import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarCobrancaBoletoComPix } from "@/lib/cora";

/**
 * POST /api/pagamento/boleto-pix
 * Body: { pedidoId: string }
 *
 * Cria uma cobrança combinada Boleto + PIX na Cora.
 * O cliente pode pagar via PIX (instantâneo) ou via boleto (até 3 dias úteis).
 * A cobrança é a mesma — o pagamento por qualquer forma quita o débito.
 *
 * Retorna:
 *   - boletoUrl : URL do PDF do boleto
 *   - emv       : código PIX Copia e Cola
 *   - qrUrl     : URL da imagem do QR Code (gerada a partir do EMV)
 *   - valor     : valor em reais
 */
export async function POST(req: NextRequest) {
  const { pedidoId } = await req.json();

  if (!pedidoId) {
    return NextResponse.json({ error: "pedidoId obrigatório" }, { status: 400 });
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { cliente: true, itens: true },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const valorCobrar = pedido.valorEntrada ?? pedido.valorTotal;

  // Se já existe uma cobrança boleto+pix gerada, retorna sem recriar
  if (pedido.boletoCobrancaId && pedido.boletoUrl && pedido.pixEmv) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pedido.pixEmv)}`;
    return NextResponse.json({
      cobrancaId: pedido.boletoCobrancaId,
      boletoUrl:  pedido.boletoUrl,
      emv:        pedido.pixEmv,
      qrUrl,
      valor:      valorCobrar,
    });
  }

  // Vencimento em 3 dias
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);
  const vencimentoStr = vencimento.toISOString().split("T")[0];

  try {
    const cobranca = await criarCobrancaBoletoComPix({
      codigo:      pedido.codigo,
      valorReais:  valorCobrar,
      vencimento:  vencimentoStr,
      cliente: {
        nome:  pedido.cliente.nome,
        cpf:   pedido.cliente.cpf,
        email: pedido.cliente.email,
      },
      servicos: [
        {
          nome:       pedido.itens[0]?.nome ?? "Serviço",
          valorReais: valorCobrar,
        },
      ],
    });

    const boletoUrl = cobranca.payment_options?.bank_slip?.url ?? null;
    const emv       = cobranca.pix?.emv ?? null;
    const qrUrl     = emv
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(emv)}`
      : null;

    // Persiste: ID da cobrança em boletoCobrancaId; EMV em pixEmv (campo reutilizado)
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        boletoCobrancaId: cobranca.id,
        boletoUrl,
        pixEmv:           emv,
        pixQrUrl:         qrUrl,
        formaPagamento:   "boleto_pix",
      },
    });

    return NextResponse.json({
      cobrancaId: cobranca.id,
      boletoUrl,
      emv,
      qrUrl,
      valor: valorCobrar,
    });
  } catch (err) {
    console.error("[Cora Boleto+PIX] Erro ao criar cobrança:", err);
    return NextResponse.json(
      { error: "Erro ao gerar cobrança Boleto+PIX. Tente novamente." },
      { status: 500 }
    );
  }
}

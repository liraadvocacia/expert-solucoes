import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarCobrancaPix } from "@/lib/cora";

/**
 * POST /api/pagamento/pix
 * Body: { pedidoId: string }
 *
 * Cria uma cobrança PIX na Cora para o pedido.
 * Se o pedido tiver valorEntrada definido (modelo 50/50), cobra apenas a entrada.
 * Retorna emv (Copia e Cola) e o valor cobrado.
 * O QR code é gerado no client a partir do EMV via api.qrserver.com.
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

  // Valor a cobrar agora: entrada (50/50 ou boleto parcelado) ou total (à vista)
  const valorCobrar = pedido.valorEntrada ?? pedido.valorTotal;

  // Se já tem cobrança PIX gerada, verifica se ainda é válida na API atual
  if (pedido.pixCobrancaId && pedido.pixEmv) {
    try {
      const { buscarCobranca } = await import("@/lib/cora");
      const cobranca = await buscarCobranca(pedido.pixCobrancaId);
      // Cobrança existente e acessível — retorna sem recriar
      if (cobranca.status !== "CANCELLED") {
        return NextResponse.json({
          cobrancaId: pedido.pixCobrancaId,
          emv: pedido.pixEmv,
          qrUrl: pedido.pixQrUrl,
          valor: valorCobrar,
        });
      }
    } catch {
      // Falha ao buscar (ex: ID de staging na API de produção) — recria a cobrança
      console.warn("[Cora PIX] Cobrança existente inválida — recriando:", pedido.pixCobrancaId);
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { pixCobrancaId: null, pixEmv: null, pixQrUrl: null },
      });
    }
  }

  // Vencimento: D+3
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);
  const vencimentoStr = vencimento.toISOString().split("T")[0];

  try {
    const cobranca = await criarCobrancaPix({
      codigo: pedido.codigo,
      valorReais: valorCobrar,
      vencimento: vencimentoStr,
      cliente: {
        nome: pedido.cliente.nome,
        cpf: pedido.cliente.cpf,
        email: pedido.cliente.email,
      },
      servicos: [
        {
          nome: pedido.itens[0]?.nome ?? "Serviço",
          valorReais: valorCobrar,
        },
      ],
    });

    // EMV = código Pix Copia e Cola
    const emv = cobranca.pix?.emv ?? null;

    // QR code gerado no client a partir do EMV via api.qrserver.com
    // (não depende de endpoint autenticado da Cora)
    const qrUrl = emv
      ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(emv)}`
      : null;

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        pixCobrancaId: cobranca.id,
        pixEmv: emv,
        pixQrUrl: qrUrl,
        formaPagamento: "pix",
      },
    });

    return NextResponse.json({ cobrancaId: cobranca.id, emv, qrUrl, valor: valorCobrar });
  } catch (err) {
    console.error("[Cora PIX] Erro ao criar cobrança:", err);
    return NextResponse.json(
      { error: "Erro ao gerar cobrança PIX. Tente novamente." },
      { status: 500 }
    );
  }
}

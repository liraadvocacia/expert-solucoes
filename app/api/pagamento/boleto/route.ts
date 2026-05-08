import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarCobrancaBoleto } from "@/lib/cora";

/**
 * POST /api/pagamento/boleto
 * Body: { pedidoId: string }
 *
 * Cria uma cobrança de boleto bancário na Cora para o pedido.
 * Usa pedido.valorEntrada se definido (pagamento parcial / 50-50),
 * caso contrário usa valorTotal.
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

  // Se já tem boleto gerado, retorna
  if (pedido.boletoCobrancaId && pedido.boletoUrl) {
    return NextResponse.json({
      cobrancaId: pedido.boletoCobrancaId,
      boletoUrl: pedido.boletoUrl,
      valor: pedido.valorEntrada ?? pedido.valorTotal,
    });
  }

  // Vencimento em 3 dias
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);
  const vencimentoStr = vencimento.toISOString().split("T")[0];

  const valorCobrar = pedido.valorEntrada ?? pedido.valorTotal;

  try {
    const cobranca = await criarCobrancaBoleto({
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

    const boletoUrl = cobranca.payment_options?.bank_slip?.url ?? null;

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        boletoCobrancaId: cobranca.id,
        boletoUrl,
        formaPagamento: "boleto",
      },
    });

    return NextResponse.json({
      cobrancaId: cobranca.id,
      boletoUrl,
      valor: valorCobrar,
    });
  } catch (err) {
    console.error("[Cora Boleto] Erro ao criar cobrança:", err);
    return NextResponse.json(
      { error: "Erro ao gerar boleto. Tente novamente." },
      { status: 500 }
    );
  }
}

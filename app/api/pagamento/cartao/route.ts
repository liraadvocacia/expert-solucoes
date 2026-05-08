import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarCobrancaCartao } from "@/lib/cora";

/**
 * POST /api/pagamento/cartao
 * Body: { pedidoId: string }
 *
 * Cria uma cobrança de cartão de crédito na Cora para o pedido.
 * Parcelas e valor vêm do próprio pedido (gravados no momento da criação).
 * Retorna a URL do checkout de cartão para redirect.
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

  // Se já tem cobrança de cartão, retorna
  if (pedido.cartaoCobrancaId && pedido.cartaoCheckoutUrl) {
    return NextResponse.json({
      cobrancaId: pedido.cartaoCobrancaId,
      checkoutUrl: pedido.cartaoCheckoutUrl,
      valor: pedido.valorTotal,
    });
  }

  // Vencimento em 3 dias
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 3);
  const vencimentoStr = vencimento.toISOString().split("T")[0];

  const parcelas = pedido.parcelas ?? 1;
  const valorCobrar = pedido.valorTotal;

  try {
    const cobranca = await criarCobrancaCartao({
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
      parcelas,
    });

    // A Cora pode retornar o checkout URL em campos diferentes conforme versão da API
    const checkoutUrl =
      cobranca.checkout_url ??
      cobranca.payment_options?.credit_card?.checkout_url ??
      null;

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        cartaoCobrancaId: cobranca.id,
        cartaoCheckoutUrl: checkoutUrl,
        formaPagamento: "cartao",
      },
    });

    return NextResponse.json({
      cobrancaId: cobranca.id,
      checkoutUrl,
      valor: valorCobrar,
      parcelas,
    });
  } catch (err) {
    console.error("[Cora Cartão] Erro ao criar cobrança:", err);
    return NextResponse.json(
      { error: "Erro ao gerar cobrança de cartão. Tente novamente." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { criarLinkPagamento } from "@/lib/infinitypay";

/**
 * POST /api/pagamento/cartao
 * Body: { pedidoId: string }
 *
 * Cria um link de pagamento no InfinityPay para o pedido.
 * Parcelas e valor vêm do próprio pedido (gravados no momento da criação).
 * Retorna a URL do checkout InfinityPay para redirect.
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

  // Se já tem link gerado, reutiliza sem recriar
  if (pedido.cartaoCheckoutUrl) {
    return NextResponse.json({
      checkoutUrl: pedido.cartaoCheckoutUrl,
      valor:       pedido.valorTotal,
      parcelas:    pedido.parcelas ?? 1,
    });
  }

  const parcelas    = pedido.parcelas ?? 1;
  const valorCobrar = pedido.valorTotal;
  const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  try {
    const { checkoutUrl } = await criarLinkPagamento({
      pedidoCodigo: pedido.codigo,
      valorReais:   valorCobrar,
      descricao:    pedido.itens[0]?.nome ?? "Serviço Expert Soluções",
      cliente: {
        nome:     pedido.cliente.nome,
        email:    pedido.cliente.email,
        telefone: pedido.cliente.whatsapp ?? pedido.cliente.telefone,
      },
      // Após pagar, InfinityPay redireciona de volta para nossa página de pagamento
      redirectUrl: `${baseUrl}/pagamento?pedidoId=${pedido.id}&codigo=${pedido.codigo}`,
      webhookUrl:  `${baseUrl}/api/webhook/infinitypay`,
    });

    // Persiste o link e marca como cartão
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        cartaoCobrancaId:  pedido.codigo, // order_nsu = codigo do pedido
        cartaoCheckoutUrl: checkoutUrl,
        formaPagamento:    "cartao",
      },
    });

    return NextResponse.json({
      checkoutUrl,
      valor:    valorCobrar,
      parcelas,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[InfinityPay Cartão] Erro ao criar link:", msg);

    let mensagem = "Erro ao gerar link de pagamento por cartão. Tente novamente.";
    if (msg.includes("INFINITYPAY_HANDLE")) {
      mensagem = "Gateway de cartão não configurado. Entre em contato pelo WhatsApp.";
    } else if (msg.includes("401") || msg.includes("403")) {
      mensagem = "Erro de autenticação com o gateway de pagamento. Entre em contato.";
    } else if (msg.includes("400")) {
      mensagem = "Dados inválidos para geração do link. Entre em contato.";
    }

    return NextResponse.json(
      { error: mensagem, detalhe: msg },
      { status: 500 }
    );
  }
}

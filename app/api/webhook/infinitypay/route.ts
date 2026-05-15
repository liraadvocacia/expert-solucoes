import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { enviarEmailConfirmacao } from "@/lib/email";

/**
 * POST /api/webhook/infinitypay
 *
 * Recebe notificação de pagamento confirmado do InfinityPay.
 * Payload esperado:
 *   invoice_slug, amount, paid_amount, installments,
 *   capture_method, transaction_nsu, order_nsu, receipt_url
 *
 * order_nsu = pedido.codigo (gravado no momento da criação do link)
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const orderNsu      = body.order_nsu      as string | undefined;
  const paidAmount    = body.paid_amount    as number | undefined;
  const amount        = body.amount         as number | undefined;
  const captureMethod = body.capture_method as string | undefined;
  const slug          = body.invoice_slug   as string | undefined;

  console.log("[InfinityPay Webhook]", JSON.stringify(body));

  if (!orderNsu) {
    return NextResponse.json({ error: "order_nsu ausente" }, { status: 400 });
  }

  // Localiza o pedido pelo código (order_nsu = pedido.codigo)
  const pedido = await prisma.pedido.findFirst({
    where: { codigo: orderNsu },
    include: {
      cliente: true,
      itens:   true,
    },
  });

  if (!pedido) {
    console.warn(`[InfinityPay Webhook] Pedido não encontrado para order_nsu: ${orderNsu}`);
    // Retorna 200 para o InfinityPay não retentar desnecessariamente
    return NextResponse.json({ ok: true });
  }

  // Só processa se ainda aguardando pagamento
  if (pedido.status !== "aguardando_pagamento") {
    console.log(`[InfinityPay Webhook] Pedido ${orderNsu} já processado (status: ${pedido.status})`);
    return NextResponse.json({ ok: true });
  }

  // Valor pago em reais (InfinityPay envia em centavos)
  const valorPagoReais = ((paidAmount ?? amount ?? 0) / 100);
  const novoValorPago  = pedido.valorPago + valorPagoReais;
  const pagamentoTotal = novoValorPago >= pedido.valorTotal;

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      valorPago:    novoValorPago,
      status:       pagamentoTotal ? "em_andamento" : "aguardando_pagamento",
      formaPagamento: captureMethod === "credit_card" ? "cartao" : captureMethod ?? "cartao",
      // Armazena o slug para consultas futuras
      ...(slug ? { cartaoCobrancaId: slug } : {}),
    },
  });

  if (pagamentoTotal && pedido.cliente.email) {
    await enviarEmailConfirmacao({
      clienteNome:  pedido.cliente.nome,
      clienteEmail: pedido.cliente.email,
      pedidoCodigo: pedido.codigo,
      pedidoTipo:   pedido.tipo,
      valorTotal:   pedido.valorTotal,
      itens:        pedido.itens.map((i) => ({ nome: i.nome, valor: i.valor })),
    });
  }

  console.log(
    `[InfinityPay Webhook] Pedido ${pedido.codigo} pago — R$ ${valorPagoReais.toFixed(2)} via ${captureMethod ?? "cartao"}`
  );

  return NextResponse.json({ ok: true });
}

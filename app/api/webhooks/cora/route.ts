import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

/**
 * POST /api/webhooks/cora
 *
 * Recebe notificações da Cora quando uma cobrança é paga.
 * Verifica assinatura HMAC-SHA256 com CORA_WEBHOOK_SECRET antes de processar.
 *
 * Header enviado pela Cora: x-cora-signature: sha256=<hex>
 *
 * Registrar este endpoint uma vez via GET /api/webhooks/cora/setup
 */

function verificarAssinatura(payload: string, assinaturaHeader: string | null): boolean {
  const secret = process.env.CORA_WEBHOOK_SECRET;

  // Se o secret não estiver configurado, loga aviso mas permite em dev
  if (!secret) {
    if (process.env.CORA_ENV === "production") {
      console.error("[Cora Webhook] CORA_WEBHOOK_SECRET não configurado em produção!");
      return false;
    }
    console.warn("[Cora Webhook] CORA_WEBHOOK_SECRET ausente — pulando verificação (dev mode)");
    return true;
  }

  if (!assinaturaHeader) {
    console.warn("[Cora Webhook] Header x-cora-signature ausente");
    return false;
  }

  // Formato esperado: "sha256=<hex>"
  const [algo, hash] = assinaturaHeader.split("=");
  if (algo !== "sha256" || !hash) {
    console.warn("[Cora Webhook] Formato de assinatura inválido:", assinaturaHeader);
    return false;
  }

  const esperado = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf-8")
    .digest("hex");

  // Comparação em tempo constante para evitar timing attacks
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(esperado, "hex"));
}

export async function POST(req: NextRequest) {
  // Lê o payload bruto para verificar a assinatura antes de parsear
  const rawBody = await req.text();
  const assinatura = req.headers.get("x-cora-signature");

  if (!verificarAssinatura(rawBody, assinatura)) {
    console.warn("[Cora Webhook] Assinatura inválida — requisição rejeitada");
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const cobrancaId = body.id as string | undefined;
  const status     = body.status as string | undefined;
  const totalPaid  = body.total_paid as number | undefined; // centavos

  console.log("[Cora Webhook]", { cobrancaId, status, totalPaid });

  // Só processa eventos de pagamento confirmado
  if (!cobrancaId || status !== "PAID") {
    return NextResponse.json({ ok: true });
  }

  // Busca pedido por qualquer uma das chaves de cobrança (PIX, boleto ou cartão)
  const pedido = await prisma.pedido.findFirst({
    where: {
      OR: [
        { pixCobrancaId: cobrancaId },
        { boletoCobrancaId: cobrancaId },
        { cartaoCobrancaId: cobrancaId },
      ],
    },
  });

  if (!pedido) {
    console.warn("[Cora Webhook] Nenhum pedido encontrado para cobrancaId:", cobrancaId);
    return NextResponse.json({ ok: true }); // 200 para não gerar retentativas
  }

  const valorPago = totalPaid ? totalPaid / 100 : (pedido.valorEntrada ?? pedido.valorTotal);

  // Acumula valor pago (pode haver múltiplos webhooks: entrada + conclusão)
  const novoValorPago = pedido.valorPago + valorPago;
  const novoPagoTotal = novoValorPago >= pedido.valorTotal;

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: {
      valorPago: novoValorPago,
      status: novoPagoTotal ? "em_andamento" : "aguardando_pagamento",
    },
  });

  console.log(
    `[Cora Webhook] Pedido ${pedido.codigo}: +R$${valorPago} pago` +
    ` (total acumulado: R$${novoValorPago}/${pedido.valorTotal})` +
    (novoPagoTotal ? " → em_andamento" : "")
  );

  return NextResponse.json({ ok: true });
}

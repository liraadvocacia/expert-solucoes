import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/pagamento/cartao
 * Body: { pedidoId: string }
 *
 * Registra a intenção de pagamento via cartão.
 * O link de pagamento será enviado manualmente pela equipe via WhatsApp.
 */
export async function POST(req: NextRequest) {
  const { pedidoId } = await req.json();

  if (!pedidoId) {
    return NextResponse.json({ error: "pedidoId obrigatório" }, { status: 400 });
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { itens: true },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Marca o pedido como cartão e aguardando pagamento
  await prisma.pedido.update({
    where: { id: pedidoId },
    data: { formaPagamento: "cartao" },
  });

  return NextResponse.json({
    ok: true,
    valor:    pedido.valorTotal,
    parcelas: pedido.parcelas ?? 1,
  });
}

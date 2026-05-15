import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/parcelas/[id]
 * Body: { pagoEm?: string (ISO) | null; observacao?: string }
 *
 * Marca uma parcela de boleto como paga ou desfaz o pagamento.
 * Atualiza valorPago do pedido pai de acordo.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { pagoEm?: string | null; observacao?: string };

  const parcela = await prisma.parcelaBoleto.findUnique({ where: { id } });
  if (!parcela) {
    return NextResponse.json({ error: "Parcela não encontrada" }, { status: 404 });
  }

  const novoDataPago = body.pagoEm !== undefined
    ? (body.pagoEm ? new Date(body.pagoEm) : null)
    : parcela.pagoEm;

  const atualizada = await prisma.parcelaBoleto.update({
    where: { id },
    data: {
      pagoEm:     novoDataPago,
      observacao: body.observacao !== undefined ? body.observacao : undefined,
    },
  });

  // Ajusta valorPago do pedido
  const eraPago   = parcela.pagoEm !== null;
  const agora     = novoDataPago !== null;
  if (eraPago !== agora) {
    const delta = agora ? parcela.valor : -parcela.valor;
    const pedido = await prisma.pedido.findUnique({ where: { id: parcela.pedidoId } });
    if (pedido) {
      const novoValorPago = Math.max(0, Math.min(pedido.valorTotal, pedido.valorPago + delta));
      await prisma.pedido.update({
        where: { id: parcela.pedidoId },
        data:  { valorPago: novoValorPago },
      });
    }
  }

  return NextResponse.json(atualizada);
}

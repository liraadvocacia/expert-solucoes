import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/assinar/[token]
 * Retorna dados do contrato pelo signingToken para a página de assinatura.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const contrato = await prisma.contrato.findUnique({
    where: { signingToken: token },
    include: {
      pedido: {
        include: { cliente: true, itens: true },
      },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Link de assinatura inválido ou expirado." }, { status: 404 });
  }

  return NextResponse.json({
    id: contrato.id,
    status: contrato.status,
    pedido: {
      id: contrato.pedido.id,
      codigo: contrato.pedido.codigo,
      modalidade: contrato.pedido.modalidade,
      formaPagamento: contrato.pedido.formaPagamento,
      valorEntrada: contrato.pedido.valorEntrada,
      valorTotal: contrato.pedido.valorTotal,
      cliente: {
        nome: contrato.pedido.cliente.nome,
        cpf: contrato.pedido.cliente.cpf,
      },
      itens: contrato.pedido.itens,
    },
  });
}

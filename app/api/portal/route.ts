import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json() as { codigo?: string; cpf?: string };
  const { codigo, cpf } = body;

  if (!codigo?.trim() || !cpf?.trim()) {
    return NextResponse.json(
      { error: "Código do pedido e CPF são obrigatórios" },
      { status: 400 }
    );
  }

  // Normaliza CPF — aceita com ou sem formatação
  const cpfNorm = cpf.replace(/\D/g, "");

  const pedido = await prisma.pedido.findFirst({
    where: {
      codigo: codigo.trim().toUpperCase(),
      tipo: "servico",
      cliente: {
        cpf: { contains: cpfNorm },
      },
    },
    include: {
      cliente: {
        select: { nome: true, cpf: true, email: true, telefone: true },
      },
      itens: true,
      contrato: {
        select: {
          id: true,
          status: true,
          assinadoEm: true,
          documentoPath: true,
          assinaturaPath: true,
        },
      },
      andamentos: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!pedido) {
    return NextResponse.json(
      { error: "Pedido não encontrado. Verifique o código e o CPF informados." },
      { status: 404 }
    );
  }

  return NextResponse.json(pedido);
}

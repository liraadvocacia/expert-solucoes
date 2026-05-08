import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const busca = searchParams.get("busca");

  const where: Record<string, unknown> = {};

  if (status && status !== "todos") {
    where.status = status;
  }

  if (busca) {
    where.OR = [
      { codigo: { contains: busca } },
      { cliente: { nome: { contains: busca } } },
      { cliente: { cpf: { contains: busca } } },
    ];
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    include: { cliente: true, itens: true, contrato: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pedidos);
}

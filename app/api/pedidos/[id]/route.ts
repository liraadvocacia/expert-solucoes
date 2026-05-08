import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: true, contrato: true },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json(pedido);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const pedido = await prisma.pedido.update({
    where: { id },
    data: body,
    include: { cliente: true, itens: true, contrato: true },
  });

  return NextResponse.json(pedido);
}

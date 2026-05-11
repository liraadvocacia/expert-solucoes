import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const andamentos = await prisma.andamento.findMany({
    where: { pedidoId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(andamentos);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { titulo, descricao } = await req.json();

  if (!titulo?.trim()) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }

  const andamento = await prisma.andamento.create({
    data: {
      titulo: titulo.trim(),
      descricao: descricao?.trim() || null,
      pedidoId: id,
    },
  });

  return NextResponse.json(andamento, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const andamentoId = searchParams.get("andamentoId");

  if (!andamentoId) {
    return NextResponse.json({ error: "andamentoId obrigatório" }, { status: 400 });
  }

  await prisma.andamento.delete({ where: { id: andamentoId } });
  return NextResponse.json({ ok: true });
}

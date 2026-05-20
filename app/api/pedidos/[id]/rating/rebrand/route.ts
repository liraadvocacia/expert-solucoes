import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rebrandKsiPdf } from "@/lib/ksi-rebrand";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true },
  });
  if (!pedido) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("pdf") as File | null;
  } catch {
    return NextResponse.json({ error: "Erro ao ler formulário" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "PDF não enviado" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { filePath, fileName, hash } = await rebrandKsiPdf(buffer, {
      codigoPedido: pedido.codigo,
      nomeCliente:  pedido.cliente.nome,
    });

    await prisma.relatorioRating.deleteMany({ where: { pedidoId: id } });
    const relatorio = await prisma.relatorioRating.create({
      data: {
        pedidoId:         id,
        nomeCliente:      pedido.cliente.nome,
        cpf:              pedido.cliente.cpf,
        classificacao:    "",
        descricaoClasse:  "",
        rendaPresumida:   0,
        comprometimento:  0,
        capacidadeMensal: 0,
        pendenciasJson:   "[]",
        filePath,
        fileName,
        hash,
      },
    });

    return NextResponse.json({
      ok: true,
      relatorio: {
        id:             relatorio.id,
        nomeCliente:    relatorio.nomeCliente,
        cpf:            relatorio.cpf,
        classificacao:  "",
        descricaoClasse:"",
        fileName:       relatorio.fileName,
        createdAt:      relatorio.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[rating/rebrand]", err);
    return NextResponse.json({ error: "Erro ao processar PDF" }, { status: 500 });
  }
}

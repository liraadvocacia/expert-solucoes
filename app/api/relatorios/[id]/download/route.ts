import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const relatorio = await prisma.relatorioRating.findUnique({ where: { id } });
  if (!relatorio) {
    return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  }

  if (!fs.existsSync(relatorio.filePath)) {
    return NextResponse.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
  }

  const buffer = fs.readFileSync(relatorio.filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${relatorio.fileName}"`,
      "Content-Length":      String(buffer.length),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";

/**
 * GET /api/contratos/[id]/documento
 * Serve o PDF do contrato (unsigned ou signed) inline para preview.
 *
 * Query: ?tipo=original|assinado (default: assinado se existir, senão original)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "auto";

  const contrato = await prisma.contrato.findUnique({ where: { id } });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  // Escolhe qual PDF servir
  let filePath: string | null = null;
  if (tipo === "original") {
    filePath = contrato.documentoPath;
  } else if (tipo === "assinado") {
    filePath = contrato.assinaturaPath;
  } else {
    // auto: prefere assinado
    filePath = contrato.assinaturaPath ?? contrato.documentoPath;
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache",
    },
  });
}

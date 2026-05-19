import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseKsiText } from "@/lib/ksi-parser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Busca pedido para ter nome/cpf do cliente como fallback
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body inválido — envie multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("pdf");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Campo 'pdf' ausente ou inválido" }, { status: 400 });
  }

  let dados: ReturnType<typeof parseKsiText> = {};
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Usa pdfjs-dist (ESM) via dynamic import — compatível com Next.js App Router
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = await import("pdfjs-dist");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const doc = await loadingTask.promise;

    let rawText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Usa hasEOL para preservar quebras de linha reais do PDF,
      // adicionando espaço entre itens na mesma linha.
      // Isso produz texto muito mais próximo ao layout original.
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const str = (item as { str: string; hasEOL?: boolean }).str;
        const eol = (item as { str: string; hasEOL?: boolean }).hasEOL ?? false;
        pageText += str + (eol ? "\n" : " ");
      }
      rawText += pageText + "\n";
    }

    dados = parseKsiText(rawText);

    console.log("[rating/parse] Extração concluída:", {
      nomeCliente:      dados.nomeCliente,
      cpf:              dados.cpf,
      classificacao:    dados.classificacao,
      comprometimento:  dados.comprometimento,
      capacidadeMensal: dados.capacidadeMensal,
      rendaPresumida:   dados.rendaPresumida,
      pontualidade:     dados.pontualidade,
      dataConsulta:     dados.dataConsulta,
      pendencias:       dados.pendencias?.length,
    });
  } catch (err) {
    // Falha silenciosa — retorna objeto vazio, admin preenche manualmente
    console.warn("[rating/parse] Falha ao processar PDF:", (err as Error).message);
  }

  // Garante que nome/cpf do cliente sejam sempre incluídos como fallback
  return NextResponse.json({
    ok: true,
    dados: {
      nomeCliente:      dados.nomeCliente      ?? pedido.cliente.nome,
      cpf:              dados.cpf              ?? pedido.cliente.cpf,
      classificacao:    dados.classificacao    ?? "",
      descricaoClasse:  dados.descricaoClasse  ?? "",
      rendaPresumida:   dados.rendaPresumida   ?? 0,
      comprometimento:  dados.comprometimento  ?? 0,
      capacidadeMensal: dados.capacidadeMensal ?? 0,
      pontualidade:     dados.pontualidade,
      pontualidadeMax:  dados.pontualidadeMax  ?? 100,
      pendencias:       dados.pendencias       ?? [],
      dataConsulta:     dados.dataConsulta     ? dados.dataConsulta.toISOString() : null,
    },
  });
}

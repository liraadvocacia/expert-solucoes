import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarRelatorioRatingPDF } from "@/lib/rating-pdf";
import fs from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const relatorio = await prisma.relatorioRating.findUnique({
    where: { id },
    include: { pedido: { include: { itens: true } } },
  });
  if (!relatorio) {
    return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });
  }

  let filePath = relatorio.filePath;

  // Vercel/serverless: /tmp é efêmero — tenta regenerar se o arquivo sumiu
  if (!fs.existsSync(filePath)) {
    // PDFs rebranded (classificacao vazia) não podem ser regenerados sem o original KSI
    if (!relatorio.classificacao) {
      return NextResponse.json(
        { error: "O arquivo expirou do servidor. Faça upload do PDF da KSI novamente para gerar um novo relatório." },
        { status: 410 }
      );
    }
    try {
      const pendencias = JSON.parse(relatorio.pendenciasJson ?? "[]");
      const resultado = await gerarRelatorioRatingPDF({
        nomeCliente:      relatorio.nomeCliente,
        cpf:              relatorio.cpf,
        classificacao:    relatorio.classificacao,
        descricaoClasse:  relatorio.descricaoClasse,
        rendaPresumida:   relatorio.rendaPresumida,
        comprometimento:  relatorio.comprometimento,
        capacidadeMensal: relatorio.capacidadeMensal,
        pontualidade:     relatorio.pontualidade ?? undefined,
        pontualidadeMax:  relatorio.pontualidadeMax ?? 100,
        pendencias,
        score:            relatorio.score ?? undefined,
        scoreMax:         relatorio.scoreMax ?? undefined,
        conclusao:        relatorio.conclusao ?? undefined,
        dataNascimento:   relatorio.dataNascimento ?? undefined,
        dataConsulta:     relatorio.dataConsulta ?? new Date(relatorio.createdAt),
        codigoPedido:     relatorio.pedido.codigo,
        nomeServico:      relatorio.pedido.itens.map(i => i.nome).join(", "),
      });
      filePath = resultado.filePath;
      // Atualiza o path no banco para próxima chamada (se ainda estiver quente)
      await prisma.relatorioRating.update({
        where: { id },
        data: { filePath, hash: resultado.hash },
      });
    } catch (err) {
      console.error("[relatorio/download] Erro ao regenerar PDF:", err);
      return NextResponse.json({ error: "Arquivo não encontrado e não foi possível regenerar" }, { status: 500 });
    }
  }

  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${relatorio.fileName}"`,
      "Content-Length":      String(buffer.length),
    },
  });
}

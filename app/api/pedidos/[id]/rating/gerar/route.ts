import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarRelatorioRatingPDF, DadosRating } from "@/lib/rating-pdf";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: true },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  // Validações básicas
  if (!body.nomeCliente || !body.cpf) {
    return NextResponse.json(
      { error: "Campos obrigatórios ausentes: nomeCliente, cpf" },
      { status: 400 }
    );
  }

  const dados: DadosRating = {
    nomeCliente:      String(body.nomeCliente),
    cpf:              String(body.cpf),
    classificacao:    String(body.classificacao ?? ""),
    descricaoClasse:  String(body.descricaoClasse ?? ""),
    rendaPresumida:   Number(body.rendaPresumida  ?? 0),
    comprometimento:  Number(body.comprometimento ?? 0),
    capacidadeMensal: Number(body.capacidadeMensal ?? 0),
    pontualidade:     body.pontualidade != null ? Number(body.pontualidade) : undefined,
    pontualidadeMax:  body.pontualidadeMax != null ? Number(body.pontualidadeMax) : 100,
    dataConsulta:     body.dataConsulta ? new Date(String(body.dataConsulta)) : new Date(),
    pendencias:       Array.isArray(body.pendencias)
      ? (body.pendencias as Array<{ tipo: string; credor: string; valor: number; dataRef?: string }>).map(p => ({
          tipo:    String(p.tipo),
          credor:  String(p.credor),
          valor:   Number(p.valor) || 0,
          dataRef: p.dataRef ? String(p.dataRef) : undefined,
        }))
      : [],
    codigoPedido:     pedido.codigo,
    nomeServico:      pedido.itens.map(i => i.nome).join(", "),
    score:            body.score != null ? Number(body.score) : undefined,
    scoreMax:         body.scoreMax != null ? Number(body.scoreMax) : undefined,
    conclusao:        body.conclusao ? String(body.conclusao) : undefined,
    dataNascimento:   body.dataNascimento ? String(body.dataNascimento) : undefined,
  };

  // Gera o PDF
  let filePath: string, fileName: string, hash: string;
  try {
    ({ filePath, fileName, hash } = await gerarRelatorioRatingPDF(dados));
  } catch (err) {
    console.error("[rating/gerar] Erro ao gerar PDF:", err);
    return NextResponse.json({ error: "Falha ao gerar PDF do relatório" }, { status: 500 });
  }

  // Upsert: apaga o anterior se existir, depois cria
  try {
    await prisma.relatorioRating.deleteMany({ where: { pedidoId: id } });
    const relatorio = await prisma.relatorioRating.create({
      data: {
        pedidoId:        id,
        nomeCliente:     dados.nomeCliente,
        cpf:             dados.cpf,
        classificacao:   dados.classificacao,
        descricaoClasse: dados.descricaoClasse,
        rendaPresumida:  dados.rendaPresumida,
        comprometimento: dados.comprometimento,
        capacidadeMensal:dados.capacidadeMensal,
        pontualidade:    dados.pontualidade,
        pontualidadeMax: dados.pontualidadeMax,
        pendenciasJson:  JSON.stringify(dados.pendencias),
        filePath,
        fileName,
        hash,
      },
    });

    return NextResponse.json({
      ok: true,
      relatorioId: relatorio.id,
      fileName:    relatorio.fileName,
      relatorio: {
        id:             relatorio.id,
        nomeCliente:    relatorio.nomeCliente,
        cpf:            relatorio.cpf,
        classificacao:  relatorio.classificacao,
        descricaoClasse:relatorio.descricaoClasse,
        fileName:       relatorio.fileName,
        createdAt:      relatorio.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[rating/gerar] Erro ao salvar no banco:", err);
    return NextResponse.json({ error: "Falha ao salvar relatório no banco" }, { status: 500 });
  }
}

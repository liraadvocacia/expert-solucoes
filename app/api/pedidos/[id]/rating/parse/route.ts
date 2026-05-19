import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseKsiText } from "@/lib/ksi-parser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true },
  });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Aceita { text: string } — o texto já foi extraído do PDF pelo browser
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const rawText = body.text;
  if (!rawText || typeof rawText !== "string" || rawText.trim().length < 20) {
    return NextResponse.json({ error: "Campo 'text' ausente ou inválido" }, { status: 400 });
  }

  const dados = parseKsiText(rawText);

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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarContratoPDF, type DadosContrato } from "@/lib/contrato-pdf";
import fs from "fs";

type TipoServico = "limpa-nome" | "rating-bancario" | "bacen";

const SERVICO_META: Record<string, { tipo: TipoServico; prazo: string }> = {
  "Limpa Nome":      { tipo: "limpa-nome",      prazo: "até 45 dias úteis" },
  "Rating Bancário": { tipo: "rating-bancario",  prazo: "até 60 dias úteis" },
  "Serviço BACEN":   { tipo: "bacen",            prazo: "até 90 dias úteis" },
};

function detectarServico(nomeItem: string): { tipo: TipoServico; prazo: string } {
  for (const [chave, meta] of Object.entries(SERVICO_META)) {
    if (nomeItem.toLowerCase().includes(chave.toLowerCase())) return meta;
  }
  return { tipo: "limpa-nome", prazo: "conforme contrato" };
}

/**
 * GET /api/contratos/[id]/documento
 *
 * Serve o PDF do contrato inline para preview.
 * Se o arquivo não existir no disco (ambiente serverless / Vercel),
 * regenera o PDF a partir dos dados do banco.
 *
 * Query: ?tipo=original|assinado (default: auto — prefere assinado)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "auto";

  // Busca contrato com dados do pedido, cliente e itens
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: {
      pedido: {
        include: { cliente: true, itens: true },
      },
    },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }

  // ── 1. Tenta servir do disco ──────────────────────────────────────────────

  const filePath =
    tipo === "assinado" ? contrato.assinaturaPath :
    tipo === "original" ? contrato.documentoPath  :
    /* auto */            contrato.assinaturaPath ?? contrato.documentoPath;

  if (filePath && fs.existsSync(filePath)) {
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

  // ── 2. Arquivo não encontrado no disco — regenera do banco ────────────────
  //    (ambiente serverless: Vercel não persiste arquivos entre invocações)

  if (tipo === "assinado") {
    // PDF assinado não pode ser regenerado sem a assinatura original
    return NextResponse.json(
      { error: "Contrato assinado não encontrado. Entre em contato." },
      { status: 404 }
    );
  }

  const pedido = contrato.pedido;
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const nomeItem = pedido.itens[0]?.nome ?? "Serviço";
  const { tipo: tipoServico, prazo } = detectarServico(nomeItem);

  const dadosContrato: DadosContrato = {
    codigo: pedido.codigo,
    tipoServico,
    cliente: {
      nome:     pedido.cliente.nome,
      cpf:      pedido.cliente.cpf,
      cnpj:     pedido.cliente.cnpj ?? undefined,
      empresa:  pedido.cliente.empresa ?? undefined,
      email:    pedido.cliente.email ?? undefined,
      telefone: pedido.cliente.telefone ?? pedido.cliente.whatsapp ?? "",
      whatsapp: pedido.cliente.whatsapp ?? undefined,
    },
    servico: {
      nome:          nomeItem,
      descricao:     nomeItem,
      valorTotal:    pedido.valorTotal,
      entrada:       (pedido as Record<string, unknown>).valorEntrada as number ?? 0,
      restante:      pedido.valorTotal - (((pedido as Record<string, unknown>).valorEntrada as number) ?? 0),
      prazoEstimado: prazo,
    },
    dataEmissao: pedido.createdAt ?? new Date(),
  };

  try {
    const { filePath: gerado } = await gerarContratoPDF(dadosContrato);
    const buffer = fs.readFileSync(gerado);

    // Atualiza o path no banco para cache futuro (best-effort)
    prisma.contrato.update({
      where: { id },
      data: { documentoPath: gerado },
    }).catch(() => { /* silencioso */ });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("[Contrato] Erro ao regenerar PDF:", err);
    return NextResponse.json(
      { error: "Erro ao gerar contrato. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

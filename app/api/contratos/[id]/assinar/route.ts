import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aplicarAssinaturaPDF, gerarContratoPDF, type DadosContrato } from "@/lib/contrato-pdf";
import { enviarEmailContratoAssinado } from "@/lib/email";
import fs from "fs";

/**
 * POST /api/contratos/[id]/assinar
 *
 * Recebe a assinatura eletrônica do contratante e gera o PDF assinado.
 *
 * Body:
 *   token: string            — signingToken do contrato (validação extra)
 *   nomeAssinante: string    — nome confirmado pelo usuário
 *   assinaturaBase64: string — PNG da assinatura em base64 (data URL)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    token: string;
    nomeAssinante: string;
    assinaturaBase64: string;
  };

  const { token, nomeAssinante, assinaturaBase64 } = body;

  if (!token || !nomeAssinante || !assinaturaBase64) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

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

  if (contrato.signingToken !== token) {
    return NextResponse.json({ error: "Token inválido" }, { status: 403 });
  }

  if (contrato.status === "assinado") {
    return NextResponse.json({ error: "Contrato já assinado" }, { status: 409 });
  }

  // ── Garante que o PDF existe no disco — regenera se necessário (Vercel serverless) ──
  let documentoPath = contrato.documentoPath;
  if (!documentoPath || !fs.existsSync(documentoPath)) {
    const pedido = contrato.pedido;
    const nomeItem = pedido.itens[0]?.nome ?? "Serviço";

    const SERVICO_META: Record<string, { tipo: "limpa-nome" | "rating-bancario" | "bacen"; prazo: string }> = {
      "Limpa Nome":      { tipo: "limpa-nome",      prazo: "até 45 dias úteis" },
      "Rating Bancário": { tipo: "rating-bancario",  prazo: "até 60 dias úteis" },
      "Serviço BACEN":   { tipo: "bacen",            prazo: "até 90 dias úteis" },
    };
    let meta: { tipo: "limpa-nome" | "rating-bancario" | "bacen"; prazo: string } = { tipo: "limpa-nome", prazo: "conforme contrato" };
    for (const [chave, m] of Object.entries(SERVICO_META)) {
      if (nomeItem.toLowerCase().includes(chave.toLowerCase())) { meta = m; break; }
    }

    const dadosContrato: DadosContrato = {
      codigo:      pedido.codigo,
      tipoServico: meta.tipo,
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
        prazoEstimado: meta.prazo,
      },
      dataEmissao: pedido.createdAt ?? new Date(),
    };

    try {
      const gerado = await gerarContratoPDF(dadosContrato);
      documentoPath = gerado.filePath;
      await prisma.contrato.update({ where: { id }, data: { documentoPath, documentoHash: gerado.hash } });
    } catch (err) {
      console.error("[Assinatura] Erro ao regenerar PDF:", err);
      return NextResponse.json({ error: "Não foi possível gerar o contrato. Tente novamente." }, { status: 500 });
    }
  }

  // Captura IP e User-Agent
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "desconhecido";
  const userAgent = req.headers.get("user-agent") ?? "desconhecido";
  const assinadoEm = new Date();

  try {
    const { filePath, hash } = await aplicarAssinaturaPDF(
      documentoPath,
      { nomeAssinante, ip, userAgent, assinadoEm, assinaturaBase64 },
      contrato.pedido.codigo
    );

    // Atualiza contrato no banco
    await prisma.contrato.update({
      where: { id },
      data: {
        status: "assinado",
        assinadoEm,
        assinaturaPath: filePath,
        assinaturaHash: hash,
        nomeAssinante,
        signingIp: ip,
        signingUserAgent: userAgent,
      },
    });

    // Atualiza status do pedido para "em_andamento" se estava aguardando
    if (contrato.pedido.status === "aguardando_pagamento") {
      await prisma.pedido.update({
        where: { id: contrato.pedidoId },
        data: { status: "em_andamento" },
      });
    }

    // Envia e-mail de confirmação de assinatura ao cliente
    if (contrato.pedido.cliente.email) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://expertsolucoes.com.br";
      const contratoUrl = `${baseUrl}/api/contratos/${id}/documento?tipo=assinado&token=${token}`;
      await enviarEmailContratoAssinado({
        clienteNome:  contrato.pedido.cliente.nome,
        clienteEmail: contrato.pedido.cliente.email,
        pedidoCodigo: contrato.pedido.codigo,
        nomeServico:  contrato.pedido.itens[0]?.nome ?? "Serviço",
        assinadoEm,
        contratoUrl,
      });
    }

    return NextResponse.json({ ok: true, assinadoEm: assinadoEm.toISOString() });
  } catch (err) {
    console.error("[Assinatura] Erro:", err);
    return NextResponse.json({ error: "Erro ao processar assinatura" }, { status: 500 });
  }
}

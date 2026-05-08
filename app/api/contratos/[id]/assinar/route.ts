import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aplicarAssinaturaPDF } from "@/lib/contrato-pdf";

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
    include: { pedido: true },
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

  if (!contrato.documentoPath) {
    return NextResponse.json({ error: "PDF do contrato não gerado ainda" }, { status: 400 });
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
      contrato.documentoPath,
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

    return NextResponse.json({ ok: true, assinadoEm: assinadoEm.toISOString() });
  } catch (err) {
    console.error("[Assinatura] Erro:", err);
    return NextResponse.json({ error: "Erro ao processar assinatura" }, { status: 500 });
  }
}

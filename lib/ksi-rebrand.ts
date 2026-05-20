/**
 * Rebrand KSI PDF: cobre elementos KSI e aplica identidade Expert Soluções.
 * Preserva 100% do conteúdo de dados do cliente.
 */

import { PDFDocument, rgb, StandardFonts, PDFImage } from "pdf-lib";
import fs   from "fs";
import path from "path";
import crypto from "crypto";

const NAVY  = rgb(0.106, 0.227, 0.420);
const GOLD  = rgb(0.769, 0.573, 0.251);
const WHITE = rgb(1, 1, 1);
const LIGHT = rgb(0.65, 0.78, 0.9);

const UPLOADS_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? "/tmp/relatorios"
  : path.join(process.cwd(), "uploads", "relatorios");

function san(t: string) {
  return t
    .replace(/—/g, "-").replace(/–/g, "-").replace(/…/g, "...")
    .replace(/['']/g, "'").replace(/[""]/g, '"');
}

export async function rebrandKsiPdf(
  input: Buffer,
  opts: { codigoPedido?: string; nomeCliente?: string } = {}
): Promise<{ filePath: string; fileName: string; hash: string }> {
  const pdfDoc = await PDFDocument.load(input);
  const pages  = pdfDoc.getPages();
  const n      = pages.length;

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Logo Expert
  let logo: PDFImage | undefined;
  try {
    const lp = path.join(process.cwd(), "public", "logo-expert-transparente.png");
    if (fs.existsSync(lp)) logo = await pdfDoc.embedPng(fs.readFileSync(lp));
  } catch { /* usa fallback textual */ }

  for (let i = 0; i < n; i++) {
    const page = pages[i];
    const { width: W, height: H } = page.getSize();

    // ── Cobre cabeçalho do browser (barra com data/título) ──────────────────
    page.drawRectangle({ x: 0, y: H - 28, width: W, height: 28, color: WHITE });

    // ── Cobre rodapé do browser (URL ksiconsultas.com.br) ───────────────────
    page.drawRectangle({ x: 0, y: 0, width: W, height: 24, color: WHITE });

    // ── Nosso cabeçalho ──────────────────────────────────────────────────────
    const HDR  = 54;
    const hdrY = H - 28 - HDR; // borda inferior do cabeçalho
    page.drawRectangle({ x: 0, y: hdrY, width: W, height: HDR, color: NAVY });
    page.drawRectangle({ x: 0, y: hdrY, width: W, height: 2.5,  color: GOLD });

    if (logo) {
      const lh = 38, lw = logo.width * (lh / logo.height);
      page.drawImage(logo, { x: 26, y: hdrY + 8, width: lw, height: lh });
    } else {
      page.drawText("EXPERT SOLUCOES", { x: 26, y: hdrY + 25, font: bold, size: 11, color: WHITE });
      page.drawText("FINANCEIRAS",     { x: 26, y: hdrY + 10, font: reg,  size: 8,  color: GOLD  });
    }

    // Título central
    const title = "RELATORIO DE CREDITO";
    const tW = bold.widthOfTextAtSize(title, 11);
    page.drawText(title, { x: (W - tW) / 2, y: hdrY + 22, font: bold, size: 11, color: WHITE });

    // Página + referência (direita)
    const pg  = `Pagina ${i + 1} de ${n}`;
    const pgW = reg.widthOfTextAtSize(pg, 8);
    page.drawText(pg, { x: W - pgW - 26, y: hdrY + 27, font: reg, size: 8, color: LIGHT });
    if (opts.codigoPedido) {
      const ref  = `Ref: ${opts.codigoPedido}`;
      const refW = reg.widthOfTextAtSize(ref, 7.5);
      page.drawText(ref, { x: W - refW - 26, y: hdrY + 12, font: reg, size: 7.5, color: LIGHT });
    }

    // ── Nosso rodapé ─────────────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: 0,  width: W, height: 32, color: NAVY });
    page.drawRectangle({ x: 0, y: 32, width: W, height: 1.5, color: GOLD });
    page.drawText(
      "Expert Solucoes Financeiras  |  Documento Confidencial  |  expertsolucoes.com.br",
      { x: 26, y: 11, font: reg, size: 7, color: LIGHT }
    );

    // ── Cobre elementos KSI por página ───────────────────────────────────────

    // Página 1: logo KSI + botões "Imprimir / Nova Consulta"
    // (área imediatamente abaixo do nosso cabeçalho, antes dos dados do cliente)
    if (i === 0) {
      // Faixa que contém logo KSI (direita) e botões (esquerda)
      page.drawRectangle({ x: 0, y: hdrY - 62, width: W, height: 62, color: WHITE });
    }

    // Página 2: box "ATENÇÃO! Negativando no RGI... NEGATIVE AGORA!!" (propaganda)
    // Aparece após a tabela de Endereços, ~52-64% do topo
    if (i === 1) {
      page.drawRectangle({
        x: 18, y: Math.round(H * 0.34),
        width: W - 36, height: Math.round(H * 0.14),
        color: WHITE,
      });
    }

    // Última página: "Versão 6.0.0 / Copyright © 2017 Tecnologia."
    if (i === n - 1) {
      page.drawRectangle({ x: 18, y: 24, width: W - 36, height: 170, color: WHITE });
      // Substitui com nosso copyright
      const c1  = san("Expert Solucoes Financeiras");
      const c2  = san("Relatorio gerado com dados de bureau de credito. Uso restrito e confidencial.");
      const c1W = bold.widthOfTextAtSize(c1, 9);
      const c2W = reg.widthOfTextAtSize(c2, 7.5);
      page.drawText(c1, { x: (W - c1W) / 2, y: 148, font: bold, size: 9,   color: NAVY });
      page.drawText(c2, { x: (W - c2W) / 2, y: 130, font: reg,  size: 7.5, color: rgb(0.45, 0.45, 0.45) });
    }
  }

  // ── Salva ────────────────────────────────────────────────────────────────
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const slug     = san(opts.nomeCliente ?? "cliente")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/-+$/, "");
  const fileName = `rating-${slug}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  const outBytes = await pdfDoc.save();

  fs.writeFileSync(filePath, Buffer.from(outBytes));
  const hash = crypto.createHash("sha256").update(outBytes).digest("hex");

  return { filePath, fileName, hash };
}

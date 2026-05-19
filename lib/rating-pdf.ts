/**
 * Relatório de Rating Bancário — Expert Soluções Financeiras
 * Geração em PDF com pdf-lib (StandardFonts / WinAnsi).
 */

import { PDFDocument, PDFFont, PDFPage, PDFImage, rgb, StandardFonts } from "pdf-lib";
import crypto from "crypto";
import fs   from "fs";
import path from "path";

const UPLOADS_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? "/tmp/relatorios"
  : path.join(process.cwd(), "uploads", "relatorios");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Paleta ───────────────────────────────────────────────────────────────────
const NAVY    = rgb(0.106, 0.227, 0.420);
const NAVY_LT = rgb(0.220, 0.353, 0.565);
const GOLD    = rgb(0.769, 0.573, 0.251);
const TEXTO   = rgb(0.10,  0.10,  0.10);
const CINZA   = rgb(0.45,  0.45,  0.45);
const CINZA_L = rgb(0.78,  0.78,  0.78);
const BRANCO  = rgb(1, 1, 1);
const BG_SEC  = rgb(0.962, 0.968, 0.978);
const BG_BOX  = rgb(0.974, 0.977, 0.986);
const VERDE   = rgb(0.09,  0.58,  0.22);
const AMARELO = rgb(0.82,  0.54,  0.04);
const VERMELHO= rgb(0.76,  0.08,  0.08);

// ─── Layout ───────────────────────────────────────────────────────────────────
const W          = 595.28;
const H          = 841.89;
const ML         = 52;
const MR         = W - 52;
const CW         = MR - ML;
const BODY_SIZE  = 10.5;
const LINE_H     = 16;
const FOOTER_H   = 32;
const HEADER_H   = 76;

// ─── Sanitizador ─────────────────────────────────────────────────────────────
// WinAnsi não suporta certos unicode. Substituímos os problemáticos.
// Caracteres portugueses (é, ã, ç, ê…) estão em Latin-1 e funcionam normalmente.
function san(text: string): string {
  return text
    .replace(/—/g, " - ")   // em dash —
    .replace(/–/g, "-")     // en dash –
    .replace(/…/g, "...")   // ellipsis …
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[→←►◄•·]/g, "-");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function t(page: PDFPage, text: string, x: number, y: number,
           font: PDFFont, size: number, color = TEXTO) {
  page.drawText(san(text), { x, y, font, size, color });
}

function hline(page: PDFPage, y: number, x0 = ML, x1 = MR,
               thickness = 0.5, color = CINZA_L) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = san(text).split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxW && cur) {
      lines.push(cur); cur = w;
    } else { cur = candidate; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Cores da escala de rating ───────────────────────────────────────────────
const GRADE_LIST  = ["C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
const GRADE_CORES = [
  rgb(0.82, 0.20, 0.07),   // C-  — vermelho
  rgb(0.88, 0.42, 0.04),   // C   — laranja escuro
  rgb(0.84, 0.62, 0.04),   // C+  — laranja
  rgb(0.65, 0.74, 0.06),   // B-  — amarelo-verde
  rgb(0.30, 0.66, 0.14),   // B   — verde médio
  rgb(0.12, 0.58, 0.22),   // B+  — verde
  rgb(0.08, 0.50, 0.46),   // A-  — verde-azulado
  rgb(0.08, 0.34, 0.78),   // A   — azul
  rgb(0.05, 0.16, 0.60),   // A+  — azul escuro
];
// índice mínimo para aprovação (B- em diante)
const GRADE_MINIMO_APROVACAO = 3; // índice de "B-"

function gradeColor(cls: string) {
  const i = GRADE_LIST.indexOf(cls);
  return i >= 0 ? GRADE_CORES[i] : VERMELHO;
}

// ─── Header ──────────────────────────────────────────────────────────────────
function drawHeader(page: PDFPage, bold: PDFFont, reg: PDFFont, logo?: PDFImage) {
  page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: NAVY });
  page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD });

  const LOGO_H = 52;
  const LOGO_W = logo ? LOGO_H * (logo.width / logo.height) : 0;
  const LOGO_X = 8;
  const LOGO_Y = H - HEADER_H + (HEADER_H - LOGO_H) / 2;
  if (logo) {
    page.drawImage(logo, { x: LOGO_X, y: LOGO_Y, width: LOGO_W, height: LOGO_H });
  }

  const TEXT_X = logo ? LOGO_X + LOGO_W + 10 : ML;
  const DIV_X  = Math.round(W * 0.62);

  page.drawLine({
    start: { x: DIV_X, y: H - 12 },
    end:   { x: DIV_X, y: H - HEADER_H + 10 },
    thickness: 1.2, color: GOLD,
  });

  if (TEXT_X < DIV_X - 20) {
    t(page, "EXPERT SOLUCOES FINANCEIRAS",  TEXT_X, H - 32, bold, 12.0, BRANCO);
    t(page, "CNPJ 66.026.983/0001-43  |  Assessoria Financeira Especializada",
      TEXT_X, H - 50, reg, 7.0, GOLD);
  }

  const TAG_X = DIV_X + 10;
  t(page, "RELATORIO DE RATING BANCARIO",  TAG_X, H - 28, bold, 7.5, GOLD);
  t(page, "Documento Confidencial",         TAG_X, H - 44, reg,  6.5, rgb(0.65, 0.78, 0.9));
  t(page, "Uso Exclusivo do Contratante",   TAG_X, H - 56, reg,  6.5, rgb(0.65, 0.78, 0.9));
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function drawFooter(page: PDFPage, reg: PDFFont, num: number, total: number) {
  page.drawRectangle({ x: 0, y: 0, width: W, height: FOOTER_H, color: NAVY });
  hline(page, FOOTER_H, 0, W, 1.5, GOLD);
  t(page,
    "Expert Solucoes Financeiras  |  Documento Confidencial  |  www.expertsolucoes.com.br",
    ML, 11, reg, 7.5, rgb(0.65, 0.78, 0.9));
  const pg = `Pagina ${num} de ${total}`;
  const pgW = reg.widthOfTextAtSize(san(pg), 7.5);
  t(page, pg, MR - pgW, 11, reg, 7.5, rgb(0.65, 0.78, 0.9));
}

// ─── DocRenderer ──────────────────────────────────────────────────────────────
class DocRenderer {
  pages: PDFPage[] = [];
  y     = 0;
  doc   : PDFDocument;
  bold  : PDFFont;
  reg   : PDFFont;
  obl   : PDFFont;
  logo? : PDFImage;

  constructor(doc: PDFDocument, bold: PDFFont, reg: PDFFont,
              obl: PDFFont, logo?: PDFImage) {
    this.doc = doc; this.bold = bold;
    this.reg = reg; this.obl  = obl; this.logo = logo;
  }

  get page() { return this.pages[this.pages.length - 1]; }

  addPage() {
    const p = this.doc.addPage([W, H]);
    this.pages.push(p);
    drawHeader(p, this.bold, this.reg, this.logo);
    this.y = H - HEADER_H - 20;
    return p;
  }

  finalize() {
    this.pages.forEach((p, i) =>
      drawFooter(p, this.reg, i + 1, this.pages.length));
  }

  ensure(needed: number) {
    if (this.y - needed < FOOTER_H + 16) this.addPage();
  }

  gap(n = 10) { this.y -= n; }

  // ── Título ──────────────────────────────────────────────────────────────
  titulo(text: string) {
    this.ensure(30);
    const tw = this.bold.widthOfTextAtSize(san(text), 13);
    t(this.page, text, (W - tw) / 2, this.y, this.bold, 13, NAVY);
    this.y -= 24;
  }

  subtitulo(text: string) {
    this.ensure(18);
    const tw = this.reg.widthOfTextAtSize(san(text), 10.0);
    t(this.page, text, (W - tw) / 2, this.y, this.reg, 10.0, CINZA);
    this.y -= 17;
  }

  goldLine() {
    this.ensure(10);
    this.page.drawRectangle({ x: ML, y: this.y - 1, width: CW, height: 2, color: GOLD });
    this.y -= 14;
  }

  // ── Cabeçalho de seção ──────────────────────────────────────────────────
  secHeader(text: string) {
    this.ensure(44);
    this.y -= 10;
    const boxH = 27;
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: CW, height: boxH, color: BG_SEC });
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: 4,  height: boxH, color: GOLD });
    const tw = this.bold.widthOfTextAtSize(san(text), 10.0);
    t(this.page, text, (W - tw) / 2, this.y - 17, this.bold, 10.0, NAVY);
    this.y -= boxH + 10;
  }

  // ── Caixa de dados simples ───────────────────────────────────────────────
  infoBox(rows: [string, string][]) {
    const rowH = 22;
    const boxH = rows.length * rowH + 16;
    this.ensure(boxH + 10);
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: CW, height: boxH,
      color: BG_BOX, borderColor: rgb(0.80, 0.84, 0.92), borderWidth: 0.8,
    });
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: 3.5, height: boxH, color: NAVY });
    let iy = this.y - 14;
    for (const [label, value] of rows) {
      t(this.page, label, ML + 12, iy, this.bold, 9.0, CINZA);
      const lw = this.bold.widthOfTextAtSize(san(label) + "  ", 9.0);
      // truncar se necessário
      let val = san(value);
      const maxVW = CW - lw - 28;
      while (this.reg.widthOfTextAtSize(val, 9.0) > maxVW && val.length > 4)
        val = val.slice(0, -4) + "...";
      t(this.page, val, ML + 12 + lw, iy, this.reg, 9.0, TEXTO);
      iy -= rowH;
    }
    this.y -= boxH + 10;
  }

  // ── Caixa de DADOS DO ANALISADO — cartão limpo, texto centralizado ───────
  dadosAnalisadoBox(rows: [string, string][]) {
    const LABEL_W  = 148;           // largura da coluna de label (navy)
    const VAL_X    = ML + LABEL_W;
    const VAL_W    = MR - VAL_X;
    const VAL_SIZE = 12.0;
    const LAB_SIZE = 9.0;
    const ROW_H    = 38;            // altura generosa por linha
    const boxH     = rows.length * ROW_H;
    this.ensure(boxH + 14);

    // ── Coluna esquerda (label) — fundo navy ─────────────────────────────
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: LABEL_W, height: boxH, color: NAVY,
    });
    // ── Coluna direita (valor) — fundo branco quase puro ─────────────────
    this.page.drawRectangle({
      x: VAL_X, y: this.y - boxH, width: VAL_W, height: boxH,
      color: rgb(0.97, 0.97, 0.99),
      borderColor: rgb(0.74, 0.80, 0.90), borderWidth: 0.8,
    });
    // ── Faixa dourada na base ─────────────────────────────────────────────
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: CW, height: 2.5, color: GOLD,
    });
    // ── Faixa dourada no topo ─────────────────────────────────────────────
    this.page.drawRectangle({
      x: ML, y: this.y - 2.5, width: CW, height: 2.5, color: GOLD,
    });

    for (let i = 0; i < rows.length; i++) {
      const [label, value] = rows[i];

      // Centro vertical de cada linha
      const rowTop = this.y - i * ROW_H;
      const midY   = rowTop - ROW_H / 2 - 3.5;  // baseline ajustada

      // Label: centralizado horizontalmente na coluna navy, em ouro
      const lw = this.bold.widthOfTextAtSize(san(label.toUpperCase()), LAB_SIZE);
      const lx = ML + (LABEL_W - lw) / 2;
      t(this.page, label.toUpperCase(), lx, midY, this.bold, LAB_SIZE, GOLD);

      // Valor: centralizado horizontalmente na coluna direita
      const vLines = wrap(value, this.bold, VAL_SIZE, VAL_W - 16);
      const blockH = vLines.length * 13;
      let vy = midY + (blockH - 13) / 2; // centraliza bloco multilinhas
      for (const vl of vLines) {
        const vw = this.bold.widthOfTextAtSize(san(vl), VAL_SIZE);
        const vx = VAL_X + (VAL_W - vw) / 2;
        t(this.page, vl, vx, vy, this.bold, VAL_SIZE, TEXTO);
        vy -= 13;
      }

      // Separador horizontal entre linhas
      if (i < rows.length - 1) {
        const sepY = rowTop - ROW_H;
        this.page.drawLine({
          start: { x: ML, y: sepY }, end: { x: MR, y: sepY },
          thickness: 0.5, color: rgb(0.26, 0.40, 0.62),
        });
        this.page.drawLine({
          start: { x: VAL_X, y: sepY }, end: { x: MR, y: sepY },
          thickness: 0.5, color: rgb(0.80, 0.84, 0.92),
        });
      }
    }
    this.y -= boxH + 16;
  }

  // ── Escala visual de rating (infográfico) ────────────────────────────────
  escalaRating(classificacao: string, descricao: string) {
    const idx     = GRADE_LIST.indexOf(classificacao);
    const n       = GRADE_LIST.length;
    const segW    = CW / n;
    const BAR_H   = 42;
    const LIFT    = 16;
    const ACIMA   = 32;   // espaço para badge "ATUAL"
    const ABAIXO  = 46;   // espaço para labels e linha de mínimo
    const TOTAL_H = ACIMA + BAR_H + LIFT + ABAIXO + 4;

    this.ensure(TOTAL_H + 20);

    const barBottom = this.y - ACIMA - LIFT - BAR_H;

    // ── Container de fundo ────────────────────────────────────────────────
    this.page.drawRectangle({
      x: ML - 6, y: barBottom - ABAIXO + 4,
      width: CW + 12, height: TOTAL_H,
      color: rgb(0.965, 0.968, 0.975),
      borderColor: rgb(0.80, 0.84, 0.92), borderWidth: 0.7,
    });

    // ── Segmentos da escala ───────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const sx       = ML + i * segW;
      const isActive = i === idx;
      const isAprov  = i >= GRADE_MINIMO_APROVACAO;
      const cor      = GRADE_CORES[i];
      const segH     = isActive ? BAR_H + LIFT : BAR_H;
      const opacity  = isActive ? 1.0 : 0.30;

      // Segmento
      this.page.drawRectangle({
        x: sx + 1, y: barBottom,
        width: segW - 2, height: segH,
        color: cor, opacity,
      });

      // Nota dentro do segmento (centralizada horizontalmente)
      const gSize = isActive ? 11.5 : 8.5;
      const gText = GRADE_LIST[i];
      const gW    = this.bold.widthOfTextAtSize(gText, gSize);
      const gX    = sx + (segW - gW) / 2;
      const gY    = barBottom + 10;
      t(this.page, gText, gX, gY, this.bold, gSize, BRANCO);

      // Linha vertical divisória entre segmentos (suave)
      if (i > 0) {
        this.page.drawLine({
          start: { x: sx, y: barBottom },
          end:   { x: sx, y: barBottom + BAR_H },
          thickness: 0.5, color: rgb(1, 1, 1, ),
          opacity: 0.25,
        });
      }
    }

    // ── Linha tracejada "mínimo para aprovação" ───────────────────────────
    const aprovX = ML + GRADE_MINIMO_APROVACAO * segW;
    // linha vertical pontilhada
    for (let yy = barBottom; yy < barBottom + BAR_H + LIFT; yy += 5) {
      this.page.drawLine({
        start: { x: aprovX, y: yy     },
        end:   { x: aprovX, y: yy + 3 },
        thickness: 1.2, color: BRANCO,
      });
    }
    // label "min. aprovacao"
    const minLabel = "min. aprovacao";
    const minLW    = this.reg.widthOfTextAtSize(san(minLabel), 6.5);
    t(this.page, minLabel, aprovX - minLW / 2, barBottom - 8,
      this.reg, 6.5, CINZA);

    // ── Badge "ATUAL" acima do segmento ativo ─────────────────────────────
    if (idx >= 0) {
      const ax        = ML + idx * segW;
      const activeTop = barBottom + BAR_H + LIFT;
      const cor       = GRADE_CORES[idx];

      // Haste
      this.page.drawLine({
        start: { x: ax + segW / 2, y: activeTop     },
        end:   { x: ax + segW / 2, y: activeTop + 8 },
        thickness: 2.0, color: cor,
      });
      // Badge
      const badge = "ATUAL";
      const bW    = this.bold.widthOfTextAtSize(badge, 7.5);
      const bX    = ax + (segW - bW) / 2 - 5;
      const bY    = activeTop + 9;
      this.page.drawRectangle({
        x: bX, y: bY, width: bW + 10, height: 15, color: cor,
      });
      t(this.page, badge, bX + 5, bY + 3, this.bold, 7.5, BRANCO);
    }

    // ── Eixo "REPROVADO → APROVADO" ──────────────────────────────────────
    const axisY = barBottom - 20;
    // Linha base
    this.page.drawLine({
      start: { x: ML, y: axisY }, end: { x: MR, y: axisY },
      thickness: 0.6, color: CINZA_L,
    });
    t(this.page, "REPROVADO", ML, axisY - 11, this.bold, 8.5, VERMELHO);
    const apW = this.bold.widthOfTextAtSize("APROVADO", 8.5);
    t(this.page, "APROVADO", MR - apW, axisY - 11, this.bold, 8.5, VERDE);

    // Triângulos indicadores nas pontas (simulados com traços)
    this.page.drawLine({
      start: { x: ML + this.bold.widthOfTextAtSize("REPROVADO", 8.5) + 4, y: axisY },
      end:   { x: aprovX - 4, y: axisY },
      thickness: 1.2, color: VERMELHO, opacity: 0.4,
    });
    this.page.drawLine({
      start: { x: aprovX + 4, y: axisY },
      end:   { x: MR - apW - 4, y: axisY },
      thickness: 1.2, color: VERDE, opacity: 0.4,
    });

    // ── Linha de resumo da classificação ─────────────────────────────────
    const corAtual  = gradeColor(classificacao);
    const resumo    = `Classificacao atual: ${classificacao}  -  ${descricao}`;
    const resumoW   = this.bold.widthOfTextAtSize(san(resumo), 10.5);
    t(this.page, resumo, (W - resumoW) / 2, axisY - 28,
      this.bold, 10.5, corAtual);

    this.y = axisY - 40;
  }

  // ── Tabela de pendências ─────────────────────────────────────────────────
  tabelaPendencias(headers: string[], rows: string[][], colWidths: number[]) {
    const rowH   = 20;
    const headH  = 26;
    const totalH = headH + rows.length * rowH + 6;
    this.ensure(totalH + 10);

    this.page.drawRectangle({ x: ML, y: this.y - headH, width: CW, height: headH, color: NAVY });
    let hx = ML + 8;
    for (let i = 0; i < headers.length; i++) {
      t(this.page, headers[i], hx, this.y - 15, this.bold, 9.0, BRANCO);
      hx += colWidths[i];
    }
    let ry = this.y - headH;

    for (let ri = 0; ri < rows.length; ri++) {
      const bg = ri % 2 === 0 ? BG_BOX : BRANCO;
      this.page.drawRectangle({
        x: ML, y: ry - rowH, width: CW, height: rowH,
        color: bg, borderColor: CINZA_L, borderWidth: 0.3,
      });
      let cx = ML + 8;
      for (let ci = 0; ci < rows[ri].length; ci++) {
        let cell = san(rows[ri][ci]);
        const maxCW = colWidths[ci] - 10;
        while (this.reg.widthOfTextAtSize(cell, 9.0) > maxCW && cell.length > 4)
          cell = cell.slice(0, -4) + "...";
        t(this.page, cell, cx, ry - 13, this.reg, 9.0);
        cx += colWidths[ci];
      }
      ry -= rowH;
    }
    this.page.drawRectangle({ x: ML, y: ry, width: 3, height: totalH, color: NAVY });
    this.y = ry - 10;
  }

  // ── Barra de score ───────────────────────────────────────────────────────
  scoreBar(label: string, score: number, maxScore: number) {
    this.ensure(44);
    const pct  = (score / maxScore) * 100;
    const cor  = pct >= 70 ? VERDE : pct >= 40 ? AMARELO : VERMELHO;
    const barH = 16;
    const barW = CW;

    // Label + valor acima da barra
    t(this.page, label, ML, this.y, this.bold, 9.0, CINZA);
    const vLabel = `${score.toFixed(1)} / ${maxScore}  (${Math.round(pct)}%)`;
    const vLW = this.bold.widthOfTextAtSize(san(vLabel), 9.0);
    t(this.page, vLabel, MR - vLW, this.y, this.bold, 9.0, cor);
    this.y -= LINE_H + 2;

    // Barra
    this.page.drawRectangle({ x: ML, y: this.y - barH, width: barW, height: barH, color: CINZA_L });
    const fillW = Math.max(0, Math.min(1, score / maxScore)) * barW;
    if (fillW > 0)
      this.page.drawRectangle({ x: ML, y: this.y - barH, width: fillW, height: barH, color: cor });
    this.y -= barH + 10;
  }

  // ── Parágrafo regular ────────────────────────────────────────────────────
  paragrafo(text: string, indent = 0) {
    const x0 = ML + indent, maxW = CW - indent;
    for (const line of wrap(text, this.reg, BODY_SIZE, maxW)) {
      this.ensure(LINE_H);
      t(this.page, line, x0, this.y, this.reg, BODY_SIZE);
      this.y -= LINE_H;
    }
    this.y -= 4;
  }

  // ── Parágrafo em negrito ─────────────────────────────────────────────────
  paragrafoBold(text: string, indent = 0) {
    const x0 = ML + indent, maxW = CW - indent;
    for (const line of wrap(text, this.bold, BODY_SIZE, maxW)) {
      this.ensure(LINE_H);
      t(this.page, line, x0, this.y, this.bold, BODY_SIZE, NAVY);
      this.y -= LINE_H;
    }
    this.y -= 4;
  }

  // ── Bullet ───────────────────────────────────────────────────────────────
  bullet(text: string, cor = GOLD) {
    this.ensure(LINE_H + 2);
    const indent = 20;
    t(this.page, "-", ML + 5, this.y, this.bold, 10, cor);
    for (const line of wrap(text, this.reg, BODY_SIZE, CW - indent)) {
      this.ensure(LINE_H);
      t(this.page, line, ML + indent, this.y, this.reg, BODY_SIZE, TEXTO);
      this.y -= LINE_H;
    }
    this.y -= 4;
  }

  // ── Caixa de alerta ──────────────────────────────────────────────────────
  alertBox(text: string, tipo: "aviso" | "critico" | "ok") {
    const cor  = tipo === "critico" ? VERMELHO : tipo === "aviso" ? AMARELO : VERDE;
    const bg   = tipo === "critico" ? rgb(1, 0.94, 0.94)
               : tipo === "aviso"   ? rgb(1, 0.97, 0.87)
               :                      rgb(0.92, 1, 0.93);
    const icon = tipo === "critico" ? "ATENCAO:" : tipo === "aviso" ? "AVISO:" : "OK:";
    const lines = wrap(`${icon} ${text}`, this.bold, BODY_SIZE, CW - 28);
    const boxH  = lines.length * LINE_H + 16;
    this.ensure(boxH + 10);
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: CW, height: boxH,
      color: bg, borderColor: cor, borderWidth: 0.9,
    });
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: 4, height: boxH, color: cor });
    let ay = this.y - 11;
    for (const line of lines) {
      t(this.page, line, ML + 12, ay, this.bold, BODY_SIZE, cor);
      ay -= LINE_H;
    }
    this.y -= boxH + 10;
  }
}

// ─── Interfaces públicas ──────────────────────────────────────────────────────
export interface PendenciaRating {
  tipo:    string;   // "RGI" | "Protesto" | "SCR" | ...
  credor:  string;
  valor:   number;
  dataRef?: string;
}

export interface DadosRating {
  nomeCliente:     string;
  cpf:             string;
  dataConsulta:    Date;
  classificacao:   string;   // "A+".."C-" ou "" quando formato sem grade
  descricaoClasse: string;
  rendaPresumida:  number;
  comprometimento: number;   // 0–100 (%)
  capacidadeMensal: number;
  pontualidade?:   number;
  pontualidadeMax?: number;
  pendencias:      PendenciaRating[];
  observacoes?:    string;
  codigoPedido?:   string;
  nomeServico?:    string;
  // campos extras extraídos de formatos sem grade A/B/C
  score?:          number;   // Score Positivo (0–1000)
  scoreMax?:       number;
  conclusao?:      string;   // "Reprovado" / "Aprovado"
  dataNascimento?: string;   // "DD/MM/YYYY"
}

// ─── Classificadores de tipo de pendência ────────────────────────────────────
const ehNeg  = (t: string) =>
  /rgi|negativ|spc|serasa/i.test(t);
const ehProt = (t: string) =>
  /protesto/i.test(t);
const ehSCR  = (t: string) =>
  /scr|prejuízo|prejuizo|bacen/i.test(t);

// ─── Geração do PDF ───────────────────────────────────────────────────────────
export async function gerarRelatorioRatingPDF(dados: DadosRating): Promise<{
  filePath: string;
  fileName: string;
  hash:     string;
}> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const obl  = await doc.embedFont(StandardFonts.HelveticaOblique);

  let logo: PDFImage | undefined;
  const logoPath = path.join(process.cwd(), "public", "logo-expert-transparente.png");
  if (fs.existsSync(logoPath)) {
    try { logo = await doc.embedPng(fs.readFileSync(logoPath)); } catch { /* sem logo */ }
  }

  const r = new DocRenderer(doc, bold, reg, obl, logo);
  r.addPage();

  const fmtData     = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const dataEmissao = fmtData(new Date());

  // ──────────────────────────────────────────────────────────────────────────
  // CABEÇALHO
  // ──────────────────────────────────────────────────────────────────────────
  r.titulo("Relatório de Análise de Rating Bancário");
  r.subtitulo(
    `Emitido em ${dataEmissao}` +
    (dados.codigoPedido ? `  |  Pedido ${dados.codigoPedido}` : "")
  );
  r.goldLine();
  r.gap(4);

  const temClassificacao = Boolean(dados.classificacao);
  const totalPend = dados.pendencias.reduce((s, p) => s + p.valor, 0);
  const conclusaoFinal = dados.conclusao ??
    (temClassificacao ? (dados.classificacao.startsWith("C") ? "Reprovado" : "Aprovado") : undefined);
  const reprovado = conclusaoFinal?.toLowerCase().includes("reprov") ||
    (temClassificacao && dados.classificacao.startsWith("C")) ||
    totalPend > 0;

  // ──────────────────────────────────────────────────────────────────────────
  // DADOS DO ANALISADO
  // ──────────────────────────────────────────────────────────────────────────
  r.secHeader("DADOS DO ANALISADO");
  const linhasDadosAnalisado: [string, string][] = [
    ["Nome Completo", dados.nomeCliente],
    ["CPF",           dados.cpf],
  ];
  if (dados.dataNascimento) linhasDadosAnalisado.push(["Data de Nascimento", dados.dataNascimento]);
  linhasDadosAnalisado.push(["Data Consulta KSI", fmtData(dados.dataConsulta)]);
  r.dadosAnalisadoBox(linhasDadosAnalisado);

  // ──────────────────────────────────────────────────────────────────────────
  // RESULTADO DA ANÁLISE — ESCALA VISUAL ou SCORE
  // ──────────────────────────────────────────────────────────────────────────
  r.secHeader("RESULTADO DA ANÁLISE");
  r.gap(6);

  if (temClassificacao) {
    // Formato ratingv2: escala A/B/C visual
    r.escalaRating(dados.classificacao, dados.descricaoClasse);
  } else {
    // Formato consultaNovaResponsePF: banner de aprovação + score
    const corRes  = reprovado ? VERMELHO : VERDE;
    const bgRes   = reprovado ? rgb(1, 0.94, 0.94) : rgb(0.92, 1, 0.93);
    const textoRes = conclusaoFinal ?? (reprovado ? "Reprovado" : "Aprovado");
    r.ensure(52);
    r.page.drawRectangle({ x: ML, y: r.y - 44, width: CW, height: 44, color: bgRes,
      borderColor: corRes, borderWidth: 1.2 });
    r.page.drawRectangle({ x: ML, y: r.y - 44, width: 5, height: 44, color: corRes });
    const resLabel = "RESULTADO:";
    const resLW = bold.widthOfTextAtSize(san(resLabel), 8);
    t(r.page, resLabel, ML + 14, r.y - 16, bold, 8, corRes);
    const resVal = textoRes.toUpperCase();
    const resVW  = bold.widthOfTextAtSize(san(resVal), 16);
    t(r.page, resVal, ML + 14 + resLW + 8, r.y - 20, bold, 16, corRes);
    const scoreTxt = dados.score !== undefined
      ? `Score Positivo: ${dados.score} / ${dados.scoreMax ?? 1000}`
      : "";
    if (scoreTxt) t(r.page, scoreTxt, ML + 14, r.y - 36, reg, 8.5, CINZA);
    r.y -= 58;
  }

  if (reprovado) {
    if (totalPend > 0) {
      r.alertBox(
        `Foram identificadas restrições financeiras totalizando ` +
        `R$ ${totalPend.toFixed(2).replace(".", ",")}. ` +
        `A regularização dessas pendências é indispensável para a aprovação no Rating Bancário.`,
        "critico"
      );
    }
    if (dados.comprometimento >= 100) {
      r.alertBox(
        `Comprometimento de renda de ${dados.comprometimento}%: as obrigações financeiras ` +
        `consomem integralmente a renda presumida, resultando em capacidade de pagamento zerada. ` +
        `Este é um fator crítico de reprovação.`,
        "critico"
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RESUMO FINANCEIRO
  // ──────────────────────────────────────────────────────────────────────────
  r.secHeader("RESUMO FINANCEIRO");
  r.infoBox([
    ["Renda presumida:",                `R$ ${dados.rendaPresumida.toFixed(2).replace(".", ",")}`],
    ["Comprometimento de renda:",       `${dados.comprometimento}%`],
    ["Capacidade mensal de pagamento:", `R$ ${dados.capacidadeMensal.toFixed(2).replace(".", ",")}`],
    ["Total de restrições identificadas:",
      `R$ ${totalPend.toFixed(2).replace(".", ",")} — ` +
      `${dados.pendencias.length} ocorrência${dados.pendencias.length !== 1 ? "s" : ""}`],
  ]);

  // ──────────────────────────────────────────────────────────────────────────
  // SCORE E PONTUALIDADE
  // ──────────────────────────────────────────────────────────────────────────
  if (dados.pontualidade !== undefined || dados.score !== undefined) {
    r.addPage();
    r.secHeader("INDICADORES DE CRÉDITO");
    r.gap(6);

    if (dados.score !== undefined) {
      r.scoreBar("Score Positivo (BACEN / Mercado Financeiro)",
        dados.score, dados.scoreMax ?? 1000);
      r.gap(2);
      const pctScore = (dados.score / (dados.scoreMax ?? 1000)) * 100;
      if (pctScore >= 70)
        r.paragrafo("Score positivo elevado. Boa capacidade de crédito no mercado financeiro.");
      else if (pctScore >= 40)
        r.paragrafo("Score positivo moderado. Indica risco médio na concessão de crédito.");
      else
        r.paragrafo(
          "Score positivo baixo. Indica alto risco de inadimplência. " +
          "A regularização das pendências é o passo fundamental para a recuperação do score."
        );
      r.gap(6);
    }

    if (dados.pontualidade !== undefined) {
      r.scoreBar("Índice de Pontualidade de Pagamento",
        dados.pontualidade, dados.pontualidadeMax ?? 100);
      r.gap(2);
      const pct = (dados.pontualidade / (dados.pontualidadeMax ?? 100)) * 100;
      if (pct >= 70)
        r.paragrafo("Histórico de pagamentos satisfatório. Mantenha a regularidade para fortalecer o rating.");
      else if (pct >= 40)
        r.paragrafo("Histórico de pagamentos moderado. Há registros de atrasos que afetam negativamente a pontuação.");
      else
        r.paragrafo(
          "Histórico de pagamentos crítico. Há muitos registros de inadimplência ou atraso. " +
          "A regularização das pendências e o cumprimento em dia das obrigações correntes são " +
          "essenciais para a recuperação do score."
        );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DETALHAMENTO DAS RESTRIÇÕES
  // ──────────────────────────────────────────────────────────────────────────
  if (dados.pendencias.length > 0) {
    r.secHeader("DETALHAMENTO DAS RESTRIÇÕES FINANCEIRAS");
    r.tabelaPendencias(
      ["Tipo", "Credor / Origem", "Valor (R$)", "Referência"],
      dados.pendencias.map(p => [
        p.tipo,
        p.credor,
        `R$ ${p.valor.toFixed(2).replace(".", ",")}`,
        p.dataRef ?? "-",
      ]),
      [72, 210, 90, 115]
    );
    r.ensure(22);
    const totalStr = `TOTAL DAS RESTRIÇÕES: R$ ${totalPend.toFixed(2).replace(".", ",")}`;
    const tw = bold.widthOfTextAtSize(san(totalStr), 9);
    t(r.page, totalStr, MR - tw, r.y, bold, 9, VERMELHO);
    r.y -= 20;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PARECER TÉCNICO
  // ──────────────────────────────────────────────────────────────────────────
  r.secHeader("PARECER TÉCNICO - EXPERT SOLUÇÕES FINANCEIRAS");

  const labelRating = temClassificacao
    ? `Rating ${dados.classificacao} (${dados.descricaoClasse})`
    : dados.score !== undefined
      ? `Score ${dados.score} — ${conclusaoFinal ?? "Sem classificação"}`
      : conclusaoFinal ?? "Sem classificação";

  r.paragrafoBold(`Análise: ${dados.nomeCliente} - ${labelRating}`);
  r.gap(4);

  if (temClassificacao) {
    r.paragrafo(
      `Com base nas informações obtidas junto aos órgãos de crédito consultados, o analisado ` +
      `apresenta classificação ${dados.classificacao} (${dados.descricaoClasse}), ` +
      `não atendendo aos critérios mínimos exigidos para aprovação no serviço de Rating Bancário.`
    );
  } else {
    r.paragrafo(
      `Com base nas informações obtidas junto aos órgãos de crédito consultados, o analisado ` +
      `${reprovado ? "não atende" : "atende"} aos critérios exigidos para aprovação no serviço de Rating Bancário.` +
      (dados.score !== undefined
        ? ` Score Positivo apurado: ${dados.score} de ${dados.scoreMax ?? 1000} pontos.`
        : "")
    );
  }

  if (totalPend > 0) {
    const n = dados.pendencias.length;
    r.paragrafo(
      `Foram identificadas ${n} restrição${n !== 1 ? "ões" : ""} financeira${n !== 1 ? "s" : ""}, ` +
      `totalizando R$ ${totalPend.toFixed(2).replace(".", ",")}. ` +
      `Essas pendências comprometem diretamente o score e impedem a aprovação no rating.`
    );
  }

  if (dados.comprometimento >= 100) {
    r.paragrafo(
      `O comprometimento de renda de ${dados.comprometimento}% indica que as obrigações vigentes ` +
      `consomem integralmente a renda presumida de R$ ${dados.rendaPresumida.toFixed(2).replace(".", ",")}. ` +
      `Esse é um dos principais fatores de reprovação.`
    );
  }

  r.gap(4);
  r.paragrafoBold("Plano de ação recomendado:");
  r.gap(2);

  // ── Negativações → Protocolo Limpa Nome ─────────────────────────────────
  const negs = dados.pendencias.filter(p => ehNeg(p.tipo));
  if (negs.length > 0) {
    const totalNegs = negs.reduce((s, p) => s + p.valor, 0);
    r.bullet(
      `[NEGATIVAÇÕES - PRIORIDADE MÁXIMA] Foram identificadas ${negs.length} ` +
      `negativação${negs.length > 1 ? "ões" : ""} totalizando ` +
      `R$ ${totalNegs.toFixed(2).replace(".", ",")}. ` +
      `Recomendamos acionar o Protocolo Limpa Nome da Expert Soluções Financeiras, ` +
      `que atua juridicamente para a remoção dessas restrições de forma rápida e segura, ` +
      `sem que o cliente precise negociar diretamente com o credor. ` +
      `A remoção de negativações é o passo mais impactante para a melhoria do rating.`
    );
  }

  // ── Protestos → também via Limpa Nome ───────────────────────────────────
  const prots = dados.pendencias.filter(p => ehProt(p.tipo));
  if (prots.length > 0) {
    const totalProt = prots.reduce((s, p) => s + p.valor, 0);
    r.bullet(
      `[PROTESTOS] ${prots.length} protesto${prots.length > 1 ? "s" : ""} identificado${prots.length > 1 ? "s" : ""} ` +
      `no valor de R$ ${totalProt.toFixed(2).replace(".", ",")}. ` +
      `O Protocolo Limpa Nome da Expert Soluções também engloba a negociação e a baixa de protestos ` +
      `junto aos cartórios, garantindo a regularização jurídica e o cancelamento do registro. ` +
      `Após a quitação e a baixa, o protesto deixa de constar nos cadastros de crédito.`
    );
  }

  // ── SCR / Crédito em prejuízo → Serviço BACEN ───────────────────────────
  const scrs = dados.pendencias.filter(p => ehSCR(p.tipo));
  if (scrs.length > 0) {
    const totalSCR = scrs.reduce((s, p) => s + p.valor, 0);
    r.bullet(
      `[CRÉDITO EM PREJUÍZO - SCR/BACEN] Foram identificados registros de crédito classificado ` +
      `como prejuízo no sistema do Banco Central (SCR), totalizando ` +
      `R$ ${totalSCR.toFixed(2).replace(".", ",")}. ` +
      `Para a regularização dessa situação, a Expert Soluções Financeiras disponibiliza o ` +
      `Serviço BACEN, que atua junto às instituições financeiras para negociação, ` +
      `liquidação e regularização desses registros perante o Banco Central. ` +
      `Entre em contato para contratar este serviço e iniciar a regularização.`
    );
  }

  // ── Comprometimento de renda ─────────────────────────────────────────────
  if (dados.comprometimento >= 80) {
    r.bullet(
      `[COMPROMETIMENTO DE RENDA] Reduzir as obrigações financeiras vigentes, ` +
      `priorizando a quitação de dívidas de alto custo (crédito pessoal, cartão rotativo). ` +
      `O objetivo é atingir comprometimento inferior a 50% da renda para viabilizar ` +
      `a aprovação no Rating Bancário.`
    );
  }

  // ── Manutenção ───────────────────────────────────────────────────────────
  r.bullet(
    `[MANUTENÇÃO] Manter em dia todas as obrigações correntes durante o processo de ` +
    `regularização. Novos lançamentos de restrição prejudicam a evolução do score e ` +
    `comprometem o resultado do serviço de Rating Bancário.`
  );

  // ── Chamada para ação ────────────────────────────────────────────────────
  r.gap(6);
  r.alertBox(
    `A Expert Soluções Financeiras oferece o serviço completo de Rating Bancário, incluindo ` +
    `o Protocolo Limpa Nome (remoção de negativações e protestos) e o Serviço BACEN ` +
    `(regularização de créditos em prejuízo junto ao Banco Central). ` +
    `Entre em contato com nossa equipe para iniciar o processo e obter a aprovação ` +
    `no menor prazo possível.`,
    "aviso"
  );

  // ── Rodapé de responsabilidade ────────────────────────────────────────────
  r.gap(8);
  r.goldLine();
  r.gap(4);
  r.paragrafo(
    `Este relatório foi elaborado com base nas informações disponíveis na data de emissão ` +
    `e possui caráter informativo e consultivo. A Expert Soluções Financeiras não se ` +
    `responsabiliza por alterações cadastrais ocorridas após a emissão deste documento. ` +
    `Para dúvidas ou informações adicionais, entre em contato com nossa equipe.`
  );

  r.finalize();

  // ─── Salva ────────────────────────────────────────────────────────────────
  const pdfBytes = await doc.save();
  const hash     = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const slug     = dados.nomeCliente
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").substring(0, 30);
  const fileName = `rating-${slug}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, pdfBytes);
  return { filePath, fileName, hash };
}

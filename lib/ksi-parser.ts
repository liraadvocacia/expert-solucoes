/**
 * KSI Consultas PDF Parser — baseado no formato real extraído via pdfjs-dist + hasEOL
 *
 * Formato real (painel.ksiconsultas.com.br, produto ratingv2):
 *  Pág 1: "Data: 15-05-2026 12:21:36"                     ← traços, não barras!
 *          "Nome   GIUMARIO DA COSTA\nPEREIRA   Número CPF   068.138.776-90"
 *          "Conclusão de Análise Inteligente:   Reprovado"
 *          "CLASSIFICAÇÃO DO RISCO DE CRÉDITO\nC-"          ← valor na linha seguinte
 *  Pág 2: "COMPROMETIMENTO DE RENDA\n100%"
 *  Pág 4: "CAPACIDADE MENSAL DE PAGAMENTO\nR$: 0,00"
 *          "RGI do Brasil   1   R$ 1.190,00"
 *          "Protesto Nacional   1   R$: 643,51"
 *          "Renda Presumida   -   R$: 4.296,00"
 *  Pág 5: "Pontualidade de Pagamento   17.41   -"
 *          "Classificação do Risco de Crédito   C-   -"
 *          "NAO INFORMADO   PINHEIRO MOVEIS   R$ 1.190,00"
 *          "01-CARTORIO DE PROTESTO DE\nTITULOS...   R$:\n643.51"
 *  Pág 6: "Créditos baixados como prejuízo até 12 meses   R$ 1.920,00"
 */

import type { DadosRating, PendenciaRating } from "./rating-pdf";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converte "R$ 4.296,00" | "4.296,00" | "643.51" → número
 * Suporta BR (ponto milhar, vírgula decimal) e EN (ponto decimal).
 */
function parseBRL(raw: string): number {
  const s = raw.replace(/R\$[:\s]*/g, "").trim();
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s.replace(/[^\d.]/g, "")) || 0;
}

/**
 * Converte "DD/MM/YYYY" ou "DD-MM-YYYY" → Date | undefined
 */
function parseDMY(str: string): Date | undefined {
  const m = str.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!m) return undefined;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Normaliza whitespace: colapsa espaços/tabs múltiplos mas preserva newlines.
 */
function normalizar(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
}

/**
 * Limpa string de credor: junta quebras de linha, remove montante R$ no final.
 */
function limparCredor(str: string): string {
  return str
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+R\$[\s\d.,:%]+$/, "")
    .replace(/\s+\d+\.\d+%$/, "")
    .trim();
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseKsiText(rawText: string): Partial<DadosRating> {
  // Normaliza: colapsa espaços/tabs, preserva quebras de linha reais do PDF
  const text = normalizar(rawText);

  // ── Data da consulta ──────────────────────────────────────────────────────
  // "Data: 15-05-2026 12:21:36"  ou  "Data: 13/05/2026"
  let dataConsulta: Date | undefined;
  const dataM =
    text.match(/Data:\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i) ??
    text.match(/Data(?:\s+d[aeo]?\s+\w+)?[:\s]+(\d{2}[-\/]\d{2}[-\/]\d{4})/i) ??
    text.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/);
  if (dataM) dataConsulta = parseDMY(dataM[1]);

  // ── Nome ──────────────────────────────────────────────────────────────────
  // "Nome   GIUMARIO DA COSTA\nPEREIRA   Número CPF   068.138.776-90"
  // Nome pode quebrar linha → \s inclui \n
  let nomeCliente = "";
  const nomeM =
    text.match(/\bNome\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ\s]{4,80}?)\s+N[uú]mero/i) ??
    text.match(/\bNome\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ\s]{4,60}?)\s+(?:Documento|Data\s+de)/i) ??
    text.match(/\bNome[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ\s]{4,60}?)(?:\s{2,}|\n)/i);
  if (nomeM) {
    nomeCliente = nomeM[1].replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim();
  }

  // ── CPF ───────────────────────────────────────────────────────────────────
  // "Número CPF   068.138.776-90"  ou  "Documento CPF :   044.104.906-05"
  let cpf = "";
  const cpfM =
    text.match(/N[uú]mero\s+CPF\s+([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i) ??
    text.match(/Documento\s+CPF\s*[:\s]+([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i) ??
    text.match(/CPF[:\s]+([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i) ??
    text.match(/([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/);
  if (cpfM) cpf = (cpfM[1] ?? cpfM[0]).trim();

  // ── Classificação ─────────────────────────────────────────────────────────
  // "CLASSIFICAÇÃO DO RISCO DE CRÉDITO\nC-"  (valor na linha seguinte)
  let classificacao = "";
  const classM =
    text.match(/CLASSIFICA[ÇC][AÃ]O\s+DO\s+RISCO\s+DE\s+CR[ÉE]DITO\s+([A-C][+-]?)/i) ??
    text.match(/Classifica[çc][aã]o\s+do\s+Risco\s+de\s+Cr[eé]dito\s+([A-C][+-]?)/i);
  if (classM) classificacao = classM[1].trim().toUpperCase();

  // ── Descrição da classe ───────────────────────────────────────────────────
  // "Conclusão de Análise Inteligente:   Reprovado"
  let descricaoClasse = "";
  const descM = text.match(
    /Conclus[aã]o\s+de\s+An[aá]lise\s+Inteligente[:\s]+(\S[^\n]{0,40})/i
  );
  if (descM) {
    descricaoClasse = descM[1].trim();
  } else if (classificacao) {
    const map: Record<string, string> = {
      "A+": "Excelente", "A": "Ótimo",       "A-": "Muito Bom",
      "B+": "Bom",       "B": "Regular",     "B-": "Abaixo do Regular",
      "C+": "Fraco",     "C": "Muito Fraco", "C-": "Reprovado",
    };
    descricaoClasse = map[classificacao] ?? "";
  }

  // ── Comprometimento de renda ───────────────────────────────────────────────
  // "COMPROMETIMENTO DE RENDA\n100%"
  let comprometimento = 0;
  const comprM =
    text.match(/COMPROMETIMENTO\s+DE\s+RENDA\s+([\d]+)\s*%/i) ??
    text.match(/Comprometimento(?:\s+de\s+Renda)?\s+([\d]+(?:[.,]\d+)?)\s*%/i);
  if (comprM) comprometimento = parseFloat(comprM[1].replace(",", ".")) || 0;

  // ── Capacidade mensal de pagamento ─────────────────────────────────────────
  // "CAPACIDADE MENSAL DE PAGAMENTO\nR$: 0,00"
  let capacidadeMensal = 0;
  const capM =
    text.match(/CAPACIDADE\s+MENSAL\s+DE\s+PAGAMENTO\s+R\$[:\s]*([\d.,]+)/i) ??
    text.match(/Capacidade\s+Mensal\s+de\s+Pagamento[:\s]*R?\$?[:\s]*([\d.,]+)/i) ??
    text.match(/Limite\s+De\s+Cr[eé]dito\s*[:\s]+R\$\s*([\d.,]+)/i);
  if (capM) capacidadeMensal = parseBRL(capM[1]);

  // ── Renda presumida / estimada ─────────────────────────────────────────────
  // "Renda Presumida   -   R$: 4.296,00"  ou  "Renda estimada :   R$   3.060,00"
  let rendaPresumida = 0;
  const rendaM =
    text.match(/Renda\s+Presumida\s+[-–]\s+R\$[:\s]*([\d.,]+)/i) ??
    text.match(/Renda\s+Presumida[:\s]+R?\$?[:\s]*([\d.,]+)/i) ??
    text.match(/Renda\s+estimada\s*[:\s]+R\$\s*([\d.,]+)/i);
  if (rendaM) rendaPresumida = parseBRL(rendaM[1]);

  // ── Pontualidade ───────────────────────────────────────────────────────────
  // "Pontualidade de Pagamento   17.41   -"  ou  "Pontualidade de Pagamento :   81.17%"
  let pontualidade: number | undefined;
  const pontM = text.match(/Pontualidade\s+de\s+Pagamento\s*[:\s]*([\d.,]+)\s*%?/i);
  if (pontM) pontualidade = parseFloat(pontM[1].replace(",", ".")) || undefined;

  // ── Pendências ─────────────────────────────────────────────────────────────
  const pendencias: PendenciaRating[] = [];

  // RGI / Negativações:
  // "NAO INFORMADO   PINHEIRO MOVEIS   R$ 1.190,00"
  const rgiDetailRe =
    /(NAO INFORMADO|\d{2}\/\d{2}\/\d{4})\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-Za-záéíóúàâêôãõüçÁÉÍÓÚÀÂÊÔÃÕÜÇ\w\s.'-]{2,60}?)\s+R\$\s*([\d.,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rgiDetailRe.exec(text)) !== null) {
    const dataRef = m[1] === "NAO INFORMADO" ? "Não informado" : m[1];
    const credor  = limparCredor(m[2]);
    const valor   = parseBRL(m[3]);
    if (valor > 0 && credor.length > 1) {
      pendencias.push({ tipo: "RGI", credor, valor, dataRef });
    }
  }

  // Protestos:
  // Formato ratingv2:      "01-CARTORIO DE PROTESTO DE\nTITULOS..."
  // Formato consultaNova:  "1 TABELIONATO DE PROTESTO DE TITULOS - SERRO"
  const protestoDetailRe =
    /\b(\d{1,3}[\s\-][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-Za-záéíóúàâêôãõüçÁÉÍÓÚÀÂÊÔÃÕÜÇ\w\s\n\-,'().]{5,200}?)\s*R\$[:\s\n]*([\d.,]+)/gi;
  while ((m = protestoDetailRe.exec(text)) !== null) {
    let credor = m[1]
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/^\d{1,3}[\s\-]\s*/, "")                     // remove "01-" ou "1 "
      .replace(/\s+N[aã]o\s+divulgado.*/i, "")              // remove "Nao divulgado ..."
      .replace(/\s+\d{2}\/\d{2}\/\d{4}.*/i, "")            // remove data formatada
      .replace(/\s+(?:AVENIDA|PRACA|PRAÇA|RUA|AV\.?|R\.)\s+.*/i, "") // remove endereço
      .replace(/\s*-\s*$/, "")                              // remove traço final
      .trim();
    const valor = parseBRL(m[2]);
    if (valor > 0 && credor.length > 3) {
      pendencias.push({ tipo: "Protesto", credor, valor });
    }
  }

  // SCR / Crédito em Prejuízo:
  // "Créditos baixados como prejuízo até 12 meses   R$ 1.920,00"
  // "PREJUIZO AO SISTEMA FINANCEIRO (C)\nR$ 1.920,00"
  const scrM =
    text.match(/Cr[eé]ditos?\s+baixados?\s+como\s+prej[uú][íi]zo[^\n]*R\$\s*([\d.,]+)/i) ??
    text.match(/PREJUIZO\s+AO\s+SISTEMA\s+FINANCEIRO[^\n]*[\n\s]+R\$\s*([\d.,]+)/i);
  if (scrM) {
    const valor = parseBRL(scrM[1]);
    if (valor > 0) {
      const credorM = text.match(
        /(?:Cr[eé]dito\s+[Pp]essoal|cr[eé]dito\s+pessoal)[^\n]{0,80}/i
      );
      const credor = credorM ? limparCredor(credorM[0]) : "Crédito Pessoal sem Consignação";
      pendencias.push({ tipo: "SCR — Crédito em Prejuízo", credor, valor });
    }
  }

  // Remove duplicatas (mesmo tipo + credor + valor)
  const pendenciasUnicas = pendencias.filter((p, i) =>
    pendencias.findIndex(
      q => q.tipo === p.tipo && q.credor === p.credor && q.valor === p.valor
    ) === i
  );

  return {
    nomeCliente:     nomeCliente     || undefined,
    cpf:             cpf             || undefined,
    classificacao:   classificacao   || undefined,
    descricaoClasse: descricaoClasse || undefined,
    rendaPresumida,
    comprometimento,
    capacidadeMensal,
    pontualidade,
    pontualidadeMax: 100,
    pendencias: pendenciasUnicas,
    dataConsulta,
  };
}

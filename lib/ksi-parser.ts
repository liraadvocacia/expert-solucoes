/**
 * KSI Consultas PDF Parser
 * Extração automática de TODOS os dados do relatório KSI para pré-preenchimento.
 *
 * Padrões reais (pdfjs-dist, items joined com " "):
 *  Pág 1: "Nome   FULANO DA SILVA   Número CPF   000.000.000-00"
 *          "Conclusão de Análise Inteligente:   Reprovado"
 *          "CLASSIFICAÇÃO DO RISCO DE CRÉDITO  C-"
 *          "Data 13/05/2026" (ou similar)
 *  Pág 2: "COMPROMETIMENTO DE RENDA  100%"
 *  Pág 4: "CAPACIDADE MENSAL DE PAGAMENTO  R$: 0,00"
 *          "RGI do Brasil   1   R$ 1.190,00"
 *          "Protesto Nacional   1   R$: 643,51"
 *          "Renda Presumida   -   R$: 4.296,00"
 *  Pág 5: "Pontualidade de Pagamento   17.41"
 *          "Classificação do Risco de Crédito   C-"
 *          "NAO INFORMADO   PINHEIRO MOVEIS   R$ 1.190,00"
 *          "01-CARTORIO DE PROTESTO DE TITULOS...PEDRO CANaRIO   R$: 643.51"
 *  Pág 6: "Créditos baixados como prejuízo até 12 meses   R$ 1.920,00"
 *          "PREJUIZO AO SISTEMA FINANCEIRO (C)  R$ 1.920,00"
 *          "Crédito Pessoal sem Consignação   R$ 1.920,00"
 */

import type { DadosRating, PendenciaRating } from "./rating-pdf";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte "R$ 4.296,00" ou "4.296,00" ou "4296.00" → 4296
 * Suporta formato BR (ponto milhar, vírgula decimal) e EN (ponto decimal).
 */
function parseBRL(raw: string): number {
  const s = raw.replace(/R\$[:\s]*/g, "").trim();
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return parseFloat(s.replace(/[^\d.]/g, "")) || 0;
}

/**
 * Converte "DD/MM/YYYY" → Date  |  undefined
 */
function parseDDMMYYYY(str: string): Date | undefined {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Limpeza básica de string (remove espaços extras, strip R$ trailing, etc.)
 */
function limpar(str: string): string {
  return str
    .replace(/\s{2,}/g, " ")
    .replace(/\s+R\$[\s\d.,]+$/, "")   // strip trailing "R$ 1.920,00"
    .trim();
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseKsiText(rawText: string): Partial<DadosRating> {
  const text = rawText;

  // ── Data da consulta KSI ──────────────────────────────────────────────────
  // Pág 1: "Data 13/05/2026"  /  "Data de Emissão: 13/05/2026"  / primeira data
  let dataConsulta: Date | undefined;
  const dataKsiM = text.match(/Data(?:\s+d[aeo]?\s+\w+)?[:\s]+(\d{2}\/\d{2}\/\d{4})/i)
    ?? text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dataKsiM) dataConsulta = parseDDMMYYYY(dataKsiM[1]);

  // ── Nome ──────────────────────────────────────────────────────────────────
  // Padrão: "Nome   GIUMARIO DA COSTA PEREIRA   Número CPF"
  let nomeCliente = "";
  const nomeM = text.match(
    /\bNome\s{1,8}([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ\s]{4,70}?)\s{2,}N[uú]mero/i
  );
  if (nomeM) {
    nomeCliente = nomeM[1].trim();
  } else {
    const fbM = text.match(/Nome(?:\s+do\s+Analisado)?[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][^\n\r]{4,70})/i);
    if (fbM) nomeCliente = fbM[1].trim();
  }

  // ── CPF ───────────────────────────────────────────────────────────────────
  let cpf = "";
  const cpfM = text.match(/N[uú]mero\s+CPF\s+([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i)
    ?? text.match(/CPF[:\s]*([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i)
    ?? text.match(/([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/);
  if (cpfM) cpf = cpfM[1].trim();

  // ── Classificação ─────────────────────────────────────────────────────────
  // Pág 1: "CLASSIFICAÇÃO DO RISCO DE CRÉDITO  C-"
  // Pág 5: "Classificação do Risco de Crédito   C-"
  let classificacao = "";
  const classM = text.match(
    /CLASSIFICA[ÇC][AÃ]O DO RISCO DE CR[ÉE]DITO\s+([A-C][+-]?)/i
  ) ?? text.match(
    /Classifica[çc][aã]o do Risco de Cr[eé]dito\s+([A-C][+-]?)/i
  );
  if (classM) classificacao = classM[1].trim().toUpperCase();

  // ── Descrição da classe ────────────────────────────────────────────────────
  // Pág 1: "Conclusão de Análise Inteligente:   Reprovado"
  let descricaoClasse = "";
  const descM = text.match(
    /Conclus[aã]o de An[aá]lise Inteligente[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][^\s\n\r][^\n\r]{0,40})/i
  );
  if (descM) {
    descricaoClasse = descM[1].trim();
  } else if (classificacao) {
    const map: Record<string, string> = {
      "A+": "Excelente", "A": "Ótimo",     "A-": "Muito Bom",
      "B+": "Bom",       "B": "Regular",   "B-": "Abaixo do Regular",
      "C+": "Fraco",     "C": "Muito Fraco", "C-": "Reprovado",
    };
    descricaoClasse = map[classificacao] ?? "";
  }

  // ── Comprometimento de renda ───────────────────────────────────────────────
  // Pág 2: "COMPROMETIMENTO DE RENDA  100%"
  let comprometimento = 0;
  const comprM = text.match(/COMPROMETIMENTO DE RENDA\s+([\d]+)\s*%/i)
    ?? text.match(/Comprometimento(?:\s+de\s+Renda)?\s+([\d]+(?:[.,]\d+)?)\s*%/i);
  if (comprM) comprometimento = parseFloat(comprM[1].replace(",", ".")) || 0;

  // ── Capacidade mensal de pagamento ────────────────────────────────────────
  // Pág 4: "CAPACIDADE MENSAL DE PAGAMENTO  R$: 0,00"
  let capacidadeMensal = 0;
  const capM = text.match(/CAPACIDADE MENSAL DE PAGAMENTO\s+R\$[:\s]*([\d.,]+)/i)
    ?? text.match(/Capacidade\s+(?:Mensal|de\s+Pagamento)(?:\s+Mensal)?[:\s]+R?\$?[:\s]*([\d.,]+)/i);
  if (capM) capacidadeMensal = parseBRL(capM[1]);

  // ── Renda presumida ───────────────────────────────────────────────────────
  // Pág 4: "Renda Presumida   -   R$: 4.296,00"
  let rendaPresumida = 0;
  const rendaM = text.match(/Renda\s+Presumida\s+[-–]\s+R\$[:\s]*([\d.,]+)/i)
    ?? text.match(/Renda\s+Presumida[:\s]+R?\$?[:\s]*([\d.,]+)/i);
  if (rendaM) rendaPresumida = parseBRL(rendaM[1]);

  // ── Pontualidade ──────────────────────────────────────────────────────────
  // Pág 5: "Pontualidade de Pagamento   17.41"
  let pontualidade: number | undefined;
  const pontualidadeMax = 100;
  const pontM = text.match(/Pontualidade de Pagamento\s+([\d.,]+)/i);
  if (pontM) pontualidade = parseFloat(pontM[1].replace(",", ".")) || undefined;

  // ── Pendências ────────────────────────────────────────────────────────────
  const pendencias: PendenciaRating[] = [];

  // ── RGI / Negativações ────────────────────────────────────────────────────
  // Pág 5: "NAO INFORMADO   PINHEIRO MOVEIS   R$ 1.190,00"
  //         "12/03/2023   LOJA DAS FLORES   R$ 500,00"
  // Captura: grupo 1 = dataRef, grupo 2 = credor, grupo 3 = valor
  const rgiDetailRe = /(NAO INFORMADO|\d{2}\/\d{2}\/\d{4})\s{1,8}([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][\w\sÁÉÍÓÚÀÂÊÔÃÕÜÇáéíóúàâêôãõüç.'-]{2,60}?)\s{1,8}R\$[:\s]*([\d.,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rgiDetailRe.exec(text)) !== null) {
    const dataRef = m[1] === "NAO INFORMADO" ? "Não informado" : m[1];
    const credor  = limpar(m[2]);
    const valor   = parseBRL(m[3]);
    if (valor > 0) pendencias.push({ tipo: "RGI", credor, valor, dataRef });
  }

  // ── Protestos ─────────────────────────────────────────────────────────────
  // Pág 5: "01-CARTORIO DE PROTESTO DE TITULOS E DOCUMENTOS PEDRO CANARIO   R$: 643.51"
  // Formato: NN-NOME DO CARTORIO... CIDADE   R$: VALOR
  // Remove o prefixo "01-" (número de ordem)
  const protestoDetailRe = /\b(\d{2,3}-[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][\w\sÁÉÍÓÚÀÂÊÔÃÕÜÇáéíóúàâêôãõüç.'-]{5,120}?)\s{1,8}R\$[:\s]*([\d.,]+)/gi;
  while ((m = protestoDetailRe.exec(text)) !== null) {
    // Strip o prefixo numérico "01-", "02-" etc.
    const credor = limpar(m[1]).replace(/^\d{2,3}-\s*/, "");
    const valor  = parseBRL(m[2]);
    if (valor > 0) pendencias.push({ tipo: "Protesto", credor, valor });
  }

  // ── SCR / Crédito em Prejuízo ─────────────────────────────────────────────
  // Pág 6: "Créditos baixados como prejuízo até 12 meses   R$ 1.920,00"
  //         "PREJUIZO AO SISTEMA FINANCEIRO (C)  R$ 1.920,00"
  //         "Crédito Pessoal sem Consignação   R$ 1.920,00"
  const scrValorM = text.match(
    /Cr[eé]ditos?\s+baixados?\s+como\s+prej[uú][íi]zo[^\n\r]*R\$[:\s]*([\d.,]+)/i
  ) ?? text.match(
    /PREJUIZO AO SISTEMA FINANCEIRO[^\n\r]*R\$[:\s]*([\d.,]+)/i
  );
  if (scrValorM) {
    const valor = parseBRL(scrValorM[1]);
    if (valor > 0) {
      // Tenta extrair o tipo específico do crédito em prejuízo
      const credorM = text.match(
        /(?:Cr[eé]dito\s+Pessoal|Cr[eé]dito\s+Consignado|Cr[eé]dito\s+Imobili[aá]rio|Financiamento|Empr[eé]stimo|Cart[aã]o\s+de\s+Cr[eé]dito)[^\n\r]{0,80}/i
      );
      const credor = credorM
        ? limpar(credorM[0])
        : "Crédito Pessoal sem Consignação";
      pendencias.push({ tipo: "SCR — Crédito em Prejuízo", credor, valor });
    }
  }

  return {
    nomeCliente:      nomeCliente      || undefined,
    cpf:              cpf              || undefined,
    classificacao:    classificacao    || undefined,
    descricaoClasse:  descricaoClasse  || undefined,
    rendaPresumida,
    comprometimento,
    capacidadeMensal,
    pontualidade,
    pontualidadeMax,
    pendencias,
    dataConsulta,
  };
}

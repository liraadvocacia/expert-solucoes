/**
 * KSI Consultas PDF Parser
 * Best-effort extraction of rating data from raw PDF text.
 *
 * Padrões baseados na estrutura real extraída via pdfjs-dist:
 *  Pág 1: "Nome   FULANO DA SILVA   Número CPF   000.000.000-00"
 *          "Conclusão de Análise Inteligente:   Reprovado"
 *          "CLASSIFICAÇÃO DO RISCO DE CRÉDITO  C-"
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
 */

import type { DadosRating, PendenciaRating } from "./rating-pdf";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte "R$ 4.296,00" ou "4.296,00" ou "4296.00" → 4296
 * Suporta tanto formato BR (ponto milhar, vírgula decimal) quanto EN (ponto decimal).
 */
function parseBRL(raw: string): number {
  // Remove "R$", "R$:", espaços
  const s = raw.replace(/R\$[:\s]*/g, "").trim();
  // Formato BR: tem vírgula como decimal → remove pontos de milhar, troca vírgula
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Formato EN/misto: ponto como decimal (ex: "643.51")
  return parseFloat(s.replace(/[^\d.]/g, "")) || 0;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseKsiText(rawText: string): Partial<DadosRating> {
  const text = rawText;

  // ── Nome ──────────────────────────────────────────────────────────────────
  // Padrão: "Nome   GIUMARIO DA COSTA PEREIRA   Número CPF"
  let nomeCliente = "";
  const nomeM = text.match(
    /\bNome\s{1,8}([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ\s]{4,70}?)\s{2,}N[uú]mero/i
  );
  if (nomeM) {
    nomeCliente = nomeM[1].trim();
  } else {
    // fallback: "Nome do Analisado: FULANO"
    const fbM = text.match(/Nome(?:\s+do\s+Analisado)?[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][^\n\r]{4,70})/i);
    if (fbM) nomeCliente = fbM[1].trim();
  }

  // ── CPF ───────────────────────────────────────────────────────────────────
  // Padrão: "Número CPF   068.138.776-90"  ou qualquer CPF no documento
  let cpf = "";
  const cpfM = text.match(/N[uú]mero\s+CPF\s+([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i)
    ?? text.match(/CPF[:\s]*([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/i)
    ?? text.match(/([\d]{3}\.[\d]{3}\.[\d]{3}-[\d]{2})/);
  if (cpfM) cpf = cpfM[1].trim();

  // ── Classificação ─────────────────────────────────────────────────────────
  // Padrão pág 1: "CLASSIFICAÇÃO DO RISCO DE CRÉDITO  C-"
  // Padrão pág 5: "Classificação do Risco de Crédito   C-"
  let classificacao = "";
  const classM = text.match(
    /CLASSIFICA[ÇC][AÃ]O DO RISCO DE CR[ÉE]DITO\s+([A-C][+-]?)/i
  ) ?? text.match(
    /Classifica[çc][aã]o do Risco de Cr[eé]dito\s+([A-C][+-]?)/i
  );
  if (classM) classificacao = classM[1].trim().toUpperCase();

  // ── Descrição da classe ────────────────────────────────────────────────────
  // Padrão pág 1: "Conclusão de Análise Inteligente:   Reprovado"
  let descricaoClasse = "";
  const descM = text.match(
    /Conclus[aã]o de An[aá]lise Inteligente[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][^\s\n\r][^\n\r]{0,40})/i
  );
  if (descM) {
    descricaoClasse = descM[1].trim();
  } else if (classificacao) {
    // Fallback: mapeamento padrão KSI (sem "D")
    const map: Record<string, string> = {
      "A+": "Excelente", "A": "Ótimo",    "A-": "Muito Bom",
      "B+": "Bom",       "B": "Regular",  "B-": "Abaixo do Regular",
      "C+": "Fraco",     "C": "Muito Fraco", "C-": "Reprovado",
    };
    descricaoClasse = map[classificacao] ?? "";
  }

  // ── Comprometimento de renda ───────────────────────────────────────────────
  // Padrão pág 2: "COMPROMETIMENTO DE RENDA  100%"
  let comprometimento = 0;
  const comprM = text.match(/COMPROMETIMENTO DE RENDA\s+([\d]+)\s*%/i)
    ?? text.match(/Comprometimento(?:\s+de\s+Renda)?\s+([\d]+(?:[.,]\d+)?)\s*%/i);
  if (comprM) comprometimento = parseFloat(comprM[1].replace(",", ".")) || 0;

  // ── Capacidade mensal de pagamento ────────────────────────────────────────
  // Padrão pág 4: "CAPACIDADE MENSAL DE PAGAMENTO  R$: 0,00"
  let capacidadeMensal = 0;
  const capM = text.match(/CAPACIDADE MENSAL DE PAGAMENTO\s+R\$[:\s]*([\d.,]+)/i)
    ?? text.match(/Capacidade\s+(?:Mensal|de\s+Pagamento)(?:\s+Mensal)?[:\s]+R?\$?[:\s]*([\d.,]+)/i);
  if (capM) capacidadeMensal = parseBRL(capM[1]);

  // ── Renda presumida ───────────────────────────────────────────────────────
  // Padrão pág 4: "Renda Presumida   -   R$: 4.296,00"
  let rendaPresumida = 0;
  const rendaM = text.match(/Renda\s+Presumida\s+[-–]\s+R\$[:\s]*([\d.,]+)/i)
    ?? text.match(/Renda\s+Presumida[:\s]+R?\$?[:\s]*([\d.,]+)/i);
  if (rendaM) rendaPresumida = parseBRL(rendaM[1]);

  // ── Pontualidade ──────────────────────────────────────────────────────────
  // Padrão pág 5: "Pontualidade de Pagamento   17.41"
  let pontualidade: number | undefined;
  const pontualidadeMax = 100;
  const pontM = text.match(/Pontualidade de Pagamento\s+([\d.,]+)/i);
  if (pontM) {
    const raw = pontM[1].replace(",", ".");
    pontualidade = parseFloat(raw) || undefined;
  }

  // ── Pendências ────────────────────────────────────────────────────────────
  const pendencias: PendenciaRating[] = [];

  // ── RGI / Negativações ────────────────────────────────────────────────────
  // Pág 5: "NAO INFORMADO   PINHEIRO MOVEIS   R$ 1.190,00"
  // Formato: (DATA|NAO INFORMADO)   CREDOR   R$ VALOR
  const rgiDetailRe = /(?:NAO INFORMADO|\d{2}\/\d{2}\/\d{4})\s{1,6}([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][\w\sÁÉÍÓÚÀÂÊÔÃÕÜÇáéíóúàâêôãõüç.'-]{2,60}?)\s{1,6}R\$[:\s]*([\d.,]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rgiDetailRe.exec(text)) !== null) {
    const credor = m[1].trim();
    const valor  = parseBRL(m[2]);
    if (valor > 0) pendencias.push({ tipo: "RGI", credor, valor });
  }

  // ── Protestos ─────────────────────────────────────────────────────────────
  // Pág 5: "01-CARTORIO DE PROTESTO DE TITULOS...PEDRO CANaRIO   R$: 643.51"
  // Formato: NN-NOME DO CARTORIO... CIDADE   R$: VALOR
  const protestoDetailRe = /\b(\d{2,3}-[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇ][\w\sÁÉÍÓÚÀÂÊÔÃÕÜÇáéíóúàâêôãõüç.'-]{5,120}?)\s{1,6}R\$[:\s]*([\d.,]+)/gi;
  while ((m = protestoDetailRe.exec(text)) !== null) {
    const credor = m[1].trim();
    const valor  = parseBRL(m[2]);
    if (valor > 0) pendencias.push({ tipo: "Protesto", credor, valor });
  }

  // ── SCR / Crédito em Prejuízo ─────────────────────────────────────────────
  // Pág 6: "Créditos baixados como prejuízo até 12 meses   R$ 1.920,00"
  //         "PREJUIZO AO SISTEMA FINANCEIRO (C)  R$ 1.920,00"
  // Tentamos achar o tipo de crédito (ex: "Crédito Pessoal sem Consignação")
  const scrValorM = text.match(
    /Cr[eé]ditos?\s+baixados?\s+como\s+prej[uú][íi]zo[^\n\r]*R\$[:\s]*([\d.,]+)/i
  ) ?? text.match(
    /PREJUIZO AO SISTEMA FINANCEIRO[^\n\r]*R\$[:\s]*([\d.,]+)/i
  );
  if (scrValorM) {
    const valor = parseBRL(scrValorM[1]);
    if (valor > 0) {
      // Tenta extrair o tipo/credor: linha seguinte ou próxima com nome do crédito
      const credorM = text.match(
        /(?:Cr[eé]dito\s+Pessoal|Cr[eé]dito\s+Consignado|Financiamento|Empréstimo)[^\n\r]{0,60}/i
      );
      const credor = credorM
        ? credorM[0].trim().replace(/\s{2,}/g, " ")
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
  };
}

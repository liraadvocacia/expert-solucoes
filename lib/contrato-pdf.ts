/**
 * Geração de contratos em PDF com pdf-lib — design profissional
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, degrees } from "pdf-lib";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Em ambiente serverless (Vercel/Lambda) apenas /tmp é gravável.
// Em desenvolvimento local usa uploads/contratos para persistência.
const UPLOADS_DIR = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? "/tmp/contratos"
  : path.join(process.cwd(), "uploads", "contratos");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Paleta ───────────────────────────────────────────────────────────────────
const NAVY    = rgb(0.106, 0.227, 0.420);   // #1B3A6B
const NAVY_LT = rgb(0.220, 0.353, 0.565);   // cabeçalho suave
const GOLD    = rgb(0.769, 0.573, 0.251);   // #C49240
const TEXTO   = rgb(0.12,  0.12,  0.12);
const CINZA   = rgb(0.45,  0.45,  0.45);
const CINZA_L = rgb(0.72,  0.72,  0.72);
const BG_SEC  = rgb(0.965, 0.970, 0.980);   // fundo suave de seção
const BRANCO  = rgb(1, 1, 1);
const BG_BOX  = rgb(0.972, 0.976, 0.988);

// ─── Layout ───────────────────────────────────────────────────────────────────
const W   = 595.28;
const H   = 841.89;
const ML  = 52;           // margem esquerda
const MR  = W - 52;      // margem direita
const CW  = MR - ML;     // largura do conteúdo
const BODY_SIZE  = 9.2;
const SMALL_SIZE = 7.8;
const LINE_H     = 15;    // altura de linha para body
const FOOTER_H   = 32;
const HEADER_H   = 72;

// ─── Word wrap preciso (usa métricas reais da fonte) ─────────────────────────
function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Helpers básicos ──────────────────────────────────────────────────────────
function t(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = TEXTO) {
  page.drawText(text, { x, y, font, size, color });
}

function hline(page: PDFPage, y: number, x0 = ML, x1 = MR, thickness = 0.5, color = CINZA_L) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

// ─── Header / Footer ─────────────────────────────────────────────────────────
function drawHeader(page: PDFPage, bold: PDFFont, reg: PDFFont) {
  // Barra navy principal
  page.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: NAVY });
  // Acento gold na base
  page.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD });

  // Logo-texto: nome da empresa
  t(page, "EXPERT SOLUÇÕES FINANCEIRAS", ML, H - 34, bold, 13.5, BRANCO);
  // Subtítulo dourado
  t(page, "CNPJ nº 66.026.983/0001-43   ·   Assessoria Financeira Especializada", ML, H - 52, reg, 7.8, GOLD);

  // Linha vertical divisória dourada (decorativa)
  page.drawLine({ start: { x: MR - 1, y: H - 16 }, end: { x: MR - 1, y: H - 60 }, thickness: 1.5, color: GOLD });
}

function drawFooter(page: PDFPage, reg: PDFFont, num: number, total: number) {
  // Barra footer
  page.drawRectangle({ x: 0, y: 0, width: W, height: FOOTER_H, color: NAVY });
  hline(page, FOOTER_H, 0, W, 1.5, GOLD);

  t(page, "Expert Soluções Financeiras  —  Documento confidencial", ML, 11, reg, 6.8, rgb(0.65, 0.78, 0.9));
  const pg = `Página ${num} de ${total}`;
  const pgW = reg.widthOfTextAtSize(pg, 6.8);
  t(page, pg, MR - pgW, 11, reg, 6.8, rgb(0.65, 0.78, 0.9));
}

// ─── DocRenderer ─────────────────────────────────────────────────────────────
class DocRenderer {
  pages: PDFPage[] = [];
  y = 0;
  doc: PDFDocument;
  bold: PDFFont;
  reg: PDFFont;
  obl: PDFFont;

  constructor(doc: PDFDocument, bold: PDFFont, reg: PDFFont, obl: PDFFont) {
    this.doc  = doc;
    this.bold = bold;
    this.reg  = reg;
    this.obl  = obl;
  }

  get page() { return this.pages[this.pages.length - 1]; }

  addPage() {
    const p = this.doc.addPage([W, H]);
    this.pages.push(p);
    drawHeader(p, this.bold, this.reg);
    this.y = H - HEADER_H - 18;
    return p;
  }

  finalize() {
    this.pages.forEach((p, i) => drawFooter(p, this.reg, i + 1, this.pages.length));
  }

  ensure(needed: number) {
    if (this.y - needed < FOOTER_H + 14) this.addPage();
  }

  gap(n = 10) { this.y -= n; }

  // ── Título principal (só na pg 1) ──
  titulo(text: string) {
    this.ensure(26);
    const tw = this.bold.widthOfTextAtSize(text, 13);
    t(this.page, text, (W - tw) / 2, this.y, this.bold, 13, NAVY);
    this.y -= 20;
  }

  subtitulo(text: string) {
    this.ensure(14);
    const tw = this.reg.widthOfTextAtSize(text, 8.5);
    t(this.page, text, (W - tw) / 2, this.y, this.reg, 8.5, CINZA);
    this.y -= 14;
  }

  // ── Linha dourada separadora ──
  goldLine() {
    this.ensure(8);
    this.page.drawRectangle({ x: ML, y: this.y - 1, width: CW, height: 1.5, color: GOLD });
    this.y -= 14;
  }

  // ── Box de dados do contrato ──
  infoBox(rows: [string, string][]) {
    const rowH = 19;
    const boxH = rows.length * rowH + 14;
    this.ensure(boxH + 8);

    // fundo
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: CW, height: boxH,
      color: BG_BOX,
      borderColor: rgb(0.80, 0.84, 0.92),
      borderWidth: 0.8,
    });
    // borda esquerda navy
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: 3, height: boxH, color: NAVY });

    let iy = this.y - 12;
    for (const [label, value] of rows) {
      t(this.page, label, ML + 12, iy, this.bold, 7.5, CINZA);
      const lw = this.bold.widthOfTextAtSize(label + "  ", 7.5);
      t(this.page, value, ML + 12 + lw, iy, this.reg, 7.5, TEXTO);
      iy -= rowH;
    }
    this.y -= boxH + 10;
  }

  // ── Header de seção: fundo suave + acento gold + texto caps ──
  secHeader(text: string) {
    this.ensure(36);
    this.y -= 10;

    const boxH = 22;
    this.page.drawRectangle({
      x: ML, y: this.y - boxH, width: CW, height: boxH,
      color: BG_SEC,
    });
    // acento gold à esquerda
    this.page.drawRectangle({ x: ML, y: this.y - boxH, width: 3, height: boxH, color: GOLD });

    const tw = this.bold.widthOfTextAtSize(text, 8.2);
    t(this.page, text, (W - tw) / 2, this.y - 14, this.bold, 8.2, NAVY);
    this.y -= boxH + 10;
  }

  // ── Cláusula: primeira linha em bold navy, resto em regular ──
  clausula(text: string) {
    this.ensure(20);
    // Divide após o "–" para colorir apenas o identificador
    const dashIdx = text.indexOf(" – ");
    if (dashIdx !== -1) {
      const header = text.substring(0, dashIdx + 3); // "CLÁUSULA X – "
      const rest   = text.substring(dashIdx + 3);

      // Pinta o header em bold navy, depois o resto em regular na mesma linha se couber
      const headerW = this.bold.widthOfTextAtSize(header, BODY_SIZE);
      const restW   = this.reg.widthOfTextAtSize(rest, BODY_SIZE);

      if (headerW + restW <= CW) {
        // Tudo numa linha
        t(this.page, header, ML, this.y, this.bold, BODY_SIZE, NAVY);
        t(this.page, rest,   ML + headerW, this.y, this.reg, BODY_SIZE, TEXTO);
        this.y -= LINE_H;
      } else {
        // Header ocupa linha(s), depois o corpo
        const headerLines = wrap(header, this.bold, BODY_SIZE, CW);
        for (const line of headerLines) {
          this.ensure(LINE_H);
          t(this.page, line, ML, this.y, this.bold, BODY_SIZE, NAVY);
          this.y -= LINE_H;
        }
        const bodyLines = wrap(rest, this.reg, BODY_SIZE, CW - 2);
        this.drawJustified(bodyLines, ML, CW - 2, this.reg, BODY_SIZE);
      }
    } else {
      // sem dash, tudo em bold navy
      const lines = wrap(text, this.bold, BODY_SIZE, CW);
      for (const line of lines) {
        this.ensure(LINE_H);
        t(this.page, line, ML, this.y, this.bold, BODY_SIZE, NAVY);
        this.y -= LINE_H;
      }
    }
    this.y -= 4;
  }

  // ── Parágrafo de texto corrido (justificado) ──
  paragrafo(text: string, indent = 0) {
    const x0   = ML + indent;
    const maxW = CW - indent;
    const lines = wrap(text, this.reg, BODY_SIZE, maxW);
    this.drawJustified(lines, x0, maxW, this.reg, BODY_SIZE);
    this.y -= 4;
  }

  // ── Sub-cláusula com número destacado ──
  subclausula(id: string, text: string) {
    this.ensure(LINE_H + 4);
    const indent = 16;
    const idW    = this.bold.widthOfTextAtSize(id + " – ", BODY_SIZE);
    const maxW   = CW - indent - idW;

    t(this.page, id + " –", ML + indent, this.y, this.bold, BODY_SIZE, NAVY_LT);

    const lines = wrap(text, this.reg, BODY_SIZE, maxW);
    this.drawJustified(lines, ML + indent + idW, maxW, this.reg, BODY_SIZE);
    this.y -= 4;
  }

  // ── Justificação: distribui espaço extra entre palavras (exceto última linha) ──
  justifyLine(line: string, x: number, maxW: number, font: PDFFont, size: number, color = TEXTO) {
    const words = line.split(" ");
    if (words.length <= 1) { t(this.page, line, x, this.y, font, size, color); return; }
    const totalWordW = words.reduce((s, w) => s + font.widthOfTextAtSize(w, size), 0);
    const gap = (maxW - totalWordW) / (words.length - 1);
    let cx = x;
    for (const word of words) {
      t(this.page, word, cx, this.y, font, size, color);
      cx += font.widthOfTextAtSize(word, size) + gap;
    }
  }

  drawJustified(lines: string[], x: number, maxW: number, font: PDFFont, size: number, color = TEXTO) {
    for (let i = 0; i < lines.length; i++) {
      this.ensure(LINE_H);
      if (i < lines.length - 1) {
        this.justifyLine(lines[i], x, maxW, font, size, color);
      } else {
        t(this.page, lines[i], x, this.y, font, size, color);
      }
      this.y -= LINE_H;
    }
  }

  // ── Bullet ──
  bullet(text: string) {
    this.ensure(LINE_H);
    const indent = 18;
    t(this.page, "-", ML + 4, this.y, this.bold, 9, GOLD);
    const maxW  = CW - indent;
    const lines = wrap(text, this.bold, BODY_SIZE, maxW);
    for (let i = 0; i < lines.length; i++) {
      this.ensure(LINE_H);
      t(this.page, lines[i], ML + indent, this.y, this.bold, BODY_SIZE, TEXTO);
      this.y -= LINE_H;
    }
    this.y -= 4;
  }
}

// ─── Interface pública ────────────────────────────────────────────────────────
export interface DadosContrato {
  codigo: string;
  tipoServico: "limpa-nome" | "rating-bancario" | "bacen";
  cliente: {
    nome: string;
    cpf: string;
    cnpj?: string | null;
    empresa?: string | null;
    email?: string | null;
    telefone: string;
    whatsapp?: string | null;
  };
  servico: {
    nome: string;
    descricao: string;
    valorTotal: number;
    entrada: number;
    restante: number;
    prazoEstimado: string;
  };
  dataEmissao: Date;
}

// ─── Geração do contrato ──────────────────────────────────────────────────────
export async function gerarContratoPDF(dados: DadosContrato): Promise<{
  filePath: string;
  fileName: string;
  hash: string;
}> {
  const doc  = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);
  const obl  = await doc.embedFont(StandardFonts.HelveticaOblique);

  const r = new DocRenderer(doc, bold, reg, obl);
  r.addPage();

  const { tipoServico, cliente, servico, dataEmissao } = dados;
  const isLimpa  = tipoServico === "limpa-nome";
  const isRating = tipoServico === "rating-bancario";

  const dataFmt = dataEmissao.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const docId   = cliente.cnpj ? `CNPJ nº ${cliente.cnpj}` : `CPF nº ${cliente.cpf}`;
  const nomePJ  = cliente.empresa ? `${cliente.empresa} (${cliente.nome})` : cliente.nome;
  const tel     = cliente.whatsapp ?? cliente.telefone;
  const valorFmt = `R$ ${servico.valorTotal.toFixed(2).replace(".", ",")}`;
  const valorExt = valorPorExtenso(servico.valorTotal);

  // ── TÍTULO ─────────────────────────────────────────────────────────────────
  r.gap(6);
  r.titulo("CONTRATO DE PRESTAÇÃO DE SERVIÇOS");
  r.subtitulo(`Referência: ${dados.codigo}   ·   Emitido em ${dataFmt}`);
  r.goldLine();
  r.gap(4);

  // ── BOX DE DADOS RESUMO ─────────────────────────────────────────────────────
  const prazoLabel = isLimpa ? "45 dias úteis" : isRating ? "60 dias úteis" : "90 dias úteis";
  r.infoBox([
    ["Contratante:", nomePJ.toUpperCase()],
    ["Documento:", docId],
    ["Serviço:", servico.nome],
    ["Valor:", `${valorFmt} (${valorExt})`],
    ["Prazo estimado:", prazoLabel],
  ]);

  // ── PARÁGRAFO INTRODUTÓRIO ──────────────────────────────────────────────────
  r.paragrafo(
    `Por este instrumento particular de CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que entre si fazem, de um lado, EXPERT SOLUÇÕES FINANCEIRAS UNIPESSOAL LTDA, inscrita no CNPJ nº 66.026.983/0001-43, representada por seu sócio administrador, Sr. Luiz Antônio Pereira de Lira, inscrito no CPF/MF sob nº 078.065.554-04, doravante denominada CONTRATADA, e, de outro lado, ${nomePJ.toUpperCase()}, inscrito(a) no ${docId}, telefone/WhatsApp ${tel}, doravante denominado(a) CONTRATANTE.`
  );
  r.paragrafo(
    "Decidem as partes, na melhor forma de direito, celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que se regulará pelas cláusulas e condições estipuladas."
  );

  // ── CLÁUSULA 1 – OBJETO ────────────────────────────────────────────────────
  r.secHeader("DO OBJETO E REALIZAÇÃO DO SERVIÇO");

  const obj1 = isLimpa
    ? "CLÁUSULA PRIMEIRA – A CONTRATADA prestará ao(à) CONTRATANTE assistência desde o primeiro contato, com a prestação de serviços de intermediação de soluções administrativas para INIBIÇÃO DE APONTAMENTOS JUNTO AOS ÓRGÃOS DE PROTEÇÃO AO CRÉDITO (Serasa, SPC Brasil, Boa Vista, CENPROT Nacional e CENPROT SP), referentes ao(s) CPF/CNPJ a seguir:"
    : isRating
      ? "CLÁUSULA PRIMEIRA – A CONTRATADA prestará ao(à) CONTRATANTE serviços especializados de diagnóstico, planejamento e implementação de estratégias para MELHORIA E REGULARIZAÇÃO DO RATING BANCÁRIO junto às instituições do Sistema Financeiro Nacional, referentes ao(s) CPF/CNPJ a seguir:"
      : "CLÁUSULA PRIMEIRA – A CONTRATADA prestará ao(à) CONTRATANTE serviços de análise, elaboração documental e REGULARIZAÇÃO COMPLETA DA SITUAÇÃO CADASTRAL E FINANCEIRA JUNTO AO BANCO CENTRAL DO BRASIL (BACEN), referentes ao(s) CPF/CNPJ a seguir:";

  r.clausula(obj1);
  r.gap(2);

  if (cliente.empresa && cliente.cnpj) {
    r.bullet(`${cliente.empresa.toUpperCase()} — CNPJ nº ${cliente.cnpj}`);
    r.bullet(`Responsável: ${cliente.nome.toUpperCase()} — CPF/MF nº ${cliente.cpf}`);
  } else {
    r.bullet(`${cliente.nome.toUpperCase()} — CPF/MF nº ${cliente.cpf}`);
  }
  r.gap(2);

  r.subclausula("1.1", "O(A) CONTRATANTE declara que foi suficientemente informado(a) e compreende o conceito e o objetivo deste serviço, conforme explicado pela equipe comercial da CONTRATADA.");
  r.subclausula("1.2", "O(A) CONTRATANTE autoriza o uso de seus dados pessoais para fins de execução do presente contrato, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).");
  if (isLimpa) {
    r.subclausula("1.3", "O(A) CONTRATANTE declara ciência de que o procedimento pode sofrer baixas, momento em que, se dentro da garantia contratual, a CONTRATADA procederá com todo procedimento cabível para obtenção novamente das baixas, sem custos adicionais.");
  }

  // ── CLÁUSULA 2 – OBRIGAÇÕES DO CONTRATANTE ────────────────────────────────
  r.secHeader("OBRIGAÇÕES DO CONTRATANTE");
  r.clausula("CLÁUSULA SEGUNDA – O(A) CONTRATANTE deverá fornecer à CONTRATADA todas as informações necessárias para a realização dos serviços, devendo especificar os detalhes indispensáveis à perfeita execução do objeto deste contrato.");
  r.subclausula("2.1", "O(A) CONTRATANTE deverá efetuar os pagamentos na forma e condições descritas na Cláusula Quarta.");
  if (isLimpa) {
    r.subclausula("2.2", "O(A) CONTRATANTE está ciente de que o serviço visa exclusivamente à entrega do documento NADA CONSTA dos órgãos de proteção ao crédito citados na Cláusula Primeira para o CPF/CNPJ do(a) Contratante, e nenhum outro órgão além dos mencionados aqui.");
  } else if (isRating) {
    r.subclausula("2.2", "O(A) CONTRATANTE está ciente de que o serviço visa à melhoria do perfil de crédito junto às instituições financeiras, não implicando garantia de aprovação em qualquer produto ou linha de crédito específica.");
  } else {
    r.subclausula("2.2", "O(A) CONTRATANTE está ciente de que o resultado final junto ao Banco Central depende de análise própria do órgão regulador, cujas decisões administrativas são soberanas e independentes da atuação da CONTRATADA.");
  }

  // ── CLÁUSULA 3 – OBRIGAÇÕES DA CONTRATADA ─────────────────────────────────
  r.secHeader("OBRIGAÇÕES DA CONTRATADA");
  r.clausula("CLÁUSULA TERCEIRA – A CONTRATADA deverá prestar os serviços solicitados pelo(a) CONTRATANTE conforme descrito no objeto, especificações e prazos previstos neste instrumento particular.");
  r.subclausula("3.1", "A CONTRATADA se obriga a manter sigilo absoluto sobre os dados, operações, informações e documentos do(a) CONTRATANTE, mesmo após a conclusão dos serviços ou o término da relação contratual, em conformidade com a LGPD – Lei nº 13.709/2018.");
  r.subclausula("3.2", "Os contratos, informações, dados, materiais e documentos inerentes ao(à) CONTRATANTE serão utilizados pela CONTRATADA, por seus funcionários ou contratados, exclusivamente para o cumprimento dos serviços solicitados, sendo vedada a comercialização ou utilização para outros fins.");

  // ── CLÁUSULA 4 – VALOR E PAGAMENTO ────────────────────────────────────────
  r.secHeader("DO VALOR E DAS CONDIÇÕES DE PAGAMENTO");

  let pagTxt: string;
  if (isLimpa) {
    const entFmt = `R$ ${servico.entrada.toFixed(2).replace(".", ",")}`;
    const resFmt = `R$ ${servico.restante.toFixed(2).replace(".", ",")}`;
    pagTxt = `O(A) CONTRATANTE pagará à CONTRATADA, a título de honorários, o valor de ${valorFmt} (${valorExt}), da seguinte forma: (i) entrada de ${entFmt} no ato da assinatura; (ii) saldo restante de ${resFmt} após a conclusão e comprovação dos serviços.`;
  } else if (isRating) {
    const entFmt = `R$ ${servico.entrada.toFixed(2).replace(".", ",")} (${valorPorExtenso(servico.entrada)})`;
    const resFmt = `R$ ${servico.restante.toFixed(2).replace(".", ",")} (${valorPorExtenso(servico.restante)})`;
    pagTxt = `O(A) CONTRATANTE pagará à CONTRATADA, a título de honorários, o valor total de ${valorFmt} (${valorExt}), sendo: (i) 50% de entrada — ${entFmt} — no ato da assinatura; (ii) 50% restante — ${resFmt} — após a conclusão e comprovação dos serviços.`;
  } else {
    pagTxt = `O(A) CONTRATANTE pagará à CONTRATADA, a título de honorários, o valor de ${valorFmt} (${valorExt}), a ser pago INTEGRALMENTE somente após a conclusão e comprovação dos serviços contratados. Não haverá cobrança antecipada de qualquer valor.`;
  }
  r.clausula(`CLÁUSULA QUARTA – ${pagTxt}`);

  // ── CLÁUSULA 5 – VALIDADE ──────────────────────────────────────────────────
  r.secHeader("DA VALIDADE E INÍCIO DO CONTRATO");
  r.clausula("CLÁUSULA QUINTA – O negócio jurídico será iniciado e validado a partir da assinatura do contrato e do pagamento realizado, conforme descrito na Cláusula Quarta.");

  // ── CLÁUSULA 6 – PRAZO ────────────────────────────────────────────────────
  r.secHeader("DO PRAZO DE ENTREGA DO SERVIÇO");
  const prazoDias = isLimpa ? "45 (quarenta e cinco)" : isRating ? "60 (sessenta)" : "90 (noventa)";
  r.clausula(`CLÁUSULA SEXTA – O prazo estimado para entrega dos serviços contratados será de até ${prazoDias} dias úteis, contados a partir da confirmação do pagamento e do recebimento integral da documentação necessária pela CONTRATADA.`);

  if (isLimpa) {
    r.subclausula("6.1", "O(A) CONTRATANTE entende que a CONTRATADA não garante aumento ou melhoria no score de crédito, mas realiza atualizações nas informações creditícias como possível consequência do serviço contratado.");
  } else if (isRating) {
    r.subclausula("6.1", "O(A) CONTRATANTE entende que os resultados dependem de múltiplos fatores, incluindo histórico creditício e análise de cada instituição financeira, não sendo possível garantir aprovação em qualquer produto ou linha de crédito específica.");
  } else {
    r.subclausula("6.1", "O(A) CONTRATANTE entende que o prazo de 90 dias pode ser estendido em razão de procedimentos administrativos internos do BACEN, alheios ao controle da CONTRATADA, o que não configura inadimplemento.");
  }

  // ── CLÁUSULA 7 – LIMITAÇÕES ───────────────────────────────────────────────
  r.secHeader("DAS LIMITAÇÕES DA CONTRATADA");
  r.clausula("CLÁUSULA SÉTIMA – O(A) CONTRATANTE foi informado(a) de que:");
  if (isLimpa) {
    r.subclausula("7.1", "A celebração deste contrato não cancela ou negocia automaticamente as dívidas existentes, sendo sua resolução dependente da negociação direta entre o(a) CONTRATANTE e seus credores, nos termos da legislação aplicável.");
    r.subclausula("7.2", "O serviço prestado visa à inibição dos apontamentos nos órgãos de proteção ao crédito, não implicando, necessariamente, a extinção das dívidas que originaram tais restrições.");
  } else if (isRating) {
    r.subclausula("7.1", "A CONTRATADA não possui vinculação, representação ou correspondência bancária junto a qualquer instituição financeira, atuando exclusivamente como assessora na estruturação e melhoria do perfil creditício.");
    r.subclausula("7.2", "Aprovações de crédito, financiamentos e produtos bancários são decisões exclusivas das instituições financeiras, que avaliam o perfil do cliente com base em critérios próprios, sendo a atuação da CONTRATADA de natureza consultiva e assessorial.");
  } else {
    r.subclausula("7.1", "A CONTRATADA atua como intermediária administrativa, elaborando e protocolando documentação junto ao Banco Central do Brasil, não possuindo capacidade de garantir determinado resultado, cujas decisões são soberanas e definitivas.");
    r.subclausula("7.2", "O prazo de análise pelo órgão regulador pode variar conforme a complexidade da situação e o fluxo interno do BACEN, o que é fator alheio ao controle da CONTRATADA.");
  }

  // ── CLÁUSULA 8 – REPROTOCOLO (SOMENTE LIMPA NOME) ─────────────────────────
  if (isLimpa) {
    r.secHeader("DA MANUTENÇÃO E TAXAS ADICIONAIS");
    r.clausula(`CLÁUSULA OITAVA – Após a exclusão dos apontamentos, caso tais apontamentos retornem dentro do prazo de 3 (três) meses, contados da data de emissão do documento "NADA CONSTA", será realizado novamente o serviço, sem qualquer custo ao CONTRATANTE.`);
    r.subclausula("Parágrafo 1º", `Entre o período de 4 (quatro) a 6 (seis) meses da data de emissão do "NADA CONSTA", o valor do re-protocolo será de R$ 350,00 (trezentos e cinquenta reais).`);
    r.subclausula("Parágrafo 2º", "Caso os apontamentos retornem após o prazo de 6 (seis) meses, o(a) CONTRATANTE deverá firmar novo contrato, com pagamento integral conforme a tabela de preços vigente.");
  }

  // ── LGPD ──────────────────────────────────────────────────────────────────
  const numLGPD = isLimpa ? "NONA" : "OITAVA";
  r.secHeader("DA CONFIDENCIALIDADE – OBSERVÂNCIA À LGPD");
  r.clausula(`CLÁUSULA ${numLGPD} – As partes declaram consentimento expresso para coleta, tratamento e compartilhamento de dados necessários ao cumprimento deste contrato, nos termos da Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).`);
  r.subclausula(`${isLimpa ? "9" : "8"}.1`, "Todas as tratativas, negociações e informações trocadas entre as partes são de caráter estritamente confidencial, sob pena de multa contratual de 10% (dez por cento) sobre o valor do contrato, acrescida de juros de 1% (um por cento) ao mês, conforme variação do IGP-M.");

  // ── RESCISÃO ──────────────────────────────────────────────────────────────
  const numR = isLimpa ? "DÉCIMA" : "NONA";
  r.secHeader("DO DESCUMPRIMENTO E DA RESCISÃO CONTRATUAL");
  r.clausula(`CLÁUSULA ${numR} – O contrato poderá ser rescindido por qualquer das partes, mediante comunicação formal com antecedência mínima de 5 (cinco) dias úteis.`);

  // ── DEVOLUÇÃO ─────────────────────────────────────────────────────────────
  const numDev = isLimpa ? "DÉCIMA PRIMEIRA" : "DÉCIMA";
  r.secHeader("DA DEVOLUÇÃO DOS VALORES PAGOS");
  r.clausula(`CLÁUSULA ${numDev} – Em caso de rescisão por iniciativa da CONTRATADA sem justo motivo, serão devolvidos integralmente os valores pagos pelo(a) CONTRATANTE. Em caso de rescisão por iniciativa do(a) CONTRATANTE após o início dos serviços, será devido à CONTRATADA o valor proporcional às atividades já realizadas.`);

  // ── FORO ─────────────────────────────────────────────────────────────────
  const numForo = isLimpa ? "DÉCIMA SEGUNDA" : "DÉCIMA PRIMEIRA";
  r.secHeader("DO FORO");
  r.clausula(`CLÁUSULA ${numForo} – Fica eleito o foro da Comarca de São Paulo – SP, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`);

  // ── DATA E ASSINATURAS ────────────────────────────────────────────────────
  r.gap(18);
  r.ensure(200);

  // Linha de data, alinhada à direita
  const dateSt = `São Paulo, ${dataFmt}.`;
  const datW = reg.widthOfTextAtSize(dateSt, BODY_SIZE);
  t(r.page, dateSt, MR - datW, r.y, reg, BODY_SIZE, CINZA);
  r.y -= 32;

  // ── Caixas de assinatura ──
  const sigY   = r.y;
  const col1   = ML;
  const col2   = W / 2 + 8;
  const boxW   = (CW - 16) / 2;
  const boxH   = 78;

  // Box contratante
  r.page.drawRectangle({
    x: col1, y: sigY - boxH, width: boxW, height: boxH,
    color: BG_BOX,
    borderColor: rgb(0.78, 0.82, 0.90),
    borderWidth: 0.8,
  });
  // acento top
  r.page.drawRectangle({ x: col1, y: sigY - 2, width: boxW, height: 2, color: NAVY });

  t(r.page, "(Espaço reservado para assinatura eletrônica)", col1 + 10, sigY - 36, obl, 7.2, CINZA);

  // Box contratada
  r.page.drawRectangle({
    x: col2, y: sigY - boxH, width: boxW, height: boxH,
    color: BG_BOX,
    borderColor: rgb(0.78, 0.82, 0.90),
    borderWidth: 0.8,
  });
  r.page.drawRectangle({ x: col2, y: sigY - 2, width: boxW, height: 2, color: NAVY });

  t(r.page, "Expert Soluções Financeiras", col2 + 10, sigY - 26, bold, 8.5, NAVY);
  t(r.page, "CNPJ nº 66.026.983/0001-43", col2 + 10, sigY - 40, reg, 7.5, CINZA);
  t(r.page, "Luiz Antônio Pereira de Lira", col2 + 10, sigY - 54, reg, 7.5, CINZA);
  t(r.page, "CPF nº 078.065.554-04", col2 + 10, sigY - 66, reg, 7.5, CINZA);

  // Labels abaixo das caixas
  r.y = sigY - boxH - 8;
  t(r.page, "CONTRATANTE", col1, r.y, bold, 8.2, NAVY);
  t(r.page, "CONTRATADA", col2, r.y, bold, 8.2, NAVY);
  r.y -= 13;
  t(r.page, nomePJ.toUpperCase(), col1, r.y, reg, 7.8, TEXTO);
  t(r.page, "EXPERT SOLUÇÕES FINANCEIRAS LTDA", col2, r.y, reg, 7.8, TEXTO);
  r.y -= 12;
  t(r.page, docId, col1, r.y, reg, 7.5, CINZA);
  t(r.page, "CNPJ nº 66.026.983/0001-43", col2, r.y, reg, 7.5, CINZA);

  // ── Box de certificado eletrônico ──
  r.y -= 28;
  r.ensure(62);
  const certH = 58;
  r.page.drawRectangle({
    x: ML, y: r.y - certH, width: CW, height: certH,
    color: rgb(0.960, 0.965, 0.978),
    borderColor: rgb(0.76, 0.82, 0.92),
    borderWidth: 0.8,
  });
  r.page.drawRectangle({ x: ML, y: r.y - certH, width: CW, height: 2.5, color: GOLD });

  const certLabel = "CERTIFICADO DE ASSINATURA ELETRÔNICA";
  const certLW = bold.widthOfTextAtSize(certLabel, 8.2);
  t(r.page, certLabel, (W - certLW) / 2, r.y - 14, bold, 8.2, NAVY);

  const sigInfo = `Signatário(a): ${nomePJ}   ·   ${docId}`;
  const sigInfoW = reg.widthOfTextAtSize(sigInfo, SMALL_SIZE);
  t(r.page, sigInfo, (W - sigInfoW) / 2, r.y - 30, reg, SMALL_SIZE, CINZA);

  const legalInfo = "Validade jurídica: MP nº 2.200-2/2001 e Lei nº 14.063/2020 — infraestrutura ICP-Brasil";
  const legalW = reg.widthOfTextAtSize(legalInfo, SMALL_SIZE);
  t(r.page, legalInfo, (W - legalW) / 2, r.y - 45, reg, SMALL_SIZE, CINZA);

  r.finalize();

  // ── Salvar ────────────────────────────────────────────────────────────────
  const bytes  = await doc.save();
  const buffer = Buffer.from(bytes);
  const hash   = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileName = `contrato-${dados.codigo}-${Date.now()}.pdf`;
  const filePath  = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  return { filePath, fileName, hash };
}

// ─── Aplicar assinatura ao PDF ────────────────────────────────────────────────
export interface DadosAssinatura {
  nomeAssinante: string;
  ip: string;
  userAgent: string;
  assinadoEm: Date;
  assinaturaBase64: string;
}

export async function aplicarAssinaturaPDF(
  contratoPath: string,
  dados: DadosAssinatura,
  codigoPedido: string
): Promise<{ filePath: string; hash: string }> {
  const contratoBytes = fs.readFileSync(contratoPath);
  const doc  = await PDFDocument.load(contratoBytes);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg  = await doc.embedFont(StandardFonts.Helvetica);

  const pages   = doc.getPages();
  const sigPage = pages[pages.length - 1];
  const { height: PH } = sigPage.getSize();

  const base64Data = dados.assinaturaBase64.replace(/^data:image\/png;base64,/, "");
  const imgBuffer  = Buffer.from(base64Data, "base64");
  const pngImage   = await doc.embedPng(imgBuffer);

  // Assinatura na caixa do contratante (aproximado)
  const sigY = PH - 265;
  sigPage.drawImage(pngImage, { x: ML + 2, y: sigY - 74, width: (CW / 2) - 10, height: 70 });

  // ── Página de auditoria ──────────────────────────────────────────────────
  const auditPage = doc.addPage([W, H]);
  auditPage.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.980, 0.982, 0.990) });

  // Header auditoria (reutiliza o mesmo estilo)
  auditPage.drawRectangle({ x: 0, y: H - HEADER_H, width: W, height: HEADER_H, color: NAVY });
  auditPage.drawRectangle({ x: 0, y: H - HEADER_H - 2, width: W, height: 2, color: GOLD });
  auditPage.drawText("REGISTRO DE ASSINATURA ELETRÔNICA", { x: ML, y: H - 35, font: bold, size: 11, color: BRANCO });
  auditPage.drawText("Trilha de auditoria — Documento confidencial", { x: ML, y: H - 52, font: reg, size: 8, color: GOLD });

  let ay = H - HEADER_H - 22;

  // Seção dados do documento
  auditPage.drawRectangle({ x: ML, y: ay - 22, width: CW, height: 22, color: BG_SEC });
  auditPage.drawRectangle({ x: ML, y: ay - 22, width: 3, height: 22, color: GOLD });
  auditPage.drawText("DADOS DO DOCUMENTO", { x: ML + 12, y: ay - 16, font: bold, size: 8.2, color: NAVY });
  ay -= 32;

  const contratoHash = crypto.createHash("sha256").update(contratoBytes).digest("hex");
  const docRows: [string, string][] = [
    ["Código do pedido", codigoPedido],
    ["Hash do contrato original (SHA-256)", contratoHash.toUpperCase()],
    ["Data de emissão", new Date(fs.statSync(contratoPath).ctime).toLocaleString("pt-BR")],
  ];

  for (const [label, value] of docRows) {
    auditPage.drawText(label + ":", { x: ML + 10, y: ay, font: bold, size: 8, color: CINZA });
    ay -= 12;
    const valLines = wrap(value, reg, 7.8, CW - 24);
    for (const vl of valLines) {
      auditPage.drawText(vl, { x: ML + 18, y: ay, font: reg, size: 7.8, color: TEXTO });
      ay -= 12;
    }
    ay -= 4;
  }

  ay -= 8;
  auditPage.drawLine({ start: { x: ML, y: ay }, end: { x: MR, y: ay }, thickness: 0.5, color: CINZA_L });
  ay -= 20;

  // Seção dados da assinatura
  auditPage.drawRectangle({ x: ML, y: ay - 22, width: CW, height: 22, color: BG_SEC });
  auditPage.drawRectangle({ x: ML, y: ay - 22, width: 3, height: 22, color: GOLD });
  auditPage.drawText("DADOS DA ASSINATURA", { x: ML + 12, y: ay - 16, font: bold, size: 8.2, color: NAVY });
  ay -= 32;

  const assinadoEmStr = dados.assinadoEm.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const sigRows: [string, string][] = [
    ["Nome do signatário", dados.nomeAssinante],
    ["Assinado em (BRT)", assinadoEmStr],
    ["Endereço IP", dados.ip],
    ["Dispositivo / Navegador", dados.userAgent.substring(0, 90) + (dados.userAgent.length > 90 ? "..." : "")],
  ];

  for (const [label, value] of sigRows) {
    auditPage.drawText(label + ":", { x: ML + 10, y: ay, font: bold, size: 8, color: CINZA });
    ay -= 12;
    const valLines = wrap(value, reg, 7.8, CW - 24);
    for (const vl of valLines) {
      auditPage.drawText(vl, { x: ML + 18, y: ay, font: reg, size: 7.8, color: TEXTO });
      ay -= 12;
    }
    ay -= 4;
  }

  ay -= 8;
  auditPage.drawLine({ start: { x: ML, y: ay }, end: { x: MR, y: ay }, thickness: 0.5, color: CINZA_L });
  ay -= 20;

  // Imagem da assinatura manuscrita
  auditPage.drawText("IMAGEM DA ASSINATURA MANUSCRITA:", { x: ML, y: ay, font: bold, size: 8.2, color: NAVY });
  ay -= 14;
  auditPage.drawRectangle({ x: ML, y: ay - 72, width: 210, height: 72, borderColor: CINZA_L, borderWidth: 1, color: BRANCO });
  auditPage.drawImage(pngImage, { x: ML + 2, y: ay - 70, width: 206, height: 68 });
  ay -= 90;

  ay -= 12;
  auditPage.drawLine({ start: { x: ML, y: ay }, end: { x: MR, y: ay }, thickness: 0.5, color: CINZA_L });
  ay -= 16;

  // Aviso legal
  auditPage.drawRectangle({
    x: ML, y: ay - 70, width: CW, height: 70,
    color: rgb(0.955, 0.965, 0.985),
    borderColor: rgb(0.76, 0.82, 0.92),
    borderWidth: 0.6,
  });
  auditPage.drawRectangle({ x: ML, y: ay - 70, width: CW, height: 2.5, color: GOLD });
  auditPage.drawText("VALIDADE JURÍDICA", { x: ML + 12, y: ay - 16, font: bold, size: 8.2, color: NAVY });
  const legalTexto = [
    "Este registro de assinatura eletrônica tem plena validade jurídica conforme:",
    "• Art. 10 da MP 2.200-2/2001 — infraestrutura de chaves públicas ICP-Brasil",
    "• Lei nº 14.063/2020 — assinaturas eletrônicas em atos e documentos digitais",
    "• Art. 107 do Código Civil — a forma do ato é livre salvo quando a lei exigir especial",
    "O hash SHA-256 garante a integridade e autenticidade do documento assinado.",
  ];
  let yl = ay - 30;
  for (const lt of legalTexto) {
    auditPage.drawText(lt, { x: ML + 12, y: yl, font: reg, size: 7.5, color: CINZA });
    yl -= 11;
  }

  // Marca d'água
  auditPage.drawText("ASSINADO ELETRONICAMENTE", {
    x: 80, y: 340, font: bold, size: 38,
    color: rgb(0.88, 0.91, 0.96),
    rotate: degrees(35),
    opacity: 0.35,
  });

  // Footer auditoria
  drawFooter(auditPage, reg, pages.length + 1, pages.length + 1);

  // ── Salvar PDF assinado ───────────────────────────────────────────────────
  const signedBytes  = await doc.save();
  const signedBuffer = Buffer.from(signedBytes);
  const hash = crypto.createHash("sha256").update(signedBuffer).digest("hex");

  const fileName = `assinado-${codigoPedido}-${Date.now()}.pdf`;
  const filePath  = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, signedBuffer);

  return { filePath, hash };
}

// ─── Número por extenso ───────────────────────────────────────────────────────
function valorPorExtenso(valor: number): string {
  const n = Math.round(valor);
  const unid = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
    "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const dez  = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const cent = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
    "seiscentos", "setecentos", "oitocentos", "novecentos"];

  function num3(x: number): string {
    if (x === 0) return "";
    if (x === 100) return "cem";
    const c = Math.floor(x / 100);
    const r = x % 100;
    const rStr = r === 0 ? "" : r < 20 ? unid[r] : dez[Math.floor(r / 10)] + (r % 10 ? " e " + unid[r % 10] : "");
    return (c > 0 ? cent[c] + (rStr ? " e " : "") : "") + rStr;
  }

  if (n === 0) return "zero reais";
  const mil  = Math.floor(n / 1000);
  const rest = n % 1000;
  let res = "";
  if (mil > 0) res = mil === 1 ? "mil" : num3(mil) + " mil";
  if (rest > 0) { const rStr = num3(rest); res = res ? res + " e " + rStr : rStr; }
  return res + " reais";
}

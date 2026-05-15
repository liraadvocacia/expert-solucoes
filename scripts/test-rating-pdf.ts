/**
 * Script de teste: gera um Relatório de Rating usando os dados reais
 * extraídos do PDF da KSI Consultas (Giumario da Costa Pereira).
 *
 * Execute com:
 *   npx ts-node --project tsconfig.json scripts/test-rating-pdf.ts
 *
 * O PDF gerado será salvo em uploads/relatorios/ e também copiado para
 * o Desktop para fácil visualização.
 */

import { gerarRelatorioRatingPDF, type DadosRating } from "../lib/rating-pdf";
import path from "path";
import fs from "fs";

const dados: DadosRating = {
  nomeCliente:   "GIUMARIO DA COSTA PEREIRA",
  cpf:           "068.138.776-90",
  dataConsulta:  new Date("2026-05-13"),   // data em que a consulta foi feita no portal parceiro

  classificacao:   "C-",
  descricaoClasse: "Reprovado",

  rendaPresumida:   4296.00,
  comprometimento:  100,
  capacidadeMensal: 0.00,

  pontualidade:    17.41,
  pontualidadeMax: 100,

  pendencias: [
    {
      tipo:   "RGI",
      credor: "Pinheiro Móveis",
      valor:  1190.00,
      dataRef: "—",
    },
    {
      tipo:   "Protesto",
      credor: "Cartório de Protesto de Títulos — Pedro Canário/ES",
      valor:  643.51,
      dataRef: "—",
    },
    {
      tipo:   "SCR — Crédito em Prejuízo",
      credor: "Crédito Pessoal sem Consignação",
      valor:  1920.00,
      dataRef: "—",
    },
  ],

  codigoPedido: "ESP-TESTE",
  nomeServico:  "Rating Bancário",
};

async function main() {
  console.log("⏳ Gerando Relatório de Rating em PDF…");
  const result = await gerarRelatorioRatingPDF(dados);
  console.log("✅ PDF gerado:", result.filePath);
  console.log("   SHA-256:", result.hash);

  // Copia para o Desktop para fácil visualização
  const desktop = path.join(process.env.HOME ?? "/tmp", "Desktop", result.fileName);
  fs.copyFileSync(result.filePath, desktop);
  console.log("📄 Copiado para o Desktop:", desktop);
}

main().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});

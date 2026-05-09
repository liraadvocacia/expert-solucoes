"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSearch,
  TrendingUp,
  Building2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  FileSignature,
  CreditCard,
  Sparkles,
  Loader2,
  Clock,
  MessageCircle,
  User,
  Briefcase,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ServicoId = "limpa-nome" | "rating-bancario" | "bacen";

type ModalidadeLimpaNome = "avista_pix" | "parcelado_cartao" | "boleto_parcelado";
type FaixaRating = "ate_100k" | "100k_300k" | "acima_300k";
type ModalidadeRating = "entrada_50_50" | "6x_cartao";
type ModalidadeBacen = "entrada_50_50" | "6x_cartao";

// ─── Dados de preços ──────────────────────────────────────────────────────────

const LIMPA_NOME_OPCOES: Record<ModalidadeLimpaNome, {
  label: string; sublabel: string; valor: number; entrada: number; restante: number; parcelas: number; forma: string;
}> = {
  avista_pix: {
    label: "À vista — PIX",
    sublabel: "R$ 600,00 em pagamento único",
    valor: 600, entrada: 600, restante: 0, parcelas: 1, forma: "pix",
  },
  parcelado_cartao: {
    label: "4× sem juros no cartão",
    sublabel: "4× R$ 174,75 = R$ 699,00",
    valor: 699, entrada: 0, restante: 699, parcelas: 4, forma: "cartao",
  },
  boleto_parcelado: {
    label: "Entrada + boleto parcelado",
    sublabel: "Entrada R$ 200 + 2× R$ 249,50 (30 e 60 dias)",
    valor: 699, entrada: 200, restante: 499, parcelas: 2, forma: "boleto",
  },
};

const RATING_FAIXAS: Record<FaixaRating, { label: string; sublabel: string; valor: number }> = {
  ate_100k:    { label: "Até R$ 100 mil",              sublabel: "Crédito simples",          valor: 2800 },
  "100k_300k": { label: "Entre R$ 100 mil e R$ 300 mil", sublabel: "Crédito intermediário", valor: 3800 },
  acima_300k:  { label: "Acima de R$ 300 mil",          sublabel: "Crédito robusto",         valor: 5000 },
};

const RATING_PAGAMENTO: Record<ModalidadeRating, { label: string; sublabel: string }> = {
  entrada_50_50: { label: "50% entrada + 50% na conclusão", sublabel: "PIX ou boleto" },
  "6x_cartao":   { label: "Parcelado em 6× no cartão",     sublabel: "Sem juros" },
};

const BACEN_PAGAMENTO: Record<ModalidadeBacen, { label: string; sublabel: string }> = {
  entrada_50_50: { label: "50% entrada + 50% na conclusão", sublabel: "PIX ou boleto" },
  "6x_cartao":   { label: "Parcelado em 6× no cartão",     sublabel: "Sem juros" },
};

const BACEN_VALOR = 3000;

// ─── Serviços base ────────────────────────────────────────────────────────────

const servicos = [
  {
    id: "limpa-nome" as ServicoId,
    icon: FileSearch,
    title: "Limpa Nome",
    description:
      "Regularização completa de restrições no CPF/CNPJ com negociação e baixa dos débitos junto aos órgãos de proteção ao crédito.",
    prazo: "45 dias úteis",
    highlight: "Reprotocolo gratuito",
    includes: [
      "Análise completa das restrições",
      "Negociação com credores",
      "Baixa junto à Serasa, SPC e Boa Vista",
      "Comprovante de regularização",
      "Reprotocolo gratuito em até 3 meses",
    ],
    color: "blue",
  },
  {
    id: "rating-bancario" as ServicoId,
    icon: TrendingUp,
    title: "Rating Bancário",
    description:
      "Diagnóstico e melhoria do seu rating junto às instituições financeiras para acesso a melhores condições de crédito.",
    prazo: "60 dias úteis",
    highlight: null,
    includes: [
      "Diagnóstico completo do rating atual",
      "Planejamento de recuperação de crédito",
      "Contato com instituições financeiras",
      "Acompanhamento do processo",
      "Relatório de evolução",
    ],
    color: "emerald",
  },
  {
    id: "bacen" as ServicoId,
    icon: Building2,
    title: "Serviço BACEN",
    description:
      "Regularização completa da sua situação cadastral e financeira junto ao Banco Central do Brasil.",
    prazo: "90 dias úteis",
    highlight: "Entrada de apenas 50%",
    includes: [
      "Análise da situação no BACEN",
      "Estratégia personalizada de regularização",
      "Elaboração e protocolo de documentação",
      "Acompanhamento completo",
      "Pagamento parcelado ou entrada + conclusão",
    ],
    color: "purple",
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-500",    icon: "text-blue-600",    dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-500", icon: "text-emerald-600", dot: "bg-emerald-500" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-500",  icon: "text-purple-600",  dot: "bg-purple-500" },
};

type Step = "selecao" | "dados";
type TipoPessoa = "pf" | "pj";

// ─── Derivações calculadas ────────────────────────────────────────────────────

function computarPedido(
  servicoId: ServicoId | null,
  modalidadeLN: ModalidadeLimpaNome | null,
  faixaRating: FaixaRating | null,
  modalidadeRating: ModalidadeRating | null,
  modalidadeBacen: ModalidadeBacen | null,
): {
  valor: number; entrada: number; restante: number; parcelas: number;
  modalidade: string; forma: string; faixaCredito?: string; pronto: boolean;
} | null {
  if (!servicoId) return null;

  if (servicoId === "limpa-nome") {
    if (!modalidadeLN) return null;
    const o = LIMPA_NOME_OPCOES[modalidadeLN];
    return { ...o, modalidade: modalidadeLN, forma: o.forma, pronto: true };
  }

  if (servicoId === "rating-bancario") {
    if (!faixaRating || !modalidadeRating) return null;
    const faixa = RATING_FAIXAS[faixaRating];
    const valor = faixa.valor;
    if (modalidadeRating === "6x_cartao") {
      return { valor, entrada: 0, restante: valor, parcelas: 6, modalidade: "6x_cartao", forma: "cartao", faixaCredito: faixaRating, pronto: true };
    }
    // 50/50 via PIX
    const entrada = valor / 2;
    return { valor, entrada, restante: entrada, parcelas: 1, modalidade: "entrada_50_50", forma: "pix", faixaCredito: faixaRating, pronto: true };
  }

  if (servicoId === "bacen") {
    if (!modalidadeBacen) return null;
    if (modalidadeBacen === "6x_cartao") {
      return { valor: BACEN_VALOR, entrada: 0, restante: BACEN_VALOR, parcelas: 6, modalidade: "6x_cartao", forma: "cartao", pronto: true };
    }
    const entrada = BACEN_VALOR / 2;
    return { valor: BACEN_VALOR, entrada, restante: entrada, parcelas: 1, modalidade: "entrada_50_50", forma: "pix", pronto: true };
  }

  return null;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ServicosPage() {
  const router = useRouter();
  const [selected, setSelected]             = useState<ServicoId | null>(null);
  const [step, setStep]                     = useState<Step>("selecao");
  const [loading, setLoading]               = useState(false);
  const [tipoPessoa, setTipoPessoa]         = useState<TipoPessoa>("pf");

  // Modalidades por serviço
  const [modalidadeLN, setModalidadeLN]         = useState<ModalidadeLimpaNome | null>(null);
  const [faixaRating, setFaixaRating]           = useState<FaixaRating | null>(null);
  const [modalidadeRating, setModalidadeRating] = useState<ModalidadeRating | null>(null);
  const [modalidadeBacen, setModalidadeBacen]   = useState<ModalidadeBacen | null>(null);

  const [form, setForm] = useState({
    nome: "", cpf: "", cnpj: "", empresa: "", whatsapp: "", email: "",
  });

  const servico = servicos.find((s) => s.id === selected);
  const pedidoCalc = computarPedido(selected, modalidadeLN, faixaRating, modalidadeRating, modalidadeBacen);

  const selecaoCompleta = pedidoCalc?.pronto === true;

  const camposValidos =
    tipoPessoa === "pf"
      ? form.nome && form.cpf && form.whatsapp && form.email
      : form.empresa && form.cnpj && form.nome && form.whatsapp && form.email;

  const handleSubmit = async () => {
    if (!camposValidos || !servico || !pedidoCalc) return;
    setLoading(true);
    try {
      const payload = {
        nome: form.nome,
        cpf: tipoPessoa === "pf" ? form.cpf : form.cpf || form.cnpj,
        cnpj: tipoPessoa === "pj" ? form.cnpj : undefined,
        empresa: tipoPessoa === "pj" ? form.empresa : undefined,
        whatsapp: form.whatsapp,
        email: form.email || undefined,
        servico: servico.title,
        valor: pedidoCalc.valor,
        entrada: pedidoCalc.entrada,
        modalidade: pedidoCalc.modalidade,
        parcelas: pedidoCalc.parcelas,
        faixaCredito: pedidoCalc.faixaCredito,
      };

      const res = await fetch("/api/servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Erro ao criar pedido.");
        return;
      }

      const data = await res.json();
      router.push(`/assinar/${data.signingToken}`);
    } catch {
      alert("Erro ao criar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  // ─── Label de pagamento para o resumo ─────────────────────────────────────

  const labelPagamento = (() => {
    if (!pedidoCalc) return "";
    if (pedidoCalc.forma === "pix" && pedidoCalc.entrada === pedidoCalc.valor) return "PIX à vista";
    if (pedidoCalc.forma === "cartao") return `Cartão de crédito em ${pedidoCalc.parcelas}×`;
    if (pedidoCalc.forma === "boleto") return "Boleto bancário parcelado";
    if (pedidoCalc.forma === "pix" && pedidoCalc.entrada < pedidoCalc.valor) return "PIX (50% entrada + 50% na conclusão)";
    return "";
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-800 pt-8 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-navy-100 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === "selecao" ? "Escolha o serviço" : "Informe seus dados"}
          </h1>
          <p className="text-navy-100">
            {step === "selecao"
              ? "Selecione o serviço e a forma de pagamento ideal para você."
              : "Preencha os dados abaixo para gerar seu pedido e contrato."}
          </p>
          {/* Steps */}
          <div className="flex items-center gap-3 mt-6">
            {[
              { label: "Serviço",  n: "1", active: step === "selecao" },
              { label: "Dados",    n: "2", active: step === "dados" },
              { label: "Contrato", n: "3", active: false },
            ].map((s, i) => (
              <span key={s.n} className="flex items-center gap-2">
                {i > 0 && <span className="w-6 h-px bg-white/20" />}
                <span className={`flex items-center gap-1.5 text-xs font-medium ${s.active ? "text-gold-400" : "text-navy-100/50"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${s.active ? "bg-gold-500 text-white" : "bg-white/20 text-white"}`}>{s.n}</span>
                  {s.label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conteúdo principal */}
          <div className="lg:col-span-2">
            {step === "selecao" ? (
              <div className="flex flex-col gap-4">
                {servicos.map((s) => {
                  const isSelected = selected === s.id;
                  const colors = colorMap[s.color];

                  return (
                    <div
                      key={s.id}
                      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                        isSelected ? `${colors.border} shadow-md` : "border-gray-200"
                      }`}
                    >
                      {/* Linha principal — clicável */}
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelected(null);
                          } else {
                            setSelected(s.id);
                            // Reset modalidades dos outros
                            setModalidadeLN(null);
                            setFaixaRating(null);
                            setModalidadeRating(null);
                            setModalidadeBacen(null);
                          }
                        }}
                        className="w-full text-left p-5"
                      >
                        <div className="flex items-start gap-4">
                          {/* Radio */}
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? `${colors.border} bg-white` : "border-gray-300"}`}>
                            {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />}
                          </div>
                          <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shrink-0`}>
                            <s.icon className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <h3 className="font-semibold text-navy-800">{s.title}</h3>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {s.highlight && (
                                    <span className="flex items-center gap-1 text-xs text-gold-500 font-medium">
                                      <Sparkles className="w-3 h-3" />
                                      {s.highlight}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {s.prazo}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">{s.description}</p>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {s.includes.map((item) => (
                                <li key={item} className="flex items-start gap-1.5 text-xs text-gray-600">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </button>

                      {/* ── Painel expandido por serviço ─────────────────── */}
                      {isSelected && (
                        <div className="border-t border-gray-100 px-5 pb-5 pt-4">

                          {/* LIMPA NOME — 3 modalidades */}
                          {s.id === "limpa-nome" && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Escolha a forma de pagamento
                              </p>
                              <div className="flex flex-col gap-2">
                                {(Object.entries(LIMPA_NOME_OPCOES) as [ModalidadeLimpaNome, typeof LIMPA_NOME_OPCOES[ModalidadeLimpaNome]][]).map(([key, opt]) => (
                                  <button
                                    key={key}
                                    onClick={() => setModalidadeLN(key)}
                                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                      modalidadeLN === key
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${modalidadeLN === key ? "border-blue-500" : "border-gray-300"}`}>
                                      {modalidadeLN === key && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-navy-800">{opt.label}</p>
                                      <p className="text-xs text-gray-500">{opt.sublabel}</p>
                                    </div>
                                    <span className="ml-auto text-sm font-bold text-navy-800 shrink-0">
                                      {formatCurrency(opt.valor)}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* RATING BANCÁRIO — faixa + pagamento */}
                          {s.id === "rating-bancario" && (
                            <div className="flex flex-col gap-4">
                              {/* Aviso comprovação de renda */}
                              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                  <strong>Importante:</strong> para melhorarmos o seu rating é fundamental que você comprove renda — tenha em mãos contracheques, declaração de IR ou extratos bancários.
                                </p>
                              </div>

                              {/* Faixa de crédito */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  Qual faixa de crédito você busca?
                                </p>
                                <div className="flex flex-col gap-2">
                                  {(Object.entries(RATING_FAIXAS) as [FaixaRating, typeof RATING_FAIXAS[FaixaRating]][]).map(([key, faixa]) => (
                                    <button
                                      key={key}
                                      onClick={() => setFaixaRating(key)}
                                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                        faixaRating === key
                                          ? "border-emerald-500 bg-emerald-50"
                                          : "border-gray-200 hover:border-gray-300"
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${faixaRating === key ? "border-emerald-500" : "border-gray-300"}`}>
                                        {faixaRating === key && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-navy-800">{faixa.label}</p>
                                        <p className="text-xs text-gray-500">{faixa.sublabel}</p>
                                      </div>
                                      <span className="ml-auto text-sm font-bold text-navy-800 shrink-0">
                                        {formatCurrency(faixa.valor)}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Forma de pagamento */}
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  Forma de pagamento
                                </p>
                                <div className="flex flex-col gap-2">
                                  {(Object.entries(RATING_PAGAMENTO) as [ModalidadeRating, typeof RATING_PAGAMENTO[ModalidadeRating]][]).map(([key, pag]) => {
                                    const valorBase = faixaRating ? RATING_FAIXAS[faixaRating].valor : 0;
                                    const desc = key === "6x_cartao" && valorBase
                                      ? `6× ${formatCurrency(valorBase / 6)}`
                                      : key === "entrada_50_50" && valorBase
                                      ? `Entrada ${formatCurrency(valorBase / 2)} + ${formatCurrency(valorBase / 2)} na conclusão`
                                      : pag.sublabel;
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => setModalidadeRating(key)}
                                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                          modalidadeRating === key
                                            ? "border-emerald-500 bg-emerald-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                      >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${modalidadeRating === key ? "border-emerald-500" : "border-gray-300"}`}>
                                          {modalidadeRating === key && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-navy-800">{pag.label}</p>
                                          <p className="text-xs text-gray-500">{desc}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* BACEN — forma de pagamento */}
                          {s.id === "bacen" && (
                            <div>
                              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-4">
                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800">
                                  Investimento: <strong>R$ 3.000,00</strong> — escolha como prefere pagar.
                                </p>
                              </div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Forma de pagamento
                              </p>
                              <div className="flex flex-col gap-2">
                                {(Object.entries(BACEN_PAGAMENTO) as [ModalidadeBacen, typeof BACEN_PAGAMENTO[ModalidadeBacen]][]).map(([key, pag]) => {
                                  const desc = key === "6x_cartao"
                                    ? `6× ${formatCurrency(BACEN_VALOR / 6)}`
                                    : `Entrada ${formatCurrency(BACEN_VALOR / 2)} + ${formatCurrency(BACEN_VALOR / 2)} na conclusão`;
                                  return (
                                    <button
                                      key={key}
                                      onClick={() => setModalidadeBacen(key)}
                                      className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                                        modalidadeBacen === key
                                          ? "border-purple-500 bg-purple-50"
                                          : "border-gray-200 hover:border-gray-300"
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${modalidadeBacen === key ? "border-purple-500" : "border-gray-300"}`}>
                                        {modalidadeBacen === key && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-navy-800">{pag.label}</p>
                                        <p className="text-xs text-gray-500">{desc}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Step 2: dados ── */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-navy-800 mb-4">Dados do contratante</h3>

                {/* Tipo de pessoa */}
                <div className="flex gap-3 mb-5">
                  {([["pf", "Pessoa Física", User], ["pj", "Pessoa Jurídica", Briefcase]] as const).map(([tipo, label, Icon]) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoPessoa(tipo as TipoPessoa)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        tipoPessoa === tipo
                          ? "border-navy-700 bg-navy-50 text-navy-800"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tipoPessoa === "pj" && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Razão Social *</label>
                        <input type="text" value={form.empresa} onChange={f("empresa")} placeholder="Nome da empresa"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">CNPJ *</label>
                        <input type="text" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0001-00"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                      </div>
                    </>
                  )}
                  <div className={tipoPessoa === "pj" ? "" : "sm:col-span-2"}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {tipoPessoa === "pj" ? "Nome do Responsável *" : "Nome completo *"}
                    </label>
                    <input type="text" value={form.nome} onChange={f("nome")} placeholder="Nome completo"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CPF {tipoPessoa === "pf" ? "*" : "(responsável)"}</label>
                    <input type="text" value={form.cpf} onChange={f("cpf")} placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                      WhatsApp *
                    </label>
                    <input type="text" value={form.whatsapp} onChange={f("whatsapp")} placeholder="(00) 90000-0000"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">E-mail * <span className="text-[10px] text-blue-600 font-medium">(confirmação de pagamento)</span></label>
                    <input type="email" value={form.email} onChange={f("email")} placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>
                </div>

                <div className="mt-6">
                  <button onClick={() => setStep("selecao")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-800 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Resumo lateral ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-6">
              <h3 className="font-semibold text-navy-800 mb-4">Resumo do serviço</h3>

              {!servico || !pedidoCalc ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {!servico
                    ? "Selecione um serviço ao lado"
                    : "Complete as opções de pagamento"}
                </p>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="font-medium text-navy-800 text-sm mb-1">{servico.title}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <Clock className="w-3 h-3" />
                      Prazo: {servico.prazo}
                    </div>

                    {/* Resumo financeiro */}
                    {pedidoCalc.entrada > 0 && pedidoCalc.entrada < pedidoCalc.valor ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Entrada</span>
                          <span className="font-semibold text-navy-800">{formatCurrency(pedidoCalc.entrada)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Restante na conclusão</span>
                          <span className="font-semibold text-navy-800">{formatCurrency(pedidoCalc.restante)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between">
                          <span className="font-semibold text-navy-800 text-sm">Total</span>
                          <span className="font-bold text-navy-800">{formatCurrency(pedidoCalc.valor)}</span>
                        </div>
                      </div>
                    ) : pedidoCalc.parcelas > 1 ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{pedidoCalc.parcelas}× de</span>
                          <span className="font-semibold text-navy-800">
                            {formatCurrency(pedidoCalc.valor / pedidoCalc.parcelas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Total</span>
                          <span>{formatCurrency(pedidoCalc.valor)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total à vista</span>
                        <span className="font-bold text-navy-800 text-lg">{formatCurrency(pedidoCalc.valor)}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    {labelPagamento}
                  </div>
                </>
              )}

              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">Próximos passos:</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    { icon: FileSignature, text: "Preenchimento dos dados" },
                    { icon: FileSignature, text: "Assinatura do contrato" },
                    { icon: CreditCard,    text: "Pagamento da entrada" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-xs text-gray-600">
                      <item.icon className="w-3.5 h-3.5 text-navy-600" />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              {step === "selecao" ? (
                <button
                  disabled={!selecaoCompleta}
                  onClick={() => setStep("dados")}
                  className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Prosseguir
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={loading || !camposValidos}
                  onClick={handleSubmit}
                  className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Confirmar pedido
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Contrato válido pelo ICP-Brasil
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

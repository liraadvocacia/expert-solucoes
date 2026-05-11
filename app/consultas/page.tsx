"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSearch,
  TrendingUp,
  Building2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Plus,
  Minus,
  MessageCircle,
  Zap,
  User,
  Briefcase,
  X,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const tiposConsulta = [
  {
    id: "nome-sujo",
    icon: FileSearch,
    title: "Consulta Nome Sujo",
    description: "Verificação completa de restrições no CPF/CNPJ junto ao SERASA, SPC, Boa Vista e Protestos em Cartório.",
    price: 49.9,
    includes: ["Situação junto à SERASA, SPC e Boa Vista", "Protestos em Cartório", "Análise de pendências financeiras", "Relatório exclusivo Expert"],
    color: "blue",
  },
  {
    id: "rating",
    icon: TrendingUp,
    title: "Consulta Rating",
    description: "Análise completa do score e rating bancário para entender seu perfil perante as instituições financeiras.",
    price: 79.9,
    includes: ["Score atual e histórico", "Rating bancário detalhado", "Análise de perfil de crédito"],
    color: "emerald",
  },
  {
    id: "bacen",
    icon: Building2,
    title: "Consulta BACEN",
    description: "Consulta detalhada da sua situação cadastral e financeira junto ao Banco Central do Brasil.",
    price: 99.0,
    includes: ["Situação no Cadastro do Sistema Financeiro", "Histórico de operações", "Pendências no BACEN"],
    color: "purple",
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-500",    icon: "text-blue-600",    dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-500", icon: "text-emerald-600", dot: "bg-emerald-500" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-500",  icon: "text-purple-600",  dot: "bg-purple-500" },
};

interface PessoaItem {
  nome: string;
  cpf: string;
}

interface ConsultaSelecionada {
  tipo: typeof tiposConsulta[0];
  quantidade: number;
  pessoas: PessoaItem[];
}

type Step = "selecao" | "dados";
type TipoPessoa = "pf" | "pj";

export default function ConsultasPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("selecao");
  const [loading, setLoading]   = useState(false);
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>("pf");

  // Mapa de consultas selecionadas: id → ConsultaSelecionada
  const [selecionadas, setSelecionadas] = useState<Record<string, ConsultaSelecionada>>({});

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    cnpj: "",
    empresa: "",
    whatsapp: "",
    email: "",
  });

  // ── Manipulação de seleção ─────────────────────────────────────────────────
  const toggleConsulta = (id: string) => {
    setSelecionadas((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const tipo = tiposConsulta.find((c) => c.id === id)!;
      return {
        ...prev,
        [id]: { tipo, quantidade: 1, pessoas: [{ nome: "", cpf: "" }] },
      };
    });
  };

  const setQuantidade = (id: string, delta: number) => {
    setSelecionadas((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const novaQtd = Math.max(1, item.quantidade + delta);
      const novasPessoas = [...item.pessoas];
      while (novasPessoas.length < novaQtd) novasPessoas.push({ nome: "", cpf: "" });
      while (novasPessoas.length > novaQtd) novasPessoas.pop();
      return { ...prev, [id]: { ...item, quantidade: novaQtd, pessoas: novasPessoas } };
    });
  };

  const setPessoa = (id: string, idx: number, field: keyof PessoaItem, value: string) => {
    setSelecionadas((prev) => {
      const item = prev[id];
      if (!item) return prev;
      const novasPessoas = item.pessoas.map((p, i) => i === idx ? { ...p, [field]: value } : p);
      return { ...prev, [id]: { ...item, pessoas: novasPessoas } };
    });
  };

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const itensLista = Object.values(selecionadas);
  const total = itensLista.reduce((acc, s) => acc + s.tipo.price * s.quantidade, 0);
  const totalItens = itensLista.reduce((acc, s) => acc + s.quantidade, 0);

  const camposValidos =
    tipoPessoa === "pf"
      ? form.nome && form.cpf && form.whatsapp && form.email
      : form.empresa && form.cnpj && form.nome && form.whatsapp && form.email;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!camposValidos || itensLista.length === 0) return;
    setLoading(true);
    try {
      // Flatten: cada pessoa vira um item separado
      const itens = itensLista.flatMap((s) =>
        s.pessoas.map((p) => ({
          nome: `${s.tipo.title}${s.quantidade > 1 ? ` – ${p.nome || form.nome}` : ""}`,
          valor: s.tipo.price,
          pessoaNome: p.nome || form.nome,
          pessoaCpf: p.cpf || form.cpf,
        }))
      );

      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          cpf: tipoPessoa === "pf" ? form.cpf : form.cpf || form.cnpj,
          cnpj: tipoPessoa === "pj" ? form.cnpj : undefined,
          empresa: tipoPessoa === "pj" ? form.empresa : undefined,
          whatsapp: form.whatsapp,
          email: form.email || undefined,
          itens,
        }),
      });
      const data = await res.json();
      router.push(`/pagamento?pedidoId=${data.id}&codigo=${data.codigo}&tipo=consulta`);
    } catch {
      alert("Erro ao criar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

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
            {step === "selecao" ? "Selecione suas consultas" : "Informe seus dados"}
          </h1>
          <p className="text-navy-100">
            {step === "selecao"
              ? "Escolha uma ou mais consultas. Resultado enviado via WhatsApp em até 24 horas."
              : "Preencha os dados abaixo para gerar seu pedido."}
          </p>

          {/* Aviso de prazo */}
          {step === "selecao" && (
            <div className="mt-4 inline-flex items-center gap-2 bg-gold-500/15 border border-gold-400/30 rounded-xl px-4 py-2">
              <Clock className="w-4 h-4 text-gold-400 shrink-0" />
              <span className="text-sm text-gold-300 font-medium">
                Resultado entregue via WhatsApp em até <strong className="text-gold-200">24 horas</strong> após a confirmação do pagamento
              </span>
            </div>
          )}

          {/* Steps */}
          <div className="flex items-center gap-3 mt-5">
            {[
              { label: "Consultas", n: "1", active: step === "selecao" },
              { label: "Dados",     n: "2", active: step === "dados" },
              { label: "Pagamento", n: "3", active: false },
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
          <div className="lg:col-span-2 flex flex-col gap-4">
            {step === "selecao" ? (
              /* ── Step 1: seleção de consultas ── */
              <>
                {tiposConsulta.map((c) => {
                  const sel = selecionadas[c.id];
                  const isSelected = !!sel;
                  const colors = colorMap[c.color];

                  return (
                    <div
                      key={c.id}
                      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                        isSelected ? `${colors.border} shadow-md` : "border-gray-200"
                      }`}
                    >
                      {/* Linha principal */}
                      <button
                        onClick={() => toggleConsulta(c.id)}
                        className="w-full text-left p-5"
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? `${colors.border.replace("border-", "bg-").replace("-500", "-500")} border-transparent` : "border-gray-300"}`}>
                            {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center shrink-0`}>
                            <c.icon className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-navy-800">{c.title}</h3>
                              <span className="text-lg font-bold text-navy-800 shrink-0">
                                {formatCurrency(c.price)}
                                <span className="text-xs font-normal text-gray-400"> /pessoa</span>
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{c.description}</p>
                            <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
                              {c.includes.map((item) => (
                                <li key={item} className="flex items-center gap-1 text-xs text-gray-500">
                                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} shrink-0`} />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </button>

                      {/* Seção expandida quando selecionado */}
                      {isSelected && sel && (
                        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                          {/* Controle de quantidade */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Quantidade de pessoas</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setQuantidade(c.id, -1)}
                                disabled={sel.quantidade <= 1}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-navy-600 hover:text-navy-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center font-semibold text-navy-800 text-sm">{sel.quantidade}</span>
                              <button
                                onClick={() => setQuantidade(c.id, +1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-navy-600 hover:text-navy-700 transition-all"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm text-gray-500 ml-1">
                                = {formatCurrency(c.price * sel.quantidade)}
                              </span>
                            </div>
                          </div>

                          {/* Dados individuais por pessoa (somente se quantidade > 1) */}
                          {sel.quantidade > 1 && (
                            <div className="flex flex-col gap-3">
                              <p className="text-xs text-gray-500 font-medium">Informe os dados de cada pessoa (opcional — deixe em branco para usar seus dados):</p>
                              {sel.pessoas.map((pessoa, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl p-3 flex gap-3 items-start">
                                  <span className={`w-5 h-5 rounded-full ${colors.dot} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1`}>{idx + 1}</span>
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={pessoa.nome}
                                      onChange={(e) => setPessoa(c.id, idx, "nome", e.target.value)}
                                      placeholder={`Nome da pessoa ${idx + 1}`}
                                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-navy-600 bg-white"
                                    />
                                    <input
                                      type="text"
                                      value={pessoa.cpf}
                                      onChange={(e) => setPessoa(c.id, idx, "cpf", e.target.value)}
                                      placeholder="CPF (000.000.000-00)"
                                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-navy-600 bg-white"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              /* ── Step 2: dados do solicitante ── */
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                {/* Aviso 24h */}
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-5">
                  <MessageCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800">
                    O resultado da sua consulta será enviado via <strong>WhatsApp</strong> em até <strong>24 horas</strong> após a confirmação do pagamento PIX.
                  </p>
                </div>

                <h3 className="font-semibold text-navy-800 mb-4">Dados do solicitante</h3>

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
                    <input type="text" value={form.nome} onChange={f("nome")} placeholder="Seu nome completo"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CPF *</label>
                    <input type="text" value={form.cpf} onChange={f("cpf")} placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600" />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                      WhatsApp * <span className="text-[10px] text-green-600 font-medium">(para envio do relatório)</span>
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

                {/* Resumo das consultas selecionadas */}
                {itensLista.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-2">Consultas selecionadas:</p>
                    <div className="flex flex-col gap-1">
                      {itensLista.map((s) => (
                        <div key={s.tipo.id} className="flex items-center justify-between text-xs text-gray-600">
                          <span>{s.tipo.title} × {s.quantidade}</span>
                          <span className="font-medium text-navy-800">{formatCurrency(s.tipo.price * s.quantidade)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button onClick={() => setStep("selecao")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-800 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumo lateral */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-6">
              <h3 className="font-semibold text-navy-800 mb-4">Resumo do pedido</h3>

              {itensLista.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  Selecione ao menos uma consulta
                </p>
              ) : (
                <div className="flex flex-col gap-2 mb-4">
                  {itensLista.map((s) => (
                    <div key={s.tipo.id} className="flex items-start justify-between text-sm">
                      <div>
                        <span className="text-gray-700 font-medium">{s.tipo.title}</span>
                        {s.quantidade > 1 && (
                          <span className="text-xs text-gray-400 block">× {s.quantidade} pessoas</span>
                        )}
                      </div>
                      <span className="font-medium text-navy-800 shrink-0 ml-2">
                        {formatCurrency(s.tipo.price * s.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 mb-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-navy-800">Total</span>
                  <span className="text-2xl font-bold text-navy-800">{formatCurrency(total)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {totalItens > 0 ? `${totalItens} consulta${totalItens > 1 ? "s" : ""} • ` : ""}Pagamento via PIX
                </p>
              </div>

              {step === "selecao" ? (
                <button
                  disabled={itensLista.length === 0}
                  onClick={() => setStep("dados")}
                  className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
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

              <div className="mt-5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Dados protegidos pela LGPD
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Zap className="w-4 h-4 text-gold-500" />
                  Relatório em até 24h via WhatsApp
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

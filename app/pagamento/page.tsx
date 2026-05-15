"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy, Check, RefreshCw, QrCode, Clock, CheckCircle2,
  AlertCircle, ArrowLeft, Smartphone, CreditCard, FileText,
  ExternalLink, Loader2, FileSignature, Lock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Forma = "pix" | "cartao" | "boleto" | "boleto_pix";

type PagamentoState =
  | { fase: "seletor" }
  | { fase: "carregando" }
  | { fase: "erro"; mensagem: string }
  | { fase: "pix"; emv: string; qrUrl: string | null; valor: number }
  | { fase: "boleto"; boletoUrl: string | null; valor: number }
  | { fase: "boleto_pix"; emv: string; qrUrl: string | null; boletoUrl: string | null; valor: number }
  | { fase: "cartao"; checkoutUrl: string | null; valor: number; parcelas: number }
  | { fase: "pago" };

// ─── Componente interno (usa useSearchParams) ─────────────────────────────────

function PagamentoContent() {
  const params      = useSearchParams();
  const router      = useRouter();
  const pedidoId    = params.get("pedidoId");
  const codigo      = params.get("codigo");
  const formaParam  = params.get("forma") as Forma | null;   // pix | cartao | boleto
  const valorParam  = params.get("valor");
  const parcelasParam = params.get("parcelas");
  const tipoParam   = params.get("tipo");  // "consulta" | null

  const [state, setState]   = useState<PagamentoState>({ fase: "seletor" });
  const [formaAtual, setFormaAtual] = useState<Forma | null>(null);
  const [copiado, setCopiado]       = useState(false);
  const [modalidade, setModalidade] = useState<string | null>(null);

  // ── Verificação de contrato não assinado ──────────────────────────────────
  const [contratoNaoAssinado, setContratoNaoAssinado] = useState<{
    signingToken: string;
  } | null>(null);
  const [verificandoContrato, setVerificandoContrato] = useState(false);

  useEffect(() => {
    // Só bloqueia para serviços (tipo !== "consulta")
    if (!pedidoId || tipoParam === "consulta") return;
    setVerificandoContrato(true);
    fetch(`/api/pedidos/${pedidoId}`)
      .then((r) => r.json())
      .then((pedido) => {
        // Verifica contrato assinado
        const contrato = pedido?.contrato;
        if (contrato && contrato.status !== "assinado" && contrato.signingToken) {
          setContratoNaoAssinado({ signingToken: contrato.signingToken });
        }
        // Captura modalidade e dispara automaticamente para cartão
        const mod: string | null = pedido?.modalidade ?? null;
        setModalidade(mod);
        if (mod === "parcelado_cartao" || mod === "6x_cartao") {
          setFormaAtual("cartao");
        }
      })
      .catch(() => { /* continua normalmente se falhar */ })
      .finally(() => setVerificandoContrato(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  // ── Verificação de pagamento (poll) ────────────────────────────────────────

  const verificarPagamento = useCallback(async () => {
    if (!pedidoId) return;
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`);
      const data = await res.json();
      if (data.status === "em_andamento" || data.status === "concluido") {
        router.push(`/confirmacao?pedidoId=${pedidoId}&codigo=${codigo ?? ""}`);
      }
    } catch { /* silencioso */ }
  }, [pedidoId, codigo, router]);

  // ── Gerar PIX ─────────────────────────────────────────────────────────────

  const gerarPix = useCallback(async () => {
    if (!pedidoId) { setState({ fase: "erro", mensagem: "pedidoId ausente." }); return; }
    setState({ fase: "carregando" });
    try {
      const res  = await fetch("/api/pagamento/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ fase: "erro", mensagem: data.error ?? "Erro ao gerar PIX." }); return; }
      setState({ fase: "pix", emv: data.emv, qrUrl: data.qrUrl, valor: data.valor });
    } catch { setState({ fase: "erro", mensagem: "Erro de conexão." }); }
  }, [pedidoId]);

  // ── Gerar Boleto ──────────────────────────────────────────────────────────

  const gerarBoleto = useCallback(async () => {
    if (!pedidoId) { setState({ fase: "erro", mensagem: "pedidoId ausente." }); return; }
    setState({ fase: "carregando" });
    try {
      const res  = await fetch("/api/pagamento/boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ fase: "erro", mensagem: data.error ?? "Erro ao gerar boleto." }); return; }
      setState({ fase: "boleto", boletoUrl: data.boletoUrl, valor: data.valor });
    } catch { setState({ fase: "erro", mensagem: "Erro de conexão." }); }
  }, [pedidoId]);

  // ── Gerar Boleto + PIX ────────────────────────────────────────────────────

  const gerarBoletoComPix = useCallback(async () => {
    if (!pedidoId) { setState({ fase: "erro", mensagem: "pedidoId ausente." }); return; }
    setState({ fase: "carregando" });
    try {
      const res  = await fetch("/api/pagamento/boleto-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ fase: "erro", mensagem: data.error ?? "Erro ao gerar cobrança." }); return; }
      setState({ fase: "boleto_pix", emv: data.emv ?? "", qrUrl: data.qrUrl, boletoUrl: data.boletoUrl, valor: data.valor });
    } catch { setState({ fase: "erro", mensagem: "Erro de conexão." }); }
  }, [pedidoId]);

  // ── Gerar Cartão ──────────────────────────────────────────────────────────

  const gerarCartao = useCallback(async () => {
    if (!pedidoId) { setState({ fase: "erro", mensagem: "pedidoId ausente." }); return; }
    setState({ fase: "carregando" });
    try {
      const res  = await fetch("/api/pagamento/cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ fase: "erro", mensagem: data.error ?? "Erro ao gerar cobrança." }); return; }
      setState({ fase: "cartao", checkoutUrl: data.checkoutUrl, valor: data.valor, parcelas: data.parcelas ?? 1 });
    } catch { setState({ fase: "erro", mensagem: "Erro de conexão." }); }
  }, [pedidoId]);

  // Dispara cobrança quando forma é selecionada
  useEffect(() => {
    if (!formaAtual) return;
    if (formaAtual === "pix")        gerarPix();
    if (formaAtual === "boleto")     gerarBoleto();
    if (formaAtual === "boleto_pix") gerarBoletoComPix();
    if (formaAtual === "cartao")     gerarCartao();
  }, [formaAtual, gerarPix, gerarBoleto, gerarBoletoComPix, gerarCartao]);

  // Poll a cada 10s (PIX, Boleto e Boleto+PIX)
  useEffect(() => {
    if (state.fase !== "pix" && state.fase !== "boleto" && state.fase !== "boleto_pix") return;
    const interval = setInterval(verificarPagamento, 10_000);
    return () => clearInterval(interval);
  }, [state.fase, verificarPagamento]);

  const copiarCodigo = async () => {
    if (state.fase !== "pix") return;
    await navigator.clipboard.writeText(state.emv);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const valorExibido = valorParam ? parseFloat(valorParam) : null;
  const parcelasExibido = parcelasParam ? parseInt(parcelasParam) : null;

  // ─── Título da página ────────────────────────────────────────────────────

  const tituloForma = (() => {
    if (!formaAtual) return "Pagamento";
    if (formaAtual === "pix")        return "Pagamento via PIX";
    if (formaAtual === "cartao")     return "Pagamento via Cartão";
    if (formaAtual === "boleto_pix") return "Boleto + PIX";
    if (formaAtual === "boleto")     return "Pagamento via Boleto";
    return "Pagamento";
  })();


  // ── Bloqueia pagamento se contrato ainda não foi assinado ────────────────
  if (verificandoContrato) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  if (contratoNaoAssinado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <FileSignature className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-navy-800 mb-3">
            Assine o contrato primeiro
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Para prosseguir com o pagamento, é necessário ler e assinar o
            contrato de prestação de serviços. A assinatura é digital e leva
            menos de 1 minuto.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-2 text-left">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              O pagamento só é liberado após a confirmação da assinatura,
              garantindo segurança jurídica para ambas as partes.
            </p>
          </div>
          <a
            href={`/assinar/${contratoNaoAssinado.signingToken}`}
            className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
          >
            <FileSignature className="w-4 h-4" />
            Ir para assinatura do contrato
          </a>
          {codigo && (
            <p className="text-xs text-gray-400 mt-4 font-mono">Pedido: {codigo}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-800 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-navy-100 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-white font-semibold text-sm">{tituloForma}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ─── Seletor de forma (sem ?forma= na URL) ──────────────────────── */}
        {state.fase === "seletor" && !formaAtual && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center mb-2">
              <p className="text-xs text-gray-500 mb-1">Valor da entrada</p>
              <p className="text-4xl font-bold text-navy-800">
                {valorExibido ? formatCurrency(valorExibido) : "—"}
              </p>
              {parcelasExibido && parcelasExibido > 1 && valorExibido && (
                <p className="text-sm text-gray-500 mt-1">
                  {parcelasExibido}× de {formatCurrency(valorExibido / parcelasExibido)}
                </p>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-700 text-center">Escolha a forma de pagamento</p>

            {([
              { forma: "pix" as Forma,        icon: QrCode,   label: "PIX",          desc: "Aprovação instantânea" },
              { forma: "boleto_pix" as Forma, icon: FileText, label: "Boleto + PIX",  desc: "Pague pelo PIX ou pelo boleto bancário" },
            ] as { forma: Forma; icon: React.ElementType; label: string; desc: string }[]).map(({ forma, icon: Icon, label, desc }) => (
              <button
                key={forma}
                onClick={() => setFormaAtual(forma)}
                className="bg-white rounded-2xl border-2 border-gray-200 hover:border-navy-500 shadow-sm p-5 flex items-center gap-4 text-left transition-all"
              >
                <div className="w-11 h-11 bg-navy-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-navy-700" />
                </div>
                <div>
                  <p className="font-semibold text-navy-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {/* ─── Carregando ─────────────────────────────────────────────────── */}
        {state.fase === "carregando" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <Loader2 className="w-8 h-8 text-navy-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Gerando sua cobrança...</p>
          </div>
        )}

        {/* ─── Erro ───────────────────────────────────────────────────────── */}
        {state.fase === "erro" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="font-bold text-navy-800 mb-2">Não foi possível gerar a cobrança</h2>
            <p className="text-sm text-gray-500 mb-6">{state.mensagem}</p>
            <button
              onClick={() => { setState({ fase: "seletor" }); setFormaAtual(null); }}
              className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* ─── PIX ────────────────────────────────────────────────────────── */}
        {state.fase === "pix" && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 mb-1">Valor a pagar</p>
              <p className="text-4xl font-bold text-navy-800">{formatCurrency(state.valor)}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                Válido por 3 dias
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">QR Code PIX</h3>
              </div>
              {state.qrUrl ? (
                <div className="flex justify-center mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.qrUrl} alt="QR Code PIX" className="w-48 h-48 rounded-xl border border-gray-100" />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <p className="text-xs text-center text-gray-400 mb-4">Abra o app do seu banco e escaneie o QR Code</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">PIX Copia e Cola</h3>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs font-mono text-gray-600 break-all leading-relaxed max-h-24 overflow-y-auto">
                {state.emv}
              </div>
              <button
                onClick={copiarCodigo}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  copiado ? "bg-emerald-500 text-white" : "bg-navy-800 hover:bg-navy-700 text-white"
                }`}
              >
                {copiado ? <><Check className="w-4 h-4" />Código copiado!</> : <><Copy className="w-4 h-4" />Copiar código PIX</>}
              </button>
            </div>

            <div className="bg-navy-800 rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold text-gold-400 mb-3 uppercase tracking-wide">Como pagar</p>
              <ol className="flex flex-col gap-2.5 text-xs text-navy-100">
                {[
                  "Abra o aplicativo do seu banco",
                  "Acesse a área PIX e escolha \"Pagar\"",
                  "Escaneie o QR Code ou cole o código acima",
                  `Confirme o pagamento de ${formatCurrency(state.valor)}`,
                  "Pronto! Você receberá a confirmação em instantes",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-center text-xs text-gray-400">Esta página atualiza automaticamente após o pagamento.</p>
          </div>
        )}

        {/* ─── Boleto ─────────────────────────────────────────────────────── */}
        {state.fase === "boleto" && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 mb-1">Valor a pagar</p>
              <p className="text-4xl font-bold text-navy-800">{formatCurrency(state.valor)}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                Vencimento em 3 dias
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">Boleto Bancário</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Clique no botão abaixo para abrir ou baixar o boleto. Pague em qualquer banco, lotérica ou pelo seu internet banking.
              </p>
              {state.boletoUrl ? (
                <a
                  href={state.boletoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir boleto
                </a>
              ) : (
                <div className="text-center text-sm text-gray-400">URL do boleto não disponível. Entre em contato.</div>
              )}
            </div>

            <div className="bg-navy-800 rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold text-gold-400 mb-3 uppercase tracking-wide">Instruções</p>
              <ol className="flex flex-col gap-2.5 text-xs text-navy-100">
                {[
                  "Clique em \"Abrir boleto\" acima",
                  "Imprima ou salve o PDF",
                  "Pague em qualquer banco, lotérica ou app",
                  "A compensação ocorre em até 3 dias úteis",
                  "Você receberá confirmação via WhatsApp",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-center text-xs text-gray-400">Esta página atualiza automaticamente após a confirmação do pagamento.</p>
          </div>
        )}

        {/* ─── Boleto + PIX ───────────────────────────────────────────────── */}
        {state.fase === "boleto_pix" && (
          <div className="flex flex-col gap-4">
            {/* Valor */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 mb-1">Valor a pagar</p>
              <p className="text-4xl font-bold text-navy-800">{formatCurrency(state.valor)}</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                Válido por 3 dias
              </div>
            </div>

            {/* PIX */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <QrCode className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">Pagar com PIX</h3>
                <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Instantâneo</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Aprovação imediata após o pagamento</p>

              {state.qrUrl ? (
                <div className="flex justify-center mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.qrUrl} alt="QR Code PIX" className="w-44 h-44 rounded-xl border border-gray-100" />
                </div>
              ) : (
                <div className="w-44 h-44 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-gray-300" />
                </div>
              )}

              {state.emv && (
                <>
                  <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs font-mono text-gray-600 break-all leading-relaxed max-h-20 overflow-y-auto">
                    {state.emv}
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(state.fase === "boleto_pix" ? state.emv : "");
                      setCopiado(true);
                      setTimeout(() => setCopiado(false), 3000);
                    }}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                      copiado ? "bg-emerald-500 text-white" : "bg-navy-800 hover:bg-navy-700 text-white"
                    }`}
                  >
                    {copiado
                      ? <><Check className="w-4 h-4" />Código copiado!</>
                      : <><Copy className="w-4 h-4" />Copiar código PIX</>
                    }
                  </button>
                </>
              )}
            </div>

            {/* Separador */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou pague pelo boleto</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Boleto */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">Boleto Bancário</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Pague em qualquer banco, lotérica ou app — compensação em até 3 dias úteis</p>
              {state.boletoUrl ? (
                <a
                  href={state.boletoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir boleto
                </a>
              ) : (
                <div className="text-center text-sm text-gray-400">URL do boleto não disponível. Entre em contato.</div>
              )}
            </div>

            <p className="text-center text-xs text-gray-400">
              Esta página atualiza automaticamente após o pagamento.
            </p>
          </div>
        )}

        {/* ─── Cartão ─────────────────────────────────────────────────────── */}
        {state.fase === "cartao" && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-xs text-gray-500 mb-1">Valor total</p>
              <p className="text-4xl font-bold text-navy-800">{formatCurrency(state.valor)}</p>
              {state.parcelas > 1 && (
                <p className="text-sm text-gray-500 mt-1">
                  {state.parcelas}× de {formatCurrency(state.valor / state.parcelas)} sem juros
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-navy-800" />
                <h3 className="font-semibold text-navy-800 text-sm">Cartão de Crédito</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Você será redirecionado para o ambiente seguro de pagamento da Cora para inserir os dados do cartão.
              </p>
              {state.checkoutUrl ? (
                <a
                  href={state.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Pagar com cartão
                </a>
              ) : (
                <div className="text-center text-sm text-gray-400">Link de pagamento não disponível. Entre em contato.</div>
              )}
            </div>

            <div className="bg-navy-800 rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold text-gold-400 mb-3 uppercase tracking-wide">Informações</p>
              <ul className="flex flex-col gap-2 text-xs text-navy-100">
                {[
                  "Ambiente 100% seguro — criptografia SSL",
                  "Aceitamos as principais bandeiras",
                  "Parcelas sem acréscimo conforme condição contratada",
                  "Confirmação imediata após o pagamento",
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="w-3.5 h-3.5 text-gold-400 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ─── Pago — redireciona para /confirmacao ───────────────────────── */}
        {state.fase === "pago" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-navy-800 mb-2">Pagamento confirmado!</h2>
            <p className="text-sm text-gray-500">Redirecionando...</p>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Export com Suspense (necessário para useSearchParams) ────────────────────

export default function PagamentoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
        </div>
      }
    >
      <PagamentoContent />
    </Suspense>
  );
}

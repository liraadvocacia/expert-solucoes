"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { use } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  FileText,
  PenLine,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
  Lock,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface ContratoInfo {
  id: string;
  status: string;
  pedido: {
    id: string;
    codigo: string;
    modalidade: string | null;
    formaPagamento: string | null;
    valorEntrada: number | null;
    valorTotal: number;
    cliente: { nome: string; cpf: string };
    itens: { nome: string; valor: number }[];
  };
}

type Fase = "carregando" | "erro" | "visualizar" | "assinar" | "concluido" | "ja_assinado";

export default function AssinarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [fase, setFase] = useState<Fase>("carregando");
  const [contrato, setContrato] = useState<ContratoInfo | null>(null);
  const [erro, setErro] = useState("");
  const [nomeConfirmado, setNomeConfirmado] = useState("");
  const [concordou, setConcordou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [assinadoEm, setAssinadoEm] = useState("");

  const sigRef = useRef<SignatureCanvas>(null);

  const carregarContrato = useCallback(async () => {
    try {
      const res = await fetch(`/api/assinar/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Contrato não encontrado.");
        setFase("erro");
        return;
      }
      const data: ContratoInfo = await res.json();
      setContrato(data);
      setNomeConfirmado(data.pedido.cliente.nome);

      if (data.status === "assinado") {
        setFase("ja_assinado");
      } else {
        setFase("visualizar");
      }
    } catch {
      setErro("Erro de conexão. Verifique sua internet.");
      setFase("erro");
    }
  }, [token]);

  useEffect(() => {
    carregarContrato();
  }, [carregarContrato]);

  const limparAssinatura = () => sigRef.current?.clear();

  const assinar = async () => {
    if (!contrato) return;
    if (!concordou) { alert("Você precisa confirmar que leu e aceita os termos."); return; }
    if (sigRef.current?.isEmpty()) { alert("Por favor, assine no campo abaixo."); return; }
    if (!nomeConfirmado.trim()) { alert("Confirme seu nome completo."); return; }

    const assinaturaBase64 = sigRef.current!.toDataURL("image/png");

    setEnviando(true);
    try {
      const res = await fetch(`/api/contratos/${contrato.id}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nomeAssinante: nomeConfirmado, assinaturaBase64 }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Erro ao processar assinatura.");
        return;
      }

      setAssinadoEm(new Date(data.assinadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
      setFase("concluido");
    } catch {
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  // ─── Carregando ────────────────────────────────────────────────────────────

  if (fase === "carregando") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-navy-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  // ─── Erro ──────────────────────────────────────────────────────────────────

  if (fase === "erro") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="font-bold text-navy-800 mb-2">Link inválido</h2>
          <p className="text-sm text-gray-500">{erro}</p>
        </div>
      </div>
    );
  }

  // ─── Já assinado ───────────────────────────────────────────────────────────

  if (fase === "ja_assinado") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="font-bold text-navy-800 mb-2">Contrato já assinado</h2>
          <p className="text-sm text-gray-500 mb-4">
            Este contrato já foi assinado eletronicamente. Guarde o código do seu pedido para acompanhamento.
          </p>
          {contrato && (
            <p className="font-mono text-xs text-gray-400">
              Pedido: {contrato.pedido.codigo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Concluído ─────────────────────────────────────────────────────────────

  if (fase === "concluido") {
    // Monta URL de pagamento com base na modalidade do pedido
    const pagamentoUrl = (() => {
      if (!contrato) return null;
      const p = contrato.pedido;
      const valor = p.valorEntrada ?? p.valorTotal;
      // Não passa "forma" — a página de pagamento determina as opções
      // automaticamente com base na modalidade do pedido.
      const params = new URLSearchParams({
        pedidoId: p.id,
        codigo: p.codigo,
        valor: String(valor),
      });
      return `/pagamento?${params.toString()}`;
    })();

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy-800 mb-2">Assinado com sucesso!</h2>
          <p className="text-sm text-gray-500 mb-4">
            Assinado em: <span className="font-medium text-navy-800">{assinadoEm} (BRT)</span>
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left text-sm">
            <div className="flex items-start gap-2 text-gray-600">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Sua assinatura foi registrada com IP, data/hora e uma cópia do PDF assinado foi gerada com trilha de auditoria completa.</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {pagamentoUrl && (
              <a
                href={pagamentoUrl}
                className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold px-5 py-3 rounded-xl transition-colors text-sm"
              >
                Prosseguir para pagamento
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Visualizar / Assinar ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <Lock className="w-4 h-4 text-gold-400" />
          <span className="text-white font-bold text-sm">Expert Soluções — Assinatura Digital</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Info do pedido */}
        {contrato && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-navy-800" />
              <h2 className="font-semibold text-navy-800 text-sm">Dados do contrato</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-gray-500">Contratante</span>
                <p className="font-medium text-navy-800">{contrato.pedido.cliente.nome}</p>
                <p className="text-xs text-gray-500">{contrato.pedido.cliente.cpf}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Serviço</span>
                {contrato.pedido.itens.map((i) => (
                  <p key={i.nome} className="font-medium text-navy-800">{i.nome}</p>
                ))}
                <p className="text-xs text-gray-500">
                  R$ {contrato.pedido.valorTotal.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visualização do contrato */}
        {contrato && fase === "visualizar" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-navy-800 text-sm">Contrato de Prestação de Serviços</h3>
              <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                <Lock className="w-3.5 h-3.5" />
                Disponível após assinar
              </span>
            </div>
            {/* Embed do PDF */}
            <div className="relative" style={{ height: 500 }}>
              <iframe
                src={`/api/contratos/${contrato.id}/documento?tipo=original`}
                className="w-full h-full rounded-b-2xl"
                title="Contrato"
              />
            </div>
            <div className="p-4 bg-amber-50 rounded-b-2xl border-t border-amber-100">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <ChevronDown className="w-3.5 h-3.5" />
                Role para baixo para assinar o contrato
              </p>
            </div>
          </div>
        )}

        {/* Painel de assinatura */}
        {contrato && (fase === "visualizar" || fase === "assinar") && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-4 h-4 text-navy-800" />
              <h3 className="font-semibold text-navy-800 text-sm">Assinatura eletrônica</h3>
            </div>

            {/* Nome confirmado */}
            <div className="mb-4">
              <label className="block text-xs text-gray-600 mb-1">Confirme seu nome completo</label>
              <input
                type="text"
                value={nomeConfirmado}
                onChange={(e) => setNomeConfirmado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy-600"
              />
            </div>

            {/* Canvas de assinatura */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-600">Assine abaixo (use o mouse ou o dedo)</label>
                <button
                  onClick={limparAssinatura}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 hover:border-navy-400 transition-colors">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="#1B3A6B"
                  canvasProps={{
                    width: 540,
                    height: 150,
                    className: "w-full",
                    style: { touchAction: "none" },
                  }}
                  backgroundColor="transparent"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-center">
                Assine como no seu documento de identidade
              </p>
            </div>

            {/* Checkbox de aceite */}
            <label className="flex items-start gap-2.5 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={concordou}
                onChange={(e) => setConcordou(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-navy-800 shrink-0"
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                Li e concordo com todos os termos e condições do contrato acima.
                Estou ciente de que esta assinatura eletrônica tem{" "}
                <strong>plena validade jurídica</strong> nos termos da Lei 14.063/2020.
              </span>
            </label>

            {/* Botão assinar */}
            <button
              onClick={assinar}
              disabled={enviando || !concordou || !nomeConfirmado.trim()}
              className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando assinatura...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Assinar contrato
                </>
              )}
            </button>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              IP, data/hora e assinatura registrados com segurança
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

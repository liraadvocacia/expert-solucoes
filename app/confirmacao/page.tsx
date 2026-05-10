"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Clock, MessageCircle, Mail, FileText,
  ArrowRight, Phone, Loader2, AlertCircle, Shield,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Pedido {
  id: string;
  codigo: string;
  tipo: "consulta" | "servico";
  status: string;
  valorTotal: number;
  formaPagamento: string;
  createdAt: string;
  cliente: {
    nome: string;
    email: string | null;
    whatsapp: string | null;
  };
  itens: { nome: string; valor: number }[];
}

// Prazo por tipo de serviço
const PRAZO_SERVICO: Record<string, string> = {
  "Limpa Nome": "até 45 dias úteis",
  "Rating Bancário": "até 60 dias úteis",
  "Serviço BACEN": "até 90 dias úteis",
};

function getPrazoServico(nomeItem: string): string {
  for (const [chave, prazo] of Object.entries(PRAZO_SERVICO)) {
    if (nomeItem.toLowerCase().includes(chave.toLowerCase())) return prazo;
  }
  return "conforme contrato";
}

function getFormaPagamentoLabel(forma: string): string {
  if (forma === "pix") return "PIX";
  if (forma === "cartao") return "Cartão de crédito";
  if (forma === "boleto") return "Boleto bancário";
  return forma;
}

// ─── Componente interno ───────────────────────────────────────────────────────

function ConfirmacaoContent() {
  const params    = useSearchParams();
  const pedidoId  = params.get("pedidoId");
  const codigoUrl = params.get("codigo");

  const [pedido, setPedido]   = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId) { setLoading(false); setErro("ID do pedido não informado."); return; }
    fetch(`/api/pedidos/${pedidoId}`)
      .then((r) => r.json())
      .then((data) => { setPedido(data); setLoading(false); })
      .catch(() => { setErro("Não foi possível carregar os dados do pedido."); setLoading(false); });
  }, [pedidoId]);

  const codigo   = pedido?.codigo ?? codigoUrl ?? "—";
  const isConsulta = pedido?.tipo === "consulta";
  const primeiroItem = pedido?.itens?.[0]?.nome ?? "";
  const prazo = isConsulta ? "até 24 horas" : getPrazoServico(primeiroItem);

  // WhatsApp link
  const waNum  = (process.env.NEXT_PUBLIC_WHATSAPP_ATENDENTE ?? "5511999990000").replace(/\D/g, "");
  const waMsg  = encodeURIComponent(`Olá! Acabei de contratar um serviço Expert Soluções Financeiras. Meu pedido é ${codigo}.`);
  const waLink = `https://wa.me/${waNum}?text=${waMsg}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-gray-50">

      {/* Hero de confirmação */}
      <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 px-6 pt-12 pb-20 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Pagamento confirmado!</h1>
        <p className="text-emerald-100 text-sm">
          {isConsulta ? "Sua consulta foi recebida com sucesso." : "Seu serviço foi contratado com sucesso."}
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10 pb-12 flex flex-col gap-4">

        {/* Card principal — número do pedido + valor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {erro && (
            <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erro}
            </div>
          )}

          <div className="flex flex-col items-center text-center border-b border-gray-100 pb-5 mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Número do pedido</p>
            <p className="font-mono text-3xl font-bold text-navy-800 tracking-wider">{codigo}</p>
            {pedido && (
              <p className="text-xs text-gray-400 mt-1">
                {getFormaPagamentoLabel(pedido.formaPagamento)} · {formatCurrency(pedido.valorTotal)}
              </p>
            )}
          </div>

          {/* Itens contratados */}
          {pedido?.itens && pedido.itens.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {isConsulta ? "Consulta contratada" : "Serviço contratado"}
              </p>
              {pedido.itens.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.nome}</span>
                  <span className="font-semibold text-navy-800">{formatCurrency(item.valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Prazo */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {isConsulta ? "Prazo de entrega" : "Prazo estimado do serviço"}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {isConsulta
                  ? "Seu relatório será entregue em até 24 horas via WhatsApp."
                  : `Serviço realizado em ${prazo} após início do processo.`}
              </p>
            </div>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">O que acontece agora</p>

          <div className="flex flex-col gap-4">

            {isConsulta ? (
              <>
                <Passo numero={1} icon={<MessageCircle className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Análise iniciada</span>
                  <span className="text-xs text-gray-500">Nossa equipe já começou a preparar seu relatório.</span>
                </Passo>
                <Passo numero={2} icon={<Clock className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Entrega em até 24 horas</span>
                  <span className="text-xs text-gray-500">O relatório completo será enviado pelo WhatsApp cadastrado.</span>
                </Passo>
                <Passo numero={3} icon={<Phone className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Contato pelo WhatsApp</span>
                  <span className="text-xs text-gray-500">Caso precise de esclarecimentos, te chamamos pelo WhatsApp.</span>
                </Passo>
              </>
            ) : (
              <>
                <Passo numero={1} icon={<MessageCircle className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Contato em breve</span>
                  <span className="text-xs text-gray-500">Nossa equipe entrará em contato pelo WhatsApp para iniciar o processo.</span>
                </Passo>
                <Passo numero={2} icon={<FileText className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Envio do contrato</span>
                  <span className="text-xs text-gray-500">Você receberá o contrato por e-mail para assinatura digital.</span>
                </Passo>
                <Passo numero={3} icon={<Clock className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Início do processo</span>
                  <span className="text-xs text-gray-500">
                    Após a assinatura, o processo é iniciado. Prazo: {prazo}.
                  </span>
                </Passo>
                <Passo numero={4} icon={<CheckCircle2 className="w-4 h-4 text-navy-700" />}>
                  <span className="font-semibold text-navy-800 text-sm">Acompanhamento</span>
                  <span className="text-xs text-gray-500">Atualizações periódicas pelo WhatsApp até a conclusão.</span>
                </Passo>
              </>
            )}
          </div>
        </div>

        {/* Comprovante e e-mail */}
        {pedido?.cliente?.email && (
          <div className="bg-navy-800 rounded-2xl p-5 flex items-start gap-3">
            <Mail className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Comprovante por e-mail</p>
              <p className="text-xs text-navy-100/70 mt-0.5">
                Um comprovante foi enviado para <span className="text-white">{pedido.cliente.email}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Segurança */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-500">
            Seus dados são protegidos e tratados com total sigilo e confidencialidade.
          </p>
        </div>

        {/* CTA WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors text-sm shadow-sm"
        >
          <MessageCircle className="w-5 h-5" />
          Falar com a Expert pelo WhatsApp
        </a>

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-navy-800 font-medium py-3.5 rounded-2xl transition-colors text-sm"
        >
          Voltar ao início
          <ArrowRight className="w-4 h-4" />
        </Link>

      </div>
    </div>
  );
}

// ─── Componente auxiliar Passo ────────────────────────────────────────────────

function Passo({ numero, icon, children }: {
  numero: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-navy-50 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 pt-1">
        {children}
      </div>
    </div>
  );
}

// ─── Export com Suspense ──────────────────────────────────────────────────────

export default function ConfirmacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
        </div>
      }
    >
      <ConfirmacaoContent />
    </Suspense>
  );
}

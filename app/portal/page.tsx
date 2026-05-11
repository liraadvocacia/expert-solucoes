"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Download,
  FileSignature,
  ChevronRight,
  Shield,
  DollarSign,
  Package,
  LogOut,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Andamento {
  id: string;
  titulo: string;
  descricao: string | null;
  createdAt: string;
}

interface ContratoPortal {
  id: string;
  status: string;
  assinadoEm: string | null;
  documentoPath: string | null;
  assinaturaPath: string | null;
}

interface PedidoPortal {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  valorTotal: number;
  valorPago: number;
  formaPagamento: string | null;
  createdAt: string;
  cliente: { nome: string; cpf: string; email: string | null; telefone: string | null };
  itens: { id: string; nome: string; valor: number }[];
  contrato: ContratoPortal | null;
  andamentos: Andamento[];
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  aguardando_pagamento: {
    label: "Aguardando Pagamento",
    icon: Clock,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  em_andamento: {
    label: "Em Andamento",
    icon: AlertCircle,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  cancelado: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

function maskCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  return cpf;
}

export default function PortalPage() {
  const [codigo, setCodigo] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pedido, setPedido] = useState<PedidoPortal | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim(), cpf }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Erro ao buscar pedido");
      } else {
        setPedido(data);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSair = () => {
    setPedido(null);
    setCodigo("");
    setCpf("");
    setErro("");
  };

  const cfg = pedido ? (statusConfig[pedido.status] ?? statusConfig.em_andamento) : null;
  const StatusIcon = cfg?.icon as React.ElementType | undefined;

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Topo */}
      <div className="bg-navy-800 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo-expert-transparente.png"
              alt="Expert Soluções Financeiras"
              width={160}
              height={52}
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <div className="flex items-center gap-1.5 text-navy-100/50 text-xs">
            <Shield className="w-3.5 h-3.5 text-gold-400" />
            Portal seguro · Dados protegidos pela LGPD
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {!pedido ? (
          /* ── FORMULÁRIO DE ACESSO ── */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-gold-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Lock className="w-7 h-7 text-gold-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Portal do Cliente</h1>
              <p className="text-navy-100/50 text-sm leading-relaxed">
                Acompanhe o andamento do seu serviço, acesse documentos e confira o status do seu processo.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="bg-white/5 border border-white/10 rounded-2xl p-7 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-navy-100/60 mb-2 uppercase tracking-wider">
                    Código do Pedido
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PED-001"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    required
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-navy-100/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy-100/60 mb-2 uppercase tracking-wider">
                    CPF do Titular
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-navy-100/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                  />
                </div>

                {erro && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{erro}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gold-500 hover:bg-gold-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? "Verificando..." : "Acessar Portal"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            <p className="text-center text-navy-100/30 text-xs mt-6 leading-relaxed">
              O código do pedido foi enviado ao seu e-mail e WhatsApp no momento da confirmação.
              <br />
              Este portal é exclusivo para serviços contratados.
            </p>
          </div>
        ) : (
          /* ── CONTEÚDO DO PORTAL ── */
          <div className="flex flex-col gap-5">

            {/* Header cliente */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">{pedido.cliente.nome}</h2>
                <p className="text-navy-100/50 text-sm mt-0.5">
                  CPF: {maskCPF(pedido.cliente.cpf)}
                  {" · "}
                  Pedido:{" "}
                  <span className="font-mono text-gold-400 font-semibold">{pedido.codigo}</span>
                </p>
              </div>
              <button
                onClick={handleSair}
                className="inline-flex items-center gap-1.5 text-navy-100/40 hover:text-white text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>

            {/* Badge de status */}
            {cfg && StatusIcon && (
              <div className={`${cfg.bg} ${cfg.border} border rounded-2xl p-5 flex items-center gap-3`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-white/60`}>
                  <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Status do Serviço</p>
                  <p className={`font-bold text-lg ${cfg.color} leading-tight`}>{cfg.label}</p>
                </div>
              </div>
            )}

            {/* Serviço + Financeiro */}
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-navy-600" />
                  <h3 className="font-semibold text-navy-800 text-sm">Serviço Contratado</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  {pedido.itens.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{item.nome}</span>
                      <span className="text-sm font-semibold text-navy-800">
                        {formatCurrency(item.valor)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2.5 mt-1 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Contratado em</span>
                    <span className="text-xs text-gray-600">
                      {new Date(pedido.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-navy-600" />
                  <h3 className="font-semibold text-navy-800 text-sm">Financeiro</h3>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Valor total</span>
                    <span className="text-sm font-semibold text-navy-800">
                      {formatCurrency(pedido.valorTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Valor pago</span>
                    <span
                      className={`text-sm font-bold ${
                        pedido.valorPago >= pedido.valorTotal
                          ? "text-emerald-600"
                          : pedido.valorPago > 0
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    >
                      {formatCurrency(pedido.valorPago)}
                    </span>
                  </div>
                  {pedido.valorPago >= pedido.valorTotal && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-2 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs text-emerald-700 font-medium">Pagamento confirmado</span>
                    </div>
                  )}
                  {pedido.valorPago > 0 && pedido.valorPago < pedido.valorTotal && (
                    <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                      <span className="text-xs text-gray-400">Saldo restante</span>
                      <span className="text-xs font-semibold text-amber-600">
                        {formatCurrency(pedido.valorTotal - pedido.valorPago)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Andamento da Demanda */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle className="w-4 h-4 text-navy-600" />
                <h3 className="font-semibold text-navy-800 text-sm">Andamento da Demanda</h3>
              </div>

              <div className="relative pl-2">
                {/* Ponto inicial — Pedido recebido */}
                <TimelineItem
                  titulo="Pedido recebido"
                  data={new Date(pedido.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                  dotColor="bg-navy-800"
                  hasLine={pedido.andamentos.length > 0}
                />

                {pedido.andamentos.map((a, i) => {
                  const isLast = i === pedido.andamentos.length - 1;
                  const isConclusion = isLast && pedido.status === "concluido";
                  return (
                    <TimelineItem
                      key={a.id}
                      titulo={a.titulo}
                      descricao={a.descricao ?? undefined}
                      data={new Date(a.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                      dotColor={isConclusion ? "bg-emerald-500" : "bg-gold-500"}
                      hasLine={!isLast}
                    />
                  );
                })}

                {pedido.andamentos.length === 0 && (
                  <p className="text-sm text-gray-400 italic ml-12 mt-1">
                    Os andamentos serão registrados em breve pela nossa equipe.
                  </p>
                )}
              </div>
            </div>

            {/* Documentos */}
            {pedido.contrato && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-navy-600" />
                  <h3 className="font-semibold text-navy-800 text-sm">Documentos</h3>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <FileSignature className="w-4 h-4 text-navy-500" />
                    <div>
                      <p className="text-sm font-medium text-navy-800">Contrato de Serviço</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {pedido.contrato.status === "assinado"
                          ? `Assinado em ${
                              pedido.contrato.assinadoEm
                                ? new Date(pedido.contrato.assinadoEm).toLocaleDateString("pt-BR")
                                : "—"
                            }`
                          : "Aguardando assinatura"}
                      </p>
                    </div>
                  </div>
                  {(pedido.contrato.documentoPath || pedido.contrato.assinaturaPath) ? (
                    <a
                      href={`/api/contratos/${pedido.contrato.id}/documento${
                        pedido.contrato.status === "assinado" ? "?tipo=assinado" : ""
                      }`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs bg-navy-800 hover:bg-navy-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">Em geração...</span>
                  )}
                </div>
              </div>
            )}

            <p className="text-center text-navy-100/30 text-xs py-2">
              Expert Soluções Financeiras · Portal do Cliente · Dados protegidos pela LGPD
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componente TimelineItem ── */
function TimelineItem({
  titulo,
  descricao,
  data,
  dotColor,
  hasLine,
}: {
  titulo: string;
  descricao?: string;
  data: string;
  dotColor: string;
  hasLine: boolean;
}) {
  return (
    <div className="flex gap-4 items-start mb-5">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-8 h-8 rounded-full ${dotColor} flex items-center justify-center`}>
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
        {hasLine && <div className="w-px bg-gray-200 mt-1.5 mb-0" style={{ minHeight: 28 }} />}
      </div>
      <div className="pb-1 pt-0.5">
        <p className="text-sm font-semibold text-navy-800">{titulo}</p>
        {descricao && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{descricao}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{data}</p>
      </div>
    </div>
  );
}

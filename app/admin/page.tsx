"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Shield,
  RefreshCw,
  Copy,
  Check,
  FileSignature,
  QrCode,
  Download,
  FileText,
  ExternalLink,
  DollarSign,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Status = "aguardando_pagamento" | "em_andamento" | "concluido" | "cancelado";

interface Contrato {
  id: string;
  status: string; // pendente | assinado | cancelado
  signingToken: string | null;
  assinadoEm: string | null;
  assinaturaPath: string | null;
}

interface Pedido {
  id: string;
  codigo: string;
  tipo: string;
  status: Status;
  valorTotal: number;
  valorPago: number;
  formaPagamento: string | null;
  pixCobrancaId: string | null;
  pixEmv: string | null;
  createdAt: string;
  cliente: { id: string; nome: string; cpf: string; telefone: string; email: string | null };
  itens: { id: string; nome: string; valor: number }[];
  contrato: Contrato | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  aguardando_pagamento: { label: "Aguard. Pagamento", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  em_andamento: { label: "Em Andamento", icon: AlertCircle, color: "text-blue-600", bg: "bg-blue-50" },
  concluido: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
};

const contratoStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "text-amber-600", bg: "bg-amber-50" },
  assinado: { label: "Assinado", color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelado: { label: "Cancelado", color: "text-red-600", bg: "bg-red-50" },
};

/** Abre WhatsApp Web com mensagem pré-preenchida */
function whatsappLink(telefone: string, mensagem: string): string {
  // Deixa só dígitos e adiciona 55 se necessário
  const digits = telefone.replace(/\D/g, "");
  const numero = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function WhatsAppButton({ telefone, mensagem, label }: { telefone: string; mensagem: string; label: string }) {
  const url = whatsappLink(telefone, mensagem);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded-lg transition-colors font-medium"
    >
      <MessageCircle className="w-3 h-3" />
      {label}
    </a>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${
        copied ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroStatus !== "todos") params.set("status", filtroStatus);
    if (busca) params.set("busca", busca);
    const res = await fetch(`/api/pedidos?${params}`);
    const data = await res.json();
    setPedidos(data);
    setLoading(false);
  }, [filtroStatus, busca]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const atualizarStatus = async (pedido: Pedido, novoStatus: Status, valorPago?: number) => {
    setAtualizando(true);
    await fetch(`/api/pedidos/${pedido.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: novoStatus,
        ...(valorPago !== undefined ? { valorPago } : {}),
      }),
    });
    setAtualizando(false);
    setPedidoSelecionado(null);
    fetchPedidos();
  };

  const pedidosFiltrados = pedidos.filter((p) =>
    filtroTipo === "todos" ? true : p.tipo === filtroTipo
  );

  const totalReceita = pedidos.reduce((acc, p) => acc + p.valorPago, 0);
  const emAndamento = pedidos.filter((p) => p.status === "em_andamento").length;
  const concluidos = pedidos.filter((p) => p.status === "concluido").length;
  const aguardando = pedidos.filter((p) => p.status === "aguardando_pagamento").length;

  const stats = [
    { label: "Total de pedidos", value: String(pedidos.length), icon: FileSearch, color: "text-navy-800" },
    { label: "Aguardando", value: String(aguardando), icon: Clock, color: "text-amber-600" },
    { label: "Em andamento", value: String(emAndamento), icon: AlertCircle, color: "text-blue-600" },
    { label: "Concluídos", value: String(concluidos), icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Receita paga", value: formatCurrency(totalReceita), icon: TrendingUp, color: "text-gold-500" },
  ];

  const signingUrl = (p: Pedido) =>
    p.contrato?.signingToken
      ? `${window.location.origin}/assinar/${p.contrato.signingToken}`
      : null;

  const pixUrl = (p: Pedido) =>
    `${window.location.origin}/pagamento?pedidoId=${p.id}&codigo=${p.codigo}`;

  const wppAtendente = process.env.NEXT_PUBLIC_WHATSAPP_ATENDENTE ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-navy-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-gold-400" />
          </div>
          <span className="text-white font-bold text-sm">Expert Soluções — Painel Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPedidos}
            title="Atualizar"
            className={`text-navy-100 hover:text-white transition-colors ${loading ? "animate-spin" : ""}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className="text-navy-100/60 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-4 p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-navy-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-navy-600 bg-white"
            >
              <option value="todos">Todos os status</option>
              <option value="aguardando_pagamento">Aguard. Pagamento</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-navy-600 bg-white"
            >
              <option value="todos">Todos os tipos</option>
              <option value="consulta">Consultas</option>
              <option value="servico">Serviços</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Código</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Cliente</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Serviço</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Financeiro</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Status</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Contrato</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((p) => {
                  const cfg = statusConfig[p.status] || statusConfig.aguardando_pagamento;
                  const cCfg = p.contrato ? contratoStatusConfig[p.contrato.status] : null;
                  const url = signingUrl(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs text-gray-500">{p.codigo}</div>
                        <div className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-navy-800 text-sm">{p.cliente.nome}</div>
                        <div className="text-xs text-gray-500">{p.cliente.cpf}</div>
                        <div className="text-xs text-gray-400">{p.cliente.telefone}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-navy-800 text-sm">{p.itens.map((i) => i.nome).join(", ")}</div>
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${p.tipo === "consulta" ? "bg-blue-50 text-blue-600" : "bg-gold-100 text-gold-500"}`}>
                          {p.tipo === "consulta" ? "Consulta" : "Serviço"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-navy-800 text-sm">{formatCurrency(p.valorTotal)}</div>
                        <div className={`text-xs ${p.valorPago > 0 ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                          {p.valorPago > 0 ? `Pago: ${formatCurrency(p.valorPago)}` : "Sem pagamento"}
                        </div>
                        {p.valorTotal > p.valorPago && p.valorPago > 0 && (
                          <div className="text-xs text-amber-600">Restam: {formatCurrency(p.valorTotal - p.valorPago)}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {cCfg ? (
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full w-fit ${cCfg.bg} ${cCfg.color}`}>
                              <FileSignature className="w-3 h-3" />
                              {cCfg.label}
                            </span>
                            {p.contrato?.status === "pendente" && url && (
                              <CopyButton text={url} label="Copiar link" />
                            )}
                            {p.contrato?.status === "assinado" && (
                              <a
                                href={`/api/contratos/${p.contrato.id}/documento?tipo=assinado`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                PDF assinado
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setPedidoSelecionado(p)}
                          className="p-1.5 hover:bg-navy-50 rounded-lg transition-colors text-gray-400 hover:text-navy-800"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && pedidosFiltrados.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">Nenhum pedido encontrado</div>
            )}
            {loading && (
              <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes */}
      {pedidoSelecionado && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setPedidoSelecionado(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy-800">{pedidoSelecionado.codigo}</h3>
                <p className="text-xs text-gray-500">{pedidoSelecionado.cliente.nome}</p>
              </div>
              <button onClick={() => setPedidoSelecionado(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Dados do cliente */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cliente</h4>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { l: "Nome", v: pedidoSelecionado.cliente.nome },
                    { l: "CPF", v: pedidoSelecionado.cliente.cpf },
                    { l: "Telefone", v: pedidoSelecionado.cliente.telefone },
                    { l: "E-mail", v: pedidoSelecionado.cliente.email ?? "—" },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <span className="text-xs text-gray-500 block">{l}</span>
                      <span className="font-medium text-navy-800">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Financeiro */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Financeiro</h4>
                <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serviço</span>
                    <span className="font-medium text-navy-800">{pedidoSelecionado.itens.map((i) => i.nome).join(", ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor total</span>
                    <span className="font-semibold text-navy-800">{formatCurrency(pedidoSelecionado.valorTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor pago</span>
                    <span className={`font-semibold ${pedidoSelecionado.valorPago > 0 ? "text-emerald-600" : "text-gray-400"}`}>
                      {formatCurrency(pedidoSelecionado.valorPago)}
                    </span>
                  </div>
                  {pedidoSelecionado.valorTotal > pedidoSelecionado.valorPago && (
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-500">Saldo restante</span>
                      <span className="font-semibold text-amber-600">{formatCurrency(pedidoSelecionado.valorTotal - pedidoSelecionado.valorPago)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Status atual */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Status do pedido</h4>
                <div className="flex flex-wrap gap-2">
                  {(["aguardando_pagamento", "em_andamento", "concluido", "cancelado"] as Status[]).map((s) => {
                    const cfg = statusConfig[s];
                    const isAtual = pedidoSelecionado.status === s;
                    return (
                      <button
                        key={s}
                        disabled={isAtual || atualizando}
                        onClick={() => atualizarStatus(
                          pedidoSelecionado,
                          s,
                          s === "concluido" ? pedidoSelecionado.valorTotal : undefined
                        )}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                          isAtual
                            ? `${cfg.bg} ${cfg.color} border-transparent font-bold ring-2 ring-offset-1 ring-current`
                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Links de ação */}
              <section>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Links e documentos</h4>
                <div className="flex flex-col gap-2">
                  {/* PIX */}
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-navy-600" />
                        <p className="text-xs font-medium text-navy-800">Pagamento PIX</p>
                      </div>
                      <div className="flex gap-1.5">
                        <CopyButton text={pixUrl(pedidoSelecionado)} label="Copiar" />
                        <a
                          href={pixUrl(pedidoSelecionado)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {/* WhatsApp — link de pagamento */}
                    <WhatsAppButton
                      telefone={pedidoSelecionado.cliente.telefone}
                      label="Enviar link de pagamento"
                      mensagem={`Olá, ${pedidoSelecionado.cliente.nome.split(" ")[0]}! 👋\n\nAqui é da *Expert Soluções Financeiras*.\n\nSeu pedido *${pedidoSelecionado.codigo}* está pronto para pagamento via PIX no valor de *${formatCurrency(pedidoSelecionado.valorTotal)}*.\n\nAcesse o link abaixo para ver o QR Code e o código PIX:\n${pixUrl(pedidoSelecionado)}\n\nQualquer dúvida estamos à disposição!`}
                    />
                  </div>

                  {/* Contrato / Assinatura */}
                  {pedidoSelecionado.contrato && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileSignature className="w-4 h-4 text-navy-600" />
                          <div>
                            <p className="text-xs font-medium text-navy-800">
                              Contrato — {contratoStatusConfig[pedidoSelecionado.contrato.status]?.label}
                            </p>
                            <p className="text-xs text-gray-400">
                              {pedidoSelecionado.contrato.status === "pendente"
                                ? "Aguardando assinatura"
                                : pedidoSelecionado.contrato.assinadoEm
                                ? `Assinado em ${new Date(pedidoSelecionado.contrato.assinadoEm).toLocaleString("pt-BR")}`
                                : "Assinado"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {pedidoSelecionado.contrato.status === "pendente" && signingUrl(pedidoSelecionado) && (
                            <CopyButton text={signingUrl(pedidoSelecionado)!} label="Link" />
                          )}
                          <a
                            href={`/api/contratos/${pedidoSelecionado.contrato.id}/documento`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </a>
                        </div>
                      </div>
                      {/* WhatsApp — link de assinatura (só se pendente) */}
                      {pedidoSelecionado.contrato.status === "pendente" && signingUrl(pedidoSelecionado) && (
                        <WhatsAppButton
                          telefone={pedidoSelecionado.cliente.telefone}
                          label="Enviar contrato para assinar"
                          mensagem={`Olá, ${pedidoSelecionado.cliente.nome.split(" ")[0]}! 👋\n\nAqui é da *Expert Soluções Financeiras*.\n\nSeu contrato referente ao pedido *${pedidoSelecionado.codigo}* está pronto para assinatura digital.\n\n✍️ Clique no link abaixo para assinar:\n${signingUrl(pedidoSelecionado)}\n\nA assinatura é simples e leva menos de 1 minuto. Qualquer dúvida é só chamar!`}
                        />
                      )}
                    </div>
                  )}

                  {/* Registrar pagamento manual */}
                  {pedidoSelecionado.valorPago < pedidoSelecionado.valorTotal && (
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-600" />
                        <div>
                          <p className="text-xs font-medium text-amber-800">Registrar pagamento manual</p>
                          <p className="text-xs text-amber-600">Caso o PIX tenha sido pago fora do sistema</p>
                        </div>
                      </div>
                      <button
                        disabled={atualizando}
                        onClick={() => atualizarStatus(
                          pedidoSelecionado,
                          pedidoSelecionado.status === "aguardando_pagamento" ? "em_andamento" : pedidoSelecionado.status,
                          pedidoSelecionado.valorTotal
                        )}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                      >
                        Confirmar pago
                      </button>
                    </div>
                  )}

                  {/* Pix EMV copiável */}
                  {pedidoSelecionado.pixEmv && (
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-navy-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Código PIX (EMV)
                        </p>
                        <CopyButton text={pedidoSelecionado.pixEmv} label="Copiar código" />
                      </div>
                      <p className="text-xs font-mono text-gray-500 break-all leading-relaxed line-clamp-2">
                        {pedidoSelecionado.pixEmv}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Footer modal */}
            <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setPedidoSelecionado(null)}
                className="w-full border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

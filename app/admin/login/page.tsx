"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "/admin";

  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) return;
    setLoading(true);
    setErro("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (res.ok) {
        router.push(redirect);
        router.refresh();
      } else {
        const data = await res.json();
        setErro(data.error ?? "Acesso negado.");
        setSenha("");
        inputRef.current?.focus();
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-800 flex items-center justify-center p-4">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-navy-600/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gold-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gold-500/20">
            <Shield className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
          <p className="text-navy-100/60 text-sm mt-1">Expert Soluções Financeiras</p>
        </div>

        {/* Card de login */}
        <form
          onSubmit={handleLogin}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-7"
        >
          <div className="mb-5">
            <label className="block text-sm text-navy-100/80 mb-1.5">Senha de acesso</label>
            <div className="relative">
              <input
                ref={inputRef}
                type={mostrar ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••••"
                autoFocus
                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-gold-400 focus:bg-white/15 transition-all"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !senha}
            className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Entrar no painel"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-navy-100/30 mt-6">
          Sessão expira em 8 horas
        </p>
      </div>
    </div>
  );
}

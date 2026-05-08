import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";

const badges = [
  "Dados protegidos pela LGPD",
  "Pagamento 100% seguro",
  "Atendimento personalizado",
];

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center bg-navy-800 overflow-hidden pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #C49240 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, #2D5DA1 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 flex flex-col items-center text-center">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 bg-white/10 border border-gold-500/30 text-gold-300 text-sm px-4 py-1.5 rounded-full mb-8">
          <CheckCircle className="w-4 h-4" />
          Consultas e serviços financeiros com segurança e agilidade
        </span>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl mb-6">
          Soluções financeiras{" "}
          <span className="text-gold-400">para sua vida</span>
        </h1>

        <p className="text-lg text-navy-100 max-w-2xl mb-10 leading-relaxed">
          Consultas de Nome Sujo, Rating Bancário e BACEN. Serviços de
          regularização financeira com contrato, segurança jurídica e total
          transparência.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/consultas"
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
          >
            Fazer uma Consulta
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/servicos"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
          >
            Ver Serviços
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl border-t border-white/10 pt-10">
          {[
            { value: "500+", label: "Clientes atendidos" },
            { value: "99%", label: "Satisfação" },
            { value: "48h", label: "Prazo médio" },
            { value: "100%", label: "Online e seguro" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-gold-400">
                {stat.value}
              </div>
              <div className="text-xs text-navy-100 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

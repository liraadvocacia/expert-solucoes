import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, ShieldCheck } from "lucide-react";

const stats = [
  { value: "500+", label: "Clientes atendidos" },
  { value: "8 anos", label: "de experiência" },
  { value: "48h", label: "Prazo médio" },
  { value: "100%", label: "Online e seguro" },
];

const badges = [
  "Dados protegidos pela LGPD",
  "Pagamento 100% seguro",
  "Contrato com validade jurídica",
];

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center bg-navy-800 overflow-hidden pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, #C49240 0%, transparent 50%),
                              radial-gradient(circle at 80% 70%, #2D5DA1 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* — Coluna esquerda: texto — */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge topo */}
            <span className="inline-flex items-center gap-2 bg-white/10 border border-gold-500/30 text-gold-300 text-sm px-4 py-1.5 rounded-full mb-8">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Consultas e serviços financeiros com segurança e agilidade
            </span>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white leading-tight mb-6">
              Soluções financeiras{" "}
              <span className="text-gold-400">para sua vida</span>
            </h1>

            <p className="text-lg text-navy-100 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Consultas de Nome Sujo, Rating Bancário e BACEN. Serviços de
              regularização financeira com contrato, segurança jurídica e total
              transparência.
            </p>

            {/* Trust badges */}
            <ul className="flex flex-col sm:flex-row flex-wrap gap-3 mb-10 justify-center lg:justify-start">
              {badges.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-sm text-navy-100/80">
                  <ShieldCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-14 justify-center lg:justify-start">
              <Link
                href="/consultas"
                className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
              >
                Fazer uma Consulta
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/servicos"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base"
              >
                Ver Serviços
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 border-t border-white/10 pt-10">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl font-bold text-gold-400">{stat.value}</div>
                  <div className="text-xs text-navy-100/70 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* — Coluna direita: foto de autoridade — */}
          <div className="relative flex-shrink-0 hidden lg:flex justify-center">
            {/* Glow decorativo */}
            <div className="absolute inset-0 bg-gold-500/10 rounded-3xl blur-3xl scale-110" />

            {/* Foto */}
            <div className="relative w-72 xl:w-80 h-[26rem] xl:h-[30rem] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src="/foto-formal.jpg"
                alt="Especialista Expert Soluções Financeiras"
                fill
                className="object-cover object-top"
                sizes="320px"
                priority
              />
              {/* Overlay gradiente no rodapé da foto */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-900/80 to-transparent" />

              {/* Card de autoridade sobre a foto */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
                  <p className="text-white font-semibold text-sm">Luiz Lira</p>
                  <p className="text-gold-300 text-xs mt-0.5">
                    Especialista · 8+ anos no mercado financeiro
                  </p>
                </div>
              </div>
            </div>

            {/* Badge flutuante — experiência */}
            <div className="absolute -top-4 -right-4 bg-gold-500 text-white rounded-2xl px-4 py-2 shadow-lg">
              <p className="text-xs font-bold uppercase tracking-wide">+8 anos</p>
              <p className="text-xs opacity-90">de experiência</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

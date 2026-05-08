import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTABanner() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="bg-navy-800 rounded-3xl px-8 py-16 shadow-xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #C49240 0%, transparent 50%),
                                radial-gradient(circle at 80% 50%, #2D5DA1 0%, transparent 50%)`,
            }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pronto para começar?
            </h2>
            <p className="text-navy-100 mb-8 max-w-lg mx-auto">
              Solicite sua consulta ou serviço agora mesmo. Processo 100%
              online, seguro e rápido.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/consultas"
                className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
              >
                Fazer Consulta
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/servicos"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
              >
                Ver Serviços
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

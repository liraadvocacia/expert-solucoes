import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy-900 pt-14 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Logo centralizada com destaque */}
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-expert-transparente.png"
            alt="Expert Soluções Financeiras"
            width={280}
            height={92}
            className="h-20 w-auto object-contain brightness-0 invert opacity-90"
          />
          <p className="text-navy-100/40 text-xs mt-3 tracking-widest uppercase">
            Soluções Financeiras com Segurança e Transparência
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-8" />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-navy-100/40 text-xs text-center">
            © {new Date().getFullYear()} Expert Soluções Financeiras. Todos os direitos reservados.
          </p>

          <div className="flex gap-6 text-xs text-navy-100/40">
            <a href="#" className="hover:text-white transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

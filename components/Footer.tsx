import { Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-navy-900 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gold-500/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-gold-400" />
          </div>
          <span className="text-white font-bold text-sm">
            Expert Soluções Financeiras
          </span>
        </div>

        <p className="text-navy-100/50 text-xs text-center">
          © {new Date().getFullYear()} Expert Soluções Financeiras. Todos os direitos reservados.
        </p>

        <div className="flex gap-4 text-xs text-navy-100/50">
          <a href="#" className="hover:text-white transition-colors">
            Política de Privacidade
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Termos de Uso
          </a>
        </div>
      </div>
    </footer>
  );
}

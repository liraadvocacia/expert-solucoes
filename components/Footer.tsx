import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-navy-900 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <Image
            src="/logo-expert.png"
            alt="Expert Soluções Financeiras"
            width={140}
            height={46}
            className="h-9 w-auto object-contain brightness-0 invert"
          />
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

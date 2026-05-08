import Link from "next/link";
import {
  FileSearch,
  TrendingUp,
  Building2,
  ArrowRight,
  Sparkles,
  Clock,
  MessageCircle,
} from "lucide-react";

const consultas = [
  {
    icon: FileSearch,
    title: "Consulta Nome Sujo",
    description:
      "Verifique se há restrições no seu CPF/CNPJ junto aos órgãos de proteção ao crédito.",
    price: "R$ 49,90",
    tag: "Resultado em 24h",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: TrendingUp,
    title: "Consulta Rating",
    description:
      "Análise completa do seu score e rating bancário para entender seu perfil financeiro.",
    price: "R$ 79,90",
    tag: "Resultado em 24h",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Building2,
    title: "Consulta BACEN",
    description:
      "Consulta detalhada junto ao Banco Central do Brasil sobre sua situação cadastral.",
    price: "R$ 99,00",
    tag: "Resultado em 24h",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

const servicos = [
  {
    icon: FileSearch,
    title: "Limpa Nome",
    description:
      "Regularização completa de restrições no CPF/CNPJ com negociação e baixa dos débitos.",
    price: "R$ 699,00",
    details: "R$ 200 de entrada + restante na conclusão",
    highlight: "Garantia de reprotocolo",
    prazo: "45 dias úteis",
    color: "text-navy-800",
    bg: "bg-navy-50",
  },
  {
    icon: TrendingUp,
    title: "Rating Bancário",
    description:
      "Melhoria e regularização do seu rating junto às instituições financeiras.",
    price: "R$ 1.800,00",
    details: "50% de entrada + 50% na conclusão",
    highlight: null,
    prazo: "60 dias úteis",
    color: "text-gold-500",
    bg: "bg-gold-100",
  },
  {
    icon: Building2,
    title: "Serviço BACEN",
    description:
      "Regularização completa da sua situação junto ao Banco Central do Brasil.",
    price: "R$ 3.000,00",
    details: "Pagamento apenas na conclusão do serviço",
    highlight: "Pague só quando concluir",
    prazo: "90 dias úteis",
    color: "text-navy-600",
    bg: "bg-navy-100",
  },
];

function ServiceCard({
  icon: Icon,
  title,
  description,
  price,
  tag,
  details,
  highlight,
  prazo,
  color,
  bg,
  isService,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  price: string;
  tag?: string;
  details?: string;
  highlight?: string | null;
  prazo?: string;
  color: string;
  bg: string;
  isService?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-navy-800 text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-2xl font-bold text-navy-800">{price}</span>
          {tag && !isService && (
            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              <MessageCircle className="w-3 h-3" />
              {tag}
            </span>
          )}
        </div>
        {details && (
          <p className="text-xs text-gray-500 mb-1">{details}</p>
        )}
        {prazo && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <Clock className="w-3 h-3" />
            Prazo: {prazo}
          </div>
        )}
        {highlight && (
          <div className="flex items-center gap-1 text-xs text-gold-500 font-medium mb-3">
            <Sparkles className="w-3 h-3" />
            {highlight}
          </div>
        )}
        <Link
          href={isService ? `/servicos` : `/consultas`}
          className="mt-2 w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {isService ? "Contratar" : "Consultar agora"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function ServicesSection() {
  return (
    <section id="servicos" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Consultas */}
        <div className="text-center mb-12">
          <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
            Consultas Rápidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-800 mt-2 mb-4">
            Entenda sua situação financeira
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Resultado entregue em até <strong className="text-navy-800">24 horas</strong> via WhatsApp, com análise exclusiva da Expert Soluções Financeiras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {consultas.map((c) => (
            <ServiceCard key={c.title} {...c} isService={false} />
          ))}
        </div>

        {/* Serviços */}
        <div className="text-center mb-12">
          <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
            Serviços Especializados
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-800 mt-2 mb-4">
            Regularize sua vida financeira
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Processo completo com contrato, assinatura digital válida pelo
            ICP-Brasil e acompanhamento até a conclusão.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {servicos.map((s) => (
            <ServiceCard key={s.title} {...s} isService={true} />
          ))}
        </div>
      </div>
    </section>
  );
}

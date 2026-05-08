import { ShieldCheck, Clock, FileSignature, HeadphonesIcon, Lock, Award } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Dados 100% protegidos",
    desc: "Tratamos seus dados com total sigilo e segurança, em conformidade com a LGPD.",
  },
  {
    icon: FileSignature,
    title: "Contrato com validade jurídica",
    desc: "Todos os serviços são formalizados com contrato assinado eletronicamente via ICP-Brasil.",
  },
  {
    icon: Clock,
    title: "Rapidez e agilidade",
    desc: "Consultas entregues em até 48h. Serviços acompanhados de perto pela nossa equipe.",
  },
  {
    icon: HeadphonesIcon,
    title: "Atendimento personalizado",
    desc: "Nossa equipe está disponível para esclarecer todas as dúvidas durante o processo.",
  },
  {
    icon: Lock,
    title: "Pagamento seguro",
    desc: "Integrações seguras com PIX, cartão e boleto. Sem surpresas no pagamento.",
  },
  {
    icon: Award,
    title: "Relatórios exclusivos",
    desc: "Não enviamos relatórios genéricos. Cada análise é exclusiva com a marca Expert.",
  },
];

export default function WhyUs() {
  return (
    <section className="py-24 bg-navy-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-gold-400 text-sm font-semibold uppercase tracking-wider">
            Diferenciais
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-4">
            Por que escolher a Expert?
          </h2>
          <p className="text-navy-100 max-w-lg mx-auto">
            Mais que um serviço, uma parceria para regularizar e fortalecer sua
            saúde financeira.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 bg-gold-500/20 rounded-xl flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-gold-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-navy-100 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

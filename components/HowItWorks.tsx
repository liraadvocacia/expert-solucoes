import { ClipboardList, CreditCard, FileCheck, CheckCircle } from "lucide-react";

const stepsConsulta = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Escolha a consulta",
    desc: "Selecione uma ou mais opções: Nome Sujo, Rating ou BACEN. O total é calculado automaticamente.",
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Pague via PIX",
    desc: "Pagamento rápido e seguro via PIX. A confirmação é instantânea.",
  },
  {
    n: "03",
    icon: FileCheck,
    title: "Informe seus dados",
    desc: "Após o pagamento, acesse o portal seguro e preencha seus dados para a consulta.",
  },
  {
    n: "04",
    icon: CheckCircle,
    title: "Receba o relatório",
    desc: "Em até 48h você recebe um relatório completo com a marca Expert Soluções.",
  },
];

const stepsServico = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Escolha o serviço",
    desc: "Selecione entre Limpa Nome, Rating Bancário ou Serviço BACEN.",
  },
  {
    n: "02",
    icon: FileCheck,
    title: "Assine o contrato",
    desc: "Seus dados são coletados, o contrato é gerado e enviado para assinatura eletrônica (ICP-Brasil).",
  },
  {
    n: "03",
    icon: CreditCard,
    title: "Realize o pagamento",
    desc: "Pague a entrada conforme condições do serviço escolhido (PIX, cartão ou boleto).",
  },
  {
    n: "04",
    icon: CheckCircle,
    title: "Acompanhe e conclua",
    desc: "Nossa equipe atua no processo. O restante é cobrado apenas quando concluirmos.",
  },
];

function Step({
  n,
  icon: Icon,
  title,
  desc,
  last,
}: {
  n: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-navy-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {n}
        </div>
        {!last && <div className="w-px flex-1 bg-navy-100 mt-2 min-h-[2rem]" />}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-gold-500" />
          <h4 className="font-semibold text-navy-800">{title}</h4>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
            Processo
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-800 mt-2 mb-4">
            Como funciona
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Dois fluxos distintos, cada um pensado para oferecer a melhor
            experiência ao cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Consultas */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-8">
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                Consultas
              </span>
            </div>
            {stepsConsulta.map((s, i) => (
              <Step
                key={s.n}
                {...s}
                last={i === stepsConsulta.length - 1}
              />
            ))}
          </div>

          {/* Serviços */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-8">
              <span className="bg-gold-100 text-gold-500 text-xs font-semibold px-3 py-1 rounded-full">
                Serviços
              </span>
            </div>
            {stepsServico.map((s, i) => (
              <Step
                key={s.n}
                {...s}
                last={i === stepsServico.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

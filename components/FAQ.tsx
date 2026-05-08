"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "Para consultas, aceitamos apenas PIX. Para serviços, aceitamos PIX, cartão de crédito e boleto bancário. Pagamentos à vista no serviço Limpa Nome têm 10% de desconto.",
  },
  {
    q: "Posso solicitar mais de uma consulta ao mesmo tempo?",
    a: "Sim! Você pode selecionar múltiplas consultas (Nome Sujo, Rating e/ou BACEN) de uma vez. O valor total é calculado automaticamente e você realiza um único pagamento.",
  },
  {
    q: "Em quanto tempo recebo o relatório de consulta?",
    a: "O relatório é entregue em até 48 horas úteis após a confirmação do pagamento. Em muitos casos, a entrega é ainda mais rápida.",
  },
  {
    q: "O relatório da Expert é diferente do relatório das birôs?",
    a: "Sim. Não enviamos o relatório bruto dos birôs de crédito. Nossa equipe analisa as informações e gera um relatório exclusivo com a marca Expert Soluções Financeiras, com interpretação e recomendações.",
  },
  {
    q: "Como funciona o contrato para os serviços?",
    a: "Após escolher o serviço e preencher seus dados, geramos um contrato personalizado que é enviado para assinatura eletrônica com validade jurídica pelo ICP-Brasil. Só após a assinatura o pagamento é solicitado.",
  },
  {
    q: "E se o serviço não for concluído com sucesso?",
    a: "Trabalhamos com total transparência. O valor restante dos serviços só é cobrado após a conclusão. Caso não seja possível concluir o serviço, não há cobrança do saldo final.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Todos os dados são tratados com total sigilo, em conformidade com a Lei Geral de Proteção de Dados (LGPD). Não compartilhamos suas informações com terceiros.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider">
            Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-800 mt-2 mb-4">
            Perguntas frequentes
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-navy-800 text-sm pr-4">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

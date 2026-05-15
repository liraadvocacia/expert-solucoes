import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarCodigoPedido } from "@/lib/pedido-utils";
import { gerarContratoPDF, type DadosContrato } from "@/lib/contrato-pdf";
import crypto from "crypto";

type TipoServico = "limpa-nome" | "rating-bancario" | "bacen";

const SERVICO_META: Record<string, { tipo: TipoServico; prazo: string }> = {
  "Limpa Nome":      { tipo: "limpa-nome",    prazo: "até 45 dias úteis" },
  "Rating Bancário": { tipo: "rating-bancario", prazo: "até 60 dias úteis" },
  "Serviço BACEN":  { tipo: "bacen",          prazo: "até 90 dias úteis" },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nome, cpf, cnpj, empresa, whatsapp, email,
    servico, valor, entrada, modalidade, parcelas, faixaCredito,
  } = body as {
    nome: string;
    cpf: string;
    cnpj?: string;
    empresa?: string;
    whatsapp: string;
    email?: string;
    servico: string;
    valor: number;
    entrada: number;
    modalidade?: string;
    parcelas?: number;
    faixaCredito?: string;
  };

  if (!nome || !cpf || !whatsapp || !servico || !valor) {
    return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
  }

  const meta = SERVICO_META[servico];
  if (!meta) {
    return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
  }

  const codigo = await gerarCodigoPedido();

  // Upsert cliente — CPF como chave única
  let cliente = await prisma.cliente.findUnique({ where: { cpf } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: { nome, cpf, cnpj, empresa, telefone: whatsapp, whatsapp, email },
    });
  } else {
    cliente = await prisma.cliente.update({
      where: { cpf },
      data: { nome, cnpj, empresa, telefone: whatsapp, whatsapp, email },
    });
  }

  const entradaFinal = entrada ?? 0;
  const restante = valor - entradaFinal;

  // Determina formaPagamento base pela modalidade
  const formaPagamento = (() => {
    if (!modalidade) return "pix";
    if (modalidade === "avista_pix" || modalidade === "entrada_50_50") return "pix";
    if (modalidade === "parcelado_cartao" || modalidade === "6x_cartao") return "cartao";
    if (modalidade === "boleto_parcelado") return "boleto";
    return "pix";
  })();

  // Cria o pedido
  const pedido = await prisma.pedido.create({
    data: {
      codigo,
      tipo: "servico",
      valorTotal: valor,
      formaPagamento,
      modalidade: modalidade ?? null,
      parcelas: parcelas ?? (
        modalidade === "parcelado_cartao" ? 5 :
        modalidade === "6x_cartao"        ? 5 :
        null
      ),
      valorEntrada: entradaFinal > 0 ? entradaFinal : null,
      faixaCredito: faixaCredito ?? null,
      clienteId: cliente.id,
      itens: {
        create: [{ nome: servico, valor }],
      },
      contrato: {
        create: {
          status: "pendente",
          signingToken: crypto.randomUUID(),
        },
      },
    },
    include: { itens: true, cliente: true, contrato: true },
  });

  // Gera PDF do contrato em background
  if (pedido.contrato) {
    const dadosContrato: DadosContrato = {
      codigo,
      tipoServico: meta.tipo,
      cliente: {
        nome: cliente.nome,
        cpf: cliente.cpf,
        cnpj: cliente.cnpj,
        empresa: cliente.empresa,
        email: cliente.email,
        telefone: cliente.telefone ?? cliente.whatsapp ?? "",
        whatsapp: cliente.whatsapp,
      },
      servico: {
        nome: servico,
        descricao: servico,
        valorTotal: valor,
        entrada: entradaFinal,
        restante,
        prazoEstimado: meta.prazo,
      },
      dataEmissao: new Date(),
    };

    gerarContratoPDF(dadosContrato)
      .then(async ({ filePath, hash }) => {
        await prisma.contrato.update({
          where: { id: pedido.contrato!.id },
          data: { documentoPath: filePath, documentoHash: hash },
        });
      })
      .catch((err) => {
        console.error("[Contrato PDF] Erro ao gerar:", err);
      });
  }

  return NextResponse.json(
    {
      ...pedido,
      signingToken: pedido.contrato?.signingToken,
      contratoId: pedido.contrato?.id,
      signingUrl: `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/assinar/${pedido.contrato?.signingToken}`,
    },
    { status: 201 }
  );
}

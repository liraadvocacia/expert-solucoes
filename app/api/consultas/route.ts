import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarCodigoPedido } from "@/lib/pedido-utils";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    nome, cpf, cnpj, empresa, telefone, whatsapp, email, itens,
  } = body as {
    nome: string;
    cpf: string;
    cnpj?: string;
    empresa?: string;
    telefone: string;
    whatsapp?: string;
    email?: string;
    itens: { nome: string; valor: number }[];
  };

  if (!nome || !cpf || !telefone || !itens?.length) {
    return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
  }

  const valorTotal = itens.reduce((acc, i) => acc + i.valor, 0);
  const codigo = await gerarCodigoPedido();

  let cliente = await prisma.cliente.findUnique({ where: { cpf } });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: { nome, cpf, cnpj, empresa, telefone, whatsapp, email },
    });
  } else {
    cliente = await prisma.cliente.update({
      where: { cpf },
      data: { nome, cnpj, empresa, telefone, whatsapp, email },
    });
  }

  const pedido = await prisma.pedido.create({
    data: {
      codigo,
      tipo: "consulta",
      valorTotal,
      formaPagamento: "pix",
      clienteId: cliente.id,
      itens: {
        create: itens.map((i) => ({ nome: i.nome, valor: i.valor })),
      },
    },
    include: { itens: true, cliente: true },
  });

  return NextResponse.json(pedido, { status: 201 });
}

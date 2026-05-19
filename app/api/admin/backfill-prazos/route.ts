import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

function addDiasUteis(data: Date, dias: number): Date {
  const d = new Date(data);
  let adicionados = 0;
  while (adicionados < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) adicionados++;
  }
  return d;
}

export async function POST(req: NextRequest) {
  void req;
  // Mesma proteção do painel admin
  const jar = await cookies();
  const sessao = jar.get("admin_session")?.value;
  if (sessao !== "ok") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Busca todos os pedidos Limpa Nome com contrato assinado e sem prazoFinal
  const pedidos = await prisma.pedido.findMany({
    where: {
      prazoFinal: null,
      itens: { some: { nome: { contains: "Limpa Nome" } } },
      contrato: { status: "assinado", assinadoEm: { not: null } },
    },
    include: {
      contrato: { select: { assinadoEm: true } },
    },
  });

  if (pedidos.length === 0) {
    return NextResponse.json({ ok: true, atualizados: 0, mensagem: "Nenhum pedido pendente." });
  }

  const atualizacoes = pedidos.map(p => {
    const prazo = addDiasUteis(p.contrato!.assinadoEm!, 45);
    return prisma.pedido.update({
      where: { id: p.id },
      data: { prazoFinal: prazo },
    });
  });

  await Promise.all(atualizacoes);

  const detalhes = pedidos.map(p => ({
    codigo: p.codigo,
    assinadoEm: p.contrato!.assinadoEm!.toISOString().split("T")[0],
    prazoFinal: addDiasUteis(p.contrato!.assinadoEm!, 45).toISOString().split("T")[0],
  }));

  return NextResponse.json({ ok: true, atualizados: pedidos.length, detalhes });
}

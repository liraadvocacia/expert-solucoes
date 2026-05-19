import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buscarCobranca } from "@/lib/cora";
import { enviarEmailConfirmacao } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      cliente:         true,
      itens:           true,
      contrato:        true,
      andamentos:      { orderBy: { createdAt: "asc" } },
      parcelasBoleto:  { orderBy: { numero: "asc" } },
      relatorioRating: true,
      limpaNomeOrgaos: true,
    },
  });

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // ── Fallback de polling: consulta a Cora diretamente se ainda aguardando ──
  // Garante que o pagamento seja detectado mesmo que o webhook não chegue.
  // Verifica pixCobrancaId (PIX puro) e boletoCobrancaId (Boleto+PIX ou boleto).
  const cobrancaIdParaPolling = pedido.pixCobrancaId ?? pedido.boletoCobrancaId;
  if (pedido.status === "aguardando_pagamento" && cobrancaIdParaPolling) {
    try {
      const cobranca = await buscarCobranca(cobrancaIdParaPolling);
      if (cobranca.status === "PAID") {
        const valorPago = (cobranca.total_amount ?? 0) / 100;
        const novoValorPago = pedido.valorPago + valorPago;
        const novoPagoTotal = novoValorPago >= pedido.valorTotal;

        const atualizado = await prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            valorPago: novoValorPago,
            status: novoPagoTotal ? "em_andamento" : "aguardando_pagamento",
          },
          include: {
            cliente:        true,
            itens:          true,
            contrato:       true,
            andamentos:     { orderBy: { createdAt: "asc" } },
            parcelasBoleto: { orderBy: { numero: "asc" } },
            relatorioRating: true,
          },
        });

        if (novoPagoTotal && pedido.cliente.email) {
          await enviarEmailConfirmacao({
            clienteNome: pedido.cliente.nome,
            clienteEmail: pedido.cliente.email,
            pedidoCodigo: pedido.codigo,
            pedidoTipo: pedido.tipo,
            valorTotal: pedido.valorTotal,
            itens: pedido.itens.map((i) => ({ nome: i.nome, valor: i.valor })),
          });
        }

        console.log(`[Pedido ${pedido.codigo}] Pago detectado via polling Cora (fallback)`);
        return NextResponse.json(atualizado);
      }
    } catch (err) {
      // Silencia erros (ID de staging, rede, etc.) — retorna estado do banco
      console.warn("[Pedido Status] Não foi possível verificar na Cora:", (err as Error).message);
    }
  }

  return NextResponse.json(pedido);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // limpaNomeOrgaos é tratado como upsert separado
  const { limpaNomeOrgaos, ...pedidoData } = body;

  const pedido = await prisma.pedido.update({
    where: { id },
    data: pedidoData,
    include: {
      cliente:         true,
      itens:           true,
      contrato:        true,
      limpaNomeOrgaos: true,
    },
  });

  if (limpaNomeOrgaos) {
    await prisma.limpaNomeOrgaos.upsert({
      where:  { pedidoId: id },
      create: { pedidoId: id, ...limpaNomeOrgaos },
      update: { ...limpaNomeOrgaos },
    });
  }

  return NextResponse.json(pedido);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verifica palavra de confirmação enviada no body
  const body = await req.json().catch(() => ({}));
  if (body.confirmacao !== "APAGAR") {
    return NextResponse.json({ error: "Confirmação inválida." }, { status: 400 });
  }

  const pedido = await prisma.pedido.findUnique({ where: { id } });
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  // Apaga dependentes antes do pedido (sem cascade no schema)
  await prisma.andamento.deleteMany({ where: { pedidoId: id } });
  await prisma.contrato.deleteMany({ where: { pedidoId: id } });
  await prisma.itemPedido.deleteMany({ where: { pedidoId: id } });
  await prisma.pedido.delete({ where: { id } });

  console.log(`[Admin] Pedido ${pedido.codigo} excluído manualmente.`);
  return NextResponse.json({ ok: true, codigo: pedido.codigo });
}

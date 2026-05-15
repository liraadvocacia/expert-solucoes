import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buscarCobranca } from "@/lib/cora";
import { verificarPagamento as verificarInfinityPay } from "@/lib/infinitypay";
import { enviarEmailConfirmacao } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: { cliente: true, itens: true, contrato: true, andamentos: { orderBy: { createdAt: "asc" } } },
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
          include: { cliente: true, itens: true, contrato: true, andamentos: { orderBy: { createdAt: "asc" } } },
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

  // ── Fallback de polling: InfinityPay (cartão) ─────────────────────────────
  // Verifica se o cartão foi pago caso o webhook não tenha chegado.
  if (pedido.status === "aguardando_pagamento" && pedido.formaPagamento === "cartao" && pedido.codigo) {
    try {
      const check = await verificarInfinityPay({ orderNsu: pedido.codigo });
      if (check.pago) {
        const novoValorPago = pedido.valorPago + check.valorPago;
        const novoPagoTotal = novoValorPago >= pedido.valorTotal;

        const atualizado = await prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            valorPago: novoValorPago,
            status: novoPagoTotal ? "em_andamento" : "aguardando_pagamento",
          },
          include: { cliente: true, itens: true, contrato: true, andamentos: { orderBy: { createdAt: "asc" } } },
        });

        if (novoPagoTotal && pedido.cliente.email) {
          await enviarEmailConfirmacao({
            clienteNome:  pedido.cliente.nome,
            clienteEmail: pedido.cliente.email,
            pedidoCodigo: pedido.codigo,
            pedidoTipo:   pedido.tipo,
            valorTotal:   pedido.valorTotal,
            itens:        pedido.itens.map((i) => ({ nome: i.nome, valor: i.valor })),
          });
        }

        console.log(`[Pedido ${pedido.codigo}] Pago detectado via polling InfinityPay (fallback)`);
        return NextResponse.json(atualizado);
      }
    } catch (err) {
      console.warn("[Pedido Status] Não foi possível verificar no InfinityPay:", (err as Error).message);
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

  const pedido = await prisma.pedido.update({
    where: { id },
    data: body,
    include: { cliente: true, itens: true, contrato: true },
  });

  return NextResponse.json(pedido);
}

/**
 * Cliente InfinityPay — Checkout Integrado
 * Documentação: https://www.infinitepay.io/checkout-documentacao
 *
 * Variáveis de ambiente necessárias:
 *   INFINITYPAY_HANDLE   — InfiniteTag do lojista (sem o $)
 *   NEXT_PUBLIC_BASE_URL — URL base da aplicação (ex: https://expertsolucoesfinanceiras.com.br)
 */

const BASE_URL = "https://api.checkout.infinitepay.io";

function getHandle(): string {
  const handle = process.env.INFINITYPAY_HANDLE;
  if (!handle) throw new Error("INFINITYPAY_HANDLE não configurado no ambiente.");
  return handle;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface InfinityPayLinkResponse {
  /** URL do checkout InfinityPay para redirecionar o cliente */
  checkoutUrl: string;
  /** order_nsu enviado (= pedido.codigo) */
  orderNsu: string;
}

export interface InfinityPayPaymentCheck {
  pago: boolean;
  valorPago: number;   // em reais
  parcelas: number;
  metodo: string;      // "credit_card" | "pix" etc.
}

// ─── Criar link de pagamento ──────────────────────────────────────────────────

export async function criarLinkPagamento(params: {
  pedidoCodigo: string;
  valorReais: number;
  descricao: string;
  cliente: {
    nome: string;
    email?: string | null;
    telefone?: string | null;
  };
  redirectUrl: string;
  webhookUrl: string;
}): Promise<InfinityPayLinkResponse> {
  const handle = getHandle();

  const body = {
    handle,
    items: [
      {
        quantity: 1,
        price: Math.round(params.valorReais * 100), // centavos
        description: params.descricao,
      },
    ],
    order_nsu: params.pedidoCodigo,
    redirect_url: params.redirectUrl,
    webhook_url: params.webhookUrl,
    customer: {
      name: params.cliente.nome,
      ...(params.cliente.email    ? { email:        params.cliente.email    } : {}),
      ...(params.cliente.telefone ? { phone_number: params.cliente.telefone } : {}),
    },
  };

  const res = await fetch(`${BASE_URL}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`InfinityPay /links falhou (${res.status}): ${text}`);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`InfinityPay retornou resposta inválida: ${text}`);
  }

  // A API pode retornar a URL em diferentes campos — cobrir os principais
  const checkoutUrl =
    (data.checkout_url as string | undefined) ??
    (data.payment_url  as string | undefined) ??
    (data.url          as string | undefined) ??
    (data.link         as string | undefined) ??
    null;

  if (!checkoutUrl) {
    console.error("[InfinityPay] Resposta sem URL de checkout:", data);
    throw new Error("InfinityPay não retornou URL de checkout. Verifique o INFINITYPAY_HANDLE.");
  }

  return { checkoutUrl, orderNsu: params.pedidoCodigo };
}

// ─── Verificar status do pagamento ────────────────────────────────────────────

export async function verificarPagamento(params: {
  orderNsu: string;
  transactionNsu?: string;
  slug?: string;
}): Promise<InfinityPayPaymentCheck> {
  const handle = getHandle();

  const res = await fetch(`${BASE_URL}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      order_nsu: params.orderNsu,
      ...(params.transactionNsu ? { transaction_nsu: params.transactionNsu } : {}),
      ...(params.slug           ? { slug:            params.slug           } : {}),
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`InfinityPay /payment_check falhou (${res.status}): ${text}`);
  }

  const data = JSON.parse(text) as {
    success?: boolean;
    paid?: boolean;
    paid_amount?: number;
    amount?: number;
    installments?: number;
    capture_method?: string;
  };

  return {
    pago:      data.paid === true || data.success === true,
    valorPago: ((data.paid_amount ?? data.amount ?? 0) / 100),
    parcelas:  data.installments ?? 1,
    metodo:    data.capture_method ?? "credit_card",
  };
}

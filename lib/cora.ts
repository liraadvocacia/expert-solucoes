/**
 * Cliente Cora API — Integração Direta com mTLS
 * Documentação: https://developers.cora.com.br/
 *
 * Variáveis de ambiente necessárias:
 *   CORA_CLIENT_ID        — client_id obtido no portal Cora (Conta > Integrações via APIs)
 *   CORA_CERT_BASE64      — certificate.pem em base64
 *   CORA_KEY_BASE64       — private-key.key em base64
 *   CORA_ENV              — "sandbox" | "production" (default: "sandbox")
 */

import { Agent } from "undici";

const isSandbox = (process.env.CORA_ENV ?? "sandbox") !== "production";

const BASE_URL = isSandbox
  ? "https://matls-clients.api.stage.cora.com.br"
  : "https://matls-clients.api.cora.com.br";

// Cache de token em memória (24h)
let cachedToken: { value: string; expiresAt: number } | null = null;

function getDispatcher(): Agent {
  const certB64 = process.env.CORA_CERT_BASE64;
  const keyB64 = process.env.CORA_KEY_BASE64;

  if (!certB64 || !keyB64) {
    throw new Error(
      "CORA_CERT_BASE64 e CORA_KEY_BASE64 são obrigatórios. " +
        "Codifique o certificate.pem e private-key.key em base64 e adicione ao .env"
    );
  }

  return new Agent({
    connect: {
      cert: Buffer.from(certB64, "base64").toString("utf-8"),
      key: Buffer.from(keyB64, "base64").toString("utf-8"),
      rejectUnauthorized: true,
    },
  });
}

async function fetchToken(): Promise<string> {
  const clientId = process.env.CORA_CLIENT_ID;
  if (!clientId) throw new Error("CORA_CLIENT_ID não configurado");

  const dispatcher = getDispatcher();

  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }),
    // @ts-expect-error — undici dispatcher (tipagem do fetch nativo não expõe)
    dispatcher,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cora auth falhou (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  return data.access_token;
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.value;
  }
  const token = await fetchToken();
  cachedToken = { value: token, expiresAt: now + 24 * 60 * 60 * 1000 };
  return token;
}

async function coraFetch(path: string, options: RequestInit & { idempotencyKey?: string } = {}) {
  const token = await getToken();
  const dispatcher = getDispatcher();
  const { idempotencyKey, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    // @ts-expect-error — undici dispatcher
    dispatcher,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cora API ${path} falhou (${res.status}): ${text}`);
  }

  return JSON.parse(text);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CoraCharge {
  id: string;
  status: "DRAFT" | "OPEN" | "IN_PAYMENT" | "PAID" | "LATE" | "CANCELLED";
  total_amount: number;
  code: string;
  /** PIX — presente quando payment_forms inclui "PIX" */
  pix?: { emv: string };
  /** Boleto — presente quando payment_forms inclui "BANK_SLIP" */
  payment_options?: {
    bank_slip?: { url: string; digitable_line?: string };
    credit_card?: { checkout_url: string };
  };
  /** URL de checkout para cartão de crédito */
  checkout_url?: string;
}

export interface CreateChargeParams {
  /** Código interno do pedido — será o `code` na cobrança Cora */
  codigo: string;
  /** Valor em reais (ex: 129.80) */
  valorReais: number;
  /** Data de vencimento no formato YYYY-MM-DD */
  vencimento: string;
  cliente: {
    nome: string;
    cpf: string;
    email?: string | null;
  };
  servicos: { nome: string; descricao?: string; valorReais: number }[];
  /** Número de parcelas (padrão: 1) */
  parcelas?: number;
}

// ─── Construtor de body compartilhado ─────────────────────────────────────────

function buildInvoiceBody(
  params: CreateChargeParams,
  paymentForms: string[]
) {
  const { codigo, vencimento, cliente, servicos, parcelas = 1 } = params;
  const cpfLimpo = cliente.cpf.replace(/\D/g, "");

  return {
    code: codigo,
    customer: {
      name: cliente.nome,
      ...(cliente.email ? { email: cliente.email } : {}),
      document: { identity: cpfLimpo, type: "CPF" },
    },
    services: servicos.map((s) => ({
      name: s.nome,
      description: s.descricao ?? s.nome,
      amount: Math.round(s.valorReais * 100), // centavos
    })),
    payment_terms: {
      due_date: vencimento,
      ...(parcelas > 1
        ? { installments: { quantity: parcelas, type: "MONTHLY" } }
        : {}),
    },
    payment_forms: paymentForms,
  };
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

/**
 * Cria uma cobrança PIX na Cora.
 */
export async function criarCobrancaPix(params: CreateChargeParams): Promise<CoraCharge> {
  const body = buildInvoiceBody(params, ["PIX"]);
  return await coraFetch("/v2/invoices/", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey: crypto.randomUUID(),
  }) as CoraCharge;
}

/**
 * Cria uma cobrança de boleto bancário na Cora.
 * Retorna a URL do boleto em `payment_options.bank_slip.url`.
 */
export async function criarCobrancaBoleto(params: CreateChargeParams): Promise<CoraCharge> {
  const body = buildInvoiceBody(params, ["BANK_SLIP"]);
  return await coraFetch("/v2/invoices/", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey: crypto.randomUUID(),
  }) as CoraCharge;
}

/**
 * Cria uma cobrança de cartão de crédito na Cora (parcelado ou à vista).
 * Retorna a URL do checkout de cartão em `checkout_url` ou `payment_options.credit_card.checkout_url`.
 */
export async function criarCobrancaCartao(params: CreateChargeParams): Promise<CoraCharge> {
  const body = buildInvoiceBody(params, ["CREDIT_CARD"]);
  return await coraFetch("/v2/invoices/", {
    method: "POST",
    body: JSON.stringify(body),
    idempotencyKey: crypto.randomUUID(),
  }) as CoraCharge;
}

/**
 * Busca o status de uma cobrança pelo ID Cora.
 */
export async function buscarCobranca(cobrancaId: string): Promise<CoraCharge> {
  return await coraFetch(`/v2/invoices/${cobrancaId}`) as CoraCharge;
}

/**
 * Registra o webhook de pagamento (chamar uma vez no setup).
 * url: URL pública que a Cora vai chamar ao confirmar pagamento.
 */
export async function registrarWebhook(url: string) {
  return await coraFetch("/endpoints/", {
    method: "POST",
    body: JSON.stringify({
      url,
      resource: "invoice",
      trigger: "paid",
    }),
    idempotencyKey: crypto.randomUUID(),
  });
}

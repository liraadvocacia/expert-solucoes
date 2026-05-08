import { NextResponse } from "next/server";
import { registrarWebhook } from "@/lib/cora";

/**
 * GET /api/webhooks/cora/setup
 *
 * Registra o webhook de pagamento na Cora.
 * Chamar APENAS UMA VEZ após configurar CORA_CLIENT_ID, CORA_CERT_BASE64
 * e CORA_KEY_BASE64 no .env.
 *
 * Após receber a resposta:
 *   1. Copie o campo "secret" retornado pela Cora
 *   2. Cole-o em CORA_WEBHOOK_SECRET no .env
 *   3. Reinicie o servidor
 *
 * Em dev: exponha localhost com ngrok e atualize NEXT_PUBLIC_BASE_URL antes de chamar.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl || baseUrl === "http://localhost:3000") {
    return NextResponse.json(
      {
        error:
          "Configure NEXT_PUBLIC_BASE_URL com a URL pública do servidor antes de registrar o webhook. " +
          "Em dev, use ngrok: npx ngrok http 3000",
      },
      { status: 400 }
    );
  }

  const webhookUrl = `${baseUrl}/api/webhooks/cora`;

  try {
    const result = await registrarWebhook(webhookUrl);

    const secret = (result as Record<string, unknown>).secret as string | undefined;

    return NextResponse.json({
      ok: true,
      mensagem: "Webhook registrado com sucesso!",
      webhookUrl,
      endpoint: result,
      proximo_passo: secret
        ? `Copie o secret abaixo e cole em CORA_WEBHOOK_SECRET no .env, depois reinicie o servidor.`
        : "Verifique no painel Cora o secret do webhook e cole em CORA_WEBHOOK_SECRET no .env.",
      CORA_WEBHOOK_SECRET: secret ?? "(não retornado — verifique no painel Cora)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

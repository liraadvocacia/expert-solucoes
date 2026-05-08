/**
 * Sessão admin — cookie HTTP-only assinado com HMAC-SHA256.
 * Usa Web Crypto API (crypto.subtle) — compatível com Edge runtime e Node.js 20+.
 */

export const COOKIE_NAME_EXPORT = "expert_admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET não configurado");
  return secret;
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Gera um token assinado: `{expiresAt}.{hmacHex}` */
export async function criarToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = String(expiresAt);
  const enc = new TextEncoder();
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const hmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${hmac}`;
}

/** Verifica o token — retorna true se válido e não expirado */
export async function verificarToken(token: string): Promise<boolean> {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;
  const payload = token.slice(0, dotIdx);
  const hmex = token.slice(dotIdx + 1);

  // Verifica expiração antes de fazer criptografia
  const expiresAt = Number(payload);
  if (isNaN(expiresAt) || Date.now() >= expiresAt) return false;

  const enc = new TextEncoder();
  const key = await getKey(getSecret());

  // Converte hex → Uint8Array
  const sigBytes = new Uint8Array(
    hmex.match(/.{2}/g)?.map((b) => parseInt(b, 16)) ?? []
  );

  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
}

/** Cabeçalho Set-Cookie para autenticar */
export async function cookieLogin(): Promise<string> {
  const token = await criarToken();
  const maxAge = SESSION_DURATION_MS / 1000;
  return `${COOKIE_NAME_EXPORT}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/** Cabeçalho Set-Cookie para deslogar */
export function cookieLogout(): string {
  return `${COOKIE_NAME_EXPORT}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

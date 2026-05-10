import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "expert_admin_session";
const ROTA_LOGIN = "/login";

async function verificarToken(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;

  const payload = token.slice(0, dotIdx);
  const hmex = token.slice(dotIdx + 1);

  const expiresAt = Number(payload);
  if (isNaN(expiresAt) || Date.now() >= expiresAt) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(
    (hmex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16))
  );

  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === ROTA_LOGIN) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valido = token ? await verificarToken(token) : false;

  if (!valido) {
    const url = req.nextUrl.clone();
    url.pathname = ROTA_LOGIN;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

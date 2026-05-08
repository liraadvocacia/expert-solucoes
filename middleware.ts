import { NextRequest, NextResponse } from "next/server";
import { verificarToken, COOKIE_NAME_EXPORT } from "@/lib/session";

const ROTA_LOGIN = "/admin/login";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Não bloqueia a própria página de login
  if (pathname === ROTA_LOGIN) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME_EXPORT)?.value;
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

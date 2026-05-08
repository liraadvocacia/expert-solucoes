import { NextRequest, NextResponse } from "next/server";
import { cookieLogin } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { senha } = await req.json() as { senha: string };

  const senhaCorreta = process.env.ADMIN_PASSWORD;
  if (!senhaCorreta) {
    return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
  }

  if (!senha || senha !== senhaCorreta) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const cookie = await cookieLogin();
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}

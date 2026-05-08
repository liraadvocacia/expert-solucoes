import { prisma } from "@/lib/db";

let counter = 0;

export async function gerarCodigoPedido(): Promise<string> {
  const count = await prisma.pedido.count();
  counter = count + 1;
  return `PED-${String(counter).padStart(3, "0")}`;
}

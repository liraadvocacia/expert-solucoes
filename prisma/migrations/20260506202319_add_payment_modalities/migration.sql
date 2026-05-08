-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "boletoCobrancaId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "boletoUrl" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "cartaoCheckoutUrl" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "cartaoCobrancaId" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "faixaCredito" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "modalidade" TEXT;
ALTER TABLE "Pedido" ADD COLUMN "parcelas" INTEGER;
ALTER TABLE "Pedido" ADD COLUMN "valorEntrada" REAL;

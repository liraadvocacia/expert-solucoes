-- CreateTable
CREATE TABLE "ParcelaBoleto" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pagoEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,

    CONSTRAINT "ParcelaBoleto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ParcelaBoleto" ADD CONSTRAINT "ParcelaBoleto_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

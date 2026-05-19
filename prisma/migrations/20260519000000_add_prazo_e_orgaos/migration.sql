-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "prazoFinal" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LimpaNomeOrgaos" (
    "id" TEXT NOT NULL,
    "serasa" TEXT NOT NULL DEFAULT 'pendente',
    "spc" TEXT NOT NULL DEFAULT 'pendente',
    "boaVista" TEXT NOT NULL DEFAULT 'pendente',
    "protestos" TEXT NOT NULL DEFAULT 'pendente',
    "pedidoId" TEXT NOT NULL,

    CONSTRAINT "LimpaNomeOrgaos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LimpaNomeOrgaos_pedidoId_key" ON "LimpaNomeOrgaos"("pedidoId");

-- AddForeignKey
ALTER TABLE "LimpaNomeOrgaos" ADD CONSTRAINT "LimpaNomeOrgaos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

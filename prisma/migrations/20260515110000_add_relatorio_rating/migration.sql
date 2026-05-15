-- CreateTable
CREATE TABLE "RelatorioRating" (
    "id" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "descricaoClasse" TEXT NOT NULL,
    "rendaPresumida" DOUBLE PRECISION NOT NULL,
    "comprometimento" DOUBLE PRECISION NOT NULL,
    "capacidadeMensal" DOUBLE PRECISION NOT NULL,
    "pontualidade" DOUBLE PRECISION,
    "pontualidadeMax" DOUBLE PRECISION,
    "pendenciasJson" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,

    CONSTRAINT "RelatorioRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelatorioRating_pedidoId_key" ON "RelatorioRating"("pedidoId");

-- AddForeignKey
ALTER TABLE "RelatorioRating" ADD CONSTRAINT "RelatorioRating_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

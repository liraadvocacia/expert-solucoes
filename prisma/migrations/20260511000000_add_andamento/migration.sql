-- CreateTable
CREATE TABLE "Andamento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,

    CONSTRAINT "Andamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

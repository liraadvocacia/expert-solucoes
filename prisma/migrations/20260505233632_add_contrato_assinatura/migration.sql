/*
  Warnings:

  - You are about to drop the column `assinaturaId` on the `Contrato` table. All the data in the column will be lost.
  - You are about to drop the column `assinaturaUrl` on the `Contrato` table. All the data in the column will be lost.
  - You are about to drop the column `documentoUrl` on the `Contrato` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signingToken" TEXT,
    "documentoPath" TEXT,
    "documentoHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "assinadoEm" DATETIME,
    "assinaturaPath" TEXT,
    "assinaturaHash" TEXT,
    "nomeAssinante" TEXT,
    "signingIp" TEXT,
    "signingUserAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,
    CONSTRAINT "Contrato_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contrato" ("createdAt", "id", "pedidoId", "status") SELECT "createdAt", "id", "pedidoId", "status" FROM "Contrato";
DROP TABLE "Contrato";
ALTER TABLE "new_Contrato" RENAME TO "Contrato";
CREATE UNIQUE INDEX "Contrato_signingToken_key" ON "Contrato"("signingToken");
CREATE UNIQUE INDEX "Contrato_pedidoId_key" ON "Contrato"("pedidoId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

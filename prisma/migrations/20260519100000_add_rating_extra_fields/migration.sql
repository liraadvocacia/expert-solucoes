-- Add extra fields to RelatorioRating for PDF regeneration
ALTER TABLE "RelatorioRating" ADD COLUMN "score"          DOUBLE PRECISION;
ALTER TABLE "RelatorioRating" ADD COLUMN "scoreMax"       DOUBLE PRECISION;
ALTER TABLE "RelatorioRating" ADD COLUMN "conclusao"      TEXT;
ALTER TABLE "RelatorioRating" ADD COLUMN "dataNascimento" TEXT;
ALTER TABLE "RelatorioRating" ADD COLUMN "dataConsulta"   TIMESTAMP(3);

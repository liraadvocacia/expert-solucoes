import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist é ESM-only — excluir do bundle webpack para usar import nativo em runtime
  // pdfjs-dist é usado apenas no browser (client component) — sem dependências server-side
};

export default nextConfig;

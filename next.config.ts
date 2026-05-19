import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist é ESM-only — excluir do bundle webpack para usar import nativo em runtime
  // pdfjs-dist e seu build legacy devem rodar nativamente em Node.js (não bundlado pelo webpack)
  serverExternalPackages: ["pdfjs-dist", "pdfjs-dist/legacy/build/pdf.mjs"],
};

export default nextConfig;

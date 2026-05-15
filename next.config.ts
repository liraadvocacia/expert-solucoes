import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist é ESM-only — excluir do bundle webpack para usar import nativo em runtime
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;

import type { NextConfig } from "next";

// In dev: Next.js(3000) → FastAPI(8000). In prod: Next.js(8000) → FastAPI(3001 internal).
const internalApiUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

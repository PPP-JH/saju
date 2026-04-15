import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Static export for production (served by FastAPI).
  // Omitted in dev so Next.js server mode is used and rewrites work.
  ...(isDev ? {} : { output: "export" }),

  // In dev, proxy /api/* to the FastAPI backend so there's no CORS preflight.
  ...(isDev && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:8000/api/:path*",
        },
      ];
    },
  }),
};

export default nextConfig;

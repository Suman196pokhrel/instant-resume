import type { NextConfig } from "next";

// Cache Components / PPR stay off: the per-request CSP nonce (proxy.ts) needs dynamic rendering.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

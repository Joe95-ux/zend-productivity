import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Ignore WASM files that Prisma might try to import
    config.resolve.alias = {
      ...config.resolve.alias,
      ".prisma/client/wasm-edge-light-loader": false,
      "./query_engine_bg.wasm?module": false,
    };
    return config;
  },
};

export default nextConfig;

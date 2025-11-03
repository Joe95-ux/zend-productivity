import type { NextConfig } from "next";
import { NormalModuleReplacementPlugin } from "webpack";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Replace WASM loader with an empty stub module
    config.plugins = [
      ...config.plugins,
      new NormalModuleReplacementPlugin(
        /\.prisma\/client\/wasm-edge-light-loader\.mjs$/,
        require.resolve("./lib/prisma-wasm-stub.js")
      ),
    ];
    
    // Ignore WASM file imports
    config.resolve.alias = {
      ...config.resolve.alias,
      ".prisma/client/wasm-edge-light-loader": require.resolve("./lib/prisma-wasm-stub.js"),
    };
    
    return config;
  },
  // Externalize Prisma client for server-side to avoid bundling issues
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;

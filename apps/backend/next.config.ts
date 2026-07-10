import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @deef/shared ships TypeScript source directly; Next transpiles it
  transpilePackages: ["@deef/shared"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript still runs through npm prebuild; this avoids a Next 16 worker crash.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 2,
    viewTransition: true,
  },
};

export default nextConfig;

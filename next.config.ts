import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "postgres", "web-push"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "postgres", "web-push"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: { unoptimized: true },
  poweredByHeader: false,
  // fonts read from disk when rendering shareable images
  outputFileTracingIncludes: { "/api/status-image/[id]": ["./src/assets/fonts/**"], "/api/greeting/[id]": ["./src/assets/fonts/**"] },
};

export default nextConfig;

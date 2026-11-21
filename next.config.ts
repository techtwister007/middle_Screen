import type { NextConfig } from "next";

/**
 * Rename support without middleware (zero cost per request): old hostnames in APP_ALIAS_HOSTS
 * permanently redirect to APP_URL so every link ever shared keeps working. Set at build time.
 */
const aliasHosts = (process.env.APP_ALIAS_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    if (!appUrl) return [];
    return aliasHosts.map((host) => ({ source: "/:path*", has: [{ type: "host" as const, value: host }], destination: `${appUrl}/:path*`, permanent: true }));
  },
  serverExternalPackages: ["sharp", "postgres", "web-push"],
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: { unoptimized: true },
  poweredByHeader: false,
  // fonts read from disk when rendering shareable images
  outputFileTracingIncludes: { "/api/status-image/[id]": ["./src/assets/fonts/**"], "/api/greeting/[id]": ["./src/assets/fonts/**"] },
};

export default nextConfig;

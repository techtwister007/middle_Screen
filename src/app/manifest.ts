import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — Agent`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#1f4d36",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

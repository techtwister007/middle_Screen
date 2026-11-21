/**
 * Single source of truth for product branding.
 * Rename the product by changing these values (or the NEXT_PUBLIC_* env vars).
 * Nothing else in the codebase hard-codes the product name.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "PropPulse",
  company: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "VectorScale",
  companyUrl: process.env.NEXT_PUBLIC_COMPANY_URL ?? "https://vectorscale.in",
  tagline: process.env.NEXT_PUBLIC_PRODUCT_TAGLINE ?? "Know which buyer is ready to visit.",
  description:
    "Send property photos on WhatsApp, get a beautiful branded link, and see exactly which buyer opened it, liked it and wants a site visit.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@vectorscale.in",
  /** Primary brand colour (used for the product UI, not agent pages). */
  primary: "#0f766e",
} as const;

export const poweredBy = `Powered by ${brand.name} · a ${brand.company} product`;

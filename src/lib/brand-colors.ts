/** Curated agent colours: all keep white text readable on top. */
export const BRAND_COLORS: [hex: string, name: string][] = [
  ["#1f4d36", "Forest"], ["#0f6b5f", "Teal"], ["#2b3c8c", "Indigo"], ["#1e3a5f", "Navy"], ["#7a1f2b", "Maroon"],
  ["#a3401f", "Terracotta"], ["#5b2a5e", "Plum"], ["#8a5a12", "Mustard"], ["#2b2d31", "Charcoal"], ["#0369a1", "Ocean"],
];

const ALIASES: Record<string, string> = { green: "Forest", "dark green": "Forest", blue: "Indigo", "dark blue": "Navy", red: "Maroon", orange: "Terracotta", brown: "Terracotta", purple: "Plum", violet: "Plum", yellow: "Mustard", gold: "Mustard", black: "Charcoal", grey: "Charcoal", gray: "Charcoal", "sky blue": "Ocean", sea: "Ocean" };

/** Relative luminance (WCAG) of a #rrggbb colour. */
export function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Contrast of white text on this colour; 4.5 is the WCAG minimum for body text. */
export const whiteContrast = (hex: string) => 1.05 / (luminance(hex) + 0.05);

/**
 * Turn what an agent typed ("maroon", "blue", "#123abc", "123abc") into a colour.
 * Returns an error message for colours too light for white text.
 */
export function parseBrandColor(input: string): { hex: string; name: string } | { error: string } {
  const q = input.trim().toLowerCase();
  const named = BRAND_COLORS.find(([, n]) => n.toLowerCase() === q) ?? BRAND_COLORS.find(([, n]) => n === ALIASES[q]);
  if (named) return { hex: named[0], name: named[1] };
  const m = q.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/);
  if (!m) return { error: "unknown" };
  const hex = "#" + (m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1]);
  if (whiteContrast(hex) < 4.5) return { error: "light" };
  return { hex, name: hex };
}

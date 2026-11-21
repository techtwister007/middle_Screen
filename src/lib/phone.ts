/**
 * Normalise an Indian / international phone number to digits with country code (no +).
 * "98123 45678" → "919812345678", "+91-98123-45678" → "919812345678".
 * Returns null when the input cannot be a valid number.
 */
export function normalizePhone(input: string | null | undefined, defaultCc = "91"): string | null {
  if (!input) return null;
  let d = String(input).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = defaultCc + d.slice(1);
  else if (d.length === 10) d = defaultCc + d;
  d = d.replace(/\D/g, "");
  if (d.length < 11 || d.length > 15) return null;
  return d;
}

export function formatPhone(p: string | null | undefined): string {
  if (!p) return "";
  if (p.startsWith("91") && p.length === 12) return `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
  return `+${p}`;
}

export function maskPhone(p: string | null | undefined): string {
  if (!p) return "";
  const f = formatPhone(p);
  return f.slice(0, -4).replace(/\d/g, (c, i) => (i < 6 ? c : "x")) + f.slice(-4);
}

export function waLink(phone: string, text?: string): string {
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

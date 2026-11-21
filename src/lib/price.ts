/** Lowering the price remembers the old one ("Price reduced"); raising it back to or above that clears it. */
export function priceDropFields(cur: { price: number | null; prevPrice: number | null }, next: number | null) {
  if (cur.price != null && next != null && next < cur.price) return { prevPrice: cur.prevPrice != null && cur.prevPrice > cur.price ? cur.prevPrice : cur.price, priceDroppedAt: new Date() };
  if (cur.prevPrice != null && (next == null || next >= cur.prevPrice)) return { prevPrice: null, priceDroppedAt: null };
  return {};
}

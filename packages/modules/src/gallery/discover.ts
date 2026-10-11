export interface DesignLike {
  id: string | number
  priceFrom?: number | null
  durationMinutes?: number | null
  occasions?: string[] | null
  category?: string | null
  colors?: string[] | null
  featured?: boolean | null
  likes?: number | null
}

export interface TasteProfile {
  liked: DesignLike[]
  skipped: DesignLike[]
}

/** Scores a design against what a customer liked and skipped in the taste builder. */
export const tasteScore = (design: DesignLike, taste: TasteProfile): number => {
  const weight = (list: DesignLike[]) => {
    let s = 0
    for (const d of list) {
      if (d.category && d.category === design.category) s += 2
      for (const o of design.occasions ?? []) if (d.occasions?.includes(o)) s += 1
      for (const c of design.colors ?? []) if (d.colors?.includes(c)) s += 1
    }
    return s
  }
  return weight(taste.liked) - weight(taste.skipped) * 0.75 + (design.featured ? 1 : 0)
}

export const rankByTaste = <T extends DesignLike>(designs: T[], taste: TasteProfile): T[] =>
  [...designs].sort((a, b) => tasteScore(b, taste) - tasteScore(a, taste))

/** "Surprise me within ₹X": designs within budget and time, best first. */
export const surpriseMe = <T extends DesignLike>(designs: T[], budget: number, maxMinutes?: number): T[] =>
  designs
    .filter((d) => (d.priceFrom ?? 0) <= budget && (!maxMinutes || (d.durationMinutes ?? 0) <= maxMinutes))
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.likes ?? 0) - (a.likes ?? 0))

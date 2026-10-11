import sharp from 'sharp'

/**
 * Generates "press-on set" product shots for demo galleries: five almond nails fanned out on a
 * soft background. Purely synthetic so demos never use anyone's real photos without permission.
 */
export type NailStyle = 'solid' | 'french' | 'chrome' | 'cat-eye' | 'ombre' | 'glitter' | 'garba' | 'moon' | 'dots' | 'marble' | 'diya' | 'lace'

export interface NailSpec {
  style: NailStyle
  base: string
  accent: string
  background: [string, string]
  /** Nail length factor 0.8 (short) .. 1.3 (long) */
  length?: number
}

const nailPath = (w: number, h: number) =>
  // Almond shape centred on (0,0), pointing up, with a rounded cuticle base.
  `M0 ${-h / 2} C ${w * 0.42} ${-h * 0.42}, ${w * 0.5} ${-h * 0.05}, ${w * 0.5} ${h * 0.2} C ${w * 0.5} ${h * 0.45}, ${w * 0.3} ${h * 0.5}, 0 ${h * 0.5} C ${-w * 0.3} ${h * 0.5}, ${-w * 0.5} ${h * 0.45}, ${-w * 0.5} ${h * 0.2} C ${-w * 0.5} ${-h * 0.05}, ${-w * 0.42} ${-h * 0.42}, 0 ${-h / 2} Z`

const seeded = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280
  return seed / 233280
}

const patternFor = (spec: NailSpec, id: string, w: number, h: number, rand: () => number) => {
  const { style, base, accent } = spec
  switch (style) {
    case 'french':
      return {
        fill: base,
        overlay: `<path d="M${-w * 0.55} ${-h * 0.18} Q 0 ${-h * 0.32} ${w * 0.55} ${-h * 0.18} L ${w * 0.6} ${-h * 0.7} L ${-w * 0.6} ${-h * 0.7} Z" fill="${accent}" clip-path="url(#clip-${id})"/>`,
      }
    case 'chrome':
      return {
        fill: `url(#chrome-${id})`,
        defs: `<linearGradient id="chrome-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${base}"/><stop offset="0.55" stop-color="#fafafa"/><stop offset="0.8" stop-color="${accent}"/><stop offset="1" stop-color="${base}"/></linearGradient>`,
      }
    case 'cat-eye':
      return {
        fill: `url(#cat-${id})`,
        defs: `<linearGradient id="cat-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${base}"/><stop offset="0.42" stop-color="${base}"/><stop offset="0.5" stop-color="${accent}"/><stop offset="0.58" stop-color="${base}"/><stop offset="1" stop-color="${base}"/></linearGradient>`,
      }
    case 'ombre':
      return {
        fill: `url(#ombre-${id})`,
        defs: `<linearGradient id="ombre-${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${accent}"/></linearGradient>`,
      }
    case 'glitter': {
      const dots = Array.from({ length: 60 })
        .map(
          () =>
            `<circle cx="${(rand() - 0.5) * w}" cy="${(rand() - 0.5) * h}" r="${0.8 + rand() * 2.2}" fill="${rand() > 0.5 ? accent : '#ffffff'}" opacity="${0.5 + rand() * 0.5}"/>`,
        )
        .join('')
      return { fill: base, overlay: `<g clip-path="url(#clip-${id})">${dots}</g>` }
    }
    case 'garba': {
      const motifs = [-0.25, 0, 0.25]
        .map((y, i) => `<rect x="${-7}" y="${y * h - 7}" width="14" height="14" transform="rotate(45 0 ${y * h})" fill="${i % 2 ? '#ffffff' : accent}"/>`)
        .join('')
      return {
        fill: base,
        overlay: `<g clip-path="url(#clip-${id})">${motifs}<rect x="${-w}" y="${h * 0.32}" width="${w * 2}" height="5" fill="${accent}"/></g>`,
      }
    }
    case 'moon':
      return { fill: base, overlay: `<ellipse cx="0" cy="${h * 0.42}" rx="${w * 0.3}" ry="${h * 0.12}" fill="${accent}" clip-path="url(#clip-${id})"/>` }
    case 'dots':
      return {
        fill: base,
        overlay: `<g clip-path="url(#clip-${id})">${[-0.2, 0, 0.2].map((y) => `<circle cx="0" cy="${y * h}" r="5" fill="${accent}"/>`).join('')}</g>`,
      }
    case 'marble': {
      const veins = Array.from({ length: 3 })
        .map(
          () =>
            `<path d="M${-w} ${(rand() - 0.5) * h} C ${-w * 0.2} ${(rand() - 0.5) * h}, ${w * 0.2} ${(rand() - 0.5) * h}, ${w} ${(rand() - 0.5) * h}" stroke="${accent}" stroke-width="${1 + rand() * 2}" fill="none" opacity="0.7"/>`,
        )
        .join('')
      return { fill: base, overlay: `<g clip-path="url(#clip-${id})">${veins}</g>` }
    }
    case 'diya':
      return {
        fill: base,
        overlay: `<g clip-path="url(#clip-${id})"><path d="M${-w * 0.25} ${h * 0.05} q ${w * 0.25} ${h * 0.12} ${w * 0.5} 0 z" fill="${accent}"/><path d="M0 ${-h * 0.12} q 6 9 0 15 q -6 -6 0 -15z" fill="#FFD36B"/></g>`,
      }
    case 'lace': {
      const loops = [-0.3, -0.15, 0, 0.15, 0.3]
        .map((y) => `<circle cx="0" cy="${y * h}" r="${w * 0.16}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.85"/>`)
        .join('')
      return { fill: base, overlay: `<g clip-path="url(#clip-${id})">${loops}</g>` }
    }
    default:
      return { fill: base }
  }
}

export const renderNailSet = async (spec: NailSpec, seed = 1, size = 1000): Promise<Buffer> => {
  const rand = seeded(seed)
  // Layout happens in a 1000 x 1150 space and is scaled to the requested size.
  const W = 1000
  const H = 1150
  const scale = size / 1000
  const len = spec.length ?? 1
  const nails = [-2, -1, 0, 1, 2].map((i) => {
    const angle = i * 9
    const w = 158 + rand() * 6
    const h = (385 + (i === 0 ? 30 : 0) - Math.abs(i) * 20) * len
    const cx = W / 2 + i * 186
    const cy = H / 2 + Math.abs(i) * Math.abs(i) * 14 + 10
    const id = `n${i + 2}`
    const p = patternFor(spec, id, w, h, rand)
    return `<g transform="translate(${cx} ${cy}) rotate(${angle})">
      <defs><clipPath id="clip-${id}"><path d="${nailPath(w, h)}"/></clipPath>${p.defs ?? ''}</defs>
      <path d="${nailPath(w, h)}" fill="${p.fill}" filter="url(#shadow)"/>
      ${p.overlay ?? ''}
      <path d="M${-w * 0.18} ${-h * 0.3} C ${-w * 0.25} ${-h * 0.05}, ${-w * 0.2} ${h * 0.2}, ${-w * 0.12} ${h * 0.35}" stroke="#ffffff" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.35"/>
    </g>`
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="bg" cx="0.3" cy="0.2" r="1.1"><stop offset="0" stop-color="${spec.background[0]}"/><stop offset="1" stop-color="${spec.background[1]}"/></radialGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="6" dy="14" stdDeviation="12" flood-color="#3a1f28" flood-opacity="0.25"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <circle cx="${W * 0.85}" cy="${H * 0.12}" r="${W * 0.25}" fill="#ffffff" opacity="0.18"/>
    ${nails.join('')}
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer()
}

/** A soft branded cover image for a salon. */
export const renderCover = async (colors: [string, string, string], size = 1440) => {
  const W = size
  const H = Math.round(size * 0.75)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="0.6" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${W * 0.2}" cy="${H * 0.3}" r="${H * 0.45}" fill="#ffffff" opacity="0.12"/>
    <circle cx="${W * 0.85}" cy="${H * 0.85}" r="${H * 0.35}" fill="#ffffff" opacity="0.1"/>
  </svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer()
}

/** Monogram logo. */
export const renderLogo = async (letter: string, bg: string, fg: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="256" fill="${bg}"/><text x="256" y="330" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="260" fill="${fg}">${letter}</text></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Round avatar with initials. */
export const renderAvatar = async (initials: string, bg: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="${bg}"/><text x="160" y="198" text-anchor="middle" font-family="'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif" font-size="120" fill="#ffffff" opacity="0.92">${initials}</text></svg>`
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer()
}

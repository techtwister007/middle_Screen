import sharp from 'sharp'

export interface Frame {
  key: string
  label: string
  background: string
  foreground: string
  accent: string
  /** Optional decorative line drawn above the salon name */
  ornament?: 'line' | 'dots' | 'diya' | 'garba'
}

export const FRAMES: Frame[] = [
  { key: 'classic', label: 'Classic', background: '#FFF8F5', foreground: '#2B1B1F', accent: '#B4637A', ornament: 'line' },
  { key: 'noir', label: 'Noir gold', background: '#141012', foreground: '#F6EDE4', accent: '#C9A45C', ornament: 'line' },
  { key: 'minimal', label: 'Minimal', background: '#FFFFFF', foreground: '#111111', accent: '#111111' },
  { key: 'navratri', label: 'Navratri', background: '#3B0A45', foreground: '#FFF3D6', accent: '#FFB000', ornament: 'garba' },
  { key: 'diwali', label: 'Diwali', background: '#2A0F05', foreground: '#FFE9B8', accent: '#F2A93B', ornament: 'diya' },
  { key: 'bridal', label: 'Bridal', background: '#FBEFEF', foreground: '#5A1F2B', accent: '#B3263E', ornament: 'dots' },
]

export const frameByKey = (key?: string | null) => FRAMES.find((f) => f.key === key) ?? FRAMES[0]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const ornamentSvg = (frame: Frame, cx: number, y: number) => {
  switch (frame.ornament) {
    case 'dots':
      return [-24, 0, 24].map((dx) => `<circle cx="${cx + dx}" cy="${y}" r="5" fill="${frame.accent}"/>`).join('')
    case 'diya':
      return `<path d="M${cx - 40} ${y} q40 30 80 0 z" fill="${frame.accent}"/><path d="M${cx} ${y - 34} q12 18 0 30 q-12 -12 0 -30z" fill="#FFD36B"/>`
    case 'garba':
      return [-60, -30, 0, 30, 60]
        .map(
          (dx, i) =>
            `<rect x="${cx + dx - 8}" y="${y - 8}" width="16" height="16" transform="rotate(45 ${cx + dx} ${y})" fill="${i % 2 ? frame.foreground : frame.accent}"/>`,
        )
        .join('')
    case 'line':
      return `<rect x="${cx - 60}" y="${y - 1}" width="120" height="2" fill="${frame.accent}"/>`
    default:
      return ''
  }
}

export interface ShareKitText {
  salonName: string
  handle?: string | null
  designName?: string | null
  artist?: string | null
  link: string
}

const textBand = (width: number, height: number, frame: Frame, t: ShareKitText, opts: { cta: boolean }) => {
  const cx = width / 2
  const lines: string[] = []
  let y = 70
  lines.push(ornamentSvg(frame, cx, y))
  y += 70
  lines.push(
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="58" fill="${frame.foreground}">${esc(t.salonName)}</text>`,
  )
  if (t.designName) {
    y += 60
    lines.push(
      `<text x="${cx}" y="${y}" text-anchor="middle" font-family="'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif" font-size="36" fill="${frame.accent}">${esc(t.designName)}${t.artist ? ` · by ${esc(t.artist)}` : ''}</text>`,
    )
  }
  if (t.handle) {
    y += 52
    lines.push(
      `<text x="${cx}" y="${y}" text-anchor="middle" font-family="'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif" font-size="32" fill="${frame.foreground}" opacity="0.8">@${esc(t.handle.replace(/^@/, ''))}</text>`,
    )
  }
  if (opts.cta) {
    y += 70
    lines.push(
      `<rect x="${cx - 300}" y="${y - 44}" width="600" height="66" rx="33" fill="${frame.accent}"/>`,
      `<text x="${cx}" y="${y}" text-anchor="middle" font-family="'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif" font-size="30" fill="${frame.background}">Book this look · ${esc(t.link.replace(/^https?:\/\//, ''))}</text>`,
    )
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${frame.background}"/>${lines.join('')}</svg>`,
  )
}

/** Builds a branded image: the nail photo on top, the salon band beneath. */
const compose = async (photo: Buffer, width: number, height: number, photoHeight: number, frame: Frame, t: ShareKitText, cta: boolean) => {
  const img = await sharp(photo)
    .rotate()
    .resize(width - 80, photoHeight - 80, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88 })
    .toBuffer()
  const rounded = await sharp(img)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width - 80}" height="${photoHeight - 80}"><rect width="100%" height="100%" rx="36" ry="36"/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer()
  const band = textBand(width, height - photoHeight, frame, t, { cta })
  return sharp({ create: { width, height, channels: 3, background: frame.background } })
    .composite([
      { input: rounded, top: 40, left: 40 },
      { input: band, top: photoHeight, left: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer()
}

export const buildShareKit = async (photo: Buffer, frame: Frame, text: ShareKitText) => ({
  story: await compose(photo, 1080, 1920, 1380, frame, text, true),
  status: await compose(photo, 1080, 1920, 1380, frame, text, true),
  square: await compose(photo, 1080, 1080, 760, frame, { ...text, designName: text.designName, handle: text.handle }, false),
})

/** A 2×2 collage of the week's best work for the owner's Instagram. */
export const buildCollage = async (photos: Buffer[], frame: Frame, title: string) => {
  const cell = 520
  const tiles = await Promise.all(
    photos.slice(0, 4).map((p) => sharp(p).rotate().resize(cell, cell, { fit: 'cover', position: 'attention' }).jpeg().toBuffer()),
  )
  const header = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="120"><text x="540" y="80" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-size="52" fill="${frame.foreground}">${esc(title)}</text></svg>`,
  )
  return sharp({ create: { width: 1080, height: 1200, channels: 3, background: frame.background } })
    .composite([
      { input: header, top: 0, left: 0 },
      ...tiles.map((t, i) => ({ input: t, top: 140 + Math.floor(i / 2) * (cell + 20), left: 10 + (i % 2) * (cell + 20) })),
    ])
    .jpeg({ quality: 88 })
    .toBuffer()
}

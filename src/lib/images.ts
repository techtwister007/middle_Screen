import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";

export type ImageVariants = {
  lg: Buffer;
  md: Buffer;
  sm: Buffer;
  width: number;
  height: number;
  hash: string;
};

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

/** Semi-transparent agent watermark in the bottom-right corner. */
function watermarkSvg(text: string, width: number, height: number) {
  const size = Math.max(14, Math.round(width / 38));
  const pad = Math.round(size * 0.9);
  const w = Math.round(text.length * size * 0.62 + pad * 2);
  const h = Math.round(size * 2.1);
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${width - w - pad}, ${height - h - pad})">
        <rect width="${w}" height="${h}" rx="${h / 2}" fill="black" fill-opacity="0.35"/>
        <text x="${w / 2}" y="${h / 2}" dominant-baseline="central" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif" font-weight="600" font-size="${size}" fill="white" fill-opacity="0.92">${escapeXml(text)}</text>
      </g>
    </svg>`,
  );
}

/** Auto-rotate, strip metadata (incl. GPS), resize to 3 sizes as WebP, optional watermark. */
export async function processImage(input: Buffer, watermark?: string | null): Promise<ImageVariants> {
  const base = sharp(input, { failOn: "none" }).rotate();
  const lgBuf = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).toBuffer();
  const meta = await sharp(lgBuf).metadata();
  const width = meta.width ?? 1600;
  const height = meta.height ?? 1200;
  let pipeline = sharp(lgBuf);
  if (watermark) pipeline = pipeline.composite([{ input: watermarkSvg(watermark, width, height) }]);
  const lg = await pipeline.webp({ quality: 80 }).toBuffer();
  const md = await sharp(lg).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  const sm = await sharp(lg).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  const small = await sharp(input, { failOn: "none" }).rotate().resize(16, 16, { fit: "fill" }).greyscale().raw().toBuffer();
  const hash = createHash("sha1").update(small).digest("hex").slice(0, 16);
  return { lg, md, sm, width, height, hash };
}

/** Square-ish avatar / logo. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" }).rotate().resize(400, 400, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
}
export async function processLogo(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" }).rotate().resize({ width: 600, height: 300, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
}

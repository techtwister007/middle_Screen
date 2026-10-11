export interface TryOnRequest {
  handImageUrl: string
  designImageUrl: string
  instructions?: string
}

export interface TryOnResult {
  /** URL or data URL of the generated image */
  imageUrl: string
  provider: string
  /** Cost in paise */
  cost: number
}

export interface ImageAiProvider {
  name: string
  tryOn(req: TryOnRequest): Promise<TryOnResult>
}

/** Returns the design image unchanged. Lets the flow be built and demoed without paying for AI. */
export class FakeImageAi implements ImageAiProvider {
  name = 'fake'
  async tryOn(req: TryOnRequest): Promise<TryOnResult> {
    return { imageUrl: req.designImageUrl, provider: this.name, cost: 0 }
  }
}

/**
 * Generic HTTP adapter: POST { hand, design, prompt } to IMAGE_AI_URL, expects { imageUrl }.
 * Point it at whichever image-editing API wins the evaluation (or a thin proxy in front of it).
 */
export class HttpImageAi implements ImageAiProvider {
  name = 'http'
  async tryOn(req: TryOnRequest): Promise<TryOnResult> {
    const res = await fetch(process.env.IMAGE_AI_URL ?? '', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.IMAGE_AI_KEY ?? ''}` },
      body: JSON.stringify({
        hand: req.handImageUrl,
        design: req.designImageUrl,
        prompt:
          req.instructions ??
          'Apply the nail design from the second image to the nails in the first image. Keep the hand, skin tone and background unchanged. Photorealistic.',
      }),
    })
    if (!res.ok) throw new Error(`Image AI error ${res.status}`)
    const json = (await res.json()) as { imageUrl: string }
    return { imageUrl: json.imageUrl, provider: this.name, cost: Number(process.env.IMAGE_AI_COST_PAISE ?? 400) }
  }
}

let imageAi: ImageAiProvider | null = null
export const getImageAi = (): ImageAiProvider => {
  if (!imageAi) imageAi = process.env.IMAGE_AI_PROVIDER === 'live' ? new HttpImageAi() : new FakeImageAi()
  return imageAi
}
export const setImageAi = (p: ImageAiProvider) => {
  imageAi = p
}

import { Badge, buttonClass } from '@salon/ui'
import { Carousel } from '@salon/ui/client'
import { Hand, MessageCircle, Share2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PriceBuilder } from '@/components/site/PriceBuilder'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl, srcSet } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { currentCustomer, type DesignRecord, designs, loadSalon, repoFor, type ServiceRecord, services } from '@/lib/site'

type Params = Promise<{ salon: string; id: string }>

const load = async (slug: string, id: string) => {
  const salon = await loadSalon(slug)
  const repo = await repoFor(salon)
  const design = await repo.findByID<DesignRecord>('designs', id, 2)
  if (!design || !(design as { published?: boolean }).published) notFound()
  return { salon, design }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { salon: slug, id } = await params
  const { design } = await load(slug, id)
  return { title: design.title, openGraph: { images: mediaUrl(design.images?.[0], 'large') ?? undefined } }
}

export default async function DesignPage({ params }: { params: Params }) {
  const { salon: slug, id } = await params
  const { salon, design } = await load(slug, id)
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language)
  const base = `/s/${slug}`
  const all = await services(salon)
  const main = (typeof design.service === 'object' ? design.service : all.find((s) => String(s.id) === String(design.service))) as ServiceRecord | null
  const included = (design.addOns ?? []).map((a) => (typeof a === 'object' ? a.id : a))
  const addOns = all.filter((s) => s.isAddOn)
  const similar = (await designs(salon, 60))
    .filter((d) => d.id !== design.id && (d.category === design.category || d.occasions?.some((o) => design.occasions?.includes(o))))
    .slice(0, 4)
  const artist = typeof design.artist === 'object' ? design.artist : null
  const whatsapp = salon.contact?.whatsapp?.replace(/\D/g, '')
  const shareText = `Look at this ${design.title} design at ${salon.name}: ${process.env.PUBLIC_URL ?? ''}${base}/designs/${design.id}`
  const features = salonFeatures(salon)
  return (
    <div className='pb-6'>
      <Carousel>
        {(design.images ?? []).map((img, i) => (
          <img alt={design.title} className='aspect-[4/5] w-full object-cover' key={i} sizes='100vw' src={mediaUrl(img, 'large') ?? ''} srcSet={srcSet(img)} />
        ))}
      </Carousel>
      <div className='px-4 pt-4'>
        <div className='flex flex-wrap gap-1.5'>
          {design.source === 'customer' ? <Badge tone='muted'>Client photo</Badge> : null}
          {(design.occasions ?? []).slice(0, 3).map((o) => (
            <Badge key={o} tone='muted'>
              {o}
            </Badge>
          ))}
        </div>
        <h1 className='mt-2 font-heading text-3xl'>{design.title}</h1>
        {artist ? <p className='text-sm text-muted'>by {artist.name}</p> : null}
        {design.description ? <p className='mt-3 text-[15px] leading-relaxed'>{design.description}</p> : null}
        {main?.lastsDays ? <p className='mt-2 text-sm text-muted'>Lasts about {Math.round(main.lastsDays / 7)} weeks.</p> : null}

        <div className='mt-5'>
          <PriceBuilder
            addOns={addOns.map((a) => ({ id: a.id, name: a.name, price: a.price, durationMinutes: a.durationMinutes }))}
            base={base}
            bookLabel={t(lang, 'bookThisLook')}
            designId={design.id}
            included={included}
            main={main ? { id: main.id, name: main.name, price: main.price, durationMinutes: main.durationMinutes } : null}
          />
        </div>

        <div className='mt-4 grid grid-cols-3 gap-2'>
          {features.has('tryOn') ? (
            <Link className={buttonClass('secondary', 'md', 'flex-col h-auto py-3 text-xs')} href={`${base}/try-on?design=${design.id}`}>
              <Hand size={18} /> {t(lang, 'tryOnMyHand')}
            </Link>
          ) : null}
          {whatsapp ? (
            <a
              className={buttonClass('secondary', 'md', 'flex-col h-auto py-3 text-xs')}
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi! Can you do the "${design.title}" design? ${process.env.PUBLIC_URL ?? ''}${base}/designs/${design.id}`)}`}
              rel='noopener'
              target='_blank'
            >
              <MessageCircle size={18} /> Ask a question
            </a>
          ) : null}
          <a
            className={buttonClass('secondary', 'md', 'flex-col h-auto py-3 text-xs')}
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            rel='noopener'
            target='_blank'
          >
            <Share2 size={18} /> Share
          </a>
        </div>
        {main?.aftercare ? (
          <div className='mt-6 rounded-card bg-tint p-4 text-sm'>
            <p className='font-medium'>Aftercare</p>
            <p className='mt-1 text-muted'>{main.aftercare}</p>
          </div>
        ) : null}
      </div>
      {similar.length ? (
        <div className='mt-8 px-4'>
          <h2 className='mb-3 font-heading text-xl'>You might also like</h2>
          <div className='grid grid-cols-2 gap-3'>
            {similar.map((d) => (
              <Link href={`${base}/designs/${d.id}`} key={String(d.id)}>
                <img alt={d.title} className='aspect-square w-full rounded-card object-cover' loading='lazy' src={mediaUrl(d.images?.[0], 'card') ?? ''} />
                <p className='mt-1.5 truncate text-sm'>{d.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

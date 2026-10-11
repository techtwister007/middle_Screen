import { buttonClass } from '@salon/ui'
import Link from 'next/link'
import { TryOn } from '@/components/site/TryOn'
import { translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { currentCustomer, type DesignRecord, loadSalon, repoFor, tryOnAllowance } from '@/lib/site'
import { requireFeature } from '../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('tryOn') }
}

export default async function TryOnPage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ design?: string }> }) {
  const { salon: slug } = await params
  const { design: designId } = await searchParams
  const salon = await loadSalon(slug)
  requireFeature(salon, 'tryOn')
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language, salonLanguages(salon))
  const tr = translator(lang)
  const design = designId ? await (await repoFor(salon)).findByID<DesignRecord>('designs', designId, 1) : null
  const aiOn = salonFeatures(salon).has('aiTryOn')
  const allowance = customer && aiOn ? await tryOnAllowance(salon, customer.id) : { enabled: aiOn, remaining: 0 }
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>{tr('tryOn')}</h1>
      <p className='mb-5 text-sm text-muted'>{tr('tryOnIntro')}</p>
      <TryOn
        aiEnabled={aiOn && allowance.enabled}
        aiRemaining={allowance.remaining}
        design={design ? { id: design.id, title: design.title, image: mediaUrl(design.images?.[0], 'thumb') } : null}
        lang={lang}
        loggedIn={Boolean(customer)}
        slug={slug}
      />
      <Link className={buttonClass('primary', 'lg', 'mt-6 w-full')} href={`/s/${slug}/book${design ? `?design=${design.id}` : ''}`}>
        {tr('bookThisLook')}
      </Link>
    </div>
  )
}

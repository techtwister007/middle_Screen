import { publicUrl } from '@salon/core'
import { pointsFor } from '@salon/modules'
import { buttonClass } from '@salon/ui'
import { Carousel } from '@salon/ui/client'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RevealShare } from '@/components/site/RevealShare'
import { translator } from '@/lib/i18n'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { salonFeatures } from '@/lib/salon'
import { contestNow, currentCustomer, idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await getLang((await currentCustomer(await loadSalon(slug)))?.language))('yourNewSet') }
}

export default async function RevealPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/reveal/${id}`)
  const lang = await getLang(customer.language)
  const tr = translator(lang)
  const features = salonFeatures(salon)
  const repo = await repoFor(salon)
  const task = await repo.findByID<{
    id: string
    customer: unknown
    photos?: unknown[]
    designName?: string
    story?: unknown
    statusImage?: unknown
    square?: unknown
    staff?: { name: string } | null
    galleryDesign?: unknown
    visit: { id: string; total?: number; status?: string } | string
  }>('photo-tasks', id, 1)
  if (!task || String(idOf(task.customer)) !== String(customer.id)) notFound()
  const visitId = idOf(task.visit)
  const [rated, contest, account] = await Promise.all([
    repo.count('ratings', { visit: { equals: visitId } }),
    features.has('contests') ? contestNow(salon) : Promise.resolve(null),
    features.has('loyalty') ? repo.findOne<{ points: number }>('loyalty-accounts', { customer: { equals: customer.id } }) : Promise.resolve(null),
  ])
  // Points this visit earned, with the same rule loyalty uses when the visit is completed.
  const total = typeof task.visit === 'object' ? (task.visit.total ?? 0) : 0
  const pointsPer100 = Number((salon.settings as { pointsPer100?: number } | null)?.pointsPer100 ?? 5)
  const earned = features.has('loyalty') && account ? pointsFor(total, pointsPer100) : 0
  const link = features.has('referrals') ? `${publicUrl()}/s/${slug}/r/${customer.referralCode}` : `${publicUrl()}/s/${slug}`
  const handle = salon.contact?.instagram ? ` @${salon.contact.instagram}` : ''
  return (
    <div className='px-4 pt-6'>
      <p className='text-center text-xs font-semibold uppercase tracking-[0.3em] text-brand'>{tr('freshFromChair')}</p>
      <h1 className='mt-2 text-center font-heading text-4xl'>{task.designName ?? tr('yourNewSet')}</h1>
      {task.staff ? <p className='text-center text-sm text-muted'>{tr('byName', { name: task.staff.name })}</p> : null}
      {earned > 0 ? (
        <Link
          className='mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-ink'
          data-testid='points-credited'
          href={`/s/${slug}/rewards`}
        >
          <Sparkles className='text-brand' size={16} /> {tr('pointsCredited', { n: earned })}
          <span className='font-normal text-muted'>· {tr('pointsTotal', { n: account?.points ?? earned })}</span>
        </Link>
      ) : null}
      <div className='mt-5 overflow-hidden rounded-card'>
        <Carousel>
          {[task.story, ...(task.photos ?? [])].filter(Boolean).map((m, i) => (
            <img alt='' className='aspect-[4/5] w-full object-cover' key={i} src={mediaUrl(m, 'large') ?? mediaUrl(m, 'original') ?? undefined} />
          ))}
        </Carousel>
      </div>
      <div className='mt-5'>
        <RevealShare
          caption={tr('revealCaption', { design: task.designName ?? tr('nails'), salon: salon.name, handle })}
          contestId={contest?.id}
          featured={Boolean(task.galleryDesign)}
          labels={{
            igStory: tr('igStory'),
            waStatus: tr('waStatus'),
            saveSquare: tr('saveSquare'),
            tagUs: tr('tagUs'),
            featureMyNails: tr('featureMyNails'),
            featureBody: tr('featureBody'),
            enterContest: tr('enterContest'),
            enterContestBody: tr('enterContestBody'),
          }}
          link={link}
          slug={slug}
          square={mediaUrl(task.square, 'original')}
          status={mediaUrl(task.statusImage, 'original')}
          story={mediaUrl(task.story, 'original')}
          taskId={task.id}
        />
      </div>
      {!rated && features.has('reviews') ? (
        <Link className={buttonClass('outline', 'lg', 'mt-6 w-full')} href={`/s/${slug}/rate/${visitId}`}>
          {tr('howWasVisit')}
        </Link>
      ) : null}
    </div>
  )
}

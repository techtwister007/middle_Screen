import { RevealShare } from '@/components/site/RevealShare'
import { mediaUrl } from '@/lib/media'
import { contestNow, idOf, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { publicUrl } from '@salon/core'
import { buttonClass } from '@salon/ui'
import { Carousel } from '@salon/ui/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Your nails' }

export default async function RevealPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/reveal/${id}`)
  const repo = await repoFor(salon)
  const task = await repo.findByID<{ id: string; customer: unknown; photos?: unknown[]; designName?: string; story?: unknown; statusImage?: unknown; square?: unknown; staff?: { name: string } | null; galleryDesign?: unknown; visit: unknown }>('photo-tasks', id, 1)
  if (!task || String(idOf(task.customer)) !== String(customer.id)) notFound()
  const rated = await repo.count('ratings', { visit: { equals: idOf(task.visit) } })
  const contest = await contestNow(salon)
  const link = `${publicUrl()}/s/${slug}/r/${customer.referralCode}`
  const handle = salon.contact?.instagram ? ` @${salon.contact.instagram}` : ''
  return (
    <div className="px-4 pt-6">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.3em] text-brand">Fresh from the chair</p>
      <h1 className="mt-2 text-center font-heading text-4xl">{task.designName ?? 'Your new set'}</h1>
      {task.staff ? <p className="text-center text-sm text-muted">by {task.staff.name}</p> : null}
      <div className="mt-5 overflow-hidden rounded-card">
        <Carousel>
          {[task.story, ...(task.photos ?? [])].filter(Boolean).map((m, i) => (
            <img alt="" className="aspect-[4/5] w-full object-cover" key={i} src={mediaUrl(m, 'large') ?? mediaUrl(m, 'original') ?? ''} />
          ))}
        </Carousel>
      </div>
      <div className="mt-5">
        <RevealShare
          caption={`My new ${task.designName ?? 'nails'} from ${salon.name}${handle} 💅`}
          contestId={contest?.id}
          featured={Boolean(task.galleryDesign)}
          link={link}
          slug={slug}
          square={mediaUrl(task.square, 'original')}
          status={mediaUrl(task.statusImage, 'original')}
          story={mediaUrl(task.story, 'original')}
          taskId={task.id}
        />
      </div>
      {!rated ? (
        <Link className={buttonClass('outline', 'lg', 'mt-6 w-full')} href={`/s/${slug}/rate/${idOf(task.visit)}`}>
          How was your visit?
        </Link>
      ) : null}
    </div>
  )
}

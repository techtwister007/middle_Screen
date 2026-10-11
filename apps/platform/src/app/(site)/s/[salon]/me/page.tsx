import { ProfileForm } from '@/components/site/ProfileForm'
import { getLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { formatINR, formatIST } from '@salon/core'
import { EmptyState, buttonClass } from '@salon/ui'
import { RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'My nails' }

export default async function MePage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/me`)
  const repo = await repoFor(salon)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const base = `/s/${slug}`
  const visits = (
    await repo.find<{ id: string; createdAt: string; designName?: string; total: number; photos?: unknown[]; staff?: { name: string } | null; lines: { name: string }[] }>('visits', {
      where: { customer: { equals: customer.id } },
      sort: '-createdAt',
      limit: 50,
      depth: 1,
    })
  ).docs
  const tasks = (
    await repo.find<{ id: string; visit: string | { id: string }; photos?: unknown[]; status: string }>('photo-tasks', {
      where: { and: [{ customer: { equals: customer.id } }, { status: { in: ['sent', 'shared', 'verified'] } }] },
      depth: 1,
      limit: 50,
    })
  ).docs
  const photoFor = (visitId: string) => {
    const t = tasks.find((x) => String(typeof x.visit === 'object' ? x.visit.id : x.visit) === String(visitId))
    return { photo: t?.photos?.[0], taskId: t?.id }
  }
  const daysToDue = customer.nextDueDate ? Math.ceil((new Date(customer.nextDueDate).getTime() - Date.now()) / 86_400_000) : null
  const cycle = 21
  const progress = daysToDue === null ? 0 : Math.min(1, Math.max(0, 1 - daysToDue / cycle))
  const lang = await getLang(customer.language)
  return (
    <div className="px-4 pt-5">
      <h1 className="font-heading text-3xl">My nails</h1>
      <p className="text-sm text-muted">{customer.visitCount ? `${customer.visitCount} visits so far` : 'Your nail diary starts with your first visit.'}</p>

      {daysToDue !== null ? (
        <div className="mt-5 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{daysToDue <= 0 ? 'Refill due now' : `Refill in ${daysToDue} days`}</span>
            <span className="text-muted">{formatIST(customer.nextDueDate!, 'd MMM', tz)}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-tint">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {visits[0] ? (
            <Link className={buttonClass('primary', 'md', 'mt-4 w-full')} href={`${base}/book?repeat=${visits[0].id}`}>
              <RotateCcw size={16} /> Repeat my last design
            </Link>
          ) : null}
        </div>
      ) : null}

      <h2 className="mb-3 mt-8 font-heading text-xl">Nail diary</h2>
      {visits.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClass('primary')} href={`${base}/designs`}>
              Explore designs
            </Link>
          }
          body="After each visit your professional nail photos land here, ready to repeat or share."
          icon={<Sparkles />}
          title="No sets yet"
        />
      ) : (
        <div className="space-y-3">
          {visits.map((v) => {
            const { photo, taskId } = photoFor(v.id)
            const img = mediaUrl(photo, 'thumb') ?? mediaUrl(v.photos?.[0], 'thumb')
            return (
              <div className="flex gap-3 rounded-card border border-line bg-surface p-3" key={v.id}>
                {img ? (
                  <Link href={taskId ? `${base}/reveal/${taskId}` : '#'}>
                    <img alt="" className="h-20 w-20 rounded-xl object-cover" src={img} />
                  </Link>
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-tint text-brand">
                    <Sparkles size={20} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.designName ?? v.lines.map((l) => l.name).join(', ')}</p>
                  <p className="text-xs text-muted">
                    {formatIST(v.createdAt, 'd MMM yyyy', tz)}
                    {v.staff ? ` · ${v.staff.name.split(' ')[0]}` : ''} · {formatINR(v.total)}
                  </p>
                  <Link className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand" href={`${base}/book?repeat=${v.id}`}>
                    <RotateCcw size={13} /> Repeat
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-heading text-xl">Profile</h2>
      <ProfileForm
        initial={{
          name: customer.name ?? '',
          birthday: customer.birthday ? customer.birthday.slice(0, 10) : '',
          marketing: Boolean(customer.consents?.marketing),
          gallery: Boolean(customer.consents?.gallery),
          lang,
          shape: customer.handProfile?.shape ?? '',
          length: customer.handProfile?.length ?? '',
          sensitivities: customer.handProfile?.sensitivities ?? '',
        }}
        slug={slug}
      />
    </div>
  )
}

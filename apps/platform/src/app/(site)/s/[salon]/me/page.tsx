import { formatINR, formatIST, type ID } from '@salon/core'
import { savedDesignIds } from '@salon/modules'
import { buttonClass, EmptyState } from '@salon/ui'
import { CalendarDays, Hand, Heart, HeartPulse, RotateCcw, Sparkles, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { ProfileForm } from '@/components/site/ProfileForm'
import { type DictKey, translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { salonFeatures } from '@/lib/salon'
import { type DesignRecord, loadSalon, repoFor, requireCustomer } from '@/lib/site'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('myNails') }
}

const DEFAULT_CYCLE_DAYS = 21

export default async function MePage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/me`)
  const lang = await getLang(customer.language)
  const tr = translator(lang)
  const features = salonFeatures(salon)
  const repo = await repoFor(salon)
  const tz = salon.timezone ?? 'Asia/Kolkata'
  const base = `/s/${slug}`
  const [visitRes, taskRes, savedIds] = await Promise.all([
    repo.find<{
      id: string
      createdAt: string
      designName?: string
      total: number
      photos?: unknown[]
      staff?: { name: string } | null
      lines: { name: string; service?: { cycleDays?: number | null } | ID | null }[]
    }>('visits', {
      where: { customer: { equals: customer.id } },
      sort: '-createdAt',
      limit: 50,
      depth: 1,
    }),
    repo.find<{ id: string; visit: string | { id: string }; photos?: unknown[]; status: string }>('photo-tasks', {
      where: { and: [{ customer: { equals: customer.id } }, { status: { in: ['sent', 'shared', 'verified'] } }] },
      depth: 1,
      limit: 50,
    }),
    savedDesignIds(await getPayloadClient(), salon.id, customer.id),
  ])
  const visits = visitRes.docs
  const tasks = taskRes.docs
  const saved = savedIds.length
    ? (
        await repo.find<DesignRecord>('designs', {
          where: { and: [{ id: { in: savedIds } }, { published: { equals: true } }] },
          limit: 60,
          depth: 1,
        })
      ).docs.sort((a, b) => savedIds.findIndex((x) => String(x) === String(a.id)) - savedIds.findIndex((x) => String(x) === String(b.id)))
    : []
  const photoFor = (visitId: string) => {
    const t = tasks.find((x) => String(typeof x.visit === 'object' ? x.visit.id : x.visit) === String(visitId))
    return { photo: t?.photos?.[0], taskId: t?.id }
  }
  const daysToDue = customer.nextDueDate ? Math.ceil((new Date(customer.nextDueDate).getTime() - Date.now()) / 86_400_000) : null
  // Refill cycle from the last visit's services (the shortest cycle wins, as for reminders).
  const cycles = (visits[0]?.lines ?? [])
    .map((l) => (l.service && typeof l.service === 'object' ? l.service.cycleDays : null))
    .filter((d): d is number => typeof d === 'number' && d > 0)
  const cycle = cycles.length ? Math.min(...cycles) : DEFAULT_CYCLE_DAYS
  const progress = daysToDue === null ? 0 : Math.min(1, Math.max(0, 1 - daysToDue / cycle))
  const shortcuts = [
    { href: `${base}/appointments`, label: tr('myAppointments'), icon: CalendarDays },
    { href: '#saved', label: tr('savedDesigns'), icon: Heart },
    { href: `${base}/care`, label: tr('careTips'), icon: HeartPulse },
    features.has('tryOn')
      ? { href: `${base}/try-on`, label: tr('tryOn'), icon: Hand }
      : { href: `${base}/menu`, label: tr('menuShort'), icon: UtensilsCrossed },
  ]
  return (
    <div className='px-4 pt-5'>
      <h1 className='font-heading text-3xl'>{tr('myNails')}</h1>
      <p className='text-sm text-muted'>{customer.visitCount ? tr('visitsSoFar', { n: customer.visitCount }) : tr('diaryStarts')}</p>

      {daysToDue !== null ? (
        <div className='mt-5 rounded-card border border-line bg-surface p-4' data-testid='refill'>
          <div className='flex items-center justify-between text-sm'>
            <span className='font-medium'>{daysToDue <= 0 ? tr('refillDueNow') : tr('refillInDays', { n: daysToDue })}</span>
            <span className='text-muted'>{formatIST(customer.nextDueDate!, 'd MMM', tz)}</span>
          </div>
          <div className='mt-3 h-2 overflow-hidden rounded-full bg-tint'>
            <div className='h-full rounded-full bg-brand' data-cycle={cycle} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          {visits[0] ? (
            <Link className={buttonClass('primary', 'md', 'mt-4 w-full')} href={`${base}/book?repeat=${visits[0].id}`}>
              <RotateCcw size={16} /> {tr('repeatLast')}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className='mt-5 grid grid-cols-4 gap-2'>
        {shortcuts.map((s) => (
          <Link
            className='flex flex-col items-center gap-1.5 rounded-card border border-line bg-surface px-1 py-3 text-center text-[11px] font-medium leading-tight'
            href={s.href}
            key={s.href}
          >
            <s.icon className='text-brand' size={20} />
            {s.label}
          </Link>
        ))}
      </div>

      <h2 className='mb-3 mt-8 font-heading text-xl'>{tr('nailDiary')}</h2>
      {visits.length === 0 ? (
        <EmptyState
          action={
            <Link className={buttonClass('primary')} href={`${base}/designs`}>
              {tr('exploreDesigns')}
            </Link>
          }
          body={tr('noSetsBody')}
          icon={<Sparkles />}
          title={tr('noSetsTitle')}
        />
      ) : (
        <div className='space-y-3'>
          {visits.map((v) => {
            const { photo, taskId } = photoFor(v.id)
            const img = mediaUrl(photo, 'thumb') ?? mediaUrl(v.photos?.[0], 'thumb')
            const thumb = img ? <img alt='' className='h-20 w-20 rounded-xl object-cover' src={img} /> : null
            return (
              <div className='flex gap-3 rounded-card border border-line bg-surface p-3' key={v.id}>
                {thumb && taskId ? (
                  <Link className='shrink-0' href={`${base}/reveal/${taskId}`}>
                    {thumb}
                  </Link>
                ) : thumb ? (
                  <span className='shrink-0'>{thumb}</span>
                ) : (
                  <span className='flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-tint text-brand'>
                    <Sparkles size={20} />
                  </span>
                )}
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-medium'>{v.designName ?? v.lines.map((l) => l.name).join(', ')}</p>
                  <p className='text-xs text-muted'>
                    {formatIST(v.createdAt, 'd MMM yyyy', tz)}
                    {v.staff ? ` · ${v.staff.name.split(' ')[0]}` : ''} · {formatINR(v.total)}
                  </p>
                  <Link className='mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand' href={`${base}/book?repeat=${v.id}`}>
                    <RotateCcw size={13} /> {tr('repeat')}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <section className='scroll-mt-20' data-testid='saved-designs' id='saved'>
        <h2 className='mb-3 mt-10 font-heading text-xl'>{tr('savedDesigns')}</h2>
        {saved.length ? (
          <div className='grid grid-cols-3 gap-2'>
            {saved.map((d) => (
              <Link data-testid='saved-design' href={`${base}/designs/${d.id}`} key={String(d.id)}>
                <img alt={d.title} className='aspect-square w-full rounded-xl object-cover' loading='lazy' src={mediaUrl(d.images?.[0], 'thumb') ?? ''} />
                <p className='mt-1 truncate text-xs'>{d.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className='flex items-center justify-center gap-2 rounded-card border border-dashed border-line p-6 text-center text-sm text-muted'>
            <Heart size={16} /> {tr('savedEmpty')}
          </p>
        )}
      </section>

      <h2 className='mb-3 mt-10 font-heading text-xl'>{tr('profile')}</h2>
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
        labels={Object.fromEntries(
          (
            [
              'language',
              'name',
              'birthdayLabel',
              'handProfile',
              'preferredShape',
              'length',
              'notSure',
              'sensitivities',
              'sensPlaceholder',
              'consentMarketing',
              'consentGallery',
              'savedTick',
              'saving',
              'save',
              'logout',
              'deleteData',
              'deleteConfirm',
              'downloadData',
              'shape_almond',
              'shape_oval',
              'shape_square',
              'shape_coffin',
              'shape_stiletto',
              'shape_round',
              'len_short',
              'len_medium',
              'len_long',
              'len_extra-long',
            ] as DictKey[]
          ).map((k) => [k, tr(k)]),
        )}
        slug={slug}
      />
    </div>
  )
}

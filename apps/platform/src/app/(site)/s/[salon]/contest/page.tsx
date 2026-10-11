import { DEFAULT_CONTEST_TERMS } from '@salon/modules'
import { EmptyState } from '@salon/ui'
import { Share2, Trophy } from 'lucide-react'
import { ContestEntries } from '@/components/site/ContestVote'
import { formatDateIn, translator } from '@/lib/i18n'
import { getLang, salonLang, salonLanguages } from '@/lib/lang'
import { mediaUrl } from '@/lib/media'
import { contestNow, currentCustomer, loadSalon, repoFor } from '@/lib/site'
import { requireFeature } from '../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('contestTitle') }
}

export default async function ContestPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  requireFeature(salon, 'contests')
  const customer = await currentCustomer(salon)
  const lang = await getLang(customer?.language, salonLanguages(salon))
  const tr = translator(lang)
  const contest = await contestNow(salon)
  if (!contest)
    return (
      <div className='px-4 pt-10'>
        <EmptyState body={tr('noContestBody')} icon={<Trophy />} title={tr('noContest')} />
      </div>
    )
  const repo = await repoFor(salon)
  const entries = (
    await repo.find<{ id: string; photo: unknown; designName?: string; votes: number; customer: { name?: string } }>('contest-entries', {
      where: { and: [{ contest: { equals: contest.id } }, { approved: { equals: true } }] },
      sort: '-votes',
      depth: 1,
      limit: 60,
    })
  ).docs
  const myVote = customer
    ? await repo.findOne<{ entry: string | { id: string } }>('contest-votes', {
        and: [{ contest: { equals: contest.id } }, { voter: { equals: customer.id } }],
      })
    : null
  const votedEntry = myVote ? String(typeof myVote.entry === 'object' ? myVote.entry.id : myVote.entry) : null
  const url = `${process.env.PUBLIC_URL ?? ''}/s/${slug}/contest`
  return (
    <div className='px-4 pt-5'>
      <p className='text-xs font-semibold uppercase tracking-widest text-brand'>{contest.theme ?? tr('thisMonth')}</p>
      <h1 className='font-heading text-3xl'>{contest.title}</h1>
      <p className='mt-1 text-sm text-muted'>
        {tr('contestIntro', { prize: contest.prize, date: formatDateIn(lang, contest.endsAt, 'd MMM', salon.timezone ?? 'Asia/Kolkata') })}
      </p>
      <a
        className='mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand'
        href={`https://wa.me/?text=${encodeURIComponent(tr('voteText', { salon: salon.name, url }))}`}
        rel='noopener'
        target='_blank'
      >
        <Share2 size={14} /> {tr('askFriendsVote')}
      </a>
      <ContestEntries
        contestId={contest.id}
        entries={entries.map((e, i) => ({
          id: String(e.id),
          title: e.designName ?? tr('untitled'),
          name: e.customer?.name?.split(' ')[0] ?? tr('aClient'),
          image: mediaUrl(e.photo, 'card'),
          votes: e.votes,
          leading: i === 0 && e.votes > 0,
        }))}
        lang={lang}
        loggedIn={Boolean(customer)}
        salonName={salon.name}
        slug={slug}
        votedEntry={votedEntry}
      />
      {contest.terms ? (
        <p className='mt-8 text-xs leading-relaxed text-muted'>{contest.terms.trim() === DEFAULT_CONTEST_TERMS ? tr('contestTermsDefault') : contest.terms}</p>
      ) : null}
    </div>
  )
}

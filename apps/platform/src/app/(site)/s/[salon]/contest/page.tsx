import { formatIST } from '@salon/core'
import { EmptyState } from '@salon/ui'
import { Share2, Trophy } from 'lucide-react'
import { VoteButton } from '@/components/site/ContestVote'
import { mediaUrl } from '@/lib/media'
import { contestNow, currentCustomer, loadSalon, repoFor } from '@/lib/site'

export const metadata = { title: 'Nail of the Month' }

export default async function ContestPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  const contest = await contestNow(salon)
  if (!contest)
    return (
      <div className='px-4 pt-10'>
        <EmptyState icon={<Trophy />} title='No contest right now' body='Nail of the Month starts again soon. Your next set could win!' />
      </div>
    )
  const customer = await currentCustomer(salon)
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
      <p className='text-xs font-semibold uppercase tracking-widest text-brand'>{contest.theme ?? 'This month'}</p>
      <h1 className='font-heading text-3xl'>{contest.title}</h1>
      <p className='mt-1 text-sm text-muted'>
        Vote for your favourite. Prize: {contest.prize}. Voting closes {formatIST(contest.endsAt, 'd MMM', salon.timezone ?? 'Asia/Kolkata')}.
      </p>
      <a
        className='mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand'
        href={`https://wa.me/?text=${encodeURIComponent(`Vote for my nails at ${salon.name}! 💅 ${url}`)}`}
        rel='noopener'
        target='_blank'
      >
        <Share2 size={14} /> Ask friends to vote
      </a>
      <div className='mt-5 grid grid-cols-2 gap-3'>
        {entries.map((e, i) => (
          <div className='rounded-card border border-line bg-surface p-2' key={e.id}>
            <div className='relative'>
              <img
                alt={e.designName ?? 'Entry'}
                className='aspect-square w-full rounded-[calc(var(--t-radius)-6px)] object-cover'
                loading='lazy'
                src={mediaUrl(e.photo, 'card') ?? ''}
              />
              {i === 0 && e.votes > 0 ? (
                <span className='absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-ink'>Leading</span>
              ) : null}
            </div>
            <p className='mt-2 truncate px-1 text-sm font-medium'>{e.designName ?? 'Untitled'}</p>
            <p className='px-1 text-xs text-muted'>{e.customer?.name?.split(' ')[0] ?? 'A client'}</p>
            <VoteButton
              contestId={contest.id}
              entryId={e.id}
              loggedIn={Boolean(customer)}
              salonName={salon.name}
              slug={slug}
              voted={votedEntry === e.id}
              votes={e.votes}
            />
          </div>
        ))}
      </div>
      {contest.terms ? <p className='mt-8 text-xs text-muted'>{contest.terms}</p> : null}
    </div>
  )
}

import { GiftCardForm, InviteActions } from '@/components/site/InviteActions'
import { salonFeatures } from '@/lib/salon'
import { firstName, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { formatINR, publicUrl } from '@salon/core'
import { inviteMessage, leaderboard } from '@salon/modules'
import { getPayloadClient } from '@/lib/payload'
import { Trophy } from 'lucide-react'

export const metadata = { title: 'Gift a friend' }

export default async function InvitePage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ gift?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  const customer = await requireCustomer(salon, `/s/${slug}/invite`)
  const repo = await repoFor(salon)
  const settings = (salon.settings ?? {}) as { referralFriendReward?: number; referralReferrerReward?: number }
  const friendGift = settings.referralFriendReward ?? 20000
  const myReward = settings.referralReferrerReward ?? 20000
  const link = `${publicUrl()}/s/${slug}/r/${customer.referralCode}`
  const message = inviteMessage(salon.name, firstName(customer.name) ?? 'Your friend', formatINR(friendGift), link)
  const mine = (await repo.find<{ status: string }>('referrals', { where: { referrer: { equals: customer.id } }, limit: 200 })).docs
  const joined = mine.filter((r) => r.status !== 'sent').length
  const visited = mine.filter((r) => r.status === 'visited' || r.status === 'rewarded').length
  const monthStart = new Date()
  monthStart.setDate(1)
  const board = (await leaderboard(await getPayloadClient(), salon.id, monthStart)).slice(0, 5)
  return (
    <div className="px-4 pt-5">
      {sp.gift ? <p className="mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">Gift sent! They'll get it on WhatsApp.</p> : null}
      <h1 className="font-heading text-3xl">Gift a friend</h1>
      <p className="mt-1 text-muted">
        Your friend gets <b>{formatINR(friendGift)} off</b> their first visit. When they come in, you get <b>{formatINR(myReward)} off</b> too.
      </p>
      <div className="mt-6">
        <InviteActions link={link} message={message} slug={slug} />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="font-heading text-2xl">{mine.length}</p>
          <p className="text-[11px] text-muted">invited</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="font-heading text-2xl">{joined}</p>
          <p className="text-[11px] text-muted">joined</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-3">
          <p className="font-heading text-2xl">{visited}</p>
          <p className="text-[11px] text-muted">visited</p>
        </div>
      </div>
      {board.length ? (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-xl">
            <Trophy className="text-brand" size={18} /> This month's top inviters
          </h2>
          <ol className="divide-y divide-line rounded-card border border-line bg-surface">
            {board.map((b, i) => (
              <li className="flex items-center justify-between px-4 py-3 text-sm" key={String(b.id)}>
                <span>
                  {i + 1}. {b.name.split(' ')[0]} {String(b.id) === String(customer.id) ? '(you)' : ''}
                </span>
                <span className="text-muted">{b.count} friends</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted">The top inviter each month wins a free set.</p>
        </div>
      ) : null}
      {salonFeatures(salon).has('giftCards') ? (
        <div className="mt-10">
          <h2 className="font-heading text-xl">Send a gift card</h2>
          <p className="mb-4 text-sm text-muted">For birthdays, Rakhi, Diwali or just because. They receive it on WhatsApp with your message.</p>
          <GiftCardForm slug={slug} />
        </div>
      ) : null}
    </div>
  )
}

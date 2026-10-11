import { formatINR, publicUrl } from '@salon/core'
import { leaderboard } from '@salon/modules'
import { Trophy } from 'lucide-react'
import { GiftCardForm, InviteActions } from '@/components/site/InviteActions'
import { translator } from '@/lib/i18n'
import { getLang, salonLang } from '@/lib/lang'
import { getPayloadClient } from '@/lib/payload'
import { salonFeatures } from '@/lib/salon'
import { firstName, loadSalon, repoFor, requireCustomer } from '@/lib/site'
import { requireFeature } from '../_lib/gate'

export async function generateMetadata({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  return { title: translator(await salonLang(await loadSalon(slug)))('inviteFriend') }
}

export default async function InvitePage({ params, searchParams }: { params: Promise<{ salon: string }>; searchParams: Promise<{ gift?: string }> }) {
  const { salon: slug } = await params
  const sp = await searchParams
  const salon = await loadSalon(slug)
  requireFeature(salon, 'referrals')
  const customer = await requireCustomer(salon, `/s/${slug}/invite`)
  const lang = await getLang(customer.language)
  const tr = translator(lang)
  const repo = await repoFor(salon)
  const settings = (salon.settings ?? {}) as { referralFriendReward?: number; referralReferrerReward?: number }
  const friendGift = settings.referralFriendReward ?? 20000
  const myReward = settings.referralReferrerReward ?? 20000
  const link = `${publicUrl()}/s/${slug}/r/${customer.referralCode}`
  const message = tr('inviteText', { name: firstName(customer.name) ?? tr('yourFriend'), amount: formatINR(friendGift), salon: salon.name, url: link })
  const mine = (await repo.find<{ status: string }>('referrals', { where: { referrer: { equals: customer.id } }, limit: 200 })).docs
  const joined = mine.filter((r) => r.status !== 'sent').length
  const visited = mine.filter((r) => r.status === 'visited' || r.status === 'rewarded').length
  const monthStart = new Date()
  monthStart.setDate(1)
  const board = (await leaderboard(await getPayloadClient(), salon.id, monthStart)).slice(0, 5)
  return (
    <div className='px-4 pt-5'>
      {sp.gift ? <p className='mb-4 rounded-btn bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800'>{tr('giftSent')}</p> : null}
      <h1 className='font-heading text-3xl'>{tr('inviteFriend')}</h1>
      <p className='mt-1 text-muted'>{tr('inviteIntro', { gift: formatINR(friendGift), mine: formatINR(myReward) })}</p>
      <div className='mt-6'>
        <InviteActions lang={lang} link={link} message={message} slug={slug} />
      </div>
      <div className='mt-6 grid grid-cols-3 gap-2 text-center'>
        <div className='rounded-card border border-line bg-surface p-3'>
          <p className='font-heading text-2xl'>{mine.length}</p>
          <p className='text-[11px] text-muted'>{tr('invited')}</p>
        </div>
        <div className='rounded-card border border-line bg-surface p-3'>
          <p className='font-heading text-2xl'>{joined}</p>
          <p className='text-[11px] text-muted'>{tr('joined')}</p>
        </div>
        <div className='rounded-card border border-line bg-surface p-3'>
          <p className='font-heading text-2xl'>{visited}</p>
          <p className='text-[11px] text-muted'>{tr('visited')}</p>
        </div>
      </div>
      {board.length ? (
        <div className='mt-8'>
          <h2 className='mb-3 flex items-center gap-2 font-heading text-xl'>
            <Trophy className='text-brand' size={18} /> {tr('topInviters')}
          </h2>
          <ol className='divide-y divide-line rounded-card border border-line bg-surface'>
            {board.map((b, i) => (
              <li className='flex items-center justify-between px-4 py-3 text-sm' key={String(b.id)}>
                <span>
                  {i + 1}. {b.name.split(' ')[0]} {String(b.id) === String(customer.id) ? tr('youMark') : ''}
                </span>
                <span className='text-muted'>{tr('friendsN', { n: b.count })}</span>
              </li>
            ))}
          </ol>
          <p className='mt-2 text-xs text-muted'>{tr('topInviterWins')}</p>
        </div>
      ) : null}
      {salonFeatures(salon).has('giftCards') ? (
        <div className='mt-10'>
          <h2 className='font-heading text-xl'>{tr('sendGiftCard')}</h2>
          <p className='mb-4 text-sm text-muted'>{tr('giftCardIntro')}</p>
          <GiftCardForm lang={lang} slug={slug} />
        </div>
      ) : null}
    </div>
  )
}

'use client'
import { Button } from '@salon/ui'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { buyPackage, claim } from '@/app/(site)/s/[salon]/actions'
import { type Lang, translator } from '@/lib/i18n'

export const BuyPackageButton = ({ slug, packageId, label, lang }: { slug: string; packageId: string | number; label: string; lang: Lang }) => {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await buyPackage(slug, packageId)
            if (!res.ok) return setError(res.error)
            window.location.href = res.data!.payUrl
          })
        }
        variant='secondary'
      >
        {pending ? <Loader2 className='animate-spin' size={16} /> : null}
        {pending ? translator(lang)('opening') : label}
      </Button>
      {error ? <p className='mt-2 text-xs'>{error}</p> : null}
    </div>
  )
}

export const ClaimOfferButton = ({
  slug,
  offerId,
  loggedIn,
  loginHref,
  lang,
}: {
  slug: string
  offerId: string | number
  loggedIn: boolean
  loginHref: string
  lang: Lang
}) => {
  const tr = translator(lang)
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!loggedIn)
    return (
      <a className='inline-flex h-14 w-full items-center justify-center rounded-btn bg-brand font-medium text-on-brand' href={loginHref}>
        {tr('loginToClaim')}
      </a>
    )
  return (
    <div>
      <Button
        className='w-full'
        disabled={pending || done}
        onClick={() =>
          start(async () => {
            const res = await claim(slug, offerId)
            if (!res.ok) return setError(res.error)
            setDone(true)
          })
        }
        size='lg'
      >
        {done ? tr('addedToRewards') : pending ? tr('claiming') : tr('claimOffer')}
      </Button>
      {error ? <p className='mt-2 text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}

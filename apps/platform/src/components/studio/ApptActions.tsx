'use client'
import { Button, buttonClass } from '@salon/ui'
import Link from 'next/link'
import { useTransition } from 'react'
import { confirmAppt, noShow } from '@/app/(site)/studio/[salon]/actions'
import { LateButton } from './LateButton'

export const ApptActions = ({ slug, id, status, past }: { slug: string; id: string | number; status: string; past: boolean }) => {
  const [pending, start] = useTransition()
  return (
    <div className='flex flex-wrap gap-2'>
      {status === 'requested' ? (
        <Button disabled={pending} onClick={() => start(async () => void (await confirmAppt(slug, id)))} size='sm'>
          Confirm
        </Button>
      ) : null}
      {['requested', 'confirmed'].includes(status) ? (
        <Link className={buttonClass('secondary', 'sm')} href={`/studio/${slug}/checkout?appointment=${id}`}>
          Check out
        </Link>
      ) : null}
      {!past && status === 'confirmed' ? <LateButton id={id} slug={slug} /> : null}
      {past && status === 'confirmed' ? (
        <Button disabled={pending} onClick={() => start(async () => void (await noShow(slug, id)))} size='sm' variant='ghost'>
          No-show
        </Button>
      ) : null}
    </div>
  )
}

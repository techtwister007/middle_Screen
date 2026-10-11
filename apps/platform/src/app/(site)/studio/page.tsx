import { getPayloadClient } from '@/lib/payload'
import { getStaffUser, staffSalonIds } from '@/lib/staff'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Studio' }

export default async function StudioIndex() {
  const user = await getStaffUser()
  if (!user) redirect('/studio/login')
  const payload = await getPayloadClient()
  const salons = (
    await payload.find({
      collection: 'salons',
      overrideAccess: true,
      depth: 0,
      limit: 200,
      where: user.role === 'platform-admin' ? {} : { id: { in: staffSalonIds(user) } },
    })
  ).docs as unknown as { id: string; name: string; slug: string }[]
  if (salons.length === 1) redirect(`/studio/${salons[0].slug}/today`)
  return (
    <div className="mx-auto max-w-lg px-5 pt-12">
      <h1 className="font-heading text-3xl">Choose a salon</h1>
      <div className="mt-6 space-y-2">
        {salons.map((s) => (
          <Link className="block rounded-card border border-line bg-surface p-4 font-medium" href={`/studio/${s.slug}/today`} key={s.id}>
            {s.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

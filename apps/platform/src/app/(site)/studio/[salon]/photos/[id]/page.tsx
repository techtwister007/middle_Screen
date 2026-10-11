import { PhotoCorner } from '@/components/studio/PhotoCorner'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'
import { forTenant } from '@salon/core'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Photo corner' }

export default async function PhotoTaskPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const { salon } = await requireStaff(slug)
  const task = await forTenant(await getPayloadClient(), salon.id).findByID<{ id: string; designName?: string; customer: { name?: string; phone: string } }>('photo-tasks', id, 1)
  if (!task) notFound()
  const season = salon.seasonalHighlight
  const frame = season === 'navratri' ? 'navratri' : season === 'diwali' ? 'diwali' : season === 'wedding' ? 'bridal' : salon.theme === 'luxe' ? 'noir' : salon.theme === 'minimal' ? 'minimal' : 'classic'
  return (
    <div>
      <h1 className="font-heading text-3xl">Photos for {task.customer?.name?.split(' ')[0] ?? 'customer'}</h1>
      <p className="mb-5 text-sm text-muted">Great photos turn into Instagram posts that bring new customers.</p>
      <PhotoCorner customerName={task.customer?.name?.split(' ')[0] ?? 'the customer'} defaultFrame={frame} initialDesign={task.designName} slug={slug} taskId={task.id} />
    </div>
  )
}

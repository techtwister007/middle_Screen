import { forTenant, idOf } from '@salon/core'
import { notFound } from 'next/navigation'
import { PhotoCorner } from '@/components/studio/PhotoCorner'
import { getPayloadClient } from '@/lib/payload'
import { requireFeature } from '@/lib/salon'
import { requireStaff } from '@/lib/staff'
import { teamOf } from '../../_lib/team'

export const metadata = { title: 'Photo corner' }

export default async function PhotoTaskPage({ params }: { params: Promise<{ salon: string; id: string }> }) {
  const { salon: slug, id } = await params
  const { salon, user } = await requireStaff(slug)
  requireFeature(salon, 'contentEngine')
  const payload = await getPayloadClient()
  const task = await forTenant(payload, salon.id).findByID<{
    id: string
    status: string
    designName?: string
    customer: { name?: string; phone: string }
    staff?: string | { id: string } | null
  }>('photo-tasks', id, 1)
  if (!task) notFound()
  const team = (await teamOf(payload, salon.id)).filter((t) => t.role !== 'manager' && t.role !== 'platform-admin')
  const defaultArtist = idOf(task.staff) ?? (team.some((t) => String(t.id) === String(user.id)) ? user.id : null)
  const season = salon.seasonalHighlight
  const frame =
    season === 'navratri'
      ? 'navratri'
      : season === 'diwali'
        ? 'diwali'
        : season === 'wedding'
          ? 'bridal'
          : salon.theme === 'luxe'
            ? 'noir'
            : salon.theme === 'minimal'
              ? 'minimal'
              : 'classic'
  return (
    <div>
      <h1 className='font-heading text-3xl'>Photos for {task.customer?.name?.split(' ')[0] ?? 'customer'}</h1>
      <p className='mb-5 text-sm text-muted'>Great photos turn into Instagram posts that bring new customers.</p>
      {task.status !== 'pending' ? (
        <p className='mb-4 rounded-btn bg-amber-500/10 p-3 text-sm text-amber-900'>Photos were already sent for this visit. Sending again replaces them.</p>
      ) : null}
      <PhotoCorner
        defaultArtist={defaultArtist}
        salonName={salon.name}
        team={team.map((t) => ({ id: t.id, name: t.name }))}
        customerName={task.customer?.name?.split(' ')[0] ?? 'the customer'}
        defaultFrame={frame}
        initialDesign={task.designName}
        slug={slug}
        taskId={task.id}
      />
    </div>
  )
}

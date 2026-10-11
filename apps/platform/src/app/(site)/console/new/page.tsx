import { NewSalonForm } from '@/components/console/NewSalonForm'

export const metadata = { title: 'New salon' }

export default async function NewSalonPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams
  return (
    <div>
      <h1 className="font-heading text-3xl">New salon or sales demo</h1>
      <p className="mb-8 mt-1 text-muted">Live within 48 hours: brand, menu, gallery, team and QR kit in one go.</p>
      <NewSalonForm defaultDemo={demo !== '0'} />
    </div>
  )
}

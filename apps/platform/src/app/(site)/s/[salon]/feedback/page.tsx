import { FeedbackForm } from '@/components/site/FeedbackForm'
import { loadSalon } from '@/lib/site'

export const metadata = { title: 'Feedback' }

export default async function FeedbackPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const salon = await loadSalon(slug)
  return (
    <div className="px-4 pt-8">
      <h1 className="font-heading text-3xl">We miss you</h1>
      <p className="mb-6 mt-1 text-muted">One tap: what's kept you away from {salon.name}?</p>
      <FeedbackForm slug={slug} />
    </div>
  )
}

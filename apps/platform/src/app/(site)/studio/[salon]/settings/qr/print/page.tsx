import { forTenant, publicUrl } from '@salon/core'
import QRCode from 'qrcode'
import { PrintButton } from '@/components/studio/PrintButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requireStaff } from '@/lib/staff'

export const metadata = { title: 'QR posters' }

/** Poster copy follows where the link leads (and, for social links, where it is shared). */
const BY_TARGET: Record<string, { title: string; body: string }> = {
  '/chair': { title: 'Love your nails?', body: 'Scan to save this look, see your photos and book your next set.' },
  '/': { title: 'Skip the queue next time', body: 'Book your next visit in 10 seconds and collect rewards.' },
  '/book': { title: 'Book in 10 seconds', body: 'Pick a design, a time and you are done. No calls needed.' },
  '/designs': { title: 'See our latest designs', body: 'Scan to browse prices and book instantly.' },
  '/care': { title: 'Your nail care, in your pocket', body: 'Aftercare tips, free fixes within 7 days and your refill reminder.' },
  '/contest': { title: 'Nail of the month', body: 'Vote for your favourite set and win a free one.' },
}
const BY_SOURCE: Record<string, { title: string; body: string }> = {
  instagram: { title: 'Follow our work', body: 'Scan for the designs everyone is booking, new looks every week.' },
  whatsapp: { title: 'Chat with us on WhatsApp', body: 'Scan to save our number, get offers and book in one tap.' },
  google: { title: 'Find us on Google', body: 'Scan for directions, reviews and booking.' },
}
const copyFor = (source: string, target: string) => BY_SOURCE[source] ?? BY_TARGET[target] ?? BY_TARGET['/designs']

export default async function QrPrintPage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug)
  const payload = await getPayloadClient()
  const links = (
    await forTenant(payload, salon.id).find<{ id: string; label: string; code: string; source: string; target: string }>('tracking-links', {
      limit: 20,
      sort: 'createdAt',
    })
  ).docs
  const posters = [
    { key: 'main', label: 'Main', url: `${publicUrl()}/s/${slug}`, source: 'qr', target: '/' },
    ...links.map((l) => ({ key: l.id, label: l.label, url: `${publicUrl()}/s/${slug}/l/${l.code}`, source: l.source, target: l.target })),
  ]
  const qrs = await Promise.all(posters.map((p) => QRCode.toDataURL(p.url, { margin: 1, width: 600 })))
  const logo = mediaUrl(salon.brand?.logo, 'thumb')
  return (
    <div>
      <div className='mb-6 flex items-center justify-between print:hidden'>
        <p className='text-sm text-muted'>A5 posters, one per page. Print, cut and stand them up.</p>
        <PrintButton />
      </div>
      <div className='grid gap-6 sm:grid-cols-2 print:block'>
        {posters.map((p, i) => {
          const copy = copyFor(p.source, p.target)
          return (
            <section
              className='flex aspect-[148/210] flex-col items-center justify-between rounded-card border border-line bg-surface p-8 text-center print:mb-0 print:h-[200mm] print:break-after-page print:rounded-none print:border-0'
              key={p.key}
            >
              <div>
                {logo ? <img alt='' className='mx-auto mb-3 h-14 w-14 rounded-full object-cover' src={logo} /> : null}
                <p className='font-heading text-xl'>{salon.name}</p>
              </div>
              <div>
                <h2 className='font-heading text-3xl'>{copy.title}</h2>
                <p className='mx-auto mt-2 max-w-[16rem] text-sm text-muted'>{copy.body}</p>
              </div>
              <img alt={`QR code: ${p.label}`} className='h-48 w-48' src={qrs[i]} />
              <p className='text-xs text-muted'>Point your camera here · {p.label}</p>
            </section>
          )
        })}
      </div>
    </div>
  )
}

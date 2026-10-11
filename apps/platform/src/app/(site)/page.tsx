import { buttonClass } from '@salon/ui'
import { ArrowRight, BellRing, Camera, Gift, LineChart, Repeat, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { PLATFORM_NAME, SUPPORT_WHATSAPP } from '@/lib/brand'

export const metadata = {
  title: `${PLATFORM_NAME} · Your salon's own app`,
  description: 'A branded app that brings salon customers back, brings their friends, and fills your Instagram.',
}

const FEATURES = [
  { icon: Repeat, title: 'Customers come back on their own', body: 'Refill reminders timed to every service, pre-booking in the chair and win-back messages.' },
  { icon: Gift, title: 'Their friends come too', body: 'Gift-a-friend invites, gift cards and contests where every voter becomes a new contact.' },
  {
    icon: Camera,
    title: 'Your Instagram fills itself',
    body: 'Branded nail photos and ready-made stories after every visit, with your handle and booking link.',
  },
  { icon: BellRing, title: 'Fewer empty slots and no-shows', body: 'Deposits for long services, waitlists and one-tap slot-filler deals.' },
  {
    icon: Sparkles,
    title: 'An app with your name on it',
    body: 'Your colours, your photos, your prices. No app store. Opens from Instagram, WhatsApp or a QR code.',
  },
  { icon: LineChart, title: 'Know what it earned you', body: 'A daily WhatsApp summary and a monthly report: bookings, repeat visits, referrals and revenue.' },
]

export default function Landing() {
  return (
    <div className='min-h-dvh'>
      <link
        href='https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
        precedence='default'
        rel='stylesheet'
      />
      <header className='mx-auto flex max-w-5xl items-center justify-between px-6 py-5'>
        <span className='font-heading text-2xl'>{PLATFORM_NAME}</span>
        <Link className='text-sm' href='/studio/login'>
          Salon login
        </Link>
      </header>
      <section className='mx-auto max-w-5xl px-6 pb-16 pt-10'>
        <p className='text-sm font-semibold uppercase tracking-[0.3em] text-brand'>For nail studios & salons</p>
        <h1 className='mt-4 max-w-3xl font-heading text-5xl leading-[1.05] md:text-6xl'>
          Your salon's own app. Customers come back, bring friends and post about you.
        </h1>
        <p className='mt-6 max-w-xl text-lg text-muted'>We set it up in 48 hours and run it for you. One refill booking pays for the month.</p>
        <div className='mt-8 flex flex-wrap gap-3'>
          <Link className={buttonClass('primary', 'lg')} href='/s/glamnails'>
            See a live salon app <ArrowRight size={18} />
          </Link>
          {SUPPORT_WHATSAPP ? (
            <a
              className={buttonClass('secondary', 'lg')}
              href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! I'd like a demo of ${PLATFORM_NAME} for my salon.`)}`}
            >
              Book a demo on WhatsApp
            </a>
          ) : null}
        </div>
      </section>
      <section className='mx-auto grid max-w-5xl gap-4 px-6 pb-20 md:grid-cols-3'>
        {FEATURES.map((f) => (
          <div className='rounded-card border border-line bg-surface p-6' key={f.title}>
            <f.icon className='text-brand' />
            <p className='mt-4 font-heading text-xl'>{f.title}</p>
            <p className='mt-2 text-sm text-muted'>{f.body}</p>
          </div>
        ))}
      </section>
      <section className='mx-auto max-w-5xl px-6 pb-20'>
        <h2 className='font-heading text-3xl'>Three looks, one platform</h2>
        <div className='mt-6 grid gap-4 md:grid-cols-3'>
          {[
            ['glamnails', 'Glam Nails Studio', 'Blush'],
            ['aura', 'Aura Beauty Lounge', 'Noir & Gold'],
            ['riddhi', 'Nails by Riddhi', 'Studio White'],
          ].map(([slug, name, theme]) => (
            <Link className='rounded-card border border-line bg-surface p-5 hover:border-brand' href={`/s/${slug}`} key={slug}>
              <p className='text-xs uppercase tracking-widest text-muted'>{theme}</p>
              <p className='mt-1 font-heading text-xl'>{name}</p>
              <p className='mt-3 inline-flex items-center gap-1 text-sm text-brand'>
                Open demo <ArrowRight size={14} />
              </p>
            </Link>
          ))}
        </div>
      </section>
      <section className='mx-auto max-w-5xl px-6 pb-24'>
        <h2 className='font-heading text-3xl'>Simple pricing</h2>
        <div className='mt-6 grid gap-4 md:grid-cols-3'>
          {[
            ['Starter', '₹499', 'Home studios', 'Menu, gallery, booking, stamp card'],
            ['Studio', '₹999', 'Nail studios', 'Everything: reminders, referrals, photos, campaigns, reports'],
            ['Growth', '₹2,499', 'Premium salons', 'Custom design, monthly photoshoot, campaigns run for you'],
          ].map(([name, price, who, what]) => (
            <div className={`rounded-card border p-6 ${name === 'Studio' ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`} key={name}>
              <p className='font-heading text-xl'>{name}</p>
              <p className='mt-2 font-heading text-4xl'>
                {price}
                <span className='text-base opacity-70'>/month</span>
              </p>
              <p className='mt-1 text-sm opacity-80'>{who}</p>
              <p className='mt-4 text-sm opacity-90'>{what}</p>
            </div>
          ))}
        </div>
        <p className='mt-4 text-sm text-muted'>
          WhatsApp messages are billed at Meta's rates, shown every month. No lock-in, and your customer data is always yours.
        </p>
      </section>
    </div>
  )
}

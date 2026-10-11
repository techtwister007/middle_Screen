import { THEMES } from '@salon/themes'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { DayHoursRow } from '@/components/studio/DayHours'
import { Field, inputClass } from '@/components/studio/Field'
import { mediaUrl } from '@/lib/media'
import { requireStaff } from '@/lib/staff'
import { saveProfile } from '../actions'

export const metadata = { title: 'Salon page & brand' }

const DAYS: [string, string][] = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
]

const SEASONS: [string, string][] = [
  ['', 'None'],
  ['navratri', 'Navratri'],
  ['diwali', 'Diwali'],
  ['holi', 'Holi'],
  ['karva-chauth', 'Karva Chauth'],
  ['eid', 'Eid'],
  ['christmas', 'Christmas'],
  ['wedding', 'Wedding season'],
  ['valentine', "Valentine's Day"],
  ['summer', 'Summer'],
  ['monsoon', 'Monsoon'],
]

export default async function ProfilePage({ params }: { params: Promise<{ salon: string }> }) {
  const { salon: slug } = await params
  const { salon } = await requireStaff(slug, { manager: true })
  const c = salon.contact ?? {}
  const s = (salon.settings ?? {}) as Record<string, string | undefined>
  const hours = new Map((salon.hours ?? []).map((h) => [h.day, h]))
  const logo = mediaUrl(salon.brand?.logo, 'thumb')
  const cover = mediaUrl(salon.brand?.cover, 'card')
  const langs = new Set(salon.languages ?? ['en'])
  return (
    <div>
      <Link className='text-sm text-brand' href={`/studio/${slug}/settings`}>
        ← More
      </Link>
      <div className='mt-3 flex items-center justify-between gap-3'>
        <h1 className='font-heading text-3xl'>Salon page & brand</h1>
        <Link className='text-sm text-brand' href={`/s/${slug}`} target='_blank'>
          Preview ↗
        </Link>
      </div>
      <ActionForm action={saveProfile.bind(null, slug)} className='mt-6' sticky submit='Save salon page'>
        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>About</h2>
          <Field label='Salon name'>
            <input className={inputClass} defaultValue={salon.name} name='name' required />
          </Field>
          <Field hint='One line under your name, e.g. "Nail art studio in Alkapuri"' label='Tagline'>
            <input className={inputClass} defaultValue={salon.tagline ?? ''} maxLength={80} name='tagline' />
          </Field>
          <Field label='About the salon'>
            <textarea className={`${inputClass} h-24 py-2`} defaultValue={salon.about ?? ''} name='about' />
          </Field>
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Look</h2>
          <fieldset>
            <legend className='mb-2 text-sm font-medium'>Theme</legend>
            <div className='grid grid-cols-3 gap-2'>
              {Object.values(THEMES).map((t) => (
                <label
                  className='cursor-pointer rounded-card border border-line p-2 text-center text-sm has-[:checked]:border-brand has-[:checked]:ring-2 has-[:checked]:ring-brand/30'
                  key={t.key}
                >
                  <input className='sr-only' defaultChecked={(salon.theme ?? 'default') === t.key} name='theme' type='radio' value={t.key} />
                  <span className='mb-2 flex h-10 overflow-hidden rounded-md'>
                    <span className='flex-1' style={{ background: t.tokens.bg }} />
                    <span className='flex-1' style={{ background: t.tokens.primary }} />
                    <span className='flex-1' style={{ background: t.tokens.accent }} />
                  </span>
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className='grid grid-cols-2 gap-3'>
            <label className='col-span-2 flex min-h-11 items-center gap-3 text-sm'>
              <input className='h-5 w-5' defaultChecked={!salon.brand?.primaryColor} name='useThemeColors' type='checkbox' /> Use the theme's own colours
            </label>
            <Field label='Main colour'>
              <input className={`${inputClass} p-1`} defaultValue={salon.brand?.primaryColor ?? '#B4637A'} name='primaryColor' type='color' />
            </Field>
            <Field label='Accent colour'>
              <input className={`${inputClass} p-1`} defaultValue={salon.brand?.accentColor ?? '#C9A227'} name='accentColor' type='color' />
            </Field>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <Field hint='Square works best' label='Logo'>
              {logo ? <img alt='Current logo' className='mb-2 h-14 w-14 rounded-full object-cover' src={logo} /> : null}
              <input accept='image/*' className='w-full min-w-0 text-xs' name='logo' type='file' />
            </Field>
            <Field hint='Wide photo for the top of your page' label='Cover photo'>
              {cover ? <img alt='Current cover' className='mb-2 h-14 w-24 rounded-md object-cover' src={cover} /> : null}
              <input accept='image/*' className='w-full min-w-0 text-xs' name='cover' type='file' />
            </Field>
          </div>
          <Field hint='Shows matching designs and photo frames on your page' label='Season / festival highlight'>
            <select className={inputClass} defaultValue={salon.seasonalHighlight ?? ''} name='seasonalHighlight'>
              {SEASONS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
              {salon.seasonalHighlight && !SEASONS.some(([k]) => k === salon.seasonalHighlight) ? (
                <option value={salon.seasonalHighlight}>{salon.seasonalHighlight}</option>
              ) : null}
            </select>
          </Field>
          <fieldset>
            <legend className='mb-2 text-sm font-medium'>Languages customers can pick</legend>
            <div className='flex flex-wrap gap-x-5 text-sm'>
              <label className='flex min-h-11 items-center gap-2'>
                <input checked className='h-5 w-5' disabled type='checkbox' /> English
              </label>
              <label className='flex min-h-11 items-center gap-2'>
                <input className='h-5 w-5' defaultChecked={langs.has('hi')} name='lang_hi' type='checkbox' /> हिन्दी
              </label>
              <label className='flex min-h-11 items-center gap-2'>
                <input className='h-5 w-5' defaultChecked={langs.has('gu')} name='lang_gu' type='checkbox' /> ગુજરાતી
              </label>
            </div>
          </fieldset>
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Contact & location</h2>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Field label='Phone'>
              <input className={inputClass} defaultValue={c.phone ?? ''} inputMode='tel' name='phone' />
            </Field>
            <Field label='WhatsApp'>
              <input className={inputClass} defaultValue={c.whatsapp ?? ''} inputMode='tel' name='whatsapp' />
            </Field>
            <Field label='Instagram handle'>
              <input className={inputClass} defaultValue={c.instagram ?? ''} name='instagram' placeholder='glamnails.vdr' />
            </Field>
            <Field label='Google Maps link'>
              <input className={inputClass} defaultValue={c.mapUrl ?? ''} name='mapUrl' type='url' />
            </Field>
            <Field label='Area'>
              <input className={inputClass} defaultValue={c.area ?? ''} name='area' />
            </Field>
            <Field label='City'>
              <input className={inputClass} defaultValue={c.city ?? ''} name='city' />
            </Field>
          </div>
          <Field label='Address'>
            <textarea className={`${inputClass} h-20 py-2`} defaultValue={c.address ?? ''} name='address' />
          </Field>
          <Field label='Parking'>
            <input className={inputClass} defaultValue={c.parking ?? ''} name='parking' placeholder='Free parking in front' />
          </Field>
        </section>

        <section className='space-y-3 rounded-card border border-line bg-surface p-2.5 sm:p-4'>
          <h2 className='font-heading text-xl'>Opening hours</h2>
          <input name='hours_v2' type='hidden' value='1' />
          {DAYS.map(([day, label]) => {
            const h = hours.get(day)
            return (
              <DayHoursRow
                day={day}
                end={h?.close ?? '20:00'}
                key={day}
                label={label}
                names={{ open: `isopen_${day}`, start: `open_${day}`, end: `close_${day}` }}
                open={!h?.closed}
                start={h?.open ?? '10:00'}
              />
            )
          })}
        </section>

        <section className='space-y-4 rounded-card border border-line bg-surface p-4'>
          <h2 className='font-heading text-xl'>Chair mode</h2>
          <p className='text-sm text-muted'>Shown to customers in the chair so they don't have to ask.</p>
          <div className='grid grid-cols-2 gap-3'>
            <Field label='Wi-Fi name'>
              <input className={inputClass} defaultValue={s.wifiName ?? ''} name='wifiName' />
            </Field>
            <Field label='Wi-Fi password'>
              <input className={inputClass} defaultValue={s.wifiPassword ?? ''} name='wifiPassword' />
            </Field>
          </div>
        </section>
      </ActionForm>
    </div>
  )
}

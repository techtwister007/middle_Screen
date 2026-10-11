import { formatIST, type ID } from '@salon/core'
import { cn } from '@salon/ui'
import Link from 'next/link'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { getPayloadClient } from '@/lib/payload'
import { requirePlatformAdmin } from '@/lib/staff'
import { deleteContent, saveArticle, savePack } from '../actions'

export const metadata = { title: 'Content' }

interface Pack {
  id: ID
  title: string
  festival: string
  startsOn: string
  endsOn: string
  pitch?: string | null
  offerTitle: string
  offerDescription?: string | null
  valueType?: string | null
  value?: number | null
  galleryTag?: string | null
}
interface Article {
  id: ID
  title: string
  slug: string
  kind?: string | null
  language?: string | null
  summary?: string | null
  body: string
  serviceCategories?: string[] | null
  published?: boolean | null
}

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '')

const PackFields = ({ p }: { p?: Pack }) => (
  <>
    {p ? <input name='id' type='hidden' value={String(p.id)} /> : null}
    <div className='grid gap-3 md:grid-cols-2'>
      <Field label='Pack name'>
        <input className={inputClass} defaultValue={p?.title} name='title' placeholder='Diwali glow pack' required />
      </Field>
      <Field hint='Matches salons’ season highlight and design seasons' label='Festival key'>
        <input className={inputClass} defaultValue={p?.festival} name='festival' placeholder='diwali' required />
      </Field>
      <Field label='Starts'>
        <input className={inputClass} defaultValue={day(p?.startsOn)} name='startsOn' required type='date' />
      </Field>
      <Field label='Ends'>
        <input className={inputClass} defaultValue={day(p?.endsOn)} name='endsOn' required type='date' />
      </Field>
    </div>
    <Field hint='One line on the owner’s Today screen' label='Pitch to owners'>
      <input className={inputClass} defaultValue={p?.pitch ?? ''} name='pitch' />
    </Field>
    <div className='grid gap-3 md:grid-cols-3'>
      <Field label='Offer headline'>
        <input className={inputClass} defaultValue={p?.offerTitle} name='offerTitle' required />
      </Field>
      <Field label='Type'>
        <select className={inputClass} defaultValue={p?.valueType ?? 'percent'} name='valueType'>
          <option value='percent'>% off</option>
          <option value='amount'>₹ off</option>
          <option value='freebie'>Free extra</option>
        </select>
      </Field>
      <Field hint='Percent or rupees' label='Value'>
        <input className={inputClass} defaultValue={p ? (p.valueType === 'amount' ? (p.value ?? 0) / 100 : (p.value ?? 0)) : 10} name='value' type='number' />
      </Field>
    </div>
    <Field label='Offer details'>
      <textarea className={`${inputClass} h-20 py-2`} defaultValue={p?.offerDescription ?? ''} name='offerDescription' />
    </Field>
    <Field hint='Designs tagged with this season are featured' label='Gallery tag'>
      <input className={inputClass} defaultValue={p?.galleryTag ?? ''} name='galleryTag' placeholder='diwali' />
    </Field>
  </>
)

const ArticleFields = ({ a }: { a?: Article }) => (
  <>
    {a ? <input name='id' type='hidden' value={String(a.id)} /> : null}
    <div className='grid gap-3 md:grid-cols-3'>
      <Field label='Title'>
        <input className={inputClass} defaultValue={a?.title} name='title' required />
      </Field>
      <Field label='Language'>
        <select className={inputClass} defaultValue={a?.language ?? 'en'} name='language'>
          <option value='en'>English</option>
          <option value='hi'>हिन्दी</option>
          <option value='gu'>ગુજરાતી</option>
        </select>
      </Field>
      <Field label='Kind'>
        <select className={inputClass} defaultValue={a?.kind ?? 'aftercare'} name='kind'>
          <option value='aftercare'>Aftercare</option>
          <option value='trend'>Trend</option>
          <option value='guide'>Guide</option>
        </select>
      </Field>
    </div>
    <Field hint='Comma separated: gel, extensions, pedicure' label='For services'>
      <input className={inputClass} defaultValue={(a?.serviceCategories ?? []).join(', ')} name='serviceCategories' />
    </Field>
    <Field label='Summary'>
      <input className={inputClass} defaultValue={a?.summary ?? ''} name='summary' />
    </Field>
    <Field hint='Plain text; blank lines start new paragraphs' label='Text'>
      <textarea className={`${inputClass} h-48 py-2`} defaultValue={a?.body} name='body' required />
    </Field>
    <label className='flex min-h-11 items-center gap-2 text-sm'>
      <input className='h-5 w-5' defaultChecked={a ? a.published !== false : true} name='published' type='checkbox' /> Published
    </label>
  </>
)

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePlatformAdmin()
  const { tab = 'packs' } = await searchParams
  const payload = await getPayloadClient()
  const [packs, articles] = await Promise.all([
    payload.find({ collection: 'campaign-packs', overrideAccess: true, depth: 0, limit: 200, sort: 'startsOn' }),
    payload.find({ collection: 'articles', overrideAccess: true, depth: 0, limit: 300, sort: 'title' }),
  ])
  return (
    <div>
      <h1 className='font-heading text-3xl'>Content</h1>
      <p className='mt-1 text-sm text-muted'>Shared by every salon. Photo frames and WhatsApp wording are in the code and need a developer.</p>
      <nav className='mt-5 flex gap-2'>
        {[
          ['packs', `Festival packs (${packs.totalDocs})`],
          ['articles', `Care articles (${articles.totalDocs})`],
        ].map(([k, label]) => (
          <Link
            className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-sm', tab === k ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')}
            href={`?tab=${k}`}
            key={k}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'packs' ? (
        <section className='mt-6 space-y-3'>
          <details className='rounded-card border border-dashed border-brand bg-surface p-4'>
            <summary className='cursor-pointer py-1 font-medium text-brand'>+ New festival pack</summary>
            <ActionForm action={savePack} className='mt-4' resetOnSuccess submit='Add pack'>
              <PackFields />
            </ActionForm>
          </details>
          {(packs.docs as unknown as Pack[]).map((p) => (
            <details className='rounded-card border border-line bg-surface p-4' key={String(p.id)}>
              <summary className='flex cursor-pointer list-none flex-wrap items-center justify-between gap-2'>
                <span className='font-medium'>{p.title}</span>
                <span className='text-sm text-muted'>
                  {formatIST(p.startsOn, 'd MMM')} – {formatIST(p.endsOn, 'd MMM yyyy')} · {p.offerTitle}
                </span>
              </summary>
              <ActionForm action={savePack} className='mt-4'>
                <PackFields p={p} />
              </ActionForm>
              <div className='mt-3'>
                <FlagButton className='text-red-700' confirm={`Delete "${p.title}"? Offers already launched by salons stay.`} run={deleteContent.bind(null, 'campaign-packs', p.id)}>
                  Delete pack
                </FlagButton>
              </div>
            </details>
          ))}
        </section>
      ) : (
        <section className='mt-6 space-y-3'>
          <details className='rounded-card border border-dashed border-brand bg-surface p-4'>
            <summary className='cursor-pointer py-1 font-medium text-brand'>+ New article</summary>
            <ActionForm action={saveArticle} className='mt-4' resetOnSuccess submit='Add article'>
              <ArticleFields />
            </ActionForm>
          </details>
          {(articles.docs as unknown as Article[]).map((a) => (
            <details className='rounded-card border border-line bg-surface p-4' key={String(a.id)}>
              <summary className='flex cursor-pointer list-none flex-wrap items-center justify-between gap-2'>
                <span className='font-medium'>{a.title}</span>
                <span className='text-sm text-muted'>
                  {a.language?.toUpperCase()} · {a.kind} {a.published === false ? '· draft' : ''}
                </span>
              </summary>
              <ActionForm action={saveArticle} className='mt-4'>
                <ArticleFields a={a} />
              </ActionForm>
              <div className='mt-3'>
                <FlagButton className='text-red-700' confirm={`Delete "${a.title}"?`} run={deleteContent.bind(null, 'articles', a.id)}>
                  Delete article
                </FlagButton>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  )
}

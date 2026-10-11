import type { ID } from '@salon/core'
import { LENGTHS, OCCASIONS, SHAPES } from '@salon/modules'
import { ActionForm } from '@/components/studio/ActionForm'
import { Field, inputClass } from '@/components/studio/Field'
import { FlagButton } from '@/components/studio/FlagButton'
import { mediaUrl } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { requirePlatformAdmin } from '@/lib/staff'
import { saveLibraryDesign, setLibraryDesign } from '../actions'

// Building a demo salon or copying photos can take a minute.
export const maxDuration = 300

export const metadata = { title: 'Design library' }

interface Look {
  id: ID
  title: string
  description?: string | null
  images?: unknown[]
  styleNames?: string[] | null
  occasions?: string[] | null
  seasons?: string[] | null
  colors?: string[] | null
  shape?: string | null
  length?: string | null
  suggestedService?: string | null
  credit?: string | null
  published?: boolean | null
  timesCopied?: number | null
}

const chip =
  'inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand'

const LookFields = ({ l }: { l?: Look }) => (
  <>
    {l ? <input name='id' type='hidden' value={String(l.id)} /> : null}
    <div className='grid gap-3 md:grid-cols-2'>
      <Field label='Name'>
        <input className={inputClass} defaultValue={l?.title} name='title' required />
      </Field>
      <Field hint='Comma separated. Matched to each salon’s styles by name.' label='Styles'>
        <input className={inputClass} defaultValue={(l?.styleNames ?? []).join(', ')} name='styleNames' placeholder='Nail art, French' />
      </Field>
    </div>
    <Field label='Description'>
      <textarea className={`${inputClass} h-20 py-2`} defaultValue={l?.description ?? ''} name='description' />
    </Field>
    <div className='grid gap-3 md:grid-cols-4'>
      <Field hint='Linked by name when copied' label='Suggested service'>
        <input className={inputClass} defaultValue={l?.suggestedService ?? ''} name='suggestedService' placeholder='Gel polish' />
      </Field>
      <Field label='Shape'>
        <select className={inputClass} defaultValue={l?.shape ?? ''} name='shape'>
          <option value=''>Any</option>
          {SHAPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label='Length'>
        <select className={inputClass} defaultValue={l?.length ?? ''} name='length'>
          <option value=''>Any</option>
          {LENGTHS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label='Seasons'>
        <input className={inputClass} defaultValue={(l?.seasons ?? []).join(', ')} name='seasons' placeholder='navratri, wedding' />
      </Field>
    </div>
    <fieldset>
      <legend className='mb-2 text-sm font-medium'>Occasions</legend>
      <div className='flex flex-wrap gap-2'>
        {OCCASIONS.map((o) => (
          <label className={chip} key={o}>
            <input className='sr-only' defaultChecked={l?.occasions?.includes(o)} name='occasions' type='checkbox' value={o} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
    <div className='grid gap-3 md:grid-cols-2'>
      <Field label='Colours'>
        <input className={inputClass} defaultValue={(l?.colors ?? []).join(', ')} name='colors' placeholder='red, gold' />
      </Field>
      <Field hint='Required for new looks: "Own photo" or the licence and link' label='Photo credit'>
        <input className={inputClass} defaultValue={l?.credit ?? ''} name='credit' placeholder='Pexels License: https://www.pexels.com/photo/…' />
      </Field>
    </div>
    <Field hint={l ? 'New photos are added after the existing ones' : 'Only photos you have the rights to share with every salon'} label='Photos'>
      <input accept='image/*' className='w-full min-w-0 text-sm' multiple name='images' required={!l} type='file' />
    </Field>
    <label className='flex min-h-11 items-center gap-2 text-sm'>
      <input className='h-5 w-5' defaultChecked={l ? l.published !== false : true} name='published' type='checkbox' /> Visible to salons
    </label>
  </>
)

export default async function LibraryPage() {
  await requirePlatformAdmin()
  const payload = await getPayloadClient()
  const looks = (await payload.find({ collection: 'library-designs', overrideAccess: true, depth: 1, limit: 300, sort: '-createdAt' }))
    .docs as unknown as Look[]
  return (
    <div>
      <h1 className='font-heading text-3xl'>Design library</h1>
      <p className='mt-1 max-w-2xl text-sm text-muted'>
        Looks every salon can copy into its gallery in one tap (Studio → Gallery → Design library). Great for new salons without photos yet. Salons keep their
        copies even if a look is removed here.
      </p>

      <details className='mt-6 rounded-card border border-dashed border-brand bg-surface p-4'>
        <summary className='cursor-pointer py-1 font-medium text-brand'>+ Add a look</summary>
        <ActionForm action={saveLibraryDesign} className='mt-4' resetOnSuccess submit='Add to library'>
          <LookFields />
        </ActionForm>
      </details>

      <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {looks.map((l) => {
          const img = mediaUrl(l.images?.[0], 'card')
          return (
            <article className='overflow-hidden rounded-card border border-line bg-surface' data-testid='library-look' key={String(l.id)}>
              {img ? <img alt='' className={`aspect-[4/3] w-full object-cover ${l.published === false ? 'opacity-50' : ''}`} src={img} /> : null}
              <div className='space-y-2 p-4'>
                <div className='flex items-start justify-between gap-2'>
                  <p className='font-medium'>{l.title}</p>
                  <span className='shrink-0 text-xs text-muted'>copied {l.timesCopied ?? 0}×</span>
                </div>
                <p className='text-xs text-muted'>
                  {(l.styleNames ?? []).join(', ')}
                  {l.suggestedService ? ` · ${l.suggestedService}` : ''}
                  {l.published === false ? ' · hidden' : ''}
                </p>
                {l.credit ? <p className='truncate text-xs text-muted'>{l.credit}</p> : null}
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  <FlagButton run={setLibraryDesign.bind(null, l.id, l.published === false ? 'publish' : 'unpublish')}>
                    {l.published === false ? 'Show to salons' : 'Hide'}
                  </FlagButton>
                  <FlagButton
                    className='text-red-700'
                    confirm={`Remove "${l.title}" from the library? Salons keep their copies.`}
                    run={setLibraryDesign.bind(null, l.id, 'delete')}
                  >
                    Delete
                  </FlagButton>
                </div>
                <details>
                  <summary className='cursor-pointer py-2 text-sm text-brand'>Edit</summary>
                  <ActionForm action={saveLibraryDesign} className='mt-2'>
                    <LookFields l={l} />
                  </ActionForm>
                </details>
              </div>
            </article>
          )
        })}
      </div>
      {!looks.length ? <p className='mt-6 text-sm text-muted'>No looks yet.</p> : null}
    </div>
  )
}

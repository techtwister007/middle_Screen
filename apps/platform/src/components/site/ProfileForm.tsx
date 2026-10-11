'use client'
import { Button, Input, Label } from '@salon/ui'
import { Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteMyData, logout, saveProfile, setLanguage } from '@/app/(site)/s/[salon]/actions'
import { LANG_LABELS, type Lang } from '@/lib/i18n'

const SHAPES = ['almond', 'oval', 'square', 'coffin', 'stiletto', 'round']
const LENGTHS = ['short', 'medium', 'long', 'extra-long']

export const ProfileForm = ({
  slug,
  initial,
  labels: l,
}: {
  slug: string
  initial: { name: string; birthday: string; marketing: boolean; gallery: boolean; lang: Lang; shape: string; length: string; sensitivities: string }
  labels: Record<string, string>
}) => {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = () =>
    start(async () => {
      await saveProfile(slug, {
        name: v.name,
        birthday: v.birthday || null,
        marketing: v.marketing,
        gallery: v.gallery,
        hand: { shape: v.shape, length: v.length, sensitivities: v.sensitivities },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  return (
    <div className='space-y-5'>
      <div>
        <Label>{l.language}</Label>
        <div className='grid grid-cols-3 gap-2' data-testid='language-switch'>
          {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
            <button
              aria-pressed={v.lang === lang}
              className={`rounded-btn border py-2.5 text-sm ${v.lang === lang ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`}
              key={lang}
              lang={lang}
              onClick={() => {
                setV({ ...v, lang })
                start(async () => {
                  await setLanguage(slug, lang)
                  // Every page (and the layout's nav) re-renders in the new language.
                  router.refresh()
                })
              }}
              type='button'
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor='pname'>{l.name}</Label>
        <Input id='pname' onChange={(e) => setV({ ...v, name: e.target.value })} value={v.name} />
      </div>
      <div>
        <Label htmlFor='bday'>{l.birthdayLabel}</Label>
        <Input id='bday' onChange={(e) => setV({ ...v, birthday: e.target.value })} type='date' value={v.birthday} />
      </div>
      <div className='rounded-card border border-line bg-surface p-4'>
        <p className='mb-3 font-medium'>{l.handProfile}</p>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='shape'>{l.preferredShape}</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id='shape'
              onChange={(e) => setV({ ...v, shape: e.target.value })}
              value={v.shape}
            >
              <option value=''>{l.notSure}</option>
              {SHAPES.map((s) => (
                <option key={s} value={s}>
                  {l[`shape_${s}`] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor='length'>{l.length}</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id='length'
              onChange={(e) => setV({ ...v, length: e.target.value })}
              value={v.length}
            >
              <option value=''>{l.notSure}</option>
              {LENGTHS.map((s) => (
                <option key={s} value={s}>
                  {l[`len_${s}`] ?? s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className='mt-3'>
          <Label htmlFor='sens'>{l.sensitivities}</Label>
          <Input id='sens' onChange={(e) => setV({ ...v, sensitivities: e.target.value })} placeholder={l.sensPlaceholder} value={v.sensitivities} />
        </div>
      </div>
      <div className='space-y-3 rounded-card border border-line bg-surface p-4 text-sm'>
        <label className='flex items-start gap-3'>
          <input
            checked={v.marketing}
            className='mt-1 h-4 w-4'
            data-testid='consent-marketing'
            onChange={(e) => setV({ ...v, marketing: e.target.checked })}
            type='checkbox'
          />
          <span>{l.consentMarketing}</span>
        </label>
        <label className='flex items-start gap-3'>
          <input checked={v.gallery} className='mt-1 h-4 w-4' onChange={(e) => setV({ ...v, gallery: e.target.checked })} type='checkbox' />
          <span>{l.consentGallery}</span>
        </label>
      </div>
      <Button className='w-full' disabled={pending} onClick={save} size='lg'>
        {saved ? l.savedTick : pending ? l.saving : l.save}
      </Button>
      <a
        className='flex h-11 items-center justify-center gap-2 rounded-btn border border-line text-sm'
        data-testid='download-data'
        download
        href={`/s/${slug}/me/data`}
      >
        <Download size={15} /> {l.downloadData}
      </a>
      <div className='flex items-center justify-between pt-2 text-sm'>
        <button
          className='text-muted underline'
          onClick={() =>
            start(async () => {
              await logout(slug)
              window.location.href = `/s/${slug}`
            })
          }
          type='button'
        >
          {l.logout}
        </button>
        {confirmDelete ? (
          <button
            className='text-red-700 underline'
            onClick={() =>
              start(async () => {
                await deleteMyData(slug)
                window.location.href = `/s/${slug}`
              })
            }
            type='button'
          >
            {l.deleteConfirm}
          </button>
        ) : (
          <button className='text-muted underline' onClick={() => setConfirmDelete(true)} type='button'>
            {l.deleteData}
          </button>
        )}
      </div>
    </div>
  )
}

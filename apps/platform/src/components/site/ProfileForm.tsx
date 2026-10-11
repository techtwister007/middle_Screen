'use client'
import { Button, Input, Label } from '@salon/ui'
import { useState, useTransition } from 'react'
import { deleteMyData, logout, saveProfile, setLanguage } from '@/app/(site)/s/[salon]/actions'
import { LANG_LABELS, type Lang } from '@/lib/i18n'

export const ProfileForm = ({
  slug,
  initial,
}: {
  slug: string
  initial: { name: string; birthday: string; marketing: boolean; gallery: boolean; lang: Lang; shape: string; length: string; sensitivities: string }
}) => {
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
        <Label>Language</Label>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
            <button
              className={`rounded-btn border py-2.5 text-sm ${v.lang === l ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface'}`}
              key={l}
              onClick={() => {
                setV({ ...v, lang: l })
                start(() => setLanguage(slug, l))
              }}
              type='button'
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor='pname'>Name</Label>
        <Input id='pname' onChange={(e) => setV({ ...v, name: e.target.value })} value={v.name} />
      </div>
      <div>
        <Label htmlFor='bday'>Birthday (for a birthday-month treat)</Label>
        <Input id='bday' onChange={(e) => setV({ ...v, birthday: e.target.value })} type='date' value={v.birthday} />
      </div>
      <div className='rounded-card border border-line bg-surface p-4'>
        <p className='mb-3 font-medium'>My hand profile</p>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='shape'>Preferred shape</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id='shape'
              onChange={(e) => setV({ ...v, shape: e.target.value })}
              value={v.shape}
            >
              <option value=''>Not sure</option>
              {['almond', 'oval', 'square', 'coffin', 'stiletto', 'round'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor='length'>Length</Label>
            <select
              className='h-12 w-full rounded-btn border border-line bg-surface px-3'
              id='length'
              onChange={(e) => setV({ ...v, length: e.target.value })}
              value={v.length}
            >
              <option value=''>Not sure</option>
              {['short', 'medium', 'long', 'extra-long'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className='mt-3'>
          <Label htmlFor='sens'>Sensitivities or allergies</Label>
          <Input id='sens' onChange={(e) => setV({ ...v, sensitivities: e.target.value })} placeholder='e.g. sensitive cuticles' value={v.sensitivities} />
        </div>
      </div>
      <div className='space-y-3 rounded-card border border-line bg-surface p-4 text-sm'>
        <label className='flex items-start gap-3'>
          <input checked={v.marketing} className='mt-1 h-4 w-4' onChange={(e) => setV({ ...v, marketing: e.target.checked })} type='checkbox' />
          <span>Offers and new designs on WhatsApp (max one a week). Booking reminders always come.</span>
        </label>
        <label className='flex items-start gap-3'>
          <input checked={v.gallery} className='mt-1 h-4 w-4' onChange={(e) => setV({ ...v, gallery: e.target.checked })} type='checkbox' />
          <span>The salon may feature my nail photos in its gallery.</span>
        </label>
      </div>
      <Button className='w-full' disabled={pending} onClick={save} size='lg'>
        {saved ? 'Saved ✓' : pending ? 'Saving…' : 'Save'}
      </Button>
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
          Log out
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
            Yes, delete my data
          </button>
        ) : (
          <button className='text-muted underline' onClick={() => setConfirmDelete(true)} type='button'>
            Delete my data
          </button>
        )}
      </div>
    </div>
  )
}

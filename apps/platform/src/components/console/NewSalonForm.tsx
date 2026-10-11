'use client'
import { Button, Input, Label, Textarea } from '@salon/ui'
import Link from 'next/link'
import { useActionState } from 'react'
import { createSalonFromForm } from '@/app/(site)/console/actions'

export const NewSalonForm = ({ defaultDemo }: { defaultDemo: boolean }) => {
  const [state, action, pending] = useActionState(createSalonFromForm, null)
  if (state?.ok)
    return (
      <div className='rounded-card bg-emerald-500/10 p-6'>
        <p className='font-heading text-2xl'>Ready! 🎉</p>
        <div className='mt-4 flex flex-wrap gap-3'>
          <Link className='text-brand underline' href={`/s/${state.data?.slug}`} target='_blank'>
            Customer app
          </Link>
          <Link className='text-brand underline' href={`/studio/${state.data?.slug}/today`}>
            Studio
          </Link>
          <Link className='text-brand underline' href={`/console/demo/${state.data?.slug}`}>
            Presenter controls
          </Link>
        </div>
      </div>
    )
  return (
    <form action={action} className='grid gap-5 md:grid-cols-2'>
      <div className='space-y-4'>
        <div>
          <Label htmlFor='name'>Salon name</Label>
          <Input id='name' name='name' placeholder='Glam Nails Studio' required />
        </div>
        <div>
          <Label htmlFor='slug'>Link (optional)</Label>
          <Input id='slug' name='slug' placeholder='glamnails → glamnails.ourbrand.in' />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='instagram'>Instagram</Label>
            <Input id='instagram' name='instagram' placeholder='@handle' />
          </div>
          <div>
            <Label htmlFor='area'>Area</Label>
            <Input id='area' name='area' placeholder='Alkapuri' />
          </div>
        </div>
        <div>
          <Label htmlFor='tagline'>Tagline</Label>
          <Input id='tagline' name='tagline' placeholder='Nail art that gets you noticed' />
        </div>
        <div>
          <Label htmlFor='about'>About</Label>
          <Textarea id='about' name='about' rows={2} />
        </div>
        <div>
          <Label htmlFor='artists'>Artists (comma separated)</Label>
          <Input id='artists' name='artists' placeholder='Riya Shah, Meera Patel' />
        </div>
      </div>
      <div className='space-y-4'>
        <div className='grid grid-cols-3 gap-3'>
          <div>
            <Label htmlFor='theme'>Theme</Label>
            <select className='h-12 w-full rounded-btn border border-line bg-surface px-3' id='theme' name='theme'>
              <option value='default'>Blush</option>
              <option value='luxe'>Noir & Gold</option>
              <option value='minimal'>Studio White</option>
            </select>
          </div>
          <div>
            <Label htmlFor='plan'>Plan</Label>
            <select className='h-12 w-full rounded-btn border border-line bg-surface px-3' defaultValue='studio' id='plan' name='plan'>
              <option value='starter'>Starter</option>
              <option value='studio'>Studio</option>
              <option value='growth'>Growth</option>
            </select>
          </div>
          <div>
            <Label htmlFor='primary'>Brand colour</Label>
            <Input className='h-12 p-1' defaultValue='#B4537A' id='primary' name='primary' type='color' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='ownerName'>Owner name</Label>
            <Input id='ownerName' name='ownerName' />
          </div>
          <div>
            <Label htmlFor='phone'>Salon WhatsApp</Label>
            <Input id='phone' name='phone' placeholder='+91…' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <Label htmlFor='ownerEmail'>Owner login email</Label>
            <Input id='ownerEmail' name='ownerEmail' type='email' />
          </div>
          <div>
            <Label htmlFor='ownerPassword'>Temporary password</Label>
            <Input id='ownerPassword' minLength={8} name='ownerPassword' required type='text' />
          </div>
        </div>
        <div>
          <Label htmlFor='menu'>Their menu (optional)</Label>
          <Textarea id='menu' name='menu' placeholder={'Gel polish, 800, 45\nAcrylic extensions, 1800, 120'} rows={4} />
          <p className='mt-1 text-xs text-muted'>
            One per line: name, price, minutes. Copy it from their price list or Instagram highlight. Empty uses a standard nail menu.
          </p>
        </div>
        <div>
          <Label htmlFor='logo'>Their logo (optional)</Label>
          <Input accept='image/*' className='h-auto py-3' id='logo' name='logo' type='file' />
        </div>
        <div>
          <Label htmlFor='photos'>Their work photos (up to 24, private demo only)</Label>
          <Input accept='image/*' className='h-auto py-3' id='photos' multiple name='photos' type='file' />
          <p className='mt-1 text-xs text-muted'>Without photos we use generated nail art. Delete a demo if the salon does not go ahead.</p>
        </div>
        <label className='flex items-center gap-3 rounded-card border border-line bg-surface p-4 text-sm'>
          <input defaultChecked={defaultDemo} name='demo' type='checkbox' />
          <span>
            <b>Sales demo</b>: add 90 days of clearly-labelled sample customers and history, expires in 7 days.
          </span>
        </label>
        <Button className='w-full' disabled={pending} size='lg' type='submit'>
          {pending ? 'Building… (about a minute)' : 'Create'}
        </Button>
        {state && !state.ok ? <p className='text-sm text-red-700'>{state.error}</p> : null}
      </div>
    </form>
  )
}

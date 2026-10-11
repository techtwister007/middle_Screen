'use client'
import { Button, Input, Label } from '@salon/ui'
import { useState } from 'react'

/** Staff sign-in through Payload's REST login, which sets the secure session cookie. */
export const StaffLoginForm = ({ next }: { next: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  return (
    <form
      className='space-y-4'
      onSubmit={async (e) => {
        e.preventDefault()
        setPending(true)
        setError(null)
        const form = new FormData(e.currentTarget)
        try {
          const res = await fetch('/api/users/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: String(form.get('email')).trim().toLowerCase(), password: form.get('password') }),
          })
          if (!res.ok) {
            setError('Email or password is not right.')
            setPending(false)
            return
          }
          window.location.href = next.startsWith('/studio') || next.startsWith('/console') ? next : '/studio'
        } catch {
          setError('Could not reach the server. Check your connection.')
          setPending(false)
        }
      }}
    >
      <div>
        <Label htmlFor='email'>Email</Label>
        <Input autoComplete='username' id='email' name='email' required type='email' />
      </div>
      <div>
        <Label htmlFor='password'>Password</Label>
        <Input autoComplete='current-password' id='password' name='password' required type='password' />
      </div>
      <Button className='w-full' disabled={pending} size='lg' type='submit'>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
      {error ? <p className='text-sm text-red-700'>{error}</p> : null}
    </form>
  )
}

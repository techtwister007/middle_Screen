'use client'
import { Button } from '@salon/ui'

export const SignOut = () => (
  <Button
    onClick={async () => {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' }).catch(() => null)
      window.location.href = '/studio/login'
    }}
    variant='ghost'
  >
    Sign out
  </Button>
)

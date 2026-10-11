'use client'
import { useEffect } from 'react'

/** Friendly fallback for unexpected errors in any page; the digest helps support find the log line. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className='flex min-h-[70dvh] items-center justify-center p-6 text-center'>
      <div className='max-w-sm'>
        <h1 className='font-heading text-3xl'>Something went wrong</h1>
        <p className='mt-3 text-muted'>It's not you, it's us. Please try again; if it keeps happening, tell the salon or our support.</p>
        <button className='mt-6 inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-on-brand' onClick={reset} type='button'>
          Try again
        </button>
        {error.digest ? <p className='mt-4 text-xs text-muted'>Reference: {error.digest}</p> : null}
      </div>
    </main>
  )
}

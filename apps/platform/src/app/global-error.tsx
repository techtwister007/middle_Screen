'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang='en'>
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100dvh',
          margin: 0,
          background: '#FBF7F4',
          color: '#2A2024',
        }}
      >
        <div style={{ maxWidth: 360, textAlign: 'center', padding: 24 }}>
          <h1>Something went wrong</h1>
          <p>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{ minHeight: 44, padding: '0 24px', borderRadius: 999, border: 0, background: '#2A2024', color: '#fff' }}
            type='button'
          >
            Try again
          </button>
          {error.digest ? <p style={{ fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p> : null}
        </div>
      </body>
    </html>
  )
}

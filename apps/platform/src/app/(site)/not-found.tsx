import Link from 'next/link'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/lang'

export default async function NotFound() {
  // No salon here: use the visitor's chosen or browser language.
  const lang = await getLang(null, ['en', 'hi', 'gu'])
  return (
    <main className='flex min-h-dvh items-center justify-center bg-[#FBF7F4] px-4 py-10 text-center text-[#2A2024]' lang={lang}>
      <div className='w-full max-w-sm'>
        <p className='text-sm font-medium text-[#8A7A80]'>404</p>
        <h1 className='mt-3 font-serif text-3xl leading-tight'>{t(lang, 'nf_title')}</h1>
        <p className='mt-3 text-[15px] leading-relaxed text-[#6B5B61]'>{t(lang, 'nf_body')}</p>
        <Link className='mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2A2024] px-6 font-medium text-white' href='/'>
          {t(lang, 'nf_home')}
        </Link>
      </div>
    </main>
  )
}

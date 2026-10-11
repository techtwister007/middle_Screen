import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:opacity-90 shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-tint',
  outline: 'border border-brand text-brand hover:bg-brand/10',
  ghost: 'text-ink hover:bg-tint',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-6 text-base',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra?: string) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none',
    variants[variant],
    sizes[size],
    extra,
  )

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) => <button className={buttonClass(variant, size, className)} {...props} />

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-card bg-surface border border-line', className)} {...props} />
)

export const Badge = ({
  className,
  tone = 'brand',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'brand' | 'muted' | 'success' | 'warning' | 'danger' }) => {
  const tones = {
    brand: 'bg-brand/12 text-brand',
    muted: 'bg-tint text-muted',
    success: 'bg-emerald-500/12 text-emerald-700',
    warning: 'bg-amber-500/15 text-amber-800',
    danger: 'bg-red-500/12 text-red-700',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone], className)} {...props} />
}

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'h-12 w-full rounded-btn border border-line bg-surface px-4 text-[16px] text-ink placeholder:text-muted/70 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
      className,
    )}
    {...props}
  />
)

export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      'w-full rounded-btn border border-line bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-muted/70 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
      className,
    )}
    {...props}
  />
)

export const Label = ({ className, ...props }: HTMLAttributes<HTMLLabelElement> & { htmlFor?: string }) => (
  <label className={cn('mb-1.5 block text-sm font-medium text-ink', className)} {...props} />
)

export const SectionTitle = ({ title, eyebrow, action, className }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; className?: string }) => (
  <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
    <div>
      {eyebrow ? <p className='mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand'>{eyebrow}</p> : null}
      <h2 className='font-heading text-2xl leading-tight text-ink'>{title}</h2>
    </div>
    {action}
  </div>
)

export const EmptyState = ({ icon, title, body, action }: { icon?: ReactNode; title: ReactNode; body?: ReactNode; action?: ReactNode }) => (
  <div className='flex flex-col items-center rounded-card border border-dashed border-line bg-surface/60 px-6 py-10 text-center'>
    {icon ? <div className='mb-3 text-brand'>{icon}</div> : null}
    <p className='font-heading text-xl text-ink'>{title}</p>
    {body ? <p className='mt-1 max-w-sm text-sm text-muted'>{body}</p> : null}
    {action ? <div className='mt-5'>{action}</div> : null}
  </div>
)

export const Stat = ({ label, value, hint, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; className?: string }) => (
  <div className={cn('rounded-card border border-line bg-surface p-4', className)}>
    <p className='text-xs font-medium uppercase tracking-wide text-muted'>{label}</p>
    <p className='mt-1 font-heading text-2xl text-ink tabular-nums'>{value}</p>
    {hint ? <p className='mt-0.5 text-xs text-muted'>{hint}</p> : null}
  </div>
)

export const Divider = ({ className }: { className?: string }) => <hr className={cn('border-line', className)} />

export const Pill = ({ active, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) => (
  <button
    className={cn(
      'h-9 shrink-0 rounded-full border px-4 text-sm transition',
      active ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface text-ink hover:border-brand/50',
      className,
    )}
    {...props}
  />
)

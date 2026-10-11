'use client'
import { formatINR, formatIST } from '@salon/core'
import { computeCheckout } from '@salon/modules/client'
import { Badge, Button, buttonClass, cn, Input, Label } from '@salon/ui'
import {
  AlertTriangle,
  Banknote,
  Camera,
  Check,
  CreditCard,
  Gift,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Split,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  type CheckoutDone,
  checkout,
  customerForCheckout,
  findCustomer,
  markPaid,
  sendReceipt,
  staffBook,
  staffSlots,
} from '@/app/(site)/studio/[salon]/actions'
import { ABOVE_NAV, plural } from './format'
import { toast } from './Toast'

interface Service {
  id: string | number
  name: string
  price: number
  durationMinutes: number
  isAddOn?: boolean | null
  cycleDays?: number | null
}
interface Customer {
  id: string | number
  name?: string | null
  phone: string
  visitCount?: number | null
  notes?: string | null
  allergies?: string | null
}
interface Reward {
  id: string | number
  kind?: string
  title: string
  valueType: string
  value: number
  freebie?: string | null
  validTo?: string | null
}
export interface TeamChip {
  id: string | number
  name: string
}
type Mode = 'upi' | 'payment-link' | 'cash' | 'card'
type SplitMode = 'upi' | 'cash' | 'card'

const MODES = [
  ['upi', 'UPI QR', QrCode],
  ['payment-link', 'Link', Link2],
  ['cash', 'Cash', Banknote],
  ['card', 'Card', CreditCard],
] as const
const SPLIT_MODES: [SplitMode, string][] = [
  ['cash', 'Cash'],
  ['upi', 'UPI'],
  ['card', 'Card'],
]

const rupeesIn = (v: string) => Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, '') || 0) * 100))
const rupeesOut = (p: number) => (p ? String(p / 100) : '')

interface Props {
  slug: string
  services: Service[]
  timezone: string
  team: TeamChip[]
  meId: string | number
  /** Paise of the first-visit gift a brand-new customer gets (0 when loyalty is off) */
  firstVisitGift: number
  initial: {
    appointmentId?: string | number | null
    customer?: Customer | null
    serviceIds: (string | number)[]
    designName?: string | null
    staffId?: string | number | null
  }
}

/** Wrapper so "New checkout" starts from a clean slate even on the same URL. */
export const Checkout = (props: Props) => {
  const [run, setRun] = useState(0)
  const router = useRouter()
  const path = usePathname()
  const blank = { serviceIds: [] }
  return (
    <CheckoutForm
      {...props}
      initial={run ? blank : props.initial}
      key={run}
      onNew={() => {
        setRun((r) => r + 1)
        router.replace(path)
        window.scrollTo({ top: 0 })
      }}
    />
  )
}

const CheckoutForm = ({ slug, services, timezone, initial, team, meId, firstVisitGift, onNew }: Props & { onNew: () => void }) => {
  const [customer, setCustomer] = useState<Customer | null>(initial.customer ?? null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[] | null>(null)
  const [newName, setNewName] = useState('')
  const [lines, setLines] = useState(
    services.filter((s) => initial.serviceIds.map(String).includes(String(s.id))).map((s) => ({ serviceId: s.id, name: s.name, price: s.price })),
  )
  const [serviceQuery, setServiceQuery] = useState('')
  const [designName, setDesignName] = useState(initial.designName ?? '')
  const defaultStaff = initial.staffId ?? (team.some((t) => String(t.id) === String(meId)) ? meId : null)
  const [staffId, setStaffId] = useState<string | number | null>(defaultStaff)
  const [extras, setExtras] = useState<{
    rewards: Reward[]
    wallet: number
    packages: { id: string | number; package: { name: string }; remaining: { service: string | number | { id: string | number }; quantity: number }[] }[]
  } | null>(null)
  const [rewardId, setRewardId] = useState<string | number | null>(null)
  const [useWallet, setUseWallet] = useState(false)
  const [packageId, setPackageId] = useState<string | number | null>(null)
  const [manualDiscount, setManualDiscount] = useState(0)
  const [tip, setTip] = useState(0)
  const [mode, setMode] = useState<Mode>('upi')
  const [splitOn, setSplitOn] = useState(false)
  const [split, setSplit] = useState<{ mode: SplitMode; amount: number }[]>([
    { mode: 'cash', amount: 0 },
    { mode: 'upi', amount: 0 },
  ])
  const [applyGift, setApplyGift] = useState(true)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<(CheckoutDone & { paid: boolean; staffId: string | number | null }) | null>(null)

  useEffect(() => {
    if (!customer) return setExtras(null)
    customerForCheckout(slug, customer.id).then((r) => {
      if (!r.ok) return
      setExtras(r.data!)
      setCustomer((c) => (c ? { ...c, ...r.data!.customer } : c))
      // A first-visit gift is used on the first visit without anyone having to remember it.
      if (!r.data!.customer.visitCount) {
        const gift = r.data!.rewards.find((x) => x.kind === 'first-visit' || x.kind === 'referral')
        if (gift) setRewardId(gift.id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, slug])

  useEffect(() => {
    const q = query.trim()
    if (q.replace(/\D/g, '').length < 3 && !/[a-z]{2,}/i.test(q)) return setResults(null)
    const t = setTimeout(() => findCustomer(slug, q).then((r) => setResults(r.ok ? (r.data ?? []) : [])), 250)
    return () => clearTimeout(t)
  }, [query, slug])

  const isNewCustomer = !customer && query.replace(/\D/g, '').length >= 10 && results !== null && results.length === 0
  const subtotal = lines.reduce((n, l) => n + l.price, 0)
  const reward = extras?.rewards.find((r) => String(r.id) === String(rewardId))
  const rewardDiscount = reward
    ? reward.valueType === 'amount'
      ? Math.min(reward.value, subtotal)
      : reward.valueType === 'percent'
        ? Math.round((subtotal * reward.value) / 100)
        : 0
    : isNewCustomer && applyGift
      ? Math.min(firstVisitGift, subtotal)
      : 0
  const pkg = extras?.packages.find((p) => String(p.id) === String(packageId))
  const packageCovered = useMemo(() => {
    if (!pkg) return 0
    const avail = new Set(pkg.remaining.filter((r) => r.quantity > 0).map((r) => String(typeof r.service === 'object' ? r.service.id : r.service)))
    return lines.filter((l) => avail.has(String(l.serviceId))).reduce((n, l) => n + l.price, 0)
  }, [pkg, lines])
  const totals = computeCheckout({ lines, manualDiscount, rewardDiscount, packageCovered, walletBalance: extras?.wallet ?? 0, useWallet })
  const due = totals.total + tip
  const splitTotal = split.reduce((n, s) => n + s.amount, 0)
  const splitOk = !splitOn || (split[0].mode !== split[1].mode && split.every((s) => s.amount > 0) && splitTotal === due)

  const shown = services.filter((s) => !serviceQuery.trim() || s.name.toLowerCase().includes(serviceQuery.trim().toLowerCase()))
  const mains = shown.filter((s) => !s.isAddOn)
  const addOns = shown.filter((s) => s.isAddOn)
  const add = (s: Service) => setLines([...lines, { serviceId: s.id, name: s.name, price: s.price }])

  const blocker = !lines.length
    ? 'Add a service'
    : !customer && query.replace(/\D/g, '').length < 10
      ? 'Find the customer or type their 10-digit number'
      : team.length && !staffId
        ? 'Pick who did the nails'
        : !splitOk
          ? `Split must add up to ${formatINR(due)}`
          : null

  const complete = () =>
    start(async () => {
      setError(null)
      const res = await checkout(slug, {
        customerId: customer?.id ?? null,
        phone: customer ? undefined : query,
        name: customer ? undefined : newName,
        appointmentId: initial.appointmentId ?? null,
        lines,
        manualDiscount,
        rewardId: reward ? rewardId : null,
        rewardDiscount,
        applyFirstVisit: isNewCustomer && applyGift,
        useWallet,
        customerPackageId: packageId,
        packageCovered,
        paymentMode: splitOn ? 'mixed' : mode,
        split: splitOn ? split : undefined,
        tip,
        designName: designName || undefined,
        staffId,
      })
      if (!res.ok) {
        setError(res.error)
        toast({ message: res.error, tone: 'error' })
        return
      }
      const online = !splitOn && (mode === 'upi' || mode === 'payment-link')
      setDone({ ...res.data!, paid: !online || res.data!.total + res.data!.tip === 0, staffId })
      window.scrollTo({ top: 0 })
    })

  if (done)
    return (
      <AfterCheckout
        done={done}
        lines={lines}
        onNew={onNew}
        onPaid={() => setDone({ ...done, paid: true })}
        services={services}
        slug={slug}
        team={team}
        timezone={timezone}
      />
    )

  return (
    <div className='space-y-7'>
      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Customer</h2>
        {customer ? (
          <div className='rounded-card border border-line bg-surface p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='font-medium'>{customer.name ?? customer.phone}</p>
                <p className='text-sm text-muted'>
                  {customer.phone} · {customer.visitCount ? plural(customer.visitCount, 'visit') : 'first visit'}
                </p>
              </div>
              {!initial.customer ? (
                <button
                  aria-label='Change customer'
                  className='-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-tint'
                  onClick={() => {
                    setCustomer(null)
                    setRewardId(null)
                  }}
                  type='button'
                >
                  <X size={20} />
                </button>
              ) : null}
            </div>
            {customer.allergies ? (
              <p className='mt-3 flex items-start gap-2 rounded-btn bg-red-500/10 p-3 text-sm font-medium text-red-800' role='alert'>
                <AlertTriangle className='mt-0.5 shrink-0' size={16} /> Allergy: {customer.allergies}
              </p>
            ) : null}
            {customer.notes ? <p className='mt-2 text-sm text-amber-800'>Note: {customer.notes}</p> : null}
          </div>
        ) : (
          <div className='space-y-2'>
            <div className='relative'>
              <Search className='absolute left-3 top-3.5 text-muted' size={18} />
              <Input
                aria-label='Find customer'
                autoFocus
                className='pl-10'
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Phone number or name'
                value={query}
              />
            </div>
            {results?.map((r) => (
              <button
                className='flex min-h-14 w-full items-center justify-between gap-3 rounded-btn border border-line bg-surface px-4 py-2 text-left'
                key={String(r.id)}
                onClick={() => setCustomer(r)}
                type='button'
              >
                <span className='min-w-0'>
                  <span className='block truncate font-medium'>{r.name ?? 'No name'}</span>
                  <span className='text-xs text-muted'>{r.phone}</span>
                </span>
                <span className='shrink-0 text-xs text-muted'>{r.visitCount ? plural(r.visitCount, 'visit') : 'new'}</span>
              </button>
            ))}
            {results?.length === 0 && !isNewCustomer ? (
              <p className='px-1 text-sm text-muted'>No match. Type the full 10-digit number to add a new customer.</p>
            ) : null}
            {isNewCustomer ? (
              <div className='space-y-3 rounded-card border border-dashed border-brand p-3'>
                <p className='text-sm font-medium'>New customer</p>
                <div>
                  <Label htmlFor='nname'>Name</Label>
                  <Input id='nname' onChange={(e) => setNewName(e.target.value)} placeholder='Name (optional)' value={newName} />
                </div>
                {firstVisitGift > 0 ? (
                  <ToggleRow checked={applyGift} onChange={setApplyGift}>
                    <Gift className='text-brand' size={18} /> First-visit gift: {formatINR(firstVisitGift)} off
                  </ToggleRow>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>

      {team.length ? (
        <section>
          <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Artist</h2>
          <div className='flex flex-wrap gap-2' role='radiogroup' aria-label='Artist'>
            {team.map((t) => (
              <button
                aria-checked={String(staffId) === String(t.id)}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm',
                  String(staffId) === String(t.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={String(t.id)}
                onClick={() => setStaffId(t.id)}
                role='radio'
                type='button'
              >
                {t.name.split(' ')[0]}
                {String(t.id) === String(meId) ? ' (me)' : ''}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Services</h2>
        {lines.length ? (
          <div className='space-y-2'>
            {lines.map((l, i) => (
              <div className='flex items-center gap-2 rounded-btn border border-line bg-surface py-1 pl-3 pr-1' key={`${l.serviceId}-${i}`}>
                <span className='min-w-0 flex-1 text-sm'>{l.name}</span>
                <label className='flex items-center gap-1 text-sm text-muted'>
                  ₹
                  <input
                    aria-label={`Price for ${l.name}`}
                    className='h-11 w-24 rounded-btn border border-line bg-surface px-2 text-right text-base tabular-nums text-ink'
                    inputMode='numeric'
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: rupeesIn(e.target.value) } : x)))}
                    value={rupeesOut(l.price)}
                  />
                </label>
                <button
                  aria-label={`Remove ${l.name}`}
                  className='flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-muted hover:bg-tint hover:text-red-700'
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  type='button'
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className='relative mt-3'>
          <Search className='absolute left-3 top-3.5 text-muted' size={18} />
          <Input
            aria-label='Search services'
            className='pl-10'
            onChange={(e) => setServiceQuery(e.target.value)}
            placeholder='Search services'
            value={serviceQuery}
          />
        </div>
        <ServiceGrid items={mains} onAdd={add} />
        {addOns.length ? (
          <>
            <p className='mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted'>Add-ons</p>
            <ServiceGrid items={addOns} onAdd={add} />
          </>
        ) : null}
        {!shown.length ? <p className='mt-3 text-sm text-muted'>No service matches “{serviceQuery}”.</p> : null}
        <div className='mt-4'>
          <Label htmlFor='dname'>Design name (for photos)</Label>
          <Input id='dname' onChange={(e) => setDesignName(e.target.value)} placeholder='e.g. Garba Glow' value={designName} />
        </div>
      </section>

      {extras && (extras.rewards.length || extras.wallet || extras.packages.length) ? (
        <section>
          <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Rewards & balance</h2>
          <div className='space-y-2'>
            {extras.rewards.map((r) => (
              <ToggleRow checked={String(rewardId) === String(r.id)} key={String(r.id)} onChange={(on) => setRewardId(on ? r.id : null)}>
                <Gift className='shrink-0 text-brand' size={18} />
                <span className='flex-1'>
                  {r.title}
                  {r.valueType === 'freebie' && r.freebie ? <span className='block text-xs text-muted'>Add "{r.freebie}" at ₹0</span> : null}
                </span>
              </ToggleRow>
            ))}
            {extras.packages.map((p) => (
              <ToggleRow checked={String(packageId) === String(p.id)} key={String(p.id)} onChange={(on) => setPackageId(on ? p.id : null)}>
                <Badge>Package</Badge> <span className='flex-1'>{p.package?.name}</span>
              </ToggleRow>
            ))}
            {extras.wallet > 0 ? (
              <ToggleRow checked={useWallet} onChange={setUseWallet}>
                <Wallet className='shrink-0 text-brand' size={18} /> Use wallet ({formatINR(extras.wallet)})
              </ToggleRow>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className='grid grid-cols-2 gap-3'>
        <div>
          <Label htmlFor='disc'>Discount (₹)</Label>
          <Input
            className='text-right tabular-nums'
            id='disc'
            inputMode='numeric'
            onChange={(e) => setManualDiscount(rupeesIn(e.target.value))}
            placeholder='0'
            value={rupeesOut(manualDiscount)}
          />
        </div>
        <div>
          <Label htmlFor='tip'>Tip for the artist (₹)</Label>
          <Input
            className='text-right tabular-nums'
            id='tip'
            inputMode='numeric'
            onChange={(e) => setTip(rupeesIn(e.target.value))}
            placeholder='0'
            value={rupeesOut(tip)}
          />
        </div>
      </section>

      <section className='rounded-card border border-line bg-surface p-4 text-sm'>
        <Row label='Subtotal' value={formatINR(totals.subtotal)} />
        {totals.packageCovered ? <Row label='Package' muted value={`−${formatINR(totals.packageCovered)}`} /> : null}
        {totals.manualDiscount ? <Row label='Discount' muted value={`−${formatINR(totals.manualDiscount)}`} /> : null}
        {totals.rewardDiscount ? <Row label={reward?.title ?? 'First-visit gift'} muted value={`−${formatINR(totals.rewardDiscount)}`} /> : null}
        {totals.walletApplied ? <Row label='Wallet' muted value={`−${formatINR(totals.walletApplied)}`} /> : null}
        {tip ? <Row label='Tip' muted value={`+${formatINR(tip)}`} /> : null}
        <div className='mt-2 flex items-end justify-between border-t border-line pt-2'>
          <span className='font-medium'>To pay</span>
          <span className='font-heading text-3xl tabular-nums'>{formatINR(due)}</span>
        </div>
      </section>

      <section>
        <h2 className='mb-2 text-sm font-semibold uppercase tracking-wider text-muted'>Payment</h2>
        {!splitOn ? (
          <div className='grid grid-cols-4 gap-2'>
            {MODES.map(([m, label, Icon]) => (
              <button
                aria-pressed={mode === m}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-btn border text-xs',
                  mode === m ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                )}
                key={m}
                onClick={() => setMode(m)}
                type='button'
              >
                <Icon size={20} /> {label}
              </button>
            ))}
          </div>
        ) : (
          <div className='space-y-2'>
            {split.map((s, i) => (
              <div className='flex items-center gap-2' key={i}>
                <select
                  aria-label={`Payment ${i + 1} mode`}
                  className='h-12 flex-1 rounded-btn border border-line bg-surface px-3'
                  onChange={(e) => setSplit(split.map((x, j) => (j === i ? { ...x, mode: e.target.value as SplitMode } : x)))}
                  value={s.mode}
                >
                  {SPLIT_MODES.map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label={`Payment ${i + 1} amount (₹)`}
                  className='w-32 text-right tabular-nums'
                  inputMode='numeric'
                  onChange={(e) => {
                    const amount = Math.min(rupeesIn(e.target.value), due)
                    // Typing the first amount fills in the rest automatically.
                    setSplit(
                      i === 0
                        ? [
                            { ...split[0], amount },
                            { ...split[1], amount: Math.max(0, due - amount) },
                          ]
                        : split.map((x, j) => (j === i ? { ...x, amount } : x)),
                    )
                  }}
                  placeholder='₹'
                  value={rupeesOut(s.amount)}
                />
              </div>
            ))}
            <p className={cn('text-xs', splitOk ? 'text-muted' : 'text-red-700')}>
              {formatINR(splitTotal)} of {formatINR(due)}
              {split[0].mode === split[1].mode ? ' · pick two different modes' : ''}
            </p>
          </div>
        )}
        <button
          className='mt-2 inline-flex min-h-11 items-center gap-2 rounded-btn px-2 text-sm text-brand'
          onClick={() => {
            setSplitOn(!splitOn)
            setSplit([
              { mode: 'cash', amount: 0 },
              { mode: 'upi', amount: 0 },
            ])
          }}
          type='button'
        >
          <Split size={16} /> {splitOn ? 'Pay with one mode' : 'Split between two modes'}
        </button>
      </section>

      <div className={cn('sticky z-20 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur', ABOVE_NAV)}>
        <Button className='w-full' disabled={pending || Boolean(blocker)} onClick={complete} size='lg'>
          {pending ? <Loader2 className='animate-spin' /> : `Complete · ${formatINR(due)}`}
        </Button>
        {blocker && !pending ? <p className='mt-1 text-center text-xs text-muted'>{blocker}</p> : null}
        {error ? (
          <p className='mt-1 text-center text-sm text-red-700' role='alert'>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className={cn('flex justify-between gap-3', muted && 'text-muted')}>
    <span className='truncate'>{label}</span>
    <span className='tabular-nums'>{value}</span>
  </div>
)

/** A whole-row toggle: easier to hit than a checkbox with wet hands. */
export const ToggleRow = ({ checked, onChange, children }: { checked: boolean; onChange: (on: boolean) => void; children: React.ReactNode }) => (
  <button
    aria-checked={checked}
    className={cn(
      'flex min-h-12 w-full items-center gap-3 rounded-btn border px-3 py-2 text-left text-sm',
      checked ? 'border-brand bg-brand/8' : 'border-line bg-surface',
    )}
    onClick={() => onChange(!checked)}
    role='switch'
    type='button'
  >
    <span
      aria-hidden
      className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md border', checked ? 'border-brand bg-brand text-on-brand' : 'border-line')}
    >
      {checked ? <Check size={16} /> : null}
    </span>
    {children}
  </button>
)

const ServiceGrid = ({ items, onAdd }: { items: Service[]; onAdd: (s: Service) => void }) => (
  <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'>
    {items.map((s) => (
      <button
        aria-label={`+ ${s.name}`}
        className='flex min-h-14 items-center gap-2 rounded-btn border border-line bg-surface px-3 py-2 text-left text-sm hover:border-brand active:scale-[0.98]'
        key={String(s.id)}
        onClick={() => onAdd(s)}
        type='button'
      >
        <Plus className='shrink-0 text-brand' size={16} />
        <span className='min-w-0 flex-1'>
          <span className='block leading-tight'>{s.name}</span>
          <span className='text-xs text-muted'>{formatINR(s.price)}</span>
        </span>
      </button>
    ))}
  </div>
)

// ── After payment ─────────────────────────────────────────────────────────────

const PART: [string, number, number][] = [
  ['Morning', 0, 12],
  ['Afternoon', 12, 17],
  ['Evening', 17, 24],
]

const AfterCheckout = ({
  done,
  onPaid,
  onNew,
  slug,
  services,
  lines,
  timezone,
  team,
}: {
  done: CheckoutDone & { paid: boolean; staffId: string | number | null }
  onPaid: () => void
  onNew: () => void
  slug: string
  services: Service[]
  lines: { serviceId: string | number; name: string; price: number }[]
  timezone: string
  team: TeamChip[]
}) => {
  const [qr, setQr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [receipt, setReceipt] = useState<'idle' | 'sending' | 'sent' | string>('idle')
  const amount = done.total + done.tip
  useEffect(() => {
    const target = done.upiUri ?? done.payUrl
    if (!target || done.paid) return setQr(null)
    QRCode.toDataURL(target, { margin: 1, width: 320 }).then(setQr)
  }, [done])

  return (
    <div className='space-y-6'>
      <div className='rounded-card bg-emerald-500/10 p-5 text-center'>
        <Check className='mx-auto text-emerald-700' size={32} />
        <p className='mt-2 font-heading text-2xl'>{done.paid ? 'Visit complete' : `Collect ${formatINR(amount)}`}</p>
        <p className='text-sm text-muted'>
          {done.rewardApplied ? `${done.rewardApplied} applied. ` : ''}The customer gets a scratch card and their points on WhatsApp.
        </p>
      </div>
      {!done.paid ? (
        <div className='rounded-card border border-line bg-surface p-5 text-center'>
          {qr ? <img alt='Payment QR' className='mx-auto h-64 w-64' src={qr} /> : <Loader2 className='mx-auto animate-spin' />}
          <p className='mt-2 text-sm text-muted'>Ask the customer to scan with any UPI app. It records itself when paid.</p>
          {done.payUrl ? (
            <a className='mt-2 inline-flex min-h-11 items-center text-sm text-brand' href={done.payUrl} rel='noopener' target='_blank'>
              Open payment link
            </a>
          ) : null}
          <Button
            className='mt-3 w-full'
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await markPaid(slug, done.visitId)
                if (!r.ok) return void toast({ message: r.error, tone: 'error' })
                toast({ message: 'Marked as paid', tone: 'success' })
                onPaid()
              })
            }
            variant='secondary'
          >
            Mark as paid
          </Button>
        </div>
      ) : null}

      <div className='rounded-card border border-line bg-surface p-4'>
        {receipt === 'sent' ? (
          <p className='flex min-h-11 items-center gap-2 text-sm text-emerald-800'>
            <Check size={18} /> Receipt sent on WhatsApp
          </p>
        ) : (
          <Button
            className='w-full'
            disabled={receipt === 'sending'}
            onClick={async () => {
              setReceipt('sending')
              const r = await sendReceipt(slug, done.visitId)
              if (!r.ok) {
                setReceipt('idle')
                return void toast({ message: r.error, tone: 'error' })
              }
              if (r.data?.url) {
                window.open(r.data.url, '_blank')
                setReceipt('idle')
                return void toast('Opened WhatsApp with the receipt. Tap send there.')
              }
              setReceipt('sent')
              toast({ message: 'Receipt sent', tone: 'success' })
            }}
            variant='secondary'
          >
            {receipt === 'sending' ? <Loader2 className='animate-spin' size={18} /> : <MessageCircle size={18} />} Send receipt on WhatsApp
          </Button>
        )}
      </div>

      <PreBook done={done} lines={lines} services={services} slug={slug} team={team} timezone={timezone} />

      <div className={cn('sticky z-20 -mx-4 grid grid-cols-2 gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur', ABOVE_NAV)}>
        {done.photoTaskId ? (
          <Link className={buttonClass('secondary', 'lg')} href={`/studio/${slug}/photos/${done.photoTaskId}`}>
            <Camera size={18} /> Photos
          </Link>
        ) : (
          <Link className={buttonClass('secondary', 'lg')} href={`/studio/${slug}/today`}>
            Today
          </Link>
        )}
        <Button onClick={onNew} size='lg'>
          <RotateCcw size={18} /> New checkout
        </Button>
      </div>
    </div>
  )
}

const UNDO_MS = 5000

const PreBook = ({
  done,
  slug,
  services,
  lines,
  timezone,
  team,
}: {
  done: CheckoutDone & { staffId: string | number | null }
  slug: string
  services: Service[]
  lines: { serviceId: string | number }[]
  timezone: string
  team: TeamChip[]
}) => {
  const cycleDays = lines.map((l) => services.find((s) => String(s.id) === String(l.serviceId))?.cycleDays ?? 0).filter((d) => d > 0)
  const cycle = cycleDays.length ? Math.min(...cycleDays, 60) : 21
  const suggested = new Date(Date.now() + cycle * 86_400_000)
  const first = Math.max(Date.now() + 86_400_000, suggested.getTime() - 3 * 86_400_000)
  const days = Array.from({ length: 14 }, (_, i) => new Date(first + i * 86_400_000))
  const mainIds = lines.map((l) => l.serviceId).filter((id) => !services.find((s) => String(s.id) === String(id))?.isAddOn)
  const [date, setDate] = useState(formatIST(suggested, 'yyyy-MM-dd', timezone))
  const [artist, setArtist] = useState<string | number | null>(done.staffId)
  const [slots, setSlots] = useState<{ start: string; staffIds: (string | number)[] }[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [state, setState] = useState<'pick' | 'confirm' | 'undo' | 'saving' | 'booked'>('pick')
  const [left, setLeft] = useState(UNDO_MS / 1000)
  const dayRef = useRef<HTMLButtonElement>(null)
  const commit = useRef<(() => void) | null>(null)

  useEffect(() => {
    dayRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [])
  useEffect(() => {
    if (!mainIds.length) return
    setSlots(null)
    staffSlots(slug, { date, serviceIds: mainIds, staffId: artist }).then((r) => setSlots(r.ok ? (r.data ?? []) : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, artist, slug])

  const book = async (startIso: string) => {
    commit.current = null
    setState('saving')
    const r = await staffBook(slug, { customerId: done.customerId, serviceIds: mainIds, start: startIso, staffId: artist, preBooked: true })
    if (!r.ok) {
      setState('pick')
      setPicked(null)
      return void toast({ message: r.error, tone: 'error' })
    }
    setState('booked')
    toast({ message: 'Next visit booked', tone: 'success' })
  }

  // Undo window: the booking is only made when the countdown ends (or the screen is left).
  useEffect(() => {
    if (state !== 'undo' || !picked) return
    setLeft(UNDO_MS / 1000)
    commit.current = () => void book(picked)
    const tick = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    const t = setTimeout(() => commit.current?.(), UNDO_MS)
    return () => {
      clearInterval(tick)
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, picked])
  useEffect(() => () => commit.current?.(), [])

  if (!mainIds.length) return null
  const who = (id: string | number | null) => team.find((t) => String(t.id) === String(id))?.name.split(' ')[0]
  const when = picked ? formatIST(picked, 'EEE d MMM, h:mm a', timezone) : ''

  return (
    <div className='rounded-card border border-line bg-surface p-4'>
      <p className='font-medium'>Pre-book the next visit</p>
      <p className='text-sm text-muted'>Customers who pre-book come back twice as often. Suggested: {formatIST(suggested, 'EEE d MMM', timezone)}.</p>
      {state === 'booked' ? (
        <p className='mt-4 rounded-btn bg-brand/10 px-4 py-3 text-sm text-brand'>
          Booked for {when}
          {who(artist) ? ` with ${who(artist)}` : ''} ✓
        </p>
      ) : state === 'confirm' || state === 'undo' || state === 'saving' ? (
        <div className='mt-4 space-y-3 rounded-btn bg-tint p-4'>
          <p className='text-sm'>
            {state === 'undo' ? 'Booking' : 'Book'} <b>{when}</b>
            {who(artist) ? ` with ${who(artist)}` : ' with any free artist'}
            {state === 'confirm' ? '?' : '…'}
          </p>
          {state === 'confirm' ? (
            <div className='grid grid-cols-2 gap-2'>
              <Button
                onClick={() => {
                  setPicked(null)
                  setState('pick')
                }}
                variant='ghost'
              >
                Back
              </Button>
              <Button onClick={() => setState('undo')}>Book it</Button>
            </div>
          ) : state === 'undo' ? (
            <Button
              className='w-full'
              onClick={() => {
                commit.current = null
                setState('pick')
                setPicked(null)
                toast('Pre-booking undone')
              }}
              variant='secondary'
            >
              Undo ({left}s)
            </Button>
          ) : (
            <p className='flex items-center gap-2 text-sm text-muted'>
              <Loader2 className='animate-spin' size={16} /> Booking…
            </p>
          )}
        </div>
      ) : (
        <>
          {team.length > 1 ? (
            <div className='mt-4 flex flex-wrap gap-2'>
              {[{ id: null as string | number | null, name: 'Any artist' }, ...team].map((t) => (
                <button
                  aria-pressed={String(artist) === String(t.id)}
                  className={cn(
                    'min-h-11 rounded-full border px-4 text-sm',
                    String(artist) === String(t.id) ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface',
                  )}
                  key={String(t.id)}
                  onClick={() => setArtist(t.id)}
                  type='button'
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>
          ) : null}
          <div className='no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1'>
            {days.map((d) => {
              const iso = formatIST(d, 'yyyy-MM-dd', timezone)
              return (
                <button
                  aria-pressed={date === iso}
                  className={cn(
                    'flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center rounded-btn border px-2 text-xs',
                    date === iso ? 'border-brand bg-brand text-on-brand' : 'border-line',
                  )}
                  key={iso}
                  onClick={() => setDate(iso)}
                  ref={date === iso ? dayRef : undefined}
                  type='button'
                >
                  <span>{formatIST(d, 'EEE', timezone)}</span>
                  <span className='text-sm font-semibold'>{formatIST(d, 'd MMM', timezone)}</span>
                </button>
              )
            })}
          </div>
          {slots === null ? <Loader2 className='mt-4 animate-spin text-muted' /> : null}
          {slots?.length === 0 ? <p className='mt-4 text-sm text-muted'>No free slots that day. Try another day or artist.</p> : null}
          {PART.map(([label, from, to]) => {
            const list = (slots ?? []).filter((s) => {
              const h = Number(formatIST(s.start, 'H', timezone))
              return h >= from && h < to
            })
            if (!list.length) return null
            return (
              <div className='mt-4' key={label}>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-muted'>{label}</p>
                <div className='grid grid-cols-3 gap-2 sm:grid-cols-4'>
                  {list.map((s) => (
                    <button
                      className='min-h-11 rounded-btn border border-line text-sm tabular-nums hover:border-brand'
                      data-slot
                      key={s.start}
                      onClick={() => {
                        setPicked(s.start)
                        setState('confirm')
                      }}
                      type='button'
                    >
                      {formatIST(s.start, 'h:mm a', timezone)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

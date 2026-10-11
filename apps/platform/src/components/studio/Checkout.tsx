'use client'
import { formatINR, formatIST } from '@salon/core'
import { computeCheckout } from '@salon/modules/client'
import { Badge, Button, Input, Label, buttonClass, cn } from '@salon/ui'
import { Banknote, Camera, Check, CreditCard, Gift, Link2, Loader2, QrCode, Search, Trash2, Wallet, X } from 'lucide-react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { checkout, customerForCheckout, findCustomer, markPaid, staffBook, staffSlots } from '@/app/(site)/studio/[salon]/actions'

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
}
interface Reward {
  id: string | number
  title: string
  valueType: string
  value: number
  freebie?: string | null
  validTo?: string | null
}
type Mode = 'upi' | 'payment-link' | 'cash' | 'card'

export const Checkout = ({
  slug,
  services,
  timezone,
  initial,
}: {
  slug: string
  services: Service[]
  timezone: string
  initial: { appointmentId?: string | number | null; customer?: Customer | null; serviceIds: (string | number)[]; designName?: string | null; staffId?: string | number | null }
}) => {
  const [customer, setCustomer] = useState<Customer | null>(initial.customer ?? null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Customer[]>([])
  const [newName, setNewName] = useState('')
  const [lines, setLines] = useState(services.filter((s) => initial.serviceIds.map(String).includes(String(s.id))).map((s) => ({ serviceId: s.id, name: s.name, price: s.price })))
  const [designName, setDesignName] = useState(initial.designName ?? '')
  const [extras, setExtras] = useState<{ rewards: Reward[]; wallet: number; packages: { id: string | number; package: { name: string }; remaining: { service: string | number | { id: string | number }; quantity: number }[] }[] } | null>(null)
  const [rewardId, setRewardId] = useState<string | number | null>(null)
  const [useWallet, setUseWallet] = useState(false)
  const [packageId, setPackageId] = useState<string | number | null>(null)
  const [manualDiscount, setManualDiscount] = useState(0)
  const [mode, setMode] = useState<Mode>('upi')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ visitId: string | number; total: number; payUrl?: string; upiUri?: string; customerId: string | number; photoTaskId?: string | number; paid: boolean } | null>(null)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) return setExtras(null)
    customerForCheckout(slug, customer.id).then((r) => r.ok && setExtras(r.data!))
  }, [customer, slug])

  useEffect(() => {
    if (query.replace(/\D/g, '').length < 4 && query.length < 3) return setResults([])
    const t = setTimeout(() => findCustomer(slug, query).then((r) => r.ok && setResults(r.data ?? [])), 250)
    return () => clearTimeout(t)
  }, [query, slug])

  const subtotal = lines.reduce((n, l) => n + l.price, 0)
  const reward = extras?.rewards.find((r) => String(r.id) === String(rewardId))
  const rewardDiscount = reward ? (reward.valueType === 'amount' ? Math.min(reward.value, subtotal) : reward.valueType === 'percent' ? Math.round((subtotal * reward.value) / 100) : 0) : 0
  const pkg = extras?.packages.find((p) => String(p.id) === String(packageId))
  const packageCovered = useMemo(() => {
    if (!pkg) return 0
    const avail = new Set(pkg.remaining.filter((r) => r.quantity > 0).map((r) => String(typeof r.service === 'object' ? r.service.id : r.service)))
    return lines.filter((l) => avail.has(String(l.serviceId))).reduce((n, l) => n + l.price, 0)
  }, [pkg, lines])
  const totals = computeCheckout({ lines, manualDiscount, rewardDiscount, packageCovered, walletBalance: extras?.wallet ?? 0, useWallet })

  useEffect(() => {
    const target = done?.upiUri ?? done?.payUrl
    if (!target || done?.paid) return setQr(null)
    QRCode.toDataURL(target, { margin: 1, width: 320 }).then(setQr)
  }, [done])

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
        rewardId,
        rewardDiscount,
        useWallet,
        customerPackageId: packageId,
        packageCovered,
        paymentMode: mode,
        designName: designName || undefined,
        staffId: initial.staffId ?? null,
      })
      if (!res.ok) return setError(res.error)
      setDone({ ...res.data!, paid: !(mode === 'upi' || mode === 'payment-link') || res.data!.total === 0 })
    })

  if (done) return <AfterCheckout done={done} onPaid={() => setDone({ ...done, paid: true })} qr={qr} services={services} lines={lines} slug={slug} timezone={timezone} />

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Customer</h2>
        {customer ? (
          <div className="flex items-center justify-between rounded-card border border-line bg-surface p-4">
            <div>
              <p className="font-medium">{customer.name ?? customer.phone}</p>
              <p className="text-sm text-muted">
                {customer.phone} · {customer.visitCount ? `${customer.visitCount} visits` : 'first visit'}
              </p>
              {customer.notes ? <p className="mt-1 text-xs text-amber-800">Note: {customer.notes}</p> : null}
            </div>
            {!initial.customer ? (
              <button aria-label="Change customer" onClick={() => setCustomer(null)} type="button">
                <X size={18} />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-muted" size={18} />
              <Input autoFocus className="pl-10" inputMode="tel" onChange={(e) => setQuery(e.target.value)} placeholder="Phone number or name" value={query} />
            </div>
            {results.map((r) => (
              <button className="flex w-full items-center justify-between rounded-btn border border-line bg-surface px-4 py-3 text-left" key={String(r.id)} onClick={() => setCustomer(r)} type="button">
                <span>
                  <span className="block font-medium">{r.name ?? 'No name'}</span>
                  <span className="text-xs text-muted">{r.phone}</span>
                </span>
                <span className="text-xs text-muted">{r.visitCount ?? 0} visits</span>
              </button>
            ))}
            {query.replace(/\D/g, '').length >= 10 && !results.length ? (
              <div>
                <Label htmlFor="nname">New customer name</Label>
                <Input id="nname" onChange={(e) => setNewName(e.target.value)} placeholder="Name (optional)" value={newName} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Services</h2>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div className="flex items-center gap-3 rounded-btn border border-line bg-surface px-3 py-2" key={`${l.serviceId}-${i}`}>
              <span className="flex-1 text-sm">{l.name}</span>
              <span className="text-sm text-muted">₹</span>
              <input
                aria-label={`Price for ${l.name}`}
                className="w-20 rounded border border-line px-2 py-1 text-right tabular-nums"
                inputMode="numeric"
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) } : x)))}
                value={l.price / 100}
              />
              <button aria-label="Remove" onClick={() => setLines(lines.filter((_, j) => j !== i))} type="button">
                <Trash2 className="text-muted" size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {services.map((s) => (
            <button className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm" key={String(s.id)} onClick={() => setLines([...lines, { serviceId: s.id, name: s.name, price: s.price }])} type="button">
              + {s.name}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label htmlFor="dname">Design name (for photos)</Label>
          <Input id="dname" onChange={(e) => setDesignName(e.target.value)} placeholder="e.g. Garba Glow" value={designName} />
        </div>
      </section>

      {extras && (extras.rewards.length || extras.wallet || extras.packages.length) ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Rewards & balance</h2>
          <div className="space-y-2">
            {extras.rewards.map((r) => (
              <button className={cn('flex w-full items-center gap-3 rounded-btn border px-3 py-3 text-left text-sm', String(rewardId) === String(r.id) ? 'border-brand bg-brand/8' : 'border-line bg-surface')} key={String(r.id)} onClick={() => setRewardId(String(rewardId) === String(r.id) ? null : r.id)} type="button">
                <Gift className="text-brand" size={16} />
                <span className="flex-1">
                  {r.title}
                  {r.valueType === 'freebie' && r.freebie ? <span className="block text-xs text-muted">Add "{r.freebie}" at ₹0</span> : null}
                </span>
                {String(rewardId) === String(r.id) ? <Check size={16} /> : null}
              </button>
            ))}
            {extras.packages.map((p) => (
              <button className={cn('flex w-full items-center gap-3 rounded-btn border px-3 py-3 text-left text-sm', String(packageId) === String(p.id) ? 'border-brand bg-brand/8' : 'border-line bg-surface')} key={String(p.id)} onClick={() => setPackageId(String(packageId) === String(p.id) ? null : p.id)} type="button">
                <Badge>Package</Badge> <span className="flex-1">{p.package?.name}</span>
              </button>
            ))}
            {extras.wallet > 0 ? (
              <label className="flex items-center gap-3 rounded-btn border border-line bg-surface px-3 py-3 text-sm">
                <input checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} type="checkbox" />
                <Wallet className="text-brand" size={16} /> Use wallet ({formatINR(extras.wallet)})
              </label>
            ) : null}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex items-center justify-between">
          <Label htmlFor="disc">Discount (₹)</Label>
          <input className="w-24 rounded-btn border border-line px-3 py-2 text-right" id="disc" inputMode="numeric" onChange={(e) => setManualDiscount(Math.max(0, Math.round(Number(e.target.value || 0) * 100)))} value={manualDiscount / 100} />
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatINR(totals.subtotal)}</span>
        </div>
        {totals.packageCovered ? <div className="flex justify-between text-muted"><span>Package</span><span>−{formatINR(totals.packageCovered)}</span></div> : null}
        {totals.manualDiscount ? <div className="flex justify-between text-muted"><span>Discount</span><span>−{formatINR(totals.manualDiscount)}</span></div> : null}
        {totals.rewardDiscount ? <div className="flex justify-between text-muted"><span>Reward</span><span>−{formatINR(totals.rewardDiscount)}</span></div> : null}
        {totals.walletApplied ? <div className="flex justify-between text-muted"><span>Wallet</span><span>−{formatINR(totals.walletApplied)}</span></div> : null}
        <div className="mt-2 flex items-end justify-between border-t border-line pt-2">
          <span className="font-medium">To pay</span>
          <span className="font-heading text-3xl tabular-nums">{formatINR(totals.total)}</span>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              ['upi', 'UPI QR', QrCode],
              ['payment-link', 'Link', Link2],
              ['cash', 'Cash', Banknote],
              ['card', 'Card', CreditCard],
            ] as const
          ).map(([m, label, Icon]) => (
            <button className={cn('flex flex-col items-center gap-1 rounded-btn border py-3 text-xs', mode === m ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface')} key={m} onClick={() => setMode(m)} type="button">
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
        <Button className="mt-4 w-full" disabled={pending || !lines.length || (!customer && query.replace(/\D/g, '').length < 10)} onClick={complete} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : `Complete · ${formatINR(totals.total)}`}
        </Button>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </section>
    </div>
  )
}

const AfterCheckout = ({
  done,
  qr,
  onPaid,
  slug,
  services,
  lines,
  timezone,
}: {
  done: { visitId: string | number; total: number; payUrl?: string; customerId: string | number; photoTaskId?: string | number; paid: boolean }
  qr: string | null
  onPaid: () => void
  slug: string
  services: Service[]
  lines: { serviceId: string | number; name: string; price: number }[]
  timezone: string
}) => {
  const cycle = Math.min(...lines.map((l) => services.find((s) => String(s.id) === String(l.serviceId))?.cycleDays ?? 0).filter((d) => d > 0), 60)
  const suggested = new Date(Date.now() + (Number.isFinite(cycle) ? cycle : 21) * 86_400_000)
  const days = Array.from({ length: 7 }, (_, i) => new Date(suggested.getTime() + (i - 2) * 86_400_000)).filter((d) => d.getTime() > Date.now())
  const [date, setDate] = useState(formatIST(suggested, 'yyyy-MM-dd', timezone))
  const [slots, setSlots] = useState<{ start: string; staffIds: (string | number)[] }[] | null>(null)
  const [booked, setBooked] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const mainIds = lines.map((l) => l.serviceId).filter((id) => !services.find((s) => String(s.id) === String(id))?.isAddOn)
  useEffect(() => {
    if (!mainIds.length) return
    setSlots(null)
    staffSlots(slug, { date, serviceIds: mainIds }).then((r) => setSlots(r.ok ? (r.data ?? []) : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slug])
  return (
    <div className="space-y-6">
      <div className="rounded-card bg-emerald-500/10 p-5 text-center">
        <Check className="mx-auto text-emerald-700" size={32} />
        <p className="mt-2 font-heading text-2xl">{done.paid ? 'Visit complete' : `Collect ${formatINR(done.total)}`}</p>
        <p className="text-sm text-muted">The customer gets a scratch card and their points on WhatsApp.</p>
      </div>
      {!done.paid ? (
        <div className="rounded-card border border-line bg-surface p-5 text-center">
          {qr ? <img alt="Payment QR" className="mx-auto h-64 w-64" src={qr} /> : <Loader2 className="mx-auto animate-spin" />}
          <p className="mt-2 text-sm text-muted">Ask the customer to scan with any UPI app. It records itself when paid.</p>
          {done.payUrl ? (
            <a className="mt-2 block text-sm text-brand" href={done.payUrl} rel="noopener" target="_blank">
              Open payment link
            </a>
          ) : null}
          <Button className="mt-4" onClick={() => start(async () => { await markPaid(slug, done.visitId); onPaid() })} variant="secondary">
            Mark as paid
          </Button>
        </div>
      ) : null}
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="font-medium">Pre-book the next visit</p>
        <p className="text-sm text-muted">Customers who pre-book come back twice as often.</p>
        {booked ? (
          <p className="mt-4 rounded-btn bg-brand/10 px-4 py-3 text-sm text-brand">Booked for {formatIST(booked, 'EEE d MMM, h:mm a', timezone)} ✓</p>
        ) : (
          <>
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
              {days.map((d) => {
                const iso = formatIST(d, 'yyyy-MM-dd', timezone)
                return (
                  <button className={cn('shrink-0 rounded-btn border px-3 py-2 text-sm', date === iso ? 'border-brand bg-brand text-on-brand' : 'border-line')} key={iso} onClick={() => setDate(iso)} type="button">
                    {formatIST(d, 'EEE d', timezone)}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {slots === null ? <Loader2 className="animate-spin text-muted" /> : null}
              {slots?.slice(0, 12).map((s) => (
                <button
                  className="rounded-btn border border-line py-2 text-sm tabular-nums"
                  disabled={pending}
                  key={s.start}
                  onClick={() =>
                    start(async () => {
                      const r = await staffBook(slug, { customerId: done.customerId, serviceIds: mainIds, start: s.start, preBooked: true })
                      if (r.ok) setBooked(s.start)
                    })
                  }
                  type="button"
                >
                  {formatIST(s.start, 'h:mm a', timezone)}
                </button>
              ))}
              {slots?.length === 0 ? <p className="col-span-4 text-sm text-muted">No free slots that day.</p> : null}
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {done.photoTaskId ? (
          <Link className={buttonClass('primary', 'lg')} href={`/studio/${slug}/photos/${done.photoTaskId}`}>
            <Camera size={18} /> Photo corner
          </Link>
        ) : null}
        <Link className={buttonClass('secondary', 'lg')} href={`/studio/${slug}/today`}>
          Back to today
        </Link>
      </div>
    </div>
  )
}

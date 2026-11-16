import type { ServiceType } from './types'

/** rules.md: business hours are 8:00–17:00 Monday to Friday, excluding US federal holidays; 1 business day = 9 hours. */
const OPEN = 8
const CLOSE = 17
// US federal holidays (observed) for 2026 and 2027.
const HOLIDAYS = new Set(['2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07', '2026-10-12', '2026-11-11', '2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-24'])
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isBusinessDay = (d: Date) => d.getDay() !== 0 && d.getDay() !== 6 && !HOLIDAYS.has(key(d))
const atHour = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0)
const nextOpen = (d: Date) => {
  let x = new Date(d)
  if (x.getHours() >= CLOSE || !isBusinessDay(x)) x = atHour(new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1), OPEN)
  while (!isBusinessDay(x)) x = atHour(new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1), OPEN)
  if (x.getHours() < OPEN) x = atHour(x, OPEN)
  return x
}

export function addBusinessHours(start: Date, hours: number): Date {
  let t = nextOpen(start)
  let left = hours * 60
  while (left > 0) {
    const close = atHour(t, CLOSE)
    const avail = (close.getTime() - t.getTime()) / 60000
    if (left <= avail) return new Date(t.getTime() + left * 60000)
    left -= avail
    t = nextOpen(close)
  }
  return t
}

export function businessHoursBetween(a: Date, b: Date): number {
  let t = nextOpen(a)
  let mins = 0
  while (t < b) {
    const close = atHour(t, CLOSE)
    const end = b < close ? b : close
    mins += Math.max(0, (end.getTime() - t.getTime()) / 60000)
    t = nextOpen(close)
  }
  return Math.round((mins / 60) * 100) / 100
}

export function slaHours(type: ServiceType, opts: { special?: boolean; nonpayment?: boolean } = {}): number {
  switch (type) {
    case 'Claim report':
    case 'ID card / evidence':
      return 4
    case 'Certificate request':
      return opts.special ? 9 : 4
    case 'Policy change':
    case 'Cancellation request':
      return 9
    case 'Billing question':
      return opts.nonpayment ? 4 : 18
    default:
      return 27
  }
}

/** US-SRV-014 indicator: ≤2 business hours left is due-soon; past due counts calendar days. */
export function dueLabel(due: Date, now: Date, paused: boolean): { text: string; tone: 'default' | 'warning' | 'danger' | 'muted' } {
  if (paused) return { text: 'SLA paused', tone: 'muted' }
  if (due < now) {
    const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
    const hrs = Math.floor((now.getTime() - due.getTime()) / 3_600_000)
    return { text: days >= 1 ? `Overdue ${days}d` : `Overdue ${Math.max(1, hrs)}h`, tone: 'danger' }
  }
  const left = businessHoursBetween(now, due)
  if (left <= 2) {
    const m = Math.round((due.getTime() - now.getTime()) / 60000)
    return { text: `Due in ${Math.floor(m / 60)}h ${m % 60}m`, tone: 'warning' }
  }
  return { text: `Due ${due.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, tone: 'default' }
}

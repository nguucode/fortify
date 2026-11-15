import { daysBetween, formatUSDate } from '@/mock/dates'

/** One mark on the Term ribbon: the 12-month strip in each Account row (surface brief, signature move). */
export interface RibbonTick {
  kind: 'renewal' | 'xdate'
  /** 0 = today, 1 = 12 months out. */
  position: number
  date: Date
  label: string
}

const SPAN_DAYS = 365

export function ribbonTicks(events: Omit<RibbonTick, 'position'>[], today: Date): RibbonTick[] {
  return events
    .map((e) => ({ ...e, position: daysBetween(today, e.date) / SPAN_DAYS }))
    .filter((t) => t.position >= 0 && t.position <= 1)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function ribbonSummary(ticks: RibbonTick[]): string {
  if (!ticks.length) return 'Nothing due in the next 12 months.'
  const part = (kind: RibbonTick['kind'], one: string, many: string, window: string) => {
    const of = ticks.filter((t) => t.kind === kind)
    if (!of.length) return ''
    return `${of.length} ${of.length === 1 ? one : many}${window}, next ${formatUSDate(of[0].date)}.`
  }
  return [part('renewal', 'renewal', 'renewals', ' in the next 12 months'), part('xdate', 'X-date', 'X-dates', '')]
    .filter(Boolean)
    .join(' ')
}

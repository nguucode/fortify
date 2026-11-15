import { ribbonSummary, type RibbonTick } from '@/domain/ribbon'
import { formatUSDate } from '@/mock/dates'
import { cx, Tip } from '@/components/ui/primitives'

export const RIBBON_WIDTH = 120
const NEAR = 30 / 365 // the first 30 days are shaded so near renewals read without hovering
const QUARTERS = [0.25, 0.5, 0.75]

/** Header for the ribbon column: the label plus month names under each quarter mark. */
export function RibbonAxis({ label, today = new Date() }: { label: string; today?: Date }) {
  const month = (q: number) => new Date(today.getFullYear(), today.getMonth() + q * 12, 1).toLocaleString('en-US', { month: 'short' })
  return (
    <span className="flex flex-col leading-none">
      <span>{label}</span>
      <span aria-hidden className="relative mt-1 h-3 text-[11px] font-normal text-muted" style={{ width: RIBBON_WIDTH }}>
        {QUARTERS.map((q) => (
          <span key={q} className="absolute -translate-x-1/2" style={{ left: q * RIBBON_WIDTH }}>
            {month(q)}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * Signature move (surface brief): a 12-month strip per Account. Solid blue ticks are Term expirations
 * (Renewals), hollow ticks are X-dates. Drawn from data at runtime; hover lists the dates.
 */
export function TermRibbon({ ticks }: { ticks: RibbonTick[] }) {
  const summary = ribbonSummary(ticks)
  return (
    <>
      <span className="sr-only">{summary}</span>
      <Tip
        label={
          ticks.length ? (
            <ul className="flex flex-col gap-0.5">
              {ticks.map((t, i) => (
                <li key={i} className="tabular whitespace-nowrap">
                  <span className="opacity-70">{t.kind === 'renewal' ? 'Renewal' : 'X-date'} {formatUSDate(t.date)}</span> · {t.label}
                </li>
              ))}
            </ul>
          ) : (
            summary
          )
        }
      >
        <span aria-hidden className="relative block h-5" style={{ width: RIBBON_WIDTH }}>
          {/* The 30-day band only appears when something is actually due inside it (status color encodes state). */}
          {ticks.some((t) => t.position <= NEAR) && <span className="absolute top-0.5 left-0 h-4 rounded-sm bg-warning/25" style={{ width: NEAR * RIBBON_WIDTH }} />}
          <span className="absolute inset-x-0 top-1/2 h-px bg-fill" />
          {QUARTERS.map((q) => (
            <span key={q} className="absolute top-[7px] h-1.5 w-px bg-inactive" style={{ left: q * RIBBON_WIDTH }} />
          ))}
          {/* Today: a strong 2px marker, distinct from the 1px quarter marks. */}
          <span className="absolute top-0 left-0 h-5 w-0.5 rounded-full bg-strong" />
          {ticks.map((t, i) => {
            // Inside 30 days a tick takes the warning hue, so the ribbon itself says "due soon".
            const near = t.position <= NEAR
            return (
            <span
              key={i}
              className={
                t.kind === 'renewal'
                  ? cx('absolute top-[3px] h-3.5 w-[3px] -translate-x-1/2 rounded-[1px]', near ? 'bg-warning-text' : 'bg-primary')
                  : cx('absolute top-[6px] size-2 -translate-x-1/2 rounded-full bg-surface ring-[1.5px]', near ? 'ring-warning-text' : 'ring-primary')
              }
              style={{ left: Math.max(4, t.position * RIBBON_WIDTH) }}
            />
            )
          })}
        </span>
      </Tip>
    </>
  )
}

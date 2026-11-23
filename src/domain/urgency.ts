export type DueTone = 'overdue' | 'soon' | null

/**
 * One urgency rule for every date (DESIGN.md › Data Table): past the date is `overdue` (danger),
 * today or inside the window is `soon` (warning), anything later has no tone.
 * `daysUntil` is days from today to the date; the window defaults to 30 days.
 */
export function dueTone(daysUntil: number | null | undefined, windowDays = 30): DueTone {
  if (daysUntil == null) return null
  if (daysUntil < 0) return 'overdue'
  return daysUntil <= windowDays ? 'soon' : null
}

/** rules.md: a premium rise of 10% or more is a renewal risk; a drop of 5% or more is good news. */
export const RISK_RISE = 0.1
export const GOOD_DROP = -0.05
export function changeTone(pct: number | null | undefined): 'up' | 'down' | null {
  if (pct == null) return null
  if (pct >= RISK_RISE) return 'up'
  return pct <= GOOD_DROP ? 'down' : null
}

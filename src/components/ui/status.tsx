import { Tip } from './primitives'

// Tone map per US-FND-017. One meaning per hue; dots carry it, labels stay ink for contrast.
// blue: open or in progress, the next move is ours · orange: waiting on someone else, or needs attention
// green: a good outcome, or live and healthy · red: a bad outcome, failure, high priority
// neutral: not started, inactive, or settled history
export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'neutral'
// Levels: High red, Medium orange, Low green (risk is low = healthy), Normal neutral. A scale where high is good
// (interest level) passes its own tone: INTEREST_TONE.
export const TONE: Record<string, Tone> = {
  New: 'blue', Contacted: 'blue', 'Gathering info': 'blue', Quoting: 'blue', Proposed: 'blue', Prospect: 'blue', Requested: 'blue', Quoted: 'blue', Presented: 'blue', 'In progress': 'blue', 'In review': 'blue', Decided: 'blue', Bound: 'blue', Reported: 'blue', 'Claim # assigned': 'blue', Open: 'blue', Ready: 'blue', 'In design': 'blue', 'In build': 'blue',
  Qualified: 'green', Won: 'green', Accepted: 'green', Client: 'green', Active: 'green', Issued: 'green', 'Re-issued': 'green', Done: 'green', Succeeded: 'green',
  'Waiting on carrier': 'orange', 'Awaiting AMS': 'orange', Medium: 'orange', 'Waiting on client': 'orange', 'Submitted to carrier': 'orange', Referred: 'orange', 'Needs review': 'orange', Remarketing: 'orange', 'Pending cancellation': 'orange', Partial: 'orange',
  Low: 'green', Lost: 'red', Declined: 'red', Canceled: 'red', 'Non-renewed': 'red', Failed: 'red', High: 'red',
  Upcoming: 'neutral', Draft: 'neutral', Disqualified: 'neutral', 'Not taken': 'neutral', 'Former client': 'neutral', Expired: 'neutral', Renewed: 'neutral', Rewritten: 'neutral', Replaced: 'neutral', Withdrawn: 'neutral', Closed: 'neutral', Inactive: 'neutral', Retired: 'neutral', Normal: 'neutral',
}
export const INTEREST_TONE: Record<string, Tone> = { High: 'green', Medium: 'orange', Low: 'neutral', Closed: 'neutral' }
// Labels take the AA text color of their hue; neutral reads as label grey.
const TEXT: Record<Tone, string> = { blue: 'text-info-text', green: 'text-success-text', orange: 'text-warning-text', red: 'text-danger-text', neutral: 'text-label' }
const DOT: Record<string, string> = {
  blue: 'bg-info',
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
  neutral: 'bg-muted',
}

export function StatusCell({ status, reason, tone: toneOverride }: { status: string | null | undefined; reason?: string; /** For a scale whose meaning differs from the default map (INTEREST_TONE). */ tone?: Tone }) {
  if (!status) return <span className="text-muted">—</span>
  const tone = toneOverride ?? TONE[status]
  if (!tone && import.meta.env.DEV) console.warn(`Unknown status "${status}"`)
  const cell = (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm whitespace-nowrap">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[tone ?? 'neutral']}`} />
      <span className={`font-medium ${TEXT[tone ?? 'neutral']}`}>{status}</span>
      {reason && <span className="truncate text-muted">· {reason}</span>}
    </span>
  )
  return reason ? <Tip label={`${status}: ${reason}`}>{cell}</Tip> : cell
}

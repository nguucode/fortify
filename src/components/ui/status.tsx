import { Tip } from './primitives'

// Tone map per US-FND-017. Dots carry the hue; labels stay text-default for contrast.
const TONE: Record<string, string> = {
  New: 'blue', Ready: 'blue', Reported: 'blue', 'Claim # assigned': 'blue', Open: 'blue', 'Submitted to carrier': 'orange', 'In design': 'orange', 'In build': 'orange', 'Gathering info': 'blue', Quoting: 'blue', 'In progress': 'blue', 'In review': 'blue', Prospect: 'blue', Requested: 'blue', Quoted: 'blue', Presented: 'blue', Proposed: 'blue',
  Qualified: 'green', 'Re-issued': 'green', Won: 'green', Active: 'green', Issued: 'green', Done: 'green', Accepted: 'green', Client: 'green', Renewed: 'green',
  'Waiting on carrier': 'orange', 'Waiting on client': 'orange', 'Needs review': 'orange', Referred: 'orange', Remarketing: 'orange', 'Pending cancellation': 'orange', Bound: 'orange',
  Lost: 'red', High: 'red', Declined: 'red', Canceled: 'red', 'Non-renewed': 'red',
  'Former client': 'neutral', Draft: 'neutral', Replaced: 'neutral', Withdrawn: 'neutral', Inactive: 'neutral', Closed: 'neutral', Contacted: 'neutral', Upcoming: 'neutral', Low: 'neutral', Expired: 'neutral', 'Not taken': 'neutral', Disqualified: 'neutral', Rewritten: 'neutral',
}
const DOT: Record<string, string> = {
  blue: 'bg-[oklch(54.6%_0.245_262.9)]',
  green: 'bg-success',
  orange: 'bg-warning',
  red: 'bg-danger',
  neutral: 'bg-muted',
}

export function StatusCell({ status, reason }: { status: string | null | undefined; reason?: string }) {
  if (!status) return <span className="text-muted">—</span>
  const tone = TONE[status]
  if (!tone && import.meta.env.DEV) console.warn(`Unknown status "${status}"`)
  const cell = (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm whitespace-nowrap">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[tone ?? 'neutral']}`} />
      <span className="text-ink">{status}</span>
      {reason && <span className="truncate text-muted">· {reason}</span>}
    </span>
  )
  return reason ? <Tip label={`${status}: ${reason}`}>{cell}</Tip> : cell
}

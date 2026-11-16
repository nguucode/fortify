import { canSeeAccount } from './access'
import type { Dataset, User } from './types'

export type NotificationKind = 'lead-assigned' | 'task-due' | 'task-overdue' | 'renewal-at-risk' | 'service-assigned' | 'certificate-review' | 'xdate-followup'
export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** Day offset from today (0 = today, -1 = yesterday). */
  offset: number
  to: string
}

/**
 * US-FND-008: notifications are derived from the store for the viewing user, so View as always shows that
 * user's set. IDs are stable per source record, so read state survives re-renders and store writes.
 */
export function deriveNotifications(data: Pick<Dataset, 'accounts' | 'leads' | 'tasks' | 'renewals' | 'serviceRequests' | 'terms' | 'policies'>, user: User): AppNotification[] {
  const acc = new Map(data.accounts.map((a) => [a.id, a]))
  const name = (id: string) => acc.get(id)?.name ?? ''
  const out: AppNotification[] = []
  for (const l of data.leads)
    if (l.assigneeId === user.id && l.status === 'New' && l.createdOffset >= -7)
      out.push({ id: `lead-${l.id}`, kind: 'lead-assigned', title: `Lead assigned to you: ${l.name}`, body: `${l.source} · ${l.linesOfInterest.join(', ')}`, offset: l.createdOffset, to: `/leads/${l.id}` })
  for (const t of data.tasks) {
    if (t.assigneeId !== user.id || t.status !== 'Open' || t.dueOffset > 0) continue
    const xdate = t.source === 'X-date'
    if (xdate && user.role !== 'producer') continue
    out.push(
      xdate
        ? { id: `task-${t.id}`, kind: 'xdate-followup', title: `X-date follow-up due: ${name(t.accountId)}`, body: t.title, offset: Math.max(t.dueOffset, -30), to: `/accounts/${t.accountId}` }
        : { id: `task-${t.id}`, kind: t.dueOffset < 0 ? 'task-overdue' : 'task-due', title: t.dueOffset < 0 ? `Task overdue: ${t.title}` : `Task due today: ${t.title}`, body: name(t.accountId), offset: Math.max(t.dueOffset, -30), to: `/accounts/${t.accountId}` },
    )
  }
  const terms = new Map(data.terms.map((t) => [t.id, t]))
  for (const r of data.renewals) {
    const a = acc.get(r.accountId)
    const t = terms.get(r.termId)
    if (!a || !t || !canSeeAccount(user, a) || user.role === 'admin') continue
    if (user.role === 'account-manager' && r.ownerId !== user.id) continue
    if (user.role === 'producer' && a.producerId !== user.id) continue
    const pct = r.renewalPremium != null ? (r.renewalPremium - t.premium) / t.premium : 0
    if (['Upcoming', 'In review', 'Remarketing'].includes(r.status) && (pct >= 0.1 || t.pendingCancellation))
      out.push({ id: `ren-${r.id}`, kind: 'renewal-at-risk', title: `Renewal at risk: ${a.name}`, body: t.pendingCancellation ? 'Pending cancellation' : `Renewal premium up ${(pct * 100).toFixed(1)}%`, offset: Math.max(r.createdOffset, -30), to: `/renewals/${r.id}` })
  }
  for (const s of data.serviceRequests)
    if (s.ownerId === user.id && s.createdById !== user.id && s.status === 'New')
      out.push({ id: `sr-${s.id}`, kind: 'service-assigned', title: `Service Request assigned to you: ${s.subject}`, body: `${s.id} · ${name(s.accountId)}`, offset: s.createdOffset, to: `/service/${s.id}` })
  return out.sort((a, b) => b.offset - a.offset)
}

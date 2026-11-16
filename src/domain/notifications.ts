import { canSeeAccount } from './access'
import { followUps } from './claimFollowUp'
import type { Dataset, User } from './types'

export type NotificationKind = 'claim-followup' | 'service-overdue' | 'mention' | 'lead-assigned' | 'task-due' | 'task-overdue' | 'renewal-at-risk' | 'service-assigned' | 'certificate-review' | 'xdate-followup'
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
export function deriveNotifications(data: Pick<Dataset, 'accounts' | 'leads' | 'tasks' | 'renewals' | 'serviceRequests' | 'terms' | 'policies'> & { activities?: Dataset['activities']; users?: Dataset['users']; certificates?: Dataset['certificates']; holders?: Dataset['holders']; claims?: Dataset['claims'] }, user: User): AppNotification[] {
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
  // US-CRT-007: certificates waiting for a Principal (never the one who submitted).
  if (user.role === 'principal')
    for (const c of data.certificates ?? [])
      if (c.status === 'Needs review' && c.submittedById !== user.id && c.createdById !== user.id)
        out.push({ id: `cert-${c.id}`, kind: 'certificate-review', title: `Certificate needs review: ${c.id}`, body: `${data.holders?.find((h) => h.id === c.holderId)?.name ?? ''} · ${name(c.accountId)}`, offset: c.submittedAt ? Math.max(-30, Math.round((new Date(c.submittedAt).getTime() - Date.now()) / 86_400_000)) : 0, to: `/certificates/${c.id}?mode=review` })
  // US-SRV-014: an overdue request notifies its assignee.
  for (const s of data.serviceRequests)
    if (s.ownerId === user.id && s.status !== 'Done' && s.status !== 'Waiting on client' && (s.dueAt ? new Date(s.dueAt) < new Date() : s.dueOffset < 0))
      out.push({ id: `sr-overdue-${s.id}`, kind: 'service-overdue', title: `${s.id} is overdue`, body: `${s.type} · ${name(s.accountId)}`, offset: Math.max(s.dueOffset, -30), to: `/service/${s.id}` })
  // US-CLM-006: once per rule per Claim, to the Account Manager.
  if (data.claims && data.activities && data.tasks)
    for (const c of data.claims) {
      if (acc.get(c.accountId)?.accountManagerId !== user.id) continue
      for (const fu of followUps(c, { activities: data.activities, tasks: data.tasks, serviceRequests: data.serviceRequests }, new Date()))
        out.push({ id: `claim-${fu.rule}-${c.id}`, kind: 'claim-followup', title: fu.rule === 'noClaimNumber' ? `${c.id} has no claim # after 2 business days` : `${c.id} needs a check-in`, body: `${fu.text} · ${name(c.accountId)}`, offset: 0, to: `/claims/${c.id}` })
    }
  for (const a of data.activities ?? [])
    if (a.mentions?.includes(user.id) && a.occurredOffset >= -14)
      out.push({ id: `mention-${a.id}`, kind: 'mention', title: `${data.users?.find((u) => u.id === a.createdById)?.name ?? 'Someone'} mentioned you`, body: `${name(a.accountId)} · ${a.subject}`, offset: a.occurredOffset, to: `/accounts/${a.accountId}?tab=activity` })
  return out.sort((a, b) => b.offset - a.offset)
}

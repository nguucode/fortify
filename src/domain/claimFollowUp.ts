import { businessHoursBetween } from './sla'
import type { Claim, Dataset } from './types'

/** US-CLM-006 (rules.md, Claims): three follow-up rules, measured in business days (9 business hours each). */
export type FollowUpRule = 'noClaimNumber' | 'checkIn' | 'checkInWaitingOnClient'
const at = (offset: number, today: Date) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset, 9)
export const businessDaysSince = (offset: number, today: Date) => Math.floor(businessHoursBetween(at(offset, today), today) / 9)

/** Last check-in: a call or email Activity linked to the Claim, a completed Task on it, or the day it opened. */
export function lastCheckIn(c: Claim, d: Pick<Dataset, 'activities' | 'tasks'>) {
  const acts = d.activities.filter((a) => a.linked?.kind === 'claim' && a.linked.id === c.id && (a.type === 'call' || a.type === 'email')).map((a) => a.occurredOffset)
  const tasks = d.tasks.filter((t) => t.linked?.kind === 'claim' && t.linked.id === c.id && t.status === 'Done').map((t) => t.doneOffset ?? t.dueOffset)
  return Math.max(c.statusDates?.Open ?? c.createdOffset, ...acts, ...tasks)
}

export function followUps(c: Claim, d: Pick<Dataset, 'activities' | 'tasks' | 'serviceRequests'>, today: Date): { rule: FollowUpRule; days: number; text: string }[] {
  if (c.status === 'Submitted to carrier' && c.submittedOffset != null) {
    const days = businessDaysSince(c.submittedOffset, today)
    return days >= 2 ? [{ rule: 'noClaimNumber', days, text: `No claim # after ${days} business days` }] : []
  }
  if (c.status !== 'Open') return []
  const waiting = d.serviceRequests.find((s) => s.id === c.serviceRequestId)?.status === 'Waiting on client'
  const days = businessDaysSince(lastCheckIn(c, d), today)
  const limit = waiting ? 14 : 7
  return days >= limit ? [{ rule: waiting ? 'checkInWaitingOnClient' : 'checkIn', days, text: `No check-in in ${days} business days${waiting ? ' (waiting on client)' : ''}` }] : []
}

import { addBusinessHours, businessHoursBetween, dueLabel, slaHours } from './sla'

const at = (s: string) => new Date(s)

describe('SLA business hours (US-SRV-014)', () => {
  it('adds hours inside 8–5 Monday to Friday, skipping nights, weekends, and federal holidays', () => {
    expect(addBusinessHours(at('2026-11-16T10:00:00'), 4)).toEqual(at('2026-11-16T14:00:00'))
    expect(addBusinessHours(at('2026-11-16T15:00:00'), 4)).toEqual(at('2026-11-17T10:00:00'))
    expect(addBusinessHours(at('2026-11-20T16:00:00'), 4)).toEqual(at('2026-11-23T11:00:00'))
    expect(addBusinessHours(at('2026-11-25T16:00:00'), 4)).toEqual(at('2026-11-27T11:00:00'))
    expect(addBusinessHours(at('2026-11-21T09:00:00'), 1)).toEqual(at('2026-11-23T09:00:00'))
  })
  it('counts business hours between two times', () => {
    expect(businessHoursBetween(at('2026-11-16T15:00:00'), at('2026-11-17T10:00:00'))).toBe(4)
  })
  it('maps types to hours, with certificates depending on special wording', () => {
    expect(slaHours('Claim report')).toBe(4)
    expect(slaHours('Certificate request', { special: true })).toBe(9)
    expect(slaHours('Certificate request')).toBe(4)
    expect(slaHours('Billing question')).toBe(18)
    expect(slaHours('Billing question', { nonpayment: true })).toBe(4)
  })
  it('labels due-soon, overdue, and paused', () => {
    const now = at('2026-11-16T10:00:00')
    expect(dueLabel(at('2026-11-16T11:40:00'), now, false)).toEqual({ text: 'Due in 1h 40m', tone: 'warning' })
    expect(dueLabel(at('2026-11-14T10:00:00'), now, false)).toEqual({ text: 'Overdue 2d', tone: 'danger' })
    expect(dueLabel(at('2026-11-18T10:00:00'), now, false)).toEqual({ text: 'Due 11/18/2026', tone: 'default' })
    expect(dueLabel(at('2026-11-18T10:00:00'), now, true)).toEqual({ text: 'SLA paused', tone: 'muted' })
  })
})

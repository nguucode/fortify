import { outsideTextingWindow, timeZoneFor } from './sms'

// 2026-11-15 is a Sunday; 2026-11-16 a Monday. Times in UTC (CST = UTC-6, EST = UTC-5).
describe('texting window (US-INB-006)', () => {
  it('TX: 9 AM to 9 PM, Sundays from noon', () => {
    expect(outsideTextingWindow('TX', '77019', new Date('2026-11-16T15:00:00Z'))).toBeNull() // 9:00 AM Mon
    expect(outsideTextingWindow('TX', '77019', new Date('2026-11-16T14:59:00Z'))).toBe('8:59 AM')
    expect(outsideTextingWindow('TX', '77019', new Date('2026-11-15T17:30:00Z'))).toBe('11:30 AM') // Sunday before noon
    expect(outsideTextingWindow('TX', '77019', new Date('2026-11-17T03:42:00Z'))).toBe('9:42 PM')
  })
  it('FL: 8 AM to 8 PM; Pensacola is Central', () => {
    expect(timeZoneFor('FL', '32502')).toBe('America/Chicago')
    expect(timeZoneFor('FL', '33602')).toBe('America/New_York')
    expect(outsideTextingWindow('FL', '33602', new Date('2026-11-17T01:30:00Z'))).toBe('8:30 PM') // Tampa
    expect(outsideTextingWindow('FL', '32502', new Date('2026-11-17T01:30:00Z'))).toBeNull() // 7:30 PM Pensacola
  })
})

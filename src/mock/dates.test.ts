import { resolveOffset, formatUSDate } from './dates'

describe('resolveOffset', () => {
  const today = new Date(2026, 10, 15) // Nov 15, 2026, local time

  it('turns a day offset into a calendar date relative to today', () => {
    expect(formatUSDate(resolveOffset(0, today))).toBe('11/15/2026')
    expect(formatUSDate(resolveOffset(45, today))).toBe('12/30/2026')
    expect(formatUSDate(resolveOffset(-30, today))).toBe('10/16/2026')
  })

  it('crosses year boundaries', () => {
    expect(formatUSDate(resolveOffset(120, today))).toBe('03/15/2027')
  })
})

import { ribbonTicks, ribbonSummary } from './ribbon'

const today = new Date(2026, 10, 15)
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('ribbonTicks', () => {
  it('places Term expirations and X-dates on a 12-month strip from today', () => {
    const ticks = ribbonTicks(
      [{ kind: 'renewal', date: d(2027, 5, 15), label: 'Home · Gulf Harbor Insurance' }],
      today,
    )
    expect(ticks).toHaveLength(1)
    // May 15, 2027 is 181 days after Nov 15, 2026, about halfway across 365 days.
    expect(ticks[0].position).toBeCloseTo(181 / 365, 3)
  })

  it('drops dates in the past or more than 12 months out, and orders by date', () => {
    const ticks = ribbonTicks(
      [
        { kind: 'xdate', date: d(2027, 2, 1), label: 'Umbrella' },
        { kind: 'renewal', date: d(2026, 11, 1), label: 'past' },
        { kind: 'renewal', date: d(2028, 1, 10), label: 'too far' },
        { kind: 'renewal', date: d(2026, 12, 1), label: 'Auto' },
      ],
      today,
    )
    expect(ticks.map((t) => t.label)).toEqual(['Auto', 'Umbrella'])
  })
})

describe('ribbonSummary', () => {
  it('gives screen readers the next date of each kind', () => {
    const ticks = ribbonTicks(
      [
        { kind: 'renewal', date: d(2026, 12, 1), label: 'Auto' },
        { kind: 'renewal', date: d(2027, 3, 1), label: 'Home' },
        { kind: 'xdate', date: d(2027, 2, 1), label: 'Umbrella' },
      ],
      today,
    )
    expect(ribbonSummary(ticks)).toBe('2 renewals in the next 12 months, next 12/01/2026. 1 X-date, next 02/01/2027.')
    expect(ribbonSummary([])).toBe('Nothing due in the next 12 months.')
  })
})

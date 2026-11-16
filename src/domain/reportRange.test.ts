import { previous, rangeFor } from './reportRange'

const today = new Date(2026, 10, 16) // Mon 11/16/2026

describe('report ranges (US-RPT-002)', () => {
  it('resolves presets to day offsets', () => {
    expect(rangeFor('mtd', today)).toEqual({ from: -15, to: 0 })
    expect(rangeFor('last-month', today)).toEqual({ from: -46, to: -16 }) // 10/01 to 10/31
    expect(rangeFor('qtd', today)).toEqual({ from: -46, to: 0 })
    expect(rangeFor('ytd', today)).toEqual({ from: -319, to: 0 })
    expect(rangeFor('custom', today, { from: '2026-11-01', to: '2026-11-10' })).toEqual({ from: -15, to: -6 })
  })
  it('previous period has the same length and ends the day before', () => {
    expect(previous({ from: -15, to: 0 })).toEqual({ from: -31, to: -16 })
  })
})

import { changeTone, dueTone } from './urgency'

describe('dueTone', () => {
  it('is overdue once the date has passed', () => {
    expect(dueTone(-1)).toBe('overdue')
    expect(dueTone(-90, 30)).toBe('overdue')
  })
  it('is due today on day zero, which is still on time', () => {
    expect(dueTone(0)).toBe('soon')
  })
  it('is soon inside the window, 30 days by default', () => {
    expect(dueTone(30)).toBe('soon')
    expect(dueTone(31)).toBeNull()
    expect(dueTone(45, 45)).toBe('soon')
    expect(dueTone(46, 45)).toBeNull()
  })
  it('never warns without a window when the window is zero', () => {
    expect(dueTone(0, 0)).toBe('soon')
    expect(dueTone(1, 0)).toBeNull()
  })
  it('has no tone for a missing date', () => {
    expect(dueTone(null)).toBeNull()
    expect(dueTone(undefined)).toBeNull()
  })
})

describe('changeTone', () => {
  it('flags a premium rise of 10% or more as a risk (rules.md)', () => {
    expect(changeTone(0.1)).toBe('up')
    expect(changeTone(0.099)).toBeNull()
  })
  it('marks a drop of 5% or more as good news', () => {
    expect(changeTone(-0.05)).toBe('down')
    expect(changeTone(-0.049)).toBeNull()
  })
  it('has no tone without a change', () => {
    expect(changeTone(null)).toBeNull()
  })
})

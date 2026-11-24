import { describe, expect, it } from 'vitest'
import { canvasInk } from './TopBar'

describe('canvasInk', () => {
  it('uses light text on a dark background and dark text on a light one', () => {
    expect(canvasInk(['#425267']).ink).toBe('light')
    expect(canvasInk(['#fde8d7']).ink).toBe('dark')
  })
  it('flags a gradient that runs from light to dark', () => {
    expect(canvasInk(['#e8eefc', '#fbe9f3']).worst).toBeGreaterThan(4.5)
    expect(canvasInk(['#ffffff', '#1e293b']).worst).toBeLessThan(4.5)
  })
})

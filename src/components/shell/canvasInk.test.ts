import { describe, expect, it } from 'vitest'
import { canvasInk, onCanvasTokens } from './canvasInk'
import { PRESETS } from './GradientEditor'

describe('canvasInk', () => {
  it('uses light text on a dark background and dark text on a light one', () => {
    expect(canvasInk(['#425267']).ink).toBe('light')
    expect(canvasInk(['#fde8d7']).ink).toBe('dark')
  })
  it('flags a gradient that runs from light to dark', () => {
    expect(canvasInk(['#e8eefc', '#fbe9f3']).worst).toBeGreaterThan(4.5)
    expect(canvasInk(['#ffffff', '#1e293b']).worst).toBeLessThan(4.5)
  })
  it('ships only presets that text reads on', () => {
    for (const [, a, b] of PRESETS) expect(canvasInk([a, b]).worst).toBeGreaterThan(4.5)
  })
  it('raises text roles until they read on a mid-tone background', () => {
    const green = onCanvasTokens(['#5b9a48'])
    expect(green.ink).toBe('dark')
    expect(green.alphas.muted).toBeGreaterThan(0.6) // the design alpha alone fails on this green
    expect(green.alphas.label).toBeGreaterThanOrEqual(green.alphas.muted)
  })
  it('keeps the design alphas where they already read', () => {
    expect(onCanvasTokens(['#fafafa']).alphas.muted).toBe(0.6)
  })
})

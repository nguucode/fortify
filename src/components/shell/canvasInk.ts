// Text on a user-picked page background (ThemeMenu → App background Color/Gradient).
// After Adobe Leonardo: each text role has a target contrast ratio, and its colour is solved against the actual
// background instead of being a fixed grey. Roles are the ink (black or white) at an alpha: the design alpha when
// that already reads, raised until it meets the target on every gradient stop when it doesn't.

type RGB = [number, number, number]
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const lumRGB = (c: RGB) => {
  const [r, g, b] = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const INK: Record<'light' | 'dark', RGB> = { light: [255, 255, 255], dark: [0, 0, 0] }
const over = (ink: RGB, a: number, bg: RGB) => ink.map((v, i) => v * a + bg[i] * (1 - a)) as RGB

/** Which ink reads on these background stops: the one whose worst contrast across them is highest. */
export function canvasInk(stops: string[]) {
  const bgs = stops.map((s) => lumRGB(rgb(s)))
  const worst = (ink: RGB) => Math.min(...bgs.map((l) => contrast(l, lumRGB(ink))))
  const light = worst(INK.light), dark = worst(INK.dark)
  return light > dark ? { ink: 'light' as const, worst: light } : { ink: 'dark' as const, worst: dark }
}

// [token, design alpha, minimum contrast]. Text roles meet WCAG AA (4.5:1); control borders meet 3:1 (1.4.11).
// Strong/ink aim for 7:1 and settle at full ink when the background can't give that. Inactive and the
// decorative line keep their design alpha (disabled and decorative UI are exempt).
const ROLES = [
  ['strong', 0.92, 7],
  ['ink', 0.86, 7],
  ['label', 0.7, 4.5],
  ['muted', 0.6, 4.5],
  ['inactive', 0.3, 0],
  ['line', 0.12, 0],
  ['line-control', 0.42, 3],
  ['recessed', 0.06, 0],
  ['fill', 0.1, 0],
] as const

/** CSS values for each role on these background stops, plus the alphas (for tests). */
export function onCanvasTokens(stops: string[]) {
  const { ink } = canvasInk(stops)
  const bgs = stops.map(rgb)
  const reads = (a: number, min: number) => bgs.every((bg) => contrast(lumRGB(over(INK[ink], a, bg)), lumRGB(bg)) >= min)
  const alphas = Object.fromEntries(
    ROLES.map(([role, base, min]) => {
      let a: number = base
      while (a < 1 && !reads(a, min)) a = Math.min(1, a + 0.02)
      return [role, Math.round(a * 100) / 100]
    }),
  ) as Record<(typeof ROLES)[number][0], number>
  const c = ink === 'light' ? '255 255 255' : '0 0 0'
  const css = Object.fromEntries(Object.entries(alphas).map(([role, a]) => [`--oc-${role}`, `rgb(${c} / ${a})`]))
  return { ink, alphas, css }
}

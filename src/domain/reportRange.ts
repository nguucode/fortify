/** US-RPT-002: date presets as inclusive day-offset ranges from today, plus the previous period of equal length. */
export type Preset = 'mtd' | 'last-month' | 'qtd' | 'ytd' | '12m' | 'custom'
export const PRESETS: [Preset, string][] = [['mtd', 'This month'], ['last-month', 'Last month'], ['qtd', 'This quarter'], ['ytd', 'Year to date'], ['12m', 'Last 12 months'], ['custom', 'Custom']]

const dayDiff = (a: Date, b: Date) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86_400_000)

export function rangeFor(preset: Preset, today: Date, custom?: { from: string; to: string }): { from: number; to: number } {
  const y = today.getFullYear()
  const m = today.getMonth()
  const off = (d: Date) => dayDiff(d, today)
  switch (preset) {
    case 'mtd':
      return { from: off(new Date(y, m, 1)), to: 0 }
    case 'last-month':
      return { from: off(new Date(y, m - 1, 1)), to: off(new Date(y, m, 0)) }
    case 'qtd':
      return { from: off(new Date(y, m - (m % 3), 1)), to: 0 }
    case 'ytd':
      return { from: off(new Date(y, 0, 1)), to: 0 }
    case 'custom':
      if (custom?.from && custom.to) return { from: off(new Date(`${custom.from}T00:00`)), to: off(new Date(`${custom.to}T00:00`)) }
      return { from: -364, to: 0 }
    default:
      return { from: -364, to: 0 }
  }
}
export const previous = (r: { from: number; to: number }) => ({ from: r.from - (r.to - r.from + 1), to: r.from - 1 })

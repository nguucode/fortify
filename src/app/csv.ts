import { formatUSDate } from '@/mock/dates'

// Prefix formula-leading cells so spreadsheets treat them as text (CSV injection).
export const csvSafe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)
const cell = (v: unknown) => `"${csvSafe(String(v ?? '')).replace(/"/g, '""')}"`

export function toCsv(head: string[], rows: unknown[][]) {
  return [head.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')
}

/** US-FND-019: downloads as sample-<name>-MM-DD-YYYY.csv. */
export function downloadCsv(name: string, head: string[], rows: unknown[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(head, rows)], { type: 'text/csv' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `sample-${name}-${formatUSDate(new Date()).replace(/\//g, '-')}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}

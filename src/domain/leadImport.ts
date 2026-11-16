import type { Line } from './types'

/** US-LEA-010: purchased lead lists. Pure helpers; the dialog and store action sit on top. */
export const IMPORT_FIELDS = ['first_name', 'last_name', 'phone', 'email', 'zip', 'line', 'city', 'street', 'current_carrier', 'x_date'] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]
const LINES: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat', 'BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella']

/** RFC 4180-ish: quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '')
const ALIASES: Record<ImportField, string[]> = { first_name: ['firstname', 'first', 'fname'], last_name: ['lastname', 'last', 'lname', 'surname'], phone: ['phone', 'mobile', 'cell', 'phonenumber'], email: ['email', 'emailaddress'], zip: ['zip', 'zipcode', 'postalcode'], line: ['line', 'lineofbusiness', 'product', 'coverage'], city: ['city'], street: ['street', 'address', 'address1'], current_carrier: ['currentcarrier', 'carrier', 'insurer'], x_date: ['xdate', 'expiration', 'renewaldate'] }
/** Header index → field, matched by name; unmatched headers map to null (ignored). */
export function autoMap(headers: string[]): (ImportField | null)[] {
  return headers.map((h) => (Object.entries(ALIASES).find(([, a]) => a.includes(norm(h)))?.[0] as ImportField) ?? null)
}

export type ImportRow = { n: number; values: Partial<Record<ImportField, string>>; status: 'Ready' | 'Invalid' | 'Possible duplicate'; reason?: string; line?: Line }
const digits = (s: string) => s.replace(/\D/g, '')

export function reviewRows(rows: string[][], map: (ImportField | null)[], existing: { phones: Set<string>; emails: Set<string> }): ImportRow[] {
  return rows.map((r, i) => {
    const values: Partial<Record<ImportField, string>> = {}
    map.forEach((f, j) => { if (f && r[j] != null) values[f] = r[j].trim() })
    const n = i + 2 // row 1 is the header
    const bad = (reason: string): ImportRow => ({ n, values, status: 'Invalid', reason: `Row ${n}: ${reason}` })
    if (!values.first_name || !values.last_name) return bad('first and last name are required')
    const ph = digits(values.phone ?? '')
    if (!ph && !values.email) return bad('needs a phone or email')
    if (ph && ph.length !== 10) return bad(`phone has ${ph.length} digits`)
    if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) return bad('email is not valid')
    if (!/^\d{5}$/.test(values.zip ?? '')) return bad('ZIP must be 5 digits')
    const line = LINES.find((l) => l.toLowerCase() === (values.line ?? '').toLowerCase())
    if (!line) return bad(`line "${values.line ?? ''}" isn't one Fortify writes`)
    const dup = (ph && existing.phones.has(ph)) || (values.email && existing.emails.has(values.email.toLowerCase()))
    return { n, values, line, status: dup ? 'Possible duplicate' : 'Ready', reason: dup ? `Row ${n}: matches an existing Account, Contact, or Lead` : undefined }
  })
}

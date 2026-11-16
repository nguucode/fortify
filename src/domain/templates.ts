/** SET-008: the merge fields templates may use, grouped by object. */
export const MERGE_FIELDS: Record<string, string[]> = {
  Account: ['account.name'],
  Contact: ['contact.firstName', 'contact.lastName'],
  Policy: ['policy.number', 'policy.line', 'policy.carrier'],
  Term: ['term.expirationDate', 'term.premium'],
  Renewal: ['renewal.premium', 'renewal.expirationDate'],
  'X-date': ['xdate.line', 'xdate.carrier', 'xdate.date'],
  Service: ['service.effectiveDate'],
  Certificate: ['certificate.holder'],
  Task: ['task.dueDate'],
  User: ['user.name', 'user.firstName'],
  Office: ['office.name', 'office.phone'],
}
const ALLOWED = new Set(Object.values(MERGE_FIELDS).flat())
const TOKEN = /\{\{\s*([a-zA-Z.]+)\s*\}\}/g

export function unknownTokens(body: string): string[] {
  return [...body.matchAll(TOKEN)].filter((m) => !ALLOWED.has(m[1])).map((m) => m[0])
}
export function renderTemplate(body: string, values: Record<string, string | undefined>): string {
  return body.replace(TOKEN, (_, k: string) => values[k] ?? '[no value]')
}
/** SMS segment math for GSM text: 160 for one segment, 153 per segment after that. */
export const smsSegments = (n: number) => (n <= 160 ? 1 : Math.ceil(n / 153))

import type { Policy, Renewal, Term } from './types'

/** rules.md risk: High when any reason applies. Reasons show in the Risk tooltip. */
export function riskReasons(r: Pick<Renewal, 'renewalPremium'>, t: Pick<Term, 'premium' | 'pendingCancellation'>, ctx: { claimsThisTerm: number; lastResort: boolean }): string[] {
  const out: string[] = []
  if (r.renewalPremium != null) {
    const pct = (r.renewalPremium - t.premium) / t.premium
    if (pct >= 0.1) out.push(`Premium +${(pct * 100).toFixed(1)}%`)
  }
  if (t.pendingCancellation) out.push('Pending cancellation')
  if (ctx.claimsThisTerm > 0) out.push(`${ctx.claimsThisTerm} claim${ctx.claimsThisTerm === 1 ? '' : 's'} this term`)
  if (ctx.lastResort) out.push('Carrier of last resort (FL)')
  return out
}

export interface CompareRow {
  item: string
  expiring: string
  renewal: string
  kind: 'Added' | 'Removed' | 'Changed' | 'Unchanged'
}

// Deterministic per-renewal variation, so the mock compare view is stable across reloads.
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/**
 * US-REN-006: expiring Term vs renewal terms, per coverage. Mock renewal terms are derived from the Policy's
 * synced coverages with a stable, renewal-specific change set. Null until the carrier sends renewal terms.
 */
export function compareRenewal(r: Renewal, t: Term, p: Policy): { total: { expiring: number; renewal: number; change: number; pct: number }; rows: CompareRow[] } | null {
  if (r.renewalPremium == null) return null
  const h = hash(r.id)
  const rows: CompareRow[] = []
  const row = (item: string, expiring: string, renewal: string) => rows.push({ item, expiring, renewal, kind: expiring === renewal ? 'Unchanged' : expiring === '—' ? 'Added' : renewal === '—' ? 'Removed' : 'Changed' })
  if (p.dwelling) {
    const d = p.dwelling
    const bumpA = h % 3 === 0 ? 1.06 : 1
    row('Coverage A (dwelling)', usd(d.coverageA), usd(Math.round((d.coverageA * bumpA) / 1000) * 1000))
    row('AOP deductible', usd(d.aopDeductible), usd(h % 4 === 1 ? Math.min(5000, d.aopDeductible * 2.5) : d.aopDeductible))
    row('Roof year', String(d.roofYear), String(d.roofYear))
    row('Construction', d.construction, d.construction)
    row('Flood zone', d.floodZone, d.floodZone)
    if (d.hurricanePct != null) {
      const next = h % 5 === 2 && d.hurricanePct < 10 ? (d.hurricanePct === 2 ? 5 : 10) : d.hurricanePct
      row('Hurricane deductible', `${d.hurricanePct}%`, `${next}%`)
      row('Wind mitigation credit', d.windMit ? 'Applied' : 'None', d.windMit ? (h % 6 === 3 ? 'Expired' : 'Applied') : 'None')
    }
    if (d.sinkhole) row('Sinkhole coverage', d.sinkhole, h % 7 === 4 ? 'CGCC only' : d.sinkhole)
    if (d.windPool) {
      row('Windstorm-pool area', d.windPool.inArea ? 'Yes' : 'No', d.windPool.inArea ? 'Yes' : 'No')
      if (d.windPool.inArea) row('Wind/hail deductible', d.windPool.windHailDeductible ?? '—', h % 3 === 1 ? '5%' : (d.windPool.windHailDeductible ?? '—'))
    }
  }
  if (p.auto) {
    const a = p.auto
    row('BI/PD limits', `${a.bi}/${a.pd}`, `${a.bi}/${a.pd}`)
    row('PIP', a.pip.selected ? `Selected · ${usd(a.pip.amount ?? 0)}` : 'Rejected in writing', a.pip.selected ? `Selected · ${usd(a.pip.amount ?? 0)}` : 'Rejected in writing')
    if (a.um) row('UM/UIM', a.um.selected ? `Selected · ${a.um.limits}` : 'Rejected in writing', a.um.selected ? `Selected · ${a.um.limits}` : h % 4 === 0 ? 'Selected · 30/60' : 'Rejected in writing')
    if (h % 5 === 1) row('Roadside assistance', '—', 'Included')
  }
  if (p.wcClasses) for (const c of p.wcClasses) row(`Class ${c.code} rate`, c.rate.toFixed(2), (c.rate * (1 + ((h % 9) - 2) / 100)).toFixed(2))
  if (['GL', 'BOP', 'Commercial umbrella'].includes(p.line)) {
    row('Each occurrence limit', '$1,000,000', '$1,000,000')
    row('General aggregate', '$2,000,000', '$2,000,000')
    row('Deductible', usd(h % 2 ? 1000 : 2500), usd(h % 4 === 3 ? 5000 : h % 2 ? 1000 : 2500))
    if (h % 3 === 2) row('Contractors exclusion endorsement', '—', 'Added')
  }
  if (p.line === 'Commercial auto') {
    row('Combined single limit', '$1,000,000', '$1,000,000')
    row('Comp/coll deductible', '$1,000', h % 3 === 0 ? '$2,500' : '$1,000')
  }
  if (!rows.length) row('Coverage', p.line, p.line)
  return { total: { expiring: t.premium, renewal: r.renewalPremium, change: r.renewalPremium - t.premium, pct: (r.renewalPremium - t.premium) / t.premium }, rows }
}

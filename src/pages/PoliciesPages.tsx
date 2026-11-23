import { Fragment, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AlertTriangle, FileText, MoreHorizontal, RefreshCw } from 'lucide-react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { menuContent, menuItem } from '@/components/shell/TopBar'
import { useApp, useDemoControls } from '@/app/store'
import { dateOf, usd, useLookups } from '@/app/hooks'
import { canSeeAccount, canSeeCommission, visibleAccounts } from '@/domain/access'
import type { InsuredItem, Policy, Term, UsState } from '@/domain/types'
import { DataTable, Gate, KeyValue, mini, PageTitle, Panel, Sheet, SheetCancel, RecordHeader, TabBar, ViewTabs, useTab, useView, type Column } from '@/components/patterns'
import { Button, Callout, cx, Due, RateChange, SearchField, SubHeading, Tip } from '@/components/ui/primitives'
import { dueTone } from '@/domain/urgency'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { NewServiceRequestSheet } from './ServicePages'
import { AccessDenied, NotFound } from './SystemPages'

const VIEWS = ['Active', 'Pending cancellation', 'Expired', 'Canceled', 'Recent production']
type Row = Policy & { term: Term; accountName: string; carrierName: string }

/** The current Term of a Policy: Active/Bound if any, else the latest. */
export function currentTerm(terms: Term[], policyId: string): Term | undefined {
  const own = terms.filter((t) => t.policyId === policyId).sort((a, b) => b.effectiveOffset - a.effectiveOffset)
  return own.find((t) => t.status === 'Active' || t.status === 'Bound') ?? own[0]
}

/** US-POL-004: synced data is labelled; Won Terms say "Awaiting AMS" until the sync matches them. */
export function AmsBadge({ term }: { term?: Term }) {
  const { amsState } = useAms()
  if (term?.source === 'fortify-won') return <span className="inline-flex items-center gap-1.5 text-sm"><span aria-hidden className="size-2 rounded-full bg-warning" /> Awaiting AMS</span>
  return (
    <Tip label="Policy data is read-only here; the AMS is the system of record. Changes go through a Service Request.">
      <span tabIndex={0} className="inline-flex items-center gap-1 text-sm text-muted">
        <RefreshCw aria-hidden className="size-3.5" /> Synced from AMS · {amsState}
      </span>
    </Tip>
  )
}
function useAms() {
  const c = useDemoControls()
  return { amsState: c.latency ? '5 min ago' : 'just now' }
}

export function PoliciesPage() {
  const { data, user } = useApp()
  const { account, carrierName } = useLookups()
  const navigate = useNavigate()
  const view = useView(VIEWS)
  const [q, setQ] = useState('')
  const scoped = new Set(visibleAccounts(user, data.accounts).map((a) => a.id))
  const rows: Row[] = data.policies
    .filter((p) => scoped.has(p.accountId))
    .map((p) => ({ ...p, term: currentTerm(data.terms, p.id)!, accountName: account(p.accountId)?.name ?? '', carrierName: carrierName(p.carrierId) }))
    .filter((r) => r.term)
  const inView: Record<string, (r: Row) => boolean> = {
    Active: (r) => r.term.status === 'Active' || r.term.status === 'Bound',
    'Pending cancellation': (r) => r.term.pendingCancellation,
    Expired: (r) => r.term.status === 'Expired' || r.term.status === 'Non-renewed',
    Canceled: (r) => r.term.status === 'Canceled',
    'Recent production': (r) => r.term.effectiveOffset > -30 && (r.term.status === 'Active' || r.term.status === 'Bound'),
  }
  const term = q.trim().toLowerCase()
  const match = (r: Row) => !term || r.policyNumber.toLowerCase().includes(term) || r.accountName.toLowerCase().includes(term)
  const list = rows.filter((r) => inView[view](r) && match(r))
  const counts = Object.fromEntries(VIEWS.map((v) => [v, rows.filter((r) => inView[v](r) && match(r)).length]))
  const cols: Column<Row>[] = [
    { key: 'number', label: 'Policy', render: (r) => <span className="flex items-baseline gap-2"><Link to={`/policies/${r.id}`} className="font-mono text-sm font-medium text-strong hover:text-link hover:underline">{r.policyNumber}</Link>{r.replacedByPolicyId && <span className="text-sm text-muted">Replaced</span>}</span>, csv: (r) => r.policyNumber },
    { key: 'account', label: 'Account', width: 240, sort: (a, b) => a.accountName.localeCompare(b.accountName), render: (r) => r.accountName },
    { key: 'line', label: 'Line', width: 150, render: (r) => r.line },
    { key: 'carrier', label: 'Carrier', width: 200, render: (r) => r.carrierName },
    { key: 'status', label: 'Status', width: 130, render: (r) => <StatusCell status={r.term.status} /> },
    { key: 'premium', label: 'Term premium', width: 130, align: 'right', sort: (a, b) => a.term.premium - b.term.premium, render: (r) => usd(r.term.premium) },
    { key: 'exp', label: 'Expiration', width: 120, sort: (a, b) => a.term.expirationOffset - b.term.expirationOffset, render: (r) => dateOf(r.term.expirationOffset) },
  ]
  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Policies" description="Read-only view of policies synced from the AMS. Request changes through Service." />
      <ViewTabs views={VIEWS} counts={counts} />
      <DataTable
        className="mt-4"
        toolbar={<SearchField value={q} onChange={setQ} placeholder="Search policy number or Account" label="Search policies" />}
        actions={<AmsBadge />}
        meta={`Showing ${list.length} policies`}
        pageSize={50} rows={list} columns={cols} minWidth={1100} listId="policies" exportName="policies" onRowClick={(r) => navigate(`/policies/${r.id}`)} empty={<EmptyState icon={FileText} title="No policies in this view" body="Policies appear here once the AMS syncs them." />} />
    </div>
  )
}

export function PolicyPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, carrierName, userName } = useLookups()
  const tab = useTab('overview')
  const [change, setChange] = useState<string | null>(null)
  const [claim, setClaim] = useState(false)
  const p = data.policies.find((x) => x.id === id)
  if (!p) return <NotFound what="Policy" />
  const account = getAccount(p.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="Policy" owner={userName(account.producerId)} />
  const terms = data.terms.filter((t) => t.policyId === p.id).sort((a, b) => b.effectiveOffset - a.effectiveOffset)
  const term = currentTerm(data.terms, p.id)
  const items = (data.insuredItems ?? []).filter((i) => i.policyId === p.id)
  const personal = account.kind === 'Household'
  const claims = data.serviceRequests.filter((r) => r.policyId === p.id && r.type === 'Claim report')
  const replacedBy = p.replacedByPolicyId ? data.policies.find((x) => x.id === p.replacedByPolicyId) : undefined
  const replaces = p.replacesPolicyId ? data.policies.find((x) => x.id === p.replacesPolicyId) : undefined
  const replacedByTerm = replacedBy ? [...data.terms.filter((t) => t.policyId === replacedBy.id)].sort((a, b) => a.effectiveOffset - b.effectiveOffset)[0] : undefined
  const itemCount = items.length + (p.wcClasses?.length ?? 0)
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'terms', label: 'Terms', count: terms.length },
    { id: 'items', label: 'Insured items', count: itemCount || null },
    ...(personal ? [{ id: 'interests', label: 'Additional interests', count: p.interests?.length || null }] : []),
    { id: 'claims', label: 'Claims', count: claims.filter((c) => c.status !== 'Done').length || null },
  ]
  const requestFor = (what: string) => setChange(what)
  const rowMenu = (what: string) => (
    <Menu.Root>
      <Menu.Trigger aria-label={`Actions for ${what}`} className="grid size-7 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong"><MoreHorizontal aria-hidden className="size-4" strokeWidth={1.75} /></Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={4} className={menuContent}>
          <Menu.Item disabled={user.role === 'admin'} className={menuItem} onSelect={() => requestFor(what)}>Request a change to this item</Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/policies', label: 'Policies' }}
        icon={FileText}
        title={`${p.line} · ${carrierName(p.carrierId)}`}
        status={<StatusCell status={term?.status} />}
        meta={
          <>
            <span className="font-mono text-sm">{p.policyNumber}</span>
            <Link className="text-link hover:underline" to={`/accounts/${account.id}?tab=policies`}>{account.name}</Link>
            <AmsBadge term={term} />
            {replaces && <Link className="text-link hover:underline" to={`/policies/${replaces.id}`}>Replaces {replaces.policyNumber} · {carrierName(replaces.carrierId)}</Link>}
            {p.line === 'WC' && <span>Auditable · Annual</span>}
          </>
        }
        actions={user.role !== 'admin' && <Button variant="primary" onClick={() => setChange('')}>Request a change</Button>}
      />
      {replacedBy && (
        <Callout tone="info" bleed>
          Replaced by <Link to={`/policies/${replacedBy.id}`} className="font-medium text-link underline">{replacedBy.policyNumber}</Link> · {carrierName(replacedBy.carrierId)}{replacedByTerm ? ` · effective ${dateOf(replacedByTerm.effectiveOffset)}` : ''}
        </Callout>
      )}
      <div className="px-8 pt-3 max-sm:px-4">
        <TabBar tabs={tabs} />
        <div className="pt-5">
          {tab === 'overview' && (
            <div className="grid grid-cols-[1fr_360px] gap-4 max-lg:grid-cols-1">
              <div className="flex min-w-0 flex-col gap-4">
                <Panel title="Current term">
                  <KeyValue items={[['Effective', term ? dateOf(term.effectiveOffset) : null], ['Expiration', term ? dateOf(term.expirationOffset) : null], ['Premium', usd(term?.premium)], ['Binder', term?.binderNumber ?? null]]} />
                </Panel>
                <CommissionCard policy={p} term={term} producerId={account.producerId} />
              </div>
              <div className="flex flex-col gap-4">
                <Panel title="Details">
                  <KeyValue items={[['Carrier', carrierName(p.carrierId)], ['Line', p.line], ['Producer', userName(account.producerId)], ['Account Manager', userName(account.accountManagerId)]]} />
                </Panel>
                {!personal && (
                  <Panel title="Related">
                    <Link to={`/accounts/${account.id}?tab=service`} className="text-base text-link hover:underline">Certificates for {account.name}</Link>
                  </Panel>
                )}
              </div>
            </div>
          )}
          {tab === 'terms' && <TermsTable policy={p} terms={terms} />}
          {tab === 'items' && <InsuredItems policy={p} items={items} state={account.state} rowMenu={rowMenu} />}
          {tab === 'interests' && personal && (
            <Panel title="Additional interests">
              {p.interests?.length ? (
                <SimpleTable
                  head={['Type', 'Name', 'Position', 'Loan number', 'Address', 'Applies to', '']}
                  rows={p.interests.map((x) => [x.type, x.name, x.position, <span key="l" className="font-mono text-sm">••••{x.loan4}</span>, x.address, x.appliesTo, rowMenu(`Interest: ${x.name}`)])}
                />
              ) : (
                <p className="text-base text-muted">No mortgagees, lienholders, or loss payees on this policy.</p>
              )}
            </Panel>
          )}
          {tab === 'claims' && (
            <Panel
              title="Claims"
              actions={
                <Gate allowed={user.role !== 'admin'} reason="Admins can view Service Requests but not create them.">
                  <Button size="sm" onClick={() => setClaim(true)}>Report a claim</Button>
                </Gate>
              }
            >
              {claims.length ? (
                <SimpleTable
                  head={['Claim', 'Date of loss', 'Description', 'Status', 'Outcome', 'Adjuster']}
                  rows={claims.map((c) => [
                    <Link key="c" to={`/claims/${c.id}`} className="font-mono text-sm text-link hover:underline">{(c.details as { claimNumber?: string }).claimNumber ?? c.id}</Link>,
                    dateOf((c.details as { lossOffset?: number }).lossOffset ?? c.createdOffset),
                    c.subject,
                    <StatusCell key="s" status={(c.details as { claimStatus?: string }).claimStatus ?? (c.status === 'Done' ? 'Closed' : 'Reported')} />,
                    (c.details as { outcome?: string }).outcome ?? '—',
                    (c.details as { adjuster?: string }).adjuster ?? '—',
                  ])}
                />
              ) : (
                <p className="text-base text-muted">No claims on this policy.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
      {change !== null && <NewServiceRequestSheet onClose={() => setChange(null)} accountId={account.id} policyId={p.id} type="Policy change" presetDescription={change || undefined} />}
      {claim && <NewServiceRequestSheet onClose={() => setClaim(false)} accountId={account.id} policyId={p.id} type="Claim report" />}
    </div>
  )
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className={cx(mini.table, 'tabular min-w-[640px]')}>
        <thead className={mini.head}><tr>{head.map((h, i) => <th key={i} className={mini.th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={mini.tr}>{r.map((c, j) => <td key={j} className={cx(mini.td, j === 0 && 'sticky left-0 bg-surface')}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

/** US-POL-005 + US-POL-006: newest first with change vs prior and where each Term came from. */
function TermsTable({ policy, terms }: { policy: Policy; terms: Term[] }) {
  const { data } = useApp()
  const [params, setParams] = useSearchParams()
  const ordered = [...terms].sort((a, b) => a.effectiveOffset - b.effectiveOffset)
  const openTerm = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('term', id); else n.delete('term'); setParams(n, { replace: true }) }
  const termId = params.get('term')
  const ti = ordered.findIndex((t) => t.id === termId)
  const replacedBy = policy.replacedByPolicyId ? data.policies.find((x) => x.id === policy.replacedByPolicyId) : undefined
  const source = (t: Term, i: number) => {
    if (t.status === 'Rewritten' && replacedBy) return <Link to={`/policies/${replacedBy.id}`} className="text-link hover:underline">Rewritten to {replacedBy.policyNumber}</Link>
    if (t.source === 'fortify-won') {
      const opp = data.opportunities.find((o) => o.stage === 'Won' && o.accountId === policy.accountId && o.lines.includes(policy.line))
      return opp ? <Link to={`/pipeline/${opp.id}`} className="text-link hover:underline">New business · {oppCodeOf(opp.id)}</Link> : 'New business'
    }
    if (i > 0) {
      const ren = data.renewals.find((r) => r.termId === ordered[i - 1].id)
      return ren ? <Link to={`/renewals/${ren.id}`} className="text-link hover:underline">Renewal</Link> : 'Renewal (AMS)'
    }
    return policy.replacesPolicyId ? 'Rewrite' : 'New business (AMS)'
  }
  return (
    <Panel title="Terms" className="min-w-0">
      <SimpleTable
        head={['Term', 'Effective', 'Expiration', 'Premium', 'Change vs prior', 'Status', 'Source']}
        rows={[...ordered.map((t, i) => {
          const prev = ordered[i - 1]
          const pct = prev ? (t.premium - prev.premium) / prev.premium : null
          return [
            <button key="t" data-term={t.id} onClick={() => openTerm(t.id)} className="font-medium text-link hover:underline">Term {i + 1}</button>,
            dateOf(t.effectiveOffset),
            dateOf(t.expirationOffset),
            usd(t.premium),
            <RateChange key="c" pct={pct} />,
            <span key="s" className="inline-flex items-center gap-2"><StatusCell status={t.status} />{t.pendingCancellation && <span className="text-sm font-medium text-warning-text">Pending cancellation</span>}</span>,
            source(t, i),
          ]
        })].reverse()}
      />
      {ti >= 0 && <TermDrawer policy={policy} terms={ordered} index={ti} onClose={() => { openTerm(null); setTimeout(() => (document.querySelector(`[data-term="${termId}"]`) as HTMLElement | null)?.focus(), 0) }} />}
    </Panel>
  )
}
const oppCodeOf = (id: string) => `OPP-${2000 + Number(id.replace(/\D/g, ''))}`

/** US-POL-007/008/009: per-line insured items; synced from the AMS, so the only action is a change request. */
function InsuredItems({ policy: p, items, state, rowMenu }: { policy: Policy; items: InsuredItem[]; state: UsState; rowMenu: (what: string) => React.ReactNode }) {
  const vehicles = items.filter((i): i is Extract<InsuredItem, { kind: 'Vehicle' }> => i.kind === 'Vehicle')
  const drivers = items.filter((i): i is Extract<InsuredItem, { kind: 'Driver' }> => i.kind === 'Driver')
  const props = items.filter((i): i is Extract<InsuredItem, { kind: 'Property' }> => i.kind === 'Property')
  const locs = items.filter((i): i is Extract<InsuredItem, { kind: 'Location' }> => i.kind === 'Location')
  const commercial = p.line === 'Commercial auto'
  const dw = p.dwelling
  const kv = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 py-1"><dt className="text-label">{k}</dt><dd className="text-right">{v}</dd></div>
  return (
    <div className="flex flex-col gap-4">
      {p.auto && (
        <Panel title={p.auto.state === 'TX' ? 'Texas auto' : 'Florida auto'}>
          <dl className="max-w-md text-base">
            {p.auto.state === 'TX' ? (
              <>
                {kv('BI/PD limits', <span className="tabular">{p.auto.bi}/{p.auto.pd}</span>)}
                {belowTxMin(p.auto.bi, p.auto.pd) && <p className="flex items-center gap-1.5 py-1 text-sm font-medium text-warning-text"><AlertTriangle aria-hidden className="size-3.5" /> Below the Texas minimum of 30/60/25</p>}
                {kv('PIP', p.auto.pip.selected ? `Selected · ${usd(p.auto.pip.amount)}` : `Rejected in writing · ${dateOf(p.auto.pip.rejectedOffset!)}`)}
                {kv('UM/UIM', p.auto.um?.selected ? `Selected · ${p.auto.um.limits}` : `Rejected in writing · ${dateOf(p.auto.um!.rejectedOffset!)}`)}
              </>
            ) : (
              <>
                {kv('PIP', usd(p.auto.pip.amount))}
                {kv('PDL', usd(p.auto.pdl))}
                {kv('BI', p.auto.biCarried ? p.auto.bi : 'Not carried (optional in FL)')}
              </>
            )}
          </dl>
        </Panel>
      )}
      {vehicles.length > 0 && (
        <Panel title="Vehicles">
          <SimpleTable
            head={['Year', 'Make', 'Model', 'VIN', 'Garaging ZIP', 'Use', 'Comp ded.', 'Coll ded.', ...(commercial ? ['Class', 'Radius'] : []), '']}
            rows={vehicles.map((v) => [v.year, v.make, v.model, <span key="v" className="font-mono text-sm">…{v.vin4}</span>, v.garagingZip ?? '—', v.use ?? '—', usd(v.compDed), usd(v.collDed), ...(commercial ? [v.vehicleClass ?? '—', v.radius ?? '—'] : []), rowMenu(`${v.year} ${v.make} ${v.model}`)])}
          />
        </Panel>
      )}
      {drivers.length > 0 && (
        <Panel title="Drivers">
          <SimpleTable head={['Name', 'Age', 'License state', 'Relationship', 'Status', '']} rows={drivers.map((d) => [d.name, d.age, d.licenseState ?? state, d.relationship ?? '—', d.rated === false ? 'Excluded' : 'Rated', rowMenu(d.name)])} />
        </Panel>
      )}
      {dw && (
        <>
          <Panel title="Dwelling">
            <dl className="max-w-md text-base">
              {kv('Address', props[0]?.address ?? '—')}
              {kv('Year built', props[0]?.yearBuilt ?? '—')}
              {kv('Roof year', dw.roofYear)}
              {kv('Construction', dw.construction)}
              {kv('Coverage A', usd(dw.coverageA))}
              {kv('AOP deductible', usd(dw.aopDeductible))}
              {kv('Flood zone', dw.floodZone)}
              {dw.sinkhole && kv('Sinkhole coverage', dw.sinkhole)}
            </dl>
          </Panel>
          {state === 'FL' && dw.hurricanePct != null && (
            <Panel title="Florida wind">
              <dl className="max-w-md text-base">
                {kv('Hurricane deductible', `${dw.hurricanePct}% · ${usd((dw.coverageA * dw.hurricanePct) / 100)} of ${usd(dw.coverageA)}`)}
              </dl>
              {dw.windMit ? (
                <div className="mt-3 border-t border-fill pt-3">
                  {(() => {
                    const validUntil = dw.windMit.inspectedOffset + 5 * 365
                    return (
                      <p className="text-base text-ink">
                        Wind mitigation · OIR-B1-1802 · inspected {dateOf(dw.windMit.inspectedOffset)} · <Due tone={dueTone(validUntil, 90)}>{validUntil < 0 ? 'expired' : 'valid until'} {dateOf(validUntil)}</Due>
                      </p>
                    )
                  })()}
                  <dl className="mt-2 max-w-md text-base">{Object.entries(dw.windMit.features).map(([k, v]) => <Fragment key={k}>{kv(k, v)}</Fragment>)}</dl>
                </div>
              ) : (
                <p className="mt-2 text-base text-label">No wind mitigation inspection on file. An inspection can lower the wind premium.</p>
              )}
            </Panel>
          )}
          {state === 'TX' && dw.windPool && (
            <Panel title="Texas wind">
              <dl className="max-w-md text-base">
                {kv('In windstorm-pool area', dw.windPool.inArea ? 'Yes' : 'No')}
                {dw.windPool.inArea && kv('WPI-8', dw.windPool.wpi8 ?? '—')}
                {dw.windPool.inArea && kv('Wind/hail deductible', dw.windPool.windHailDeductible ?? '—')}
              </dl>
            </Panel>
          )}
        </>
      )}
      {locs.length > 0 && (
        <Panel title="Locations">
          <SimpleTable head={['#', 'Address', 'Occupancy', 'Building limit', 'BPP limit', 'Deductible', '']} rows={locs.map((l) => [l.number, l.address, l.occupancy, usd(l.buildingValue), usd(l.bppLimit), usd(l.deductible), rowMenu(`Location ${l.number}`)])} />
        </Panel>
      )}
      {p.wcClasses && (
        <Panel title={`Payroll · ${p.wcEmployees ?? '—'} employees`}>
          <SimpleTable
            head={['State', 'Class code', 'Description', 'Estimated payroll', 'Rate', '']}
            rows={[...p.wcClasses.map((c) => [c.state, <span key="c" className="font-mono text-sm">{c.code}</span>, c.description, usd(c.payroll), c.rate.toFixed(2), rowMenu(`Class ${c.code}`)]), ['', '', <span key="t" className="font-semibold">Total</span>, <span key="v" className="font-semibold">{usd(p.wcClasses.reduce((s, c) => s + c.payroll, 0))}</span>, '', '']]}
          />
        </Panel>
      )}
      {!vehicles.length && !drivers.length && !dw && !locs.length && !p.wcClasses && !p.auto && <Panel title="Insured items"><p className="text-base text-muted">No insured items synced for this policy.</p></Panel>}
    </div>
  )
}
const belowTxMin = (bi: string, pd: number) => {
  const [a, b] = bi.split('/').map(Number)
  return a < 30 || b < 60 || pd < 25
}

/** US-POL-013: Producer on the commission record, Principal and Admin; absent (not masked) for everyone else. */
function CommissionCard({ policy, term, producerId }: { policy: Policy; term?: Term; producerId: string }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  if (!canSeeCommission(user, producerId)) return null
  if (!term) return null
  if (term.source === 'fortify-won')
    return <Panel title="Commission"><p className="text-base text-muted">Commission appears after the AMS syncs the issued policy.</p></Panel>
  const rate = data.carriers.find((c) => c.id === policy.carrierId)?.commission?.[policy.line] ?? 0.12
  const isRenewal = data.terms.some((t) => t.policyId === policy.id && t.expirationOffset <= term.effectiveOffset)
  const share = isRenewal ? 0.4 : 0.5
  const agency = term.premium * rate
  return (
    <Panel title="Commission">
      <KeyValue
        items={[
          ['Commission rate', `${(rate * 100).toFixed(1)}%`],
          ['Agency commission', usd(agency)],
          ...(user.role === 'producer'
            ? ([['My share', `${share * 100}% · ${isRenewal ? 'renewal' : 'new business'}`], ['My commission', usd(agency * share)]] as [string, string][])
            : ([['Producer', `${userName(producerId)} · ${share * 100}%`], ['Producer commission', usd(agency * share)]] as [string, string][])),
        ]}
      />
      <p className="mt-2 text-sm text-muted">From the carrier commission schedule synced from the AMS.</p>
    </Panel>
  )
}

/** US-POL-014: a past (or any) Term in a drawer; ?tab=terms&term=:id survives reload. */
function TermDrawer({ policy, terms, index, onClose }: { policy: Policy; terms: Term[]; index: number; onClose: () => void }) {
  const { data } = useApp()
  const t = terms[index]
  const current = terms.find((x) => x.status === 'Active' || x.status === 'Bound')
  const [compare, setCompare] = useState(false)
  const items = (data.insuredItems ?? []).filter((x) => x.policyId === policy.id)
  const label = (x: InsuredItem) => (x.kind === 'Vehicle' ? `${x.year} ${x.make} ${x.model}` : x.kind === 'Driver' ? x.name : x.kind === 'Property' ? x.address : `Location ${x.number} · ${x.address}`)
  const cov: [string, string][] = policy.dwelling ? [['Coverage A', usd(policy.dwelling.coverageA)], ['AOP deductible', usd(policy.dwelling.aopDeductible)], ['Roof year', String(policy.dwelling.roofYear)]] : policy.auto ? [['Bodily injury', policy.auto.bi], ['Property damage', usd(policy.auto.pd)]] : policy.wcClasses ? policy.wcClasses.map((c) => [`${c.code} ${c.description}`, `Payroll ${usd(c.payroll)}`] as [string, string]) : [['Line', policy.line]]
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`Term ${index + 1} · ${dateOf(t.effectiveOffset)}–${dateOf(t.expirationOffset)}`} description={`${policy.policyNumber} · ${policy.line}`} footer={<SheetCancel>Close</SheetCancel>}>
      <KeyValue items={[['Status', <StatusCell key="s" status={t.status} />], ['Premium', usd(t.premium)], ['Source', t.source === 'fortify-won' ? 'Won in Fortify' : 'AMS']]} />
      <SubHeading className="mt-5 mb-1">Coverage</SubHeading>
      <KeyValue items={cov} />
      <p className="mt-1 text-sm text-muted">Coverage shown is the policy’s current schedule from the AMS.</p>
      <SubHeading className="mt-5 mb-1">Insured items · {items.length}</SubHeading>
      {items.length ? <ul className="text-base">{items.slice(0, 12).map((x) => <li key={x.id}>{label(x)}</li>)}{items.length > 12 && <li className="text-muted">+{items.length - 12} more</li>}</ul> : <p className="text-base text-muted">No insured items synced.</p>}
      {current && current.id !== t.id && (
        <div className="mt-5">
          {!compare ? <button className="text-base text-link underline" onClick={() => setCompare(true)}>Compare with current term</button> : (
            <table className={cx(mini.table, 'tabular')}>
              <thead className={mini.head}><tr><th className={mini.th}>Item</th><th className={mini.th}>Term {index + 1}</th><th className={mini.th}>Current</th></tr></thead>
              <tbody>
                {([['Effective', dateOf(t.effectiveOffset), dateOf(current.effectiveOffset)], ['Expiration', dateOf(t.expirationOffset), dateOf(current.expirationOffset)], ['Premium', usd(t.premium), <span key="p">{usd(current.premium)} (<RateChange pct={(current.premium - t.premium) / t.premium} />)</span>]] as [string, ReactNode, ReactNode][]).map(([k, a, b]) => <tr key={k} className={mini.tr}><td className={cx(mini.td, 'text-label')}>{k}</td><td className={mini.td}>{a}</td><td className={mini.td}>{b}</td></tr>)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Sheet>
  )
}

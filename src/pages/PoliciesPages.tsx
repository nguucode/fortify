import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FileText, RefreshCw, Search } from 'lucide-react'
import { useApp, useDemoControls } from '@/app/store'
import { dateOf, usd, useLookups } from '@/app/hooks'
import { canSeeAccount, visibleAccounts } from '@/domain/access'
import type { Policy, Term } from '@/domain/types'
import { DataTable, KeyValue, PageTitle, Panel, RecordHeader, ViewTabs, useView, type Column } from '@/components/patterns'
import { Button, Tip } from '@/components/ui/primitives'
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
  if (term?.source === 'fortify-won') return <span className="rounded-full bg-warning-tint px-2 text-xs leading-5 font-medium text-warning-text shadow-ring">Awaiting AMS</span>
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
    { key: 'number', label: 'Policy', render: (r) => <Link to={`/policies/${r.id}`} className="font-mono text-sm font-medium text-strong hover:text-link hover:underline">{r.policyNumber}</Link> },
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
      <div className="mt-4 flex items-center justify-between gap-2">
        <label className="relative w-80 max-sm:w-full">
          <span className="sr-only">Search policies</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search policy number or Account" className="h-9 w-full rounded-md bg-surface pr-3 pl-8 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary" />
        </label>
        <AmsBadge />
      </div>
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {Math.min(list.length, 100)} of {list.length} policies</p>
      <DataTable rows={list.slice(0, 100)} columns={cols} minWidth={1100} onRowClick={(r) => navigate(`/policies/${r.id}`)} empty={<EmptyState icon={FileText} title="No policies in this view" body="Policies appear here once the AMS syncs them." />} />
    </div>
  )
}

export function PolicyPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { account: getAccount, carrierName, userName } = useLookups()
  const [change, setChange] = useState(false)
  const p = data.policies.find((x) => x.id === id)
  if (!p) return <NotFound what="Policy" />
  const account = getAccount(p.accountId)!
  if (!canSeeAccount(user, account)) return <AccessDenied what="Policy" owner={userName(account.producerId)} />
  const terms = data.terms.filter((t) => t.policyId === p.id).sort((a, b) => b.effectiveOffset - a.effectiveOffset)
  const term = currentTerm(data.terms, p.id)
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
          </>
        }
        actions={user.role !== 'admin' && <Button variant="primary" onClick={() => setChange(true)}>Request a change</Button>}
      />
      <div className="grid grid-cols-[1fr_360px] gap-4 px-8 pt-5 max-lg:grid-cols-1 max-sm:px-4">
        <Panel title="Terms">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-10 border-b border-fill text-base font-semibold text-strong">
                <th className="px-2">Effective</th>
                <th className="px-2">Expiration</th>
                <th className="px-2">Status</th>
                <th className="px-2 text-right">Premium</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.id} className="tabular h-10 border-b border-fill last:border-0">
                  <td className="px-2">{dateOf(t.effectiveOffset)}</td>
                  <td className="px-2">{dateOf(t.expirationOffset)}</td>
                  <td className="px-2"><StatusCell status={t.status} /></td>
                  <td className="px-2 text-right">{usd(t.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Details">
          <KeyValue items={[['Carrier', carrierName(p.carrierId)], ['Line', p.line], ['Current premium', usd(term?.premium)], ['Binder', term?.binderNumber ?? null], ['Producer', userName(account.producerId)], ['Account Manager', userName(account.accountManagerId)]]} />
        </Panel>
      </div>
      {change && <NewServiceRequestSheet onClose={() => setChange(false)} accountId={account.id} policyId={p.id} type="Policy change" />}
    </div>
  )
}

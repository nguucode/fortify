import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, FileText, Upload } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, usd, useLookups, useMutate } from '@/app/hooks'
import type { Account, AccountDocument, Activity, DocumentType, InsuredItem, Opportunity, Task, XDate } from '@/domain/types'
import { StatusCell } from '@/components/ui/status'
import { XDateDrawer } from './XDatesPages'
import { useRisk } from './RenewalsPages'
import { renewalWindowDays } from '@/domain/rules'
import { DataTable, Field, inputCls, KeyValue, Panel, Sheet, SheetCancel, type Column } from '@/components/patterns'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { Button, cx, Tip } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { useCompleteTask } from './TaskSheet'

const SYNCED = 'Synced from AMS. Request a policy change to update it.'

/** US-ACC-006: DWC Form-005 is due each year by April 30 for a Texas non-subscriber. */
export function dwcLine(dwcOffset: number | null | undefined, today = new Date()): { text: string; warn: boolean } {
  const year = today.getFullYear()
  const feb1 = new Date(year, 1, 1)
  const filed = dwcOffset != null ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + dwcOffset) : null
  if (filed && filed >= feb1) return { text: `DWC-005 filed ${filed.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, warn: false }
  const pastDue = today > new Date(year, 3, 30)
  return pastDue ? { text: `DWC-005 not on file for ${year}`, warn: true } : { text: `DWC-005 due by 04/30/${year}`, warn: false }
}

/** US-ACC-005 Household / US-ACC-006 Business details, with AMS-synced insured items and Locations. */
export function DetailsPanel({ account, onEdit }: { account: Account; onEdit?: () => void }) {
  const { data } = useApp()
  const d = account.details
  const items = (data.insuredItems ?? []).filter((i) => i.accountId === account.id)
  const policyNo = (id: string) => data.policies.find((p) => p.id === id)?.policyNumber ?? ''
  const edit = onEdit && <Button size="sm" onClick={onEdit}>Edit details</Button>
  if (!d) return null
  const address = `${d.street}, ${account.city}, ${account.state} ${account.zip}`
  if (account.kind === 'Household') {
    const groups: [string, InsuredItem['kind']][] = [['Vehicles', 'Vehicle'], ['Drivers', 'Driver'], ['Properties', 'Property']]
    return (
      <Panel title="Details" actions={edit}>
        <KeyValue items={[['Mailing address', address], ['County', d.county || null], ['Coastal', account.coastal ? 'Yes, coastal ZIP' : null], ['Preferred contact', d.preferredContact], ['Account source', d.source], ['Created', dateOf(account.createdOffset)]]} />
        {items.length > 0 && (
          <div className="mt-4 border-t border-fill pt-3">
            <h3 className="mb-1 text-sm font-semibold text-label">Insured items</h3>
            {groups.map(([label, kind]) => {
              const list = items.filter((i) => i.kind === kind)
              if (!list.length) return null
              return (
                <div key={kind} className="mt-2">
                  <p className="text-xs text-muted">{label}</p>
                  <ul>
                    {list.map((i) => (
                      <li key={i.id}>
                        <Tip label={SYNCED}>
                          <Link to={`/policies/${i.policyId}`} className="flex justify-between gap-3 py-1 text-base hover:text-link">
                            <span className="min-w-0 truncate">
                              {i.kind === 'Vehicle' && `${i.year} ${i.make} ${i.model} · VIN …${i.vin4}`}
                              {i.kind === 'Driver' && `${i.name}, ${i.age}`}
                              {i.kind === 'Property' && `${i.address} · built ${i.yearBuilt}`}
                            </span>
                            <span className="shrink-0 font-mono text-xs text-muted">{policyNo(i.policyId)}</span>
                          </Link>
                        </Tip>
                        {i.kind === 'Property' && i.hurricaneDeductiblePct != null && (
                          <p className="pb-1 text-sm text-label">
                            Hurricane deductible {i.hurricaneDeductiblePct}% · {usd(i.hurricaneDeductible)}
                            {i.windMitOffset != null && (
                              <span className={cx('ml-2', i.windMitOffset < -5 * 365 && 'font-medium text-warning-text')}>Wind mitigation {dateOf(i.windMitOffset)}</span>
                            )}
                          </p>
                        )}
                        {i.kind === 'Property' && i.wpi8 && <p className="pb-1 text-sm text-label">WPI-8 {i.wpi8}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    )
  }
  const locations = items.filter((i): i is Extract<InsuredItem, { kind: 'Location' }> => i.kind === 'Location')
  const dwc = d.wcStatus === 'Non-subscriber (TX)' ? dwcLine(d.dwc005Offset) : null
  return (
    <Panel title="Details" actions={edit}>
      <KeyValue
        items={[
          ['Legal name', d.legalName ?? account.name],
          ['DBA', d.dba ?? null],
          ['Entity type', d.entityType ?? null],
          ['FEIN', d.fein4 ? `Ending ${d.fein4}` : null],
          ['NAICS', d.naics ? `${d.naics} · ${d.naicsDescription ?? ''}` : null],
          ['Years in business', d.yearsInBusiness ?? null],
          ['Employees', d.employees ?? null],
          ['Annual revenue', d.revenue ? usd(d.revenue) : null],
          ['Annual payroll', d.payroll ? usd(d.payroll) : null],
          ['Website', d.website ?? null],
          [
            'Workers’ comp',
            d.wcStatus === 'Non-subscriber (TX)' ? (
              <span key="wc">
                <Tip label="Not covered by workers' compensation by choice. Confirm employer's liability alternatives.">
                  <span tabIndex={0} className="inline-flex items-center gap-1 font-medium text-warning-text">
                    <AlertTriangle aria-hidden className="size-3.5" /> Non-subscriber (TX)
                  </span>
                </Tip>
                <span className={cx('block text-sm', dwc!.warn ? 'font-medium text-warning-text' : 'text-muted')}>{dwc!.text}</span>
              </span>
            ) : (d.wcStatus ?? null),
          ],
          ['Mailing address', address],
          ['Preferred contact', d.preferredContact],
        ]}
      />
      {locations.length > 0 && (
        <div className="mt-4 border-t border-fill pt-3">
          <h3 className="mb-1 flex justify-between text-sm font-semibold text-label">Locations <span className="font-normal text-muted">{locations.length} location{locations.length === 1 ? '' : 's'} · Synced from AMS</span></h3>
          <ul className="divide-y divide-fill">
            {locations.map((l) => (
              <li key={l.id}>
                <Link to={`/policies/${l.policyId}`} className="grid h-10 grid-cols-[32px_1fr_auto_auto] items-center gap-3 text-base hover:text-link">
                  <span className="tabular text-sm text-muted">#{l.number}</span>
                  <span className="truncate">{l.address}</span>
                  <span className="text-sm text-label">{l.occupancy}</span>
                  <span className="tabular text-sm text-label">{usd(l.buildingValue)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

/** US-ACC-008: open Tasks above the timeline, with a "Linked to" filter. */
export function ActivityTab({ account, onTask }: { account: Account; onTask: (t: Task | 'new') => void }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const [linked, setLinked] = useState('')
  const complete = useCompleteTask()
  const tasks = data.tasks.filter((t) => t.accountId === account.id && t.status === 'Open').sort((a, b) => a.dueOffset - b.dueOffset)
  const options = useMemo(() => {
    const seen = new Map<string, string>()
    for (const a of data.activities) {
      if (a.accountId !== account.id || !a.linked) continue
      const k = `${a.linked.kind}:${a.linked.id}`
      if (seen.has(k)) continue
      const p = a.linked.kind === 'policy' ? data.policies.find((x) => x.id === a.linked!.id) : null
      seen.set(k, p ? `Policy ${p.policyNumber}` : a.linked.kind === 'service' ? `Service ${a.linked.id}` : a.linked.kind === 'opportunity' ? `Opportunity ${a.linked.id}` : a.linked.kind === 'renewal' ? `Renewal ${a.linked.id}` : `Lead ${a.linked.id}`)
    }
    return [...seen.entries()]
  }, [data.activities, data.policies, account.id])
  const filter: Activity['linked'] = linked ? { kind: linked.split(':')[0] as NonNullable<Activity['linked']>['kind'], id: linked.split(':')[1] } : null
  const readOnly = user.role === 'admin' || account.lifecycle !== 'active'
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Open tasks" actions={!readOnly && <Button size="sm" onClick={() => onTask('new')}>New task</Button>}>
        {tasks.length ? (
          <ul className="flex flex-col divide-y divide-fill">
            {tasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <input type="checkbox" aria-label={`Complete ${t.title}`} disabled={readOnly} onChange={() => complete(t)} className="size-4 accent-primary" />
                <button onClick={() => onTask(t)} className="min-w-0 flex-1 truncate text-left text-base text-strong hover:text-link hover:underline">{t.title}</button>
                <span className={cx('tabular shrink-0 text-sm', t.dueOffset < 0 ? 'font-medium text-danger-text' : 'text-muted')}>{userName(t.assigneeId)} · {t.dueOffset < 0 ? `Overdue ${-t.dueOffset}d` : dateOf(t.dueOffset)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-muted">No open tasks.</p>
        )}
        {tasks.length > 5 && <Link to={`/tasks?account=${account.id}`} className="mt-2 inline-block text-sm text-link hover:underline">Show all {tasks.length} open tasks</Link>}
      </Panel>
      <Panel
        title="Activity"
        actions={
          <span className="flex items-center gap-2">
            <select value={linked} onChange={(e) => setLinked(e.target.value)} aria-label="Linked to" className="h-8 rounded-md bg-surface px-2 text-sm text-ink shadow-control">
              <option value="">All records</option>
              {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            {!readOnly && <LogActivityButton accountId={account.id} />}
          </span>
        }
      >
        <ActivityTimeline accountId={account.id} linked={filter ?? undefined} limit={50} />
      </Panel>
    </div>
  )
}

const DOC_TYPES: DocumentType[] = ['Application', 'Signed proposal', 'Loss run', 'Photo', 'Correspondence', 'Other']
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`)

/** US-ACC-009: AMS documents are read-only; uploads are mock files that can be renamed or retyped, never deleted. */
export function DocumentsTab({ account }: { account: Account }) {
  const { data, user } = useApp()
  const { userName } = useLookups()
  const mutate = useMutate()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<File[] | null>(null)
  const [type, setType] = useState<DocumentType>('Correspondence')
  const [typeFilter, setTypeFilter] = useState('')
  const [linkFilter, setLinkFilter] = useState('')
  const [open, setOpen] = useState<AccountDocument | null>(null)
  const [renaming, setRenaming] = useState('')
  const docs = (data.documents ?? []).filter((d) => d.accountId === account.id).sort((a, b) => b.addedOffset - a.addedOffset)
  const links = [...new Map(docs.filter((d) => d.linked).map((d) => [d.linked!.id, d.linked!.label])).entries()]
  const shown = docs.filter((d) => (!typeFilter || d.type === typeFilter) && (!linkFilter || d.linked?.id === linkFilter))
  const readOnly = user.role === 'admin' || account.lifecycle !== 'active'
  const cols: Column<AccountDocument>[] = [
    { key: 'name', label: 'Name', render: (d) => <button onClick={() => { setOpen(d); setRenaming(d.name) }} className="inline-flex max-w-full items-center gap-2 truncate font-medium text-strong hover:text-link hover:underline"><FileText aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} /><span className="truncate">{d.name}</span></button>, csv: (d) => d.name },
    { key: 'type', label: 'Type', width: 140, render: (d) => d.type },
    { key: 'linked', label: 'Linked to', width: 200, render: (d) => d.linked?.label ?? <span className="text-muted">—</span>, csv: (d) => d.linked?.label ?? '' },
    { key: 'status', label: 'Source', width: 100, render: (d) => d.source },
    { key: 'by', label: 'Added by', width: 150, render: (d) => (d.addedById ? userName(d.addedById) : 'AMS sync'), csv: (d) => (d.addedById ? userName(d.addedById) : 'AMS sync') },
    { key: 'on', label: 'Added on', width: 110, mobile: true, sort: (a, b) => a.addedOffset - b.addedOffset, render: (d) => dateOf(d.addedOffset) },
    { key: 'size', label: 'Size', width: 90, align: 'right', render: (d) => kb(d.size) },
  ]
  return (
    <Panel title="Documents" actions={!readOnly && <Button size="sm" onClick={() => input.current?.click()}><Upload aria-hidden className="size-4" /> Upload</Button>}>
      <input ref={input} type="file" multiple hidden onChange={(e) => { const fs = [...(e.target.files ?? [])]; if (fs.length) setPending(fs); e.target.value = '' }} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Type" className="h-8 rounded-md bg-surface px-2 text-sm shadow-control">
          <option value="">All types</option>
          {[...new Set(docs.map((d) => d.type))].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)} aria-label="Linked to" className="h-8 rounded-md bg-surface px-2 text-sm shadow-control">
          <option value="">All records</option>
          {links.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select>
        <span className="tabular text-sm text-muted">Showing {shown.length} of {docs.length} documents</span>
      </div>
      <DataTable rows={shown} columns={cols} minWidth={900} empty={<EmptyState icon={FileText} title="No documents" body="Dec pages and ID cards arrive from the AMS; upload applications, loss runs, and photos here." />} />
      {pending && (
        <Sheet
          open
          onOpenChange={(v) => !v && setPending(null)}
          title={`Upload ${pending.length} document${pending.length === 1 ? '' : 's'}`}
          footer={<><SheetCancel /><Button variant="primary" onClick={() => mutate((s) => s.addDocuments(account.id, pending.map((f) => ({ name: f.name, size: f.size })), type, null, user.id), `${pending.length} document${pending.length === 1 ? '' : 's'} added`).then(() => setPending(null))}>Add</Button></>}
        >
          <ul className="mb-4 text-base">{pending.map((f) => <li key={f.name} className="flex justify-between py-1"><span className="truncate">{f.name}</span><span className={cx('text-sm', f.size > 25 * 1024 * 1024 ? 'text-danger-text' : 'text-muted')}>{kb(f.size)}</span></li>)}</ul>
          <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className={inputCls}>{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <p className="mt-2 text-sm text-muted">Files stay in this demo session; nothing is uploaded.</p>
        </Sheet>
      )}
      {open && (
        <Sheet
          open
          onOpenChange={(v) => !v && setOpen(null)}
          title={open.name}
          description={`${open.type} · ${open.source}`}
          footer={
            <>
              <SheetCancel>Close</SheetCancel>
              {open.source === 'Uploaded' && open.addedById === user.id && renaming.trim() && renaming !== open.name && (
                <Button onClick={() => mutate((s) => s.updateDocument(open.id, { name: renaming.trim() }), 'Document renamed').then(() => setOpen(null))}>Rename</Button>
              )}
              <Button variant="primary" onClick={() => { const url = URL.createObjectURL(new Blob([`Sample document: ${open.name}`], { type: 'text/plain' })); Object.assign(document.createElement('a'), { href: url, download: open.name.replace(/\.\w+$/, '') + '.txt' }).click(); URL.revokeObjectURL(url) }}>Download</Button>
            </>
          }
        >
          <div aria-hidden className="mb-4 grid aspect-[8.5/11] place-items-center rounded-md bg-recessed text-sm text-muted shadow-ring">Preview not available in the demo</div>
          <KeyValue items={[['Linked to', open.linked?.label ?? null], ['Added by', open.addedById ? userName(open.addedById) : 'AMS sync'], ['Added on', dateOf(open.addedOffset)], ['Size', kb(open.size)]]} />
          {open.source === 'Uploaded' && open.addedById === user.id && (
            <div className="mt-4"><Field label="Name"><input value={renaming} onChange={(e) => setRenaming(e.target.value)} className={inputCls} /></Field></div>
          )}
        </Sheet>
      )}
    </Panel>
  )
}

/** US-PIP-012: Opportunities (open first, closed collapsed), Quotes across them, and X-dates. */
export function SalesTab({ account, onNewOpp }: { account: Account; onNewOpp: () => void }) {
  const { data, user } = useApp()
  const { userName, carrierName } = useLookups()
  const [showClosed, setShowClosed] = useState(false)
  const [quoteFilter, setQuoteFilter] = useState<'Open' | 'All'>('Open')
  const [xd, setXd] = useState<XDate | 'new' | null>(null)
  const opps = data.opportunities.filter((o) => o.accountId === account.id)
  const isOpen = (o: Opportunity) => o.stage !== 'Won' && o.stage !== 'Lost'
  const open = opps.filter(isOpen)
  const closed = opps.filter((o) => !isOpen(o)).sort((a, b) => (b.closedOffset ?? 0) - (a.closedOffset ?? 0))
  const oppName = (o: Opportunity) => o.name ?? `${account.name} · ${o.lines.join(', ')}`
  const bound = (o: Opportunity) => data.quotes.filter((q) => q.opportunityId === o.id && q.status === 'Accepted').flatMap((q) => q.lines.filter((l) => l.accepted)).reduce((s, l) => s + (l.premium ?? 0), 0)
  const quotes = data.quotes.filter((q) => opps.some((o) => o.id === q.opportunityId)).filter((q) => quoteFilter === 'All' || ['Requested', 'Quoted', 'Referred', 'Presented'].includes(q.status))
  const xdates = data.xDates.filter((x) => x.accountId === account.id).sort((a, b) => a.xDateOffset - b.xDateOffset)
  const th = 'h-9 px-2 text-left text-sm font-semibold text-strong'
  const td = 'h-10 px-2 text-base'
  const canCreate = user.role !== 'admin' && account.lifecycle === 'active'
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Opportunities" actions={canCreate && <Button size="sm" onClick={onNewOpp}>{user.role === 'account-manager' ? '+ Cross-sell opportunity' : '+ Add opportunity'}</Button>}>
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[760px] border-collapse">
            <thead><tr className="border-b border-fill"><th className={th}>Name</th><th className={th}>Type</th><th className={th}>Stage</th><th className={th}>Lines</th><th className={cx(th, 'text-right')}>Premium</th><th className={th}>Target close</th><th className={th}>Producer</th></tr></thead>
            <tbody>
              {open.map((o) => (
                <tr key={o.id} className="border-b border-fill">
                  <td className={cx(td, 'max-w-0 truncate')}><Link to={`/pipeline/${o.id}`} className="font-medium text-strong hover:text-link hover:underline">{oppName(o)}</Link></td>
                  <td className={td}>{o.type}</td>
                  <td className={td}><StatusCell status={o.stage} /></td>
                  <td className={td}>{o.lines.join(', ')}</td>
                  <td className={cx(td, 'text-right')}>{usd(o.estimatedPremium)}</td>
                  <td className={cx(td, o.targetCloseOffset < 0 && 'font-medium text-danger-text')}>{dateOf(o.targetCloseOffset)}</td>
                  <td className={td}>{userName(o.ownerId)}</td>
                </tr>
              ))}
              {open.length === 0 && <tr><td colSpan={7} className="px-2 py-3 text-base text-muted">No open opportunities.</td></tr>}
            </tbody>
          </table>
        </div>
        {closed.length > 0 && (
          <div className="mt-2">
            <button aria-expanded={showClosed} onClick={() => setShowClosed(!showClosed)} className="text-sm font-medium text-link hover:underline">{showClosed ? 'Hide' : 'Show'} closed ({closed.length})</button>
            {showClosed && (
              <ul className="mt-2 divide-y divide-fill">
                {closed.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 py-2 text-base">
                    <Link to={`/pipeline/${o.id}`} className="min-w-0 flex-1 truncate text-strong hover:text-link hover:underline">{oppName(o)}</Link>
                    <StatusCell status={o.stage} reason={o.lostReason ?? undefined} />
                    <span className="tabular w-24 text-right text-sm text-label">{o.closedOffset != null ? dateOf(o.closedOffset) : ''}</span>
                    <span className="tabular w-24 text-right text-sm">{o.stage === 'Won' ? usd(bound(o)) : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>
      <Panel
        title="Quotes"
        actions={
          <div role="group" aria-label="Quote status" className="inline-flex rounded-md bg-recessed p-0.5">
            {(['Open', 'All'] as const).map((v) => <button key={v} aria-pressed={quoteFilter === v} onClick={() => setQuoteFilter(v)} className={cx('h-7 rounded-[5px] px-2.5 text-sm', quoteFilter === v ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label')}>{v}</button>)}
          </div>
        }
      >
        {quotes.length ? (
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[760px] border-collapse">
              <thead><tr className="border-b border-fill"><th className={th}>Carrier</th><th className={th}>Lines</th><th className={th}>Status</th><th className={cx(th, 'text-right')}>Total quoted</th><th className={th}>Valid until</th><th className={th}>Opportunity</th></tr></thead>
              <tbody>
                {quotes.map((q) => {
                  const o = opps.find((x) => x.id === q.opportunityId)!
                  const total = q.lines.reduce((s, l) => s + (l.premium ?? 0), 0)
                  return (
                    <tr key={q.id} className="border-b border-fill last:border-0">
                      <td className={td}>{carrierName(q.carrierId)}</td>
                      <td className={td}>{q.lines.map((l) => l.line).join(', ')}</td>
                      <td className={td}><StatusCell status={q.status} /></td>
                      <td className={cx(td, 'text-right')}>{total ? usd(total) : '—'}</td>
                      <td className={td}>{q.validUntilOffset != null ? dateOf(q.validUntilOffset) : '—'}</td>
                      <td className={cx(td, 'max-w-0 truncate')}><Link to={`/pipeline/${o.id}`} className="text-link hover:underline">{oppName(o)}</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-base text-muted">{quoteFilter === 'Open' ? 'No open quotes.' : 'No quotes yet.'}</p>
        )}
      </Panel>
      <Panel title="X-dates" actions={canCreate && <Button size="sm" onClick={() => setXd('new')}>+ Add X-date</Button>}>
        <p className="-mt-2 mb-2 text-sm text-muted">{account.status === 'Client' ? 'Coverage this Account buys elsewhere' : 'Current coverage to quote ahead of'}</p>
        {(() => {
          const upcoming = xdates.filter((x) => x.xDateOffset >= 0 && x.interestLevel !== 'Closed')
          const past = xdates.filter((x) => x.xDateOffset < 0 || x.interestLevel === 'Closed')
          const row = (x: XDate) => {
            const o = x.opportunityId ? data.opportunities.find((y) => y.id === x.opportunityId) : undefined
            return (
              <li key={x.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 py-2 text-base max-md:grid-cols-[1fr_auto]">
                <button onClick={() => setXd(x)} className="min-w-0 truncate text-left text-strong hover:text-link hover:underline">{x.line} · {x.currentCarrier}</button>
                <span className="tabular text-sm text-label max-md:hidden">{x.premium ? usd(x.premium) : '—'}</span>
                <span className="tabular text-sm">{dateOf(x.xDateOffset)}</span>
                <span className={cx('tabular w-20 text-right text-sm max-md:hidden', x.xDateOffset < 0 ? 'text-muted' : x.xDateOffset <= (account.kind === 'Business' ? 90 : 45) ? 'font-medium text-warning-text' : 'text-label')}>{x.xDateOffset < 0 ? 'passed' : `${x.xDateOffset} days`}</span>
                <span className="text-sm text-label max-md:hidden">{x.interestLevel}</span>
                <span className="text-sm max-md:hidden">{o ? <Link to={`/pipeline/${o.id}`} className="text-link hover:underline">{o.stage}</Link> : <span className="text-muted">—</span>}</span>
              </li>
            )
          }
          return (
            <>
              {upcoming.length ? <ul className="divide-y divide-fill">{upcoming.map(row)}</ul> : <p className="text-base text-muted">No upcoming X-dates.</p>}
              {past.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-link">Past and closed ({past.length})</summary>
                  <ul className="divide-y divide-fill">{past.map(row)}</ul>
                </details>
              )}
            </>
          )
        })()}
      </Panel>
      {xd && <XDateDrawer accountId={account.id} xdate={xd === 'new' ? undefined : xd} onClose={() => setXd(null)} />}
    </div>
  )
}

/** US-REN-010: open Renewals first, past ones grouped, and when the next window opens. */
export function RenewalsTab({ account }: { account: Account }) {
  const { data } = useApp()
  const { userName } = useLookups()
  const risk = useRisk()
  const rens = data.renewals.filter((r) => r.accountId === account.id)
  const termOf = (id: string) => data.terms.find((t) => t.id === id)!
  const open = rens.filter((r) => r.status !== 'Done').sort((a, b) => termOf(a.termId).expirationOffset - termOf(b.termId).expirationOffset)
  const past = rens.filter((r) => r.status === 'Done').sort((a, b) => termOf(b.termId).expirationOffset - termOf(a.termId).expirationOffset)
  const pol = (id: string) => data.policies.find((p) => p.id === id)!
  const pct = (r: (typeof rens)[number]) => { const t = termOf(r.termId); return r.renewalPremium != null ? (r.renewalPremium - t.premium) / t.premium : null }
  const fmtPct = (p: number | null) => (p == null ? <span className="text-muted">Awaiting terms</span> : <span className={cx(p >= 0.1 ? 'text-danger-text' : p <= -0.05 ? 'text-success-text' : '')}>{p > 0 ? '+' : p < 0 ? '−' : ''}{Math.abs(p * 100).toFixed(1)}%</span>)
  // Terms not yet in a Renewal: the soonest one tells when the next window opens.
  const withRenewal = new Set(rens.map((r) => r.termId))
  const upcoming = data.terms
    .filter((t) => (t.status === 'Active' || t.status === 'Bound') && !withRenewal.has(t.id) && data.policies.some((p) => p.id === t.policyId && p.accountId === account.id))
    .map((t) => { const p = pol(t.policyId); const w = renewalWindowDays(account.kind === 'Business' ? 'small-commercial' : p.line === 'Home' && account.state === 'FL' ? 'fl-residential-property' : 'personal'); return { t, p, w, opens: t.expirationOffset - w } })
    .sort((a, b) => a.opens - b.opens)[0]
  const th = 'h-9 px-2 text-left text-sm font-semibold text-strong'
  const td = 'h-10 px-2 text-base'
  return (
    <Panel title="Renewals">
      {open.length ? (
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[760px] border-collapse">
            <thead><tr className="border-b border-fill"><th className={th}>Policy</th><th className={th}>Expiration</th><th className={cx(th, 'text-right')}>Days left</th><th className={th}>Status</th><th className={cx(th, 'text-right')}>Change</th><th className={th}>Risk</th><th className={th}>Account Manager</th></tr></thead>
            <tbody>
              {open.map((r) => {
                const t = termOf(r.termId)
                const reasons = risk(r, t)
                return (
                  <tr key={r.id} className="border-b border-fill last:border-0">
                    <td className={td}><Link to={`/renewals/${r.id}`} className="text-link hover:underline">{pol(r.policyId).line} · <span className="font-mono text-sm">{pol(r.policyId).policyNumber}</span></Link></td>
                    <td className={td}>{dateOf(t.expirationOffset)}</td>
                    <td className={cx(td, 'text-right')}>{t.expirationOffset}</td>
                    <td className={td}><StatusCell status={r.status} /></td>
                    <td className={cx(td, 'text-right')}>{fmtPct(pct(r))}</td>
                    <td className={td}>{reasons.length ? <Tip label={reasons.join(' · ')}><span tabIndex={0}><StatusCell status="High" /></span></Tip> : <StatusCell status="Low" />}</td>
                    <td className={td}>{userName(r.ownerId)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-base text-muted">No renewals open. They appear when a Term enters its window.</p>
      )}
      {past.length > 0 && (
        <section className="mt-4 border-t border-fill pt-3">
          <h3 className="mb-1 text-sm font-semibold text-label">Past renewals</h3>
          <ul className="divide-y divide-fill">
            {past.map((r) => (
              <li key={r.id}>
                <Link to={`/renewals/${r.id}`} className="tabular grid h-10 grid-cols-[1fr_120px_140px_90px] items-center gap-3 text-base hover:text-link">
                  <span className="truncate">{pol(r.policyId).line} · {pol(r.policyId).policyNumber}</span>
                  <span>{dateOf(termOf(r.termId).expirationOffset)}</span>
                  <span>{r.decision ?? '—'}</span>
                  <span className="text-right">{fmtPct(pct(r))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {upcoming && <p className="mt-3 text-sm text-muted">Next renewal opens {dateOf(Math.max(0, upcoming.opens))} for {upcoming.p.line} ({upcoming.w}-day window).</p>}
    </Panel>
  )
}

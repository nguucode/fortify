import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, FileText, Upload } from 'lucide-react'
import { useApp } from '@/app/store'
import { dateOf, usd, useLookups, useMutate } from '@/app/hooks'
import type { Account, AccountDocument, Activity, DocumentType, InsuredItem, Task } from '@/domain/types'
import { DataTable, Field, inputCls, KeyValue, Panel, Sheet, SheetCancel, type Column } from '@/components/patterns'
import { ActivityTimeline, LogActivityButton } from '@/components/ActivityTimeline'
import { Button, cx, Tip } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'

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
  const mutate = useMutate()
  const [linked, setLinked] = useState('')
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
                <input type="checkbox" aria-label={`Complete ${t.title}`} disabled={readOnly} onChange={() => mutate((s) => s.completeTask(t.id, user.id), 'Task completed')} className="size-4 accent-primary" />
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

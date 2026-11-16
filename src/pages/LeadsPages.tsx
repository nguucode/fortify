import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import { Building2, Clock, CheckCircle2, Home, Search, UserPlus } from 'lucide-react'
import { useApp } from '@/app/store'
import { ago, dateOf, inDays, useLookups, useMutate } from '@/app/hooks'
import { canSeeAccount, canWorkLead, scopeOf } from '@/domain/access'
import { findMatches, type Match } from '@/domain/rules'
import type { Lead, User } from '@/domain/types'
import { DataTable, Gate, KeyValue, PageTitle, Panel, RecordHeader, ViewTabs, useView, type Column } from '@/components/patterns'
import { Button, cx } from '@/components/ui/primitives'
import { StatusCell } from '@/components/ui/status'
import { EmptyState } from '@/components/ui/states'
import { AccessDenied, NotFound } from './SystemPages'

export const leadCode = (id: string) => `L-${1000 + Number(id.replace(/\D/g, ''))}`
const VIEWS = ['Open', 'Unassigned', 'Qualified', 'Disqualified']

/** US-LEA-001 scope: Producers see Leads assigned to them; Account Managers their Office; Principal/Admin all. */
function leadsInScope(user: User, leads: Lead[]) {
  const scope = scopeOf(user)
  if (scope === 'Agency') return leads
  if (scope === 'Office') return leads.filter((l) => l.officeId === user.officeId)
  return leads.filter((l) => l.assigneeId === user.id)
}

export function LeadsPage() {
  const { data, user } = useApp()
  const { userName, office } = useLookups()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = useView(VIEWS)
  const q = (params.get('q') ?? '').toLowerCase()
  const scoped = leadsInScope(user, data.leads)
  const inView: Record<string, (l: Lead) => boolean> = {
    Open: (l) => l.status === 'New' || l.status === 'Contacted',
    Unassigned: (l) => !l.assigneeId && (l.status === 'New' || l.status === 'Contacted'),
    Qualified: (l) => l.status === 'Qualified',
    Disqualified: (l) => l.status === 'Disqualified',
  }
  const digitsQ = q.replace(/\D/g, '')
  const matches = (l: Lead) => !q || l.name.toLowerCase().includes(q) || (l.businessName ?? '').toLowerCase().includes(q) || l.email.includes(q) || (digitsQ.length > 2 && l.phone.replace(/\D/g, '').includes(digitsQ))
  const rows = scoped.filter((l) => inView[view](l) && matches(l)).sort((a, b) => b.createdOffset - a.createdOffset)
  const counts = Object.fromEntries(VIEWS.map((v) => [v, scoped.filter((l) => inView[v](l) && matches(l)).length]))
  const unassigned = scoped.filter(inView.Unassigned)

  const cols: Column<Lead>[] = [
    { key: 'name', label: 'Name', sort: (a, b) => a.name.localeCompare(b.name), render: (l) => (
      <span className="flex min-w-0 items-center gap-2">
        {l.kind === 'Household' ? <Home aria-label="Personal" className="size-4 shrink-0 text-muted" strokeWidth={1.75} /> : <Building2 aria-label="Commercial" className="size-4 shrink-0 text-muted" strokeWidth={1.75} />}
        <Link to={`/leads/${l.id}`} className="shrink-0 font-medium text-strong hover:text-link hover:underline">{l.name}</Link>
        {l.businessName && <span className="min-w-0 truncate text-sm text-muted max-sm:hidden">{l.businessName}</span>}
      </span>
    ) },
    { key: 'status', label: 'Status', width: 120, render: (l) => <StatusCell status={l.status} reason={l.disqualifyReason ?? undefined} /> },
    { key: 'source', label: 'Source', width: 120, render: (l) => l.source },
    { key: 'lines', label: 'Lines of interest', width: 140, render: (l) => l.linesOfInterest.join(', ') },
    { key: 'assignee', label: 'Assigned to', width: 150, render: (l) => (l.assigneeId ? userName(l.assigneeId) : <span className="text-muted">Unassigned</span>) },
    { key: 'office', label: 'Office', width: 110, render: (l) => office(l.officeId)?.name },
    { key: 'received', label: 'Received', width: 120, sort: (a, b) => a.createdOffset - b.createdOffset, render: (l) => {
      const stale = l.status === 'New' && l.attempts.length === 0 && l.createdOffset < 0
      return (
        <span className={cx('inline-flex items-center gap-1', stale && 'font-medium text-warning-text')} title={stale ? `No contact attempt in ${-l.createdOffset} day(s)` : undefined}>
          {stale && <Clock aria-hidden className="size-3.5" />}
          {ago(l.createdOffset)}
        </span>
      )
    } },
    { key: 'attempts', label: 'Attempts', width: 96, align: 'right', render: (l) => l.attempts.length || <span className="text-muted">—</span> },
  ]

  return (
    <div className="px-8 pt-6 pb-10 max-sm:px-4">
      <PageTitle title="Leads" description="Inbound inquiries waiting to be contacted and qualified." />
      {user.role !== 'producer' && unassigned.length > 0 && (
        <div className="mt-4 rounded-md bg-surface px-4 py-3 shadow-ring">
          <p className="text-base font-medium text-strong">{unassigned.length} new leads are unassigned</p>
          <ul className="mt-1 text-sm text-label">
            {unassigned.slice(0, 3).map((l) => (
              <li key={l.id}>
                <Link className="text-link hover:underline" to={`/leads/${l.id}`}>{l.name}</Link> · {l.source} · {ago(l.createdOffset)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ViewTabs views={VIEWS} counts={counts} />
      <div className="mt-4 flex items-center gap-2">
        <label className="relative w-80 max-sm:w-full">
          <span className="sr-only">Search leads</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            defaultValue={params.get('q') ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('q', e.target.value)
              else next.delete('q')
              setParams(next, { replace: true })
            }}
            placeholder="Search name, business, phone, or email"
            className="h-9 w-full rounded-md bg-surface pr-3 pl-8 text-base shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>
      </div>
      <p className="tabular mt-3 mb-2 text-sm text-muted">Showing {rows.length} {view.toLowerCase()} leads</p>
      <DataTable
        rows={rows}
        columns={cols}
        minWidth={1100}
        onRowClick={(l) => navigate(`/leads/${l.id}`)}
        empty={<EmptyState icon={UserPlus} title={q ? 'No leads match this search' : `No ${view.toLowerCase()} leads`} body={view === 'Open' ? 'New web, phone, and referral inquiries land here.' : 'Leads move here as they are worked.'} />}
      />
    </div>
  )
}

export function LeadPage() {
  const { id = '' } = useParams()
  const { data, user } = useApp()
  const { userName, office, account } = useLookups()
  const [qualifyOpen, setQualifyOpen] = useState(false)
  const lead = data.leads.find((l) => l.id === id)
  if (!lead) return <NotFound what="lead" />
  if (!leadsInScope(user, [lead]).length) return <AccessDenied what="lead" owner={userName(lead.assigneeId)} />
  const canWork = canWorkLead(user, lead)
  const open = lead.status === 'New' || lead.status === 'Contacted'
  const denied = user.role === 'admin' ? 'Admins can’t qualify; it creates an Opportunity.' : 'Only the assigned Producer or a Principal can work this lead'

  return (
    <div className="pb-10">
      <RecordHeader
        back={{ to: '/leads', label: 'Leads' }}
        icon={lead.kind === 'Household' ? Home : Building2}
        title={lead.name}
        status={<StatusCell status={lead.status} />}
        meta={
          <>
            <span className="font-mono text-sm">{leadCode(lead.id)}</span>
            <span>{lead.source}</span>
            <span>Received {dateOf(lead.createdOffset)} ({ago(lead.createdOffset)})</span>
            <span>Assigned to {userName(lead.assigneeId)}</span>
          </>
        }
        actions={
          open && (
            <Gate allowed={canWork} reason={denied}>
              <Button variant="primary" onClick={() => setQualifyOpen(true)}>Qualify</Button>
            </Gate>
          )
        }
      />
      <div className="flex flex-col gap-4 px-8 pt-5 max-sm:px-4">
        {lead.status === 'Qualified' && lead.qualifiedAccountId && (
          <div className="flex items-center gap-2 rounded-md bg-success-tint px-4 py-3 text-base text-ink shadow-ring">
            <CheckCircle2 aria-hidden className="size-4 text-success" />
            Qualified into <Link className="font-medium text-link hover:underline" to={`/accounts/${lead.qualifiedAccountId}`}>{account(lead.qualifiedAccountId)?.name ?? 'the Account'}</Link>
            {lead.qualifiedOpportunityId && (
              <>
                {' '}· <Link className="font-medium text-link hover:underline" to={`/pipeline/${lead.qualifiedOpportunityId}`}>open the Opportunity</Link>
              </>
            )}
          </div>
        )}
        {lead.status === 'Disqualified' && <div className="rounded-md bg-recessed px-4 py-3 text-base text-ink">Disqualified: {lead.disqualifyReason}</div>}
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <Panel title="Contact">
            <KeyValue items={[['Phone', lead.phone], ['Email', lead.email], ['Location', `${lead.city}, ${lead.state}`], ['Office', office(lead.officeId)?.name]]} />
          </Panel>
          <Panel title="Interest">
            <KeyValue items={[['Type', lead.kind === 'Household' ? 'Personal' : 'Commercial'], ['Business', lead.businessName], ['Lines', lead.linesOfInterest.join(', ')], ['Current carrier', lead.currentCarrier], ['X-date', lead.xDateOffset != null ? `${dateOf(lead.xDateOffset)} (${inDays(lead.xDateOffset)})` : null]]} />
          </Panel>
          <Panel title="Contact attempts">
            {lead.attempts.length ? (
              <ol className="flex flex-col gap-2 text-base">
                {[...lead.attempts].sort((a, b) => b.offset - a.offset).map((a, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{a.channel}: {a.outcome}</span>
                    <span className="text-sm text-muted">{ago(a.offset)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-base text-muted">No attempts logged yet.</p>
            )}
          </Panel>
        </div>
      </div>
      {qualifyOpen && <QualifyDialog lead={lead} onClose={() => setQualifyOpen(false)} />}
    </div>
  )
}

/** US-LEA-006 + US-LEA-007: two steps, duplicate check then confirm. One transaction; failure creates nothing. */
function QualifyDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { data, user } = useApp()
  const { userName, office } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const matches = useMemo(() => findMatches(lead, { accounts: data.accounts.filter((a) => a.lifecycle === 'active'), contacts: data.contacts }), [lead, data.accounts, data.contacts])
  const [target, setTarget] = useState<string | null>(matches.find((m) => m.strength === 'Strong')?.accountId ?? null)
  const [confirmNew, setConfirmNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasStrong = matches.some((m) => m.strength === 'Strong')
  const targetAccount = target ? data.accounts.find((a) => a.id === target) : null
  const newName = lead.kind === 'Business' && lead.businessName ? lead.businessName : `${lead.name.split(' ').pop()} Household`
  const outcome = targetAccount
    ? targetAccount.status === 'Client'
      ? `Adds a Cross-sell Opportunity to ${targetAccount.name}`
      : `Adds a New business Opportunity to ${targetAccount.name}`
    : `Creates the Prospect Account ${newName} with a New business Opportunity`
  const canContinue = target !== null || !hasStrong || confirmNew

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const { opportunityId } = await mutate((s) => s.qualifyLead({ leadId: lead.id, targetAccountId: target, actorId: user.id }), 'Lead qualified. Opportunity created.')
      onClose()
      navigate(`/pipeline/${opportunityId}`)
    } catch {
      setError('Couldn’t qualify the lead. Nothing was created.')
    } finally {
      setBusy(false)
    }
  }

  const row = (m: Match) => {
    const a = data.accounts.find((x) => x.id === m.accountId)!
    const inScope = canSeeAccount(user, a)
    return (
      <label key={m.accountId} className={cx('flex items-start gap-3 rounded-md px-3 py-2.5 shadow-ring', target === a.id && 'bg-selection', !inScope && 'opacity-70')}>
        <input type="radio" name="match" disabled={!inScope} checked={target === a.id} onChange={() => setTarget(a.id)} className="mt-1 accent-primary" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium text-strong">{a.name}</span>
            <span className={cx('text-sm font-medium', m.strength === 'Strong' ? 'text-warning-text' : 'text-label')}>{m.strength}</span>
          </span>
          <span className="block text-sm text-label">
            {a.kind} · {a.status} · {office(a.officeId)?.name} · {userName(a.producerId)} · matched on {m.reasons.join(', ')}
          </span>
          {!inScope && <span className="block text-sm text-muted">Outside your scope. Ask {userName(a.producerId)} to take this lead.</span>}
        </span>
      </label>
    )
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content className="fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col rounded-lg bg-surface shadow-pop">
          <header className="border-b border-fill px-5 py-4">
            <p className="text-sm text-muted">Step {step} of 2</p>
            <Dialog.Title className="text-lg font-medium text-strong">{step === 1 ? 'Check for duplicates' : 'Confirm and qualify'}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted">
              {step === 1 ? `Checked ${data.accounts.length.toLocaleString('en-US')} accounts and ${data.contacts.length.toLocaleString('en-US')} contacts for ${lead.name}.` : outcome}
            </Dialog.Description>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {step === 1 ? (
              <div className="flex flex-col gap-2">
                {matches.length ? matches.map(row) : <p className="text-base text-ink">No matching Accounts or Contacts.</p>}
                <label className={cx('flex items-start gap-3 rounded-md px-3 py-2.5 shadow-ring', target === null && 'bg-selection')}>
                  <input type="radio" name="match" checked={target === null} onChange={() => setTarget(null)} className="mt-1 accent-primary" />
                  <span>
                    <span className="font-medium text-strong">Create a new Prospect Account</span>
                    <span className="block text-sm text-label">{newName}</span>
                  </span>
                </label>
                {target === null && hasStrong && (
                  <label className="mt-1 flex items-center gap-2 text-base text-ink">
                    <input type="checkbox" checked={confirmNew} onChange={(e) => setConfirmNew(e.target.checked)} className="size-4 accent-primary" />
                    I’ve checked: this is a different Account
                  </label>
                )}
                <p className="mt-2 text-base text-label">{outcome}</p>
              </div>
            ) : (
              <KeyValue
                items={[
                  ['Account', targetAccount ? `${targetAccount.name} (${targetAccount.status})` : `${newName} (new Prospect)`],
                  ['Opportunity', `${targetAccount?.status === 'Client' ? 'Cross-sell' : 'New business'} · ${lead.linesOfInterest.join(', ')}`],
                  ['Starting stage', lead.status === 'Contacted' ? 'Contacted' : 'New'],
                  ['Owner', userName(lead.assigneeId ?? user.id)],
                  ['Copied to the Account', `${lead.attempts.length} contact attempt${lead.attempts.length === 1 ? '' : 's'} as Activities`],
                ]}
              />
            )}
            {error && <p role="alert" className="mt-3 text-sm text-danger-text">{error}</p>}
          </div>
          <footer className="flex justify-between gap-2 border-t border-fill px-5 py-3">
            {step === 2 ? <Button disabled={busy} onClick={() => setStep(1)}>Back</Button> : <span />}
            <span className="flex gap-2">
              <Button disabled={busy} onClick={onClose}>Cancel</Button>
              {step === 1 ? (
                <Button variant="primary" disabled={!canContinue} onClick={() => setStep(2)}>Continue</Button>
              ) : (
                <Button variant="primary" disabled={busy} onClick={submit}>{busy ? 'Qualifying…' : 'Qualify lead'}</Button>
              )}
            </span>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

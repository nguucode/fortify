import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Plus, X } from 'lucide-react'
import { useApp } from '@/app/store'
import { offsetOfDate, useLookups, useMutate } from '@/app/hooks'
import { resolveOffset } from '@/mock/dates'
import { visibleAccounts } from '@/domain/access'
import type { Line, Opportunity, OpportunityType } from '@/domain/types'
import { Field, inputCls, mini, Sheet, SheetCancel } from '@/components/patterns'
import { Button, Callout, controlCls, cx, SubHeading, Tip } from '@/components/ui/primitives'

const PL: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat']
const CL: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto']
const SOURCES = ['Referral', 'Cross-sell review', 'X-date', 'Web form', 'Phone', 'Walk-in', 'Trusted Choice']
// Default probability per stage until Settings > Pipeline stages (SET) lands.
const NEW_PROBABILITY = 10
const iso = (offset: number) => {
  const d = resolveOffset(offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fromIso = (v: string) => offsetOfDate(new Date(`${v}T12:00:00`))

/** US-PIP-003: one sheet for create and edit, opened from /pipeline, the Account Sales tab, and the Opportunity record. */
export function OpportunitySheet({ onClose, accountId: lockedAccount, opportunity }: { onClose: () => void; accountId?: string; opportunity?: Opportunity }) {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const mutate = useMutate()
  const navigate = useNavigate()
  const isAM = user.role === 'account-manager'
  const editing = !!opportunity
  const [accountId, setAccountId] = useState(opportunity?.accountId ?? lockedAccount ?? '')
  const [query, setQuery] = useState('')
  const acc = accountId ? account(accountId) : undefined
  const defaultType: OpportunityType = isAM || (acc && acc.status !== 'Prospect') ? 'Cross-sell' : 'New business'
  const [type, setType] = useState<OpportunityType | null>(opportunity?.type ?? null)
  const effType = type ?? defaultType
  const [lines, setLines] = useState<Line[]>(opportunity?.lines ?? [])
  const [details, setDetails] = useState<NonNullable<Opportunity['lineDetails']>>(opportunity?.lineDetails ?? {})
  const [close, setClose] = useState(iso(opportunity?.targetCloseOffset ?? 30))
  const [premium, setPremium] = useState(opportunity?.estimatedPremium ? String(opportunity.estimatedPremium) : '')
  const [probability, setProbability] = useState(String(opportunity?.probability ?? NEW_PROBABILITY))
  const [ownerId, setOwnerId] = useState(opportunity?.ownerId ?? '')
  const [source, setSource] = useState(opportunity?.source ?? 'Referral')
  const [name, setName] = useState(opportunity?.name ?? '')
  const [notes, setNotes] = useState(opportunity?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [failed, setFailed] = useState(false)

  const producerId = ownerId || (isAM || !acc ? (acc?.producerId ?? '') : user.role === 'producer' ? user.id : acc.producerId)
  const options = acc?.kind === 'Business' ? CL : PL
  const matches = useMemo(() => {
    const t = query.trim().toLowerCase()
    return t.length < 2 ? [] : visibleAccounts(user, data.accounts).filter((a) => a.lifecycle === 'active' && a.name.toLowerCase().includes(t)).slice(0, 8)
  }, [query, user, data.accounts])
  const duplicate = data.opportunities.find((o) => o.id !== opportunity?.id && o.accountId === accountId && o.stage !== 'Won' && o.stage !== 'Lost' && o.lines.some((l) => lines.includes(l)))
  const premiumN = premium === '' ? 0 : Number(premium.replace(/[$,]/g, ''))
  const probN = Number(probability)
  const errors = {
    account: !accountId ? 'Choose an Account.' : '',
    lines: lines.length === 0 ? 'Add at least one line' : '',
    close: !close ? 'Target close date is required' : '',
    premium: Number.isNaN(premiumN) || premiumN < 0 || premiumN > 9_999_999 ? 'Enter $0 to $9,999,999.' : '',
    probability: !Number.isInteger(probN) || probN < 0 || probN > 100 ? 'Enter 0 to 100.' : '',
  }
  const valid = Object.values(errors).every((e) => !e)
  const producers = data.users.filter((u) => u.role === 'producer' && (!acc || u.officeId === acc.officeId))
  const canChangeProducer = user.role === 'principal'
  const typeLocked = isAM || opportunity?.type === 'Remarket'

  const save = async () => {
    setTouched(true)
    if (!valid || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const id = await mutate(
        (s) =>
          s.saveOpportunity(
            opportunity?.id ?? null,
            { accountId, type: effType, lines, targetCloseOffset: fromIso(close), estimatedPremium: premiumN, ownerId: producerId, source, probability: probN, name: name.trim() || null, notes: notes.trim() || null, lineDetails: details },
            user.id,
          ),
        editing ? 'Opportunity saved' : 'Opportunity created',
      )
      onClose()
      if (!editing) navigate(`/pipeline/${id}`)
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }
  const err = (k: keyof typeof errors) => (touched ? errors[k] : '') || undefined
  const setDetail = (l: Line, patch: Record<string, unknown>) => setDetails({ ...details, [l]: { ...details[l], ...patch } })

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={editing ? 'Edit opportunity' : isAM ? 'New cross-sell opportunity' : 'New opportunity'}
      description={isAM && !editing ? "It goes to the Account's Producer; you can read it afterwards." : undefined}
      busy={busy}
      footer={
        <>
          <SheetCancel disabled={busy} />
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create opportunity'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {failed && <Callout tone="danger">Couldn't save the Opportunity. Try again.</Callout>}
        <section className="flex flex-col gap-3">
          <SubHeading>Account</SubHeading>
          {lockedAccount || editing ? (
            <Tip label={acc?.name}>
              <p className="truncate rounded-md bg-recessed px-2.5 py-2 text-base text-ink">{acc?.name}</p>
            </Tip>
          ) : acc ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-recessed px-2.5 py-2">
              <span className="truncate text-base text-ink">{acc.name} <span className="text-muted">· {acc.status}</span></span>
              <button onClick={() => { setAccountId(''); setLines([]) }} className="text-sm text-link hover:underline">Change</button>
            </div>
          ) : (
            <Field label="Account" error={err('account')}>
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Accounts" className={inputCls} />
              {query.trim().length >= 2 && (
                <ul className="mt-1 overflow-hidden rounded-md shadow-ring">
                  {matches.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => { setAccountId(a.id); setQuery('') }} className="flex w-full justify-between px-2.5 py-2 text-left text-base hover:bg-recessed">
                        <span className="truncate">{a.name}</span>
                        <span className="text-sm text-muted">{a.status}</span>
                      </button>
                    </li>
                  ))}
                  {matches.length === 0 && (
                    <li className="px-2.5 py-2 text-base text-muted">
                      No Accounts match “{query.trim()}”. <Link to="/accounts" className="text-link hover:underline">Add an Account</Link>
                    </li>
                  )}
                </ul>
              )}
            </Field>
          )}
          <Field label="Type" hint={typeLocked ? (isAM ? 'Account Managers create Cross-sell Opportunities.' : 'Remarket Opportunities come from a Renewal.') : undefined}>
            <select value={effType} disabled={typeLocked} onChange={(e) => setType(e.target.value as OpportunityType)} className={inputCls}>
              {(opportunity?.type === 'Remarket' ? ['Remarket'] : ['New business', 'Cross-sell']).map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Name" hint={`Leave blank for “${acc?.name ?? 'Account'} · ${lines.join(', ') || 'lines'}”.`}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={120} />
          </Field>
        </section>

        <section className="flex flex-col gap-2">
          <SubHeading>Lines</SubHeading>
          {lines.length > 0 && (
            <table className={mini.table}>
              <thead>
                <tr className={mini.head}>
                  <th className={mini.th}>Line</th>
                  <th className={mini.th}>Current carrier</th>
                  <th className={cx(mini.th, 'w-28')}>Premium</th>
                  <th className={cx(mini.th, 'w-40')}>X-date</th>
                  <th className={cx(mini.th, 'w-14')} />
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l} className={mini.tr}>
                    <td className={cx(mini.td, 'font-medium text-strong')}>{l}</td>
                    <td className={mini.td}><input aria-label={`${l} current carrier`} value={details[l]?.currentCarrier ?? ''} onChange={(e) => setDetail(l, { currentCarrier: e.target.value || undefined })} className={cx(controlCls('sm'), 'w-full')} /></td>
                    <td className={mini.td}><input aria-label={`${l} current premium`} inputMode="numeric" value={details[l]?.currentPremium ?? ''} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); setDetail(l, { currentPremium: e.target.value ? Math.min(n, 9_999_999) : undefined }) }} className={cx(controlCls('sm'), 'tabular w-full')} /></td>
                    <td className={mini.td}><input aria-label={`${l} X-date`} type="date" value={details[l]?.xDateOffset != null ? iso(details[l]!.xDateOffset!) : ''} onChange={(e) => setDetail(l, { xDateOffset: e.target.value ? fromIso(e.target.value) : undefined })} className={cx(controlCls('sm'), 'w-full')} /></td>
                    <td className={mini.td}>
                      <button aria-label={`Remove ${l}`} onClick={() => setLines(lines.filter((x) => x !== l))} className="grid size-8 place-items-center rounded-md text-muted hover:bg-recessed hover:text-strong"><X className="size-4" strokeWidth={1.75} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {acc ? (
            options.every((l) => lines.includes(l)) ? (
              <p className="text-sm text-muted">All lines added</p>
            ) : (
              <label className="flex items-center gap-2 text-sm text-link">
                <Plus aria-hidden className="size-3.5" />
                <select aria-label="Add line" value="" onChange={(e) => e.target.value && setLines([...lines, e.target.value as Line])} className="h-8 cursor-pointer rounded-md bg-transparent text-sm font-medium text-link outline-none focus-visible:outline-2 focus-visible:outline-primary">
                  <option value="">Add line</option>
                  {options.filter((l) => !lines.includes(l)).map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            )
          ) : (
            <p className="text-sm text-muted">Choose an Account first.</p>
          )}
          {err('lines') && <p className="text-sm text-danger-text">{err('lines')}</p>}
          {duplicate && (
            <Callout tone="warning" action={<Link to={`/pipeline/${duplicate.id}`} onClick={onClose} className="inline-flex h-8 items-center text-base text-link hover:underline">Open it instead?</Link>}>
              {duplicate.name ?? `${acc?.name} · ${duplicate.lines.join(', ')}`} is already open for {duplicate.lines.filter((l) => lines.includes(l)).join(', ')}.
            </Callout>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <SubHeading className="col-span-2">Dates and owner</SubHeading>
          <Field label="Target close date" error={err('close')}>
            <input type="date" value={close} onChange={(e) => setClose(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Estimated premium" error={err('premium')}>
            <input inputMode="numeric" value={premium} onChange={(e) => setPremium(e.target.value)} placeholder="$0" className={cx(inputCls, 'tabular')} />
          </Field>
          <Field label="Probability %" error={err('probability')}>
            <input inputMode="numeric" value={probability} onChange={(e) => setProbability(e.target.value.replace(/\D/g, ''))} className={cx(inputCls, 'tabular')} />
          </Field>
          <Field label="Source">
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
              {[...new Set([source, ...SOURCES])].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Producer" hint={canChangeProducer ? undefined : 'Only a Principal can change the Producer.'}>
              <select value={producerId} disabled={!canChangeProducer} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                {!producers.some((p) => p.id === producerId) && producerId && <option value={producerId}>{userName(producerId)}</option>}
                {producers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          </div>
        </section>

        <section>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={cx(inputCls, 'h-24 py-2')} maxLength={2000} />
          </Field>
        </section>
      </div>
    </Sheet>
  )
}

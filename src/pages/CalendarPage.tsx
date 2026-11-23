import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { visibleAccounts } from '@/domain/access'
import { usd } from '@/app/hooks'
import { useApp } from '@/app/store'
import { useLookups } from '@/app/hooks'
import type { Task } from '@/domain/types'
import { Button, cx, Segmented, Select } from '@/components/ui/primitives'
import { PageTitle } from '@/components/patterns'
import { fmtTime, TaskSheet, useCompleteTask } from './TaskSheet'

const START = 7 * 60 // 7:00 AM
const END = 19 * 60 // 7:00 PM
const SLOT = 30
const ROW = 24 // px per 30 minutes
const SLOTS = (END - START) / SLOT
const DAY = 86_400_000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const offsetOf = (d: Date) => Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / DAY)
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** US-WRK-007 week/day (+ simple month) and US-WRK-008 schedule by clicking or dragging empty slots. */
export function CalendarPage() {
  const { data, user } = useApp()
  const { account, userName } = useLookups()
  const complete = useCompleteTask()
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') ?? 'week') as 'day' | 'week' | 'month'
  // US-WRK-009: key-date overlays, remembered per user in this browser.
  const overlayKey = `fortify.calendar.overlays.${user.id}`
  const [overlays, setOverlays] = useState<{ ren: boolean; xd: boolean }>(() => { try { return { ren: false, xd: false, ...JSON.parse(localStorage.getItem(overlayKey) ?? '{}') } } catch { return { ren: false, xd: false } } })
  useEffect(() => { try { setOverlays({ ren: false, xd: false, ...JSON.parse(localStorage.getItem(overlayKey) ?? '{}') }) } catch { /* storage blocked */ } }, [overlayKey])
  const toggleOverlay = (k: 'ren' | 'xd') => { const n = { ...overlays, [k]: !overlays[k] }; setOverlays(n); try { localStorage.setItem(overlayKey, JSON.stringify(n)) } catch { /* storage blocked */ } }
  const anchor = params.get('date') ? new Date(`${params.get('date')}T12:00:00`) : new Date()
  const forOptions = user.role === 'producer' ? [user] : user.role === 'account-manager' ? data.users.filter((u) => u.officeId === user.officeId && u.role !== 'admin') : data.users.filter((u) => u.role !== 'admin')
  const who = user.role === 'producer' ? user.id : (params.get('for') ?? user.id)
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }
  const days =
    view === 'day'
      ? [startOfDay(anchor)]
      : view === 'week'
        ? Array.from({ length: 7 }, (_, i) => new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay() + i))
        : (() => {
            const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
            return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay() + i))
          })()
  const scoped = new Map(visibleAccounts(user, data.accounts).filter((a) => user.role !== 'producer' || a.producerId === user.id).map((a) => [a.id, a]))
  const keyDates = new Map<number, { key: string; text: string; to: string }[]>()
  const addKey = (off: number, x: { key: string; text: string; to: string }) => keyDates.set(off, [...(keyDates.get(off) ?? []), x])
  if (view === 'month' && overlays.ren)
    for (const r of data.renewals) {
      const a = scoped.get(r.accountId)
      const t = data.terms.find((x) => x.id === r.termId)
      if (a && t && r.status !== 'Done') addKey(t.expirationOffset, { key: r.id, text: `Renewal: ${a.name} · ${data.policies.find((p) => p.id === r.policyId)?.line ?? ''}`, to: `/renewals/${r.id}` })
    }
  if (view === 'month' && overlays.xd)
    for (const x of data.xDates) if (scoped.has(x.accountId) && x.interestLevel !== 'Closed') addKey(x.xDateOffset, { key: x.id, text: `X-date: ${x.line} · ${x.currentCarrier}${x.premium ? ` · ${usd(x.premium)}` : ''}`, to: `/x-dates?xdate=${x.id}` })
  const step = (dir: 1 | -1) => {
    const d = new Date(anchor)
    if (view === 'day') d.setDate(d.getDate() + dir)
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir)
    set({ date: isoDate(d) })
  }
  const tasks = data.tasks.filter((t) => t.assigneeId === who && t.status !== 'Canceled')
  const onDay = (d: Date) => tasks.filter((t) => t.dueOffset === offsetOf(d))
  const [sheet, setSheet] = useState<{ task?: Task; prefill?: { dueOffset: number; dueTime: string; durationMin: number } } | null>(null)
  const [drag, setDrag] = useState<{ day: number; from: number; to: number } | null>(null)
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const grid = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const end = () => {
      if (!drag) return
      const lo = Math.min(drag.from, drag.to)
      const hi = Math.max(drag.from, drag.to)
      setSheet({ prefill: { dueOffset: offsetOf(days[drag.day]), dueTime: hhmm(START + lo * SLOT), durationMin: (hi - lo + 1) * SLOT } })
      setDrag(null)
    }
    window.addEventListener('pointerup', end)
    return () => window.removeEventListener('pointerup', end)
  })
  const title =
    view === 'month'
      ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : view === 'day'
        ? anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const block = (t: Task) => {
    const start = mins(t.dueTime!)
    const len = t.type === 'Meeting' ? (t.durationMin ?? 30) : 30
    const top = ((Math.max(start, START) - START) / SLOT) * ROW
    const height = Math.max(ROW, (Math.min(len, END - start) / SLOT) * ROW - 2)
    const done = t.status === 'Done'
    return (
      <Popover.Root key={t.id}>
        <Popover.Trigger
          onPointerDown={(e) => e.stopPropagation()}
          className={cx('absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs shadow-ring transition-colors duration-150', done ? 'bg-recessed text-label' : 'bg-surface text-ink hover:bg-recessed')}
          style={{ top, height }}
        >
          <span className="flex items-center gap-1 font-medium">
            {done && <Check aria-label="Done" className="size-3 shrink-0" />}
            {t.type === 'Meeting' && !done && <span aria-hidden className="size-2 shrink-0 rounded-full bg-strong" />}
            <span className="truncate">{t.title}</span>
          </span>
          <span className="block truncate text-label">{fmtTime(t.dueTime!)}</span>
        </Popover.Trigger>
        <TaskPopover t={t} onEdit={() => setSheet({ task: t })} onComplete={() => complete(t)} />
      </Popover.Root>
    )
  }
  function TaskPopover({ t, onEdit, onComplete }: { t: Task; onEdit: () => void; onComplete: () => void }) {
    const contacts = data.contacts.filter((c) => t.contactIds?.includes(c.id))
    return (
      <Popover.Portal>
        <Popover.Content side="right" align="start" sideOffset={6} className="z-50 w-72 rounded-md bg-surface p-3 text-sm shadow-pop">
          <p className="text-base font-medium text-strong">{t.title}</p>
          <p className="mt-0.5 text-label">{account(t.accountId)?.name}</p>
          <p className="text-label">{t.dueTime ? `${fmtTime(t.dueTime)}${t.type === 'Meeting' ? ` · ${t.durationMin ?? 30} min` : ''}` : 'All day'}{t.location ? ` · ${t.location}` : ''}</p>
          {t.linked && <p className="text-label">Linked to {t.linked.kind} {t.linked.id}</p>}
          {contacts.length > 0 && <p className="text-label">With {contacts.map((c) => c.name).join(', ')}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {t.status === 'Open' && user.role !== 'admin' && <Button size="sm" onClick={onComplete}>Complete</Button>}
            <Button size="sm" onClick={onEdit}>Edit</Button>
            <Link to={`/accounts/${t.accountId}`} className="inline-flex h-8 items-center px-1 text-sm text-link hover:underline">Open account</Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    )
  }
  const chip = (t: Task) => (
    <Popover.Root key={t.id}>
      <Popover.Trigger className={cx('flex min-h-6 w-full min-w-0 items-center gap-1 rounded-sm px-1.5 text-left text-xs shadow-ring', t.status === 'Done' ? 'bg-recessed text-label' : 'bg-surface text-ink hover:bg-recessed')}>
        {t.status === 'Done' && <Check aria-label="Done" className="size-3 shrink-0" />}
        <span className="truncate">{t.title}</span>
      </Popover.Trigger>
      <TaskPopover t={t} onEdit={() => setSheet({ task: t })} onComplete={() => complete(t)} />
    </Popover.Root>
  )

  const today = offsetOf(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return (
    <div className="flex h-full flex-col px-8 pt-6 pb-6 max-sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Calendar" description={`${title}${who !== user.id ? ` · ${userName(who)}` : ''}`} />
        <div className="flex flex-wrap items-center gap-2">
          {user.role !== 'producer' && (
            <label className="flex items-center gap-2 text-sm text-label">
              Calendar for
              <Select value={who} onChange={(e) => set({ for: e.target.value === user.id ? null : e.target.value })}>
                {forOptions.map((u) => <option key={u.id} value={u.id}>{u.id === user.id ? 'Me' : u.name}</option>)}
              </Select>
            </label>
          )}
          {view === 'month' && (
            <Popover.Root>
              <Popover.Trigger asChild><Button>Show<ChevronDown aria-hidden className="size-3.5" /></Button></Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" sideOffset={4} className="z-50 w-56 rounded-md bg-surface p-2 shadow-pop">
                  <label className="flex h-8 items-center gap-2 px-1 text-base"><input type="checkbox" checked={overlays.ren} onChange={() => toggleOverlay('ren')} />Renewal expirations</label>
                  <label className="flex h-8 items-center gap-2 px-1 text-base"><input type="checkbox" checked={overlays.xd} onChange={() => toggleOverlay('xd')} />X-dates</label>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          )}
          <Segmented label="View" value={view} onChange={(v) => set({ view: v === 'week' ? null : v })} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
          <Button onClick={() => set({ date: null })}>Today</Button>
          <span className="flex">
            <button aria-label="Previous" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-md text-label hover:bg-recessed"><ChevronLeft className="size-4" strokeWidth={1.75} /></button>
            <button aria-label="Next" onClick={() => step(1)} className="grid size-9 place-items-center rounded-md text-label hover:bg-recessed"><ChevronRight className="size-4" strokeWidth={1.75} /></button>
          </span>
        </div>
      </div>

      {view === 'month' ? (
        <div className="mt-4 grid flex-1 grid-cols-7 overflow-hidden rounded-md bg-surface shadow-ring">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="border-b border-fill px-2 py-1 text-xs font-semibold text-label">{d}</div>)}
          {days.map((d, i) => {
            const list = onDay(d)
            const inMonth = d.getMonth() === anchor.getMonth()
            return (
              <div key={i} className={cx('min-h-24 border-r border-b border-fill p-1 [&:nth-child(7n+7)]:border-r-0', !inMonth && 'bg-recessed')}>
                <button onClick={() => set({ view: 'day', date: isoDate(d) })} className={cx('mb-1 grid size-6 place-items-center rounded-full text-xs tabular hover:bg-fill', offsetOf(d) === today ? 'bg-strong font-semibold text-white hover:bg-strong' : inMonth ? 'text-ink' : 'text-label')}>{d.getDate()}</button>
                <div className="flex flex-col gap-0.5">
                  {list.slice(0, 3).map(chip)}
                  {list.length > 3 && <button onClick={() => set({ view: 'day', date: isoDate(d) })} className="min-h-6 px-1 text-left text-xs text-link hover:underline">+{list.length - 3} more</button>}
                </div>
                <KeyDates items={keyDates.get(offsetOf(d)) ?? []} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-md bg-surface shadow-ring">
          <div className="sticky top-0 z-20 grid border-b border-fill bg-surface" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(${view === 'day' ? 240 : 110}px, 1fr))` }}>
            <span />
            {days.map((d) => (
              <div key={d.toISOString()} className={cx('border-l border-fill px-2 py-1.5 text-sm', offsetOf(d) === today ? 'font-semibold text-strong' : 'text-label')}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })} <span className="tabular">{d.getMonth() + 1}/{d.getDate()}</span>
              </div>
            ))}
            <span className="px-2 py-1 text-xs text-muted">All day</span>
            {days.map((d) => (
              <div key={`all${d.toISOString()}`} className="flex min-h-8 flex-col gap-0.5 border-l border-fill p-1">
                {onDay(d).filter((t) => !t.dueTime).map(chip)}
              </div>
            ))}
          </div>
          <div ref={grid} className="relative grid select-none" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(${view === 'day' ? 240 : 110}px, 1fr))` }}>
            <div>
              {Array.from({ length: SLOTS }, (_, i) => (
                <div key={i} className="tabular relative pr-2 text-right text-xs text-muted" style={{ height: ROW }}>
                  {i % 2 === 0 && i > 0 && <span className="-translate-y-1/2 inline-block">{fmtTime(hhmm(START + i * SLOT))}</span>}
                </div>
              ))}
            </div>
            {days.map((d, di) => (
              <div key={d.toISOString()} className="relative border-l border-fill">
                {Array.from({ length: SLOTS }, (_, i) => {
                  const inDrag = drag && drag.day === di && i >= Math.min(drag.from, drag.to) && i <= Math.max(drag.from, drag.to)
                  return (
                    <div
                      key={i}
                      role={user.role === 'admin' ? undefined : 'button'}
                      tabIndex={user.role === 'admin' ? undefined : -1}
                      aria-label={user.role === 'admin' ? undefined : `New meeting ${d.toLocaleDateString('en-US')} ${fmtTime(hhmm(START + i * SLOT))}`}
                      onPointerDown={(e) => { if (user.role === 'admin' || e.button !== 0) return; e.preventDefault(); setDrag({ day: di, from: i, to: i }) }}
                      onPointerEnter={() => drag && drag.day === di && setDrag({ ...drag, to: i })}
                      className={cx('border-b', i % 2 ? 'border-fill' : 'border-fill/50', inDrag ? 'bg-selection' : user.role !== 'admin' && 'hover:bg-recessed')}
                      style={{ height: ROW }}
                    />
                  )
                })}
                {offsetOf(d) === today && nowMin >= START && nowMin <= END && <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 h-px bg-strong" style={{ top: ((nowMin - START) / SLOT) * ROW }} />}
                {onDay(d).filter((t) => t.dueTime && mins(t.dueTime) < END).map(block)}
              </div>
            ))}
          </div>
        </div>
      )}
      {sheet && <TaskSheet task={sheet.task} prefill={sheet.prefill} onClose={() => setSheet(null)} />}
    </div>
  )
}

/** Overlays read as reference marks, not work: no fill, a hollow ring, never completable or draggable. */
function KeyDates({ items }: { items: { key: string; text: string; to: string }[] }) {
  if (!items.length) return null
  const row = (x: { key: string; text: string; to: string }) => <Link key={x.key} to={x.to} title={x.text} className="flex min-h-6 items-center gap-1.5 text-xs text-label hover:text-strong hover:underline"><span aria-hidden className="size-2 shrink-0 rounded-full ring-1 ring-label ring-inset" /><span className="truncate">{x.text}</span></Link>
  return (
    <div className="mt-1 flex flex-col">
      {items.slice(0, 2).map(row)}
      {items.length > 2 && (
        <Popover.Root>
          <Popover.Trigger className="min-h-6 pl-3.5 text-left text-xs text-link hover:underline">+{items.length - 2} key dates</Popover.Trigger>
          <Popover.Portal><Popover.Content sideOffset={4} className="z-50 max-h-80 w-72 overflow-y-auto rounded-md bg-surface p-2 shadow-pop">{items.map(row)}</Popover.Content></Popover.Portal>
        </Popover.Root>
      )}
    </div>
  )
}

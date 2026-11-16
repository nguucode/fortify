import { useRef, useState } from 'react'
import { canSeeAccount } from '@/domain/access'
import { CalendarDays, Mail, MessageSquare, Phone, Sparkles, StickyNote, type LucideIcon } from 'lucide-react'
import { useApp } from '@/app/store'
import { ago, dateOf, useLookups, useMutate } from '@/app/hooks'
import type { Activity, ActivityType } from '@/domain/types'
import { Button, Tip } from './ui/primitives'
import { Field, inputCls, Sheet, SheetCancel } from './patterns'

const ICON: Record<ActivityType, LucideIcon> = { call: Phone, email: Mail, sms: MessageSquare, meeting: CalendarDays, note: StickyNote, system: Sparkles }

/** US-WRK-011: "@Dana Whitfield" renders as a token for each stored mention. */
function withMentions(text: string, mentions: string[] | undefined, name: (id: string) => string) {
  if (!mentions?.length) return text
  const names = mentions.map(name)
  const parts = text.split(new RegExp(`(${names.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|')})`))
  return parts.map((p, i) => (names.includes(p.slice(1)) && p.startsWith('@') ? <span key={i} className="rounded-sm bg-fill px-1 font-medium text-strong">{p}</span> : p))
}

/** US-WRK-001: newest first; system events are muted. Reused on every record page. */
export function ActivityTimeline({ accountId, linked, limit = 25 }: { accountId?: string; linked?: Activity['linked']; limit?: number }) {
  const { data } = useApp()
  const { userName } = useLookups()
  const items = data.activities
    .filter((a) => (accountId ? a.accountId === accountId : true) && (!linked || (a.linked?.kind === linked.kind && a.linked.id === linked.id)))
    .sort((a, b) => b.occurredOffset - a.occurredOffset || b.id.localeCompare(a.id))
    .slice(0, limit)
  if (!items.length) return <p className="text-base text-muted">No activity yet. Calls, emails, notes, and changes appear here.</p>
  return (
    <ol className="flex flex-col">
      {items.map((a) => {
        const Icon = ICON[a.type]
        return (
          <li key={a.id} className="flex gap-3 border-b border-fill py-2.5 last:border-0">
            <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${a.type === 'system' ? 'text-muted' : 'text-label'}`} strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className={`text-base ${a.type === 'system' ? 'text-label' : 'text-ink'}`}>{withMentions(a.subject, a.mentions, userName)}</p>
              {a.body && <p className="mt-0.5 text-sm text-muted">{withMentions(a.body, a.mentions, userName)}</p>}
              <p className="mt-0.5 text-sm text-muted">
                {userName(a.createdById)} ·{' '}
                <Tip label={dateOf(a.occurredOffset)}>
                  <span>{ago(a.occurredOffset)}</span>
                </Tip>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** US-WRK-002: log a call, email, SMS, meeting, or note. Activities cannot be deleted (roles.md). US-WRK-011: @mentions. */
export function LogActivityButton({ accountId, linked }: { accountId: string; linked?: Activity['linked'] }) {
  const { user, data } = useApp()
  const mutate = useMutate()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<Exclude<ActivityType, 'system'>>('call')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [mention, setMention] = useState<{ start: number; q: string } | null>(null)
  const [active, setActive] = useState(0)
  const area = useRef<HTMLTextAreaElement>(null)
  const account = data.accounts.find((a) => a.id === accountId)
  // Only people who can see this Account can be mentioned (roles.md scope).
  const people = account ? data.users.filter((u) => u.id !== user.id && canSeeAccount(u, account)) : []
  const options = mention ? people.filter((u) => u.name.toLowerCase().includes(mention.q.toLowerCase())).slice(0, 6) : []
  const onBody = (v: string, caret: number) => {
    setBody(v)
    const m = /(^|\s)@([\w .'-]{0,24})$/.exec(v.slice(0, caret))
    setMention(m ? { start: caret - m[2].length - 1, q: m[2] } : null)
    setActive(0)
  }
  const pick = (name: string) => {
    if (!mention) return
    const caret = mention.start + 1 + mention.q.length
    const next = `${body.slice(0, mention.start)}@${name} ${body.slice(caret)}`
    setBody(next)
    setMention(null)
    requestAnimationFrame(() => {
      const pos = mention.start + name.length + 2
      area.current?.focus()
      area.current?.setSelectionRange(pos, pos)
    })
  }
  const mentions = people.filter((u) => `${subject}\n${body}`.includes(`@${u.name}`)).map((u) => u.id)
  const save = async () => {
    setBusy(true)
    try {
      await mutate((s) => s.logActivity({ accountId, type, subject: subject.trim(), body: body.trim() || null, createdById: user.id, linked: linked ?? null, mentions }), 'Activity logged')
      setOpen(false)
      setSubject('')
      setBody('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>Log activity</Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Log activity"
        busy={busy}
        footer={
          <>
            <SheetCancel />
            <Button variant="primary" disabled={busy || subject.trim().length < 3} onClick={save}>
              {busy ? 'Saving…' : 'Log activity'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Type">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {(['call', 'email', 'sms', 'meeting', 'note'] as const).map((t) => (
                <option key={t} value={t}>{t === 'sms' ? 'SMS' : t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Field>
          <Field label="Summary" hint="At least 3 characters, e.g. “Call: reviewed umbrella quote”">
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <div className="relative">
            <Field label="Details (optional)" hint="Type @ to mention a teammate.">
              <textarea
                ref={area}
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls="mention-list"
                aria-autocomplete="list"
                className={`${inputCls} h-28 py-2`}
                value={body}
                onChange={(e) => onBody(e.target.value, e.target.selectionStart)}
                onKeyDown={(e) => {
                  if (!mention || !options.length) return
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % options.length) }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + options.length) % options.length) }
                  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[active].name) }
                  else if (e.key === 'Escape') { e.stopPropagation(); setMention(null) }
                }}
              />
            </Field>
            {mention && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-md bg-surface p-1 shadow-pop">
                <ul id="mention-list" role="listbox" aria-label="Mention">
                  {options.map((u, i) => (
                    <li key={u.id} role="option" aria-selected={i === active}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(u.name) }} className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-base ${i === active ? 'bg-recessed' : ''}`}>
                        <span className="grid size-6 place-items-center rounded-full bg-fill text-xs font-medium text-label">{u.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                        <span className="flex-1 truncate">{u.name}</span>
                        <span className="text-xs text-muted">{u.role.replace('-', ' ')} · {data.offices.find((o) => o.id === u.officeId)?.name}</span>
                      </button>
                    </li>
                  ))}
                  {options.length === 0 && <li className="px-2 py-1.5 text-sm text-muted">No one by that name.</li>}
                </ul>
                <p className="border-t border-fill px-2 pt-1.5 pb-1 text-xs text-muted">Only people who can see this account can be mentioned.</p>
              </div>
            )}
          </div>
          {mentions.length > 0 && <p className="text-sm text-label">Will notify {mentions.map((id) => data.users.find((u) => u.id === id)!.name).join(', ')}.</p>}
        </div>
      </Sheet>
    </>
  )
}

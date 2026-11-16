import { useState } from 'react'
import { CalendarDays, Mail, MessageSquare, Phone, Sparkles, StickyNote, type LucideIcon } from 'lucide-react'
import { useApp } from '@/app/store'
import { ago, dateOf, useLookups, useMutate } from '@/app/hooks'
import type { Activity, ActivityType } from '@/domain/types'
import { Button, Tip } from './ui/primitives'
import { Field, inputCls, Sheet } from './patterns'

const ICON: Record<ActivityType, LucideIcon> = { call: Phone, email: Mail, sms: MessageSquare, meeting: CalendarDays, note: StickyNote, system: Sparkles }

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
              <p className={`text-base ${a.type === 'system' ? 'text-label' : 'text-ink'}`}>{a.subject}</p>
              {a.body && <p className="mt-0.5 text-sm text-muted">{a.body}</p>}
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

/** US-WRK-002: log a call, email, SMS, meeting, or note. Activities cannot be deleted (roles.md). */
export function LogActivityButton({ accountId, linked }: { accountId: string; linked?: Activity['linked'] }) {
  const { user } = useApp()
  const mutate = useMutate()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<Exclude<ActivityType, 'system'>>('call')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await mutate((s) => s.logActivity({ accountId, type, subject: subject.trim(), body: body.trim() || null, createdById: user.id, linked: linked ?? null }), 'Activity logged')
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
            <Button onClick={() => setOpen(false)}>Cancel</Button>
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
          <Field label="Details (optional)">
            <textarea className={`${inputCls} h-28 py-2`} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </>
  )
}

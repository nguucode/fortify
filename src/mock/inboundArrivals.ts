import { useEffect } from 'react'
import { dataStore, useApp } from '@/app/store'

/**
 * US-INB-011: three scripted inbound messages for the current View as user at ~30 s, 2 min, and 5 min of visible
 * time. Timers pause while the tab is hidden and restart when View as changes. The Account Manager persona gets a
 * STOP; every persona gets one reply on a Done conversation, which reopens it.
 */
const AT = [30, 120, 300]
export function useInboundArrivals(viewing: () => string | null) {
  const { user } = useApp()
  useEffect(() => {
    const d = dataStore().getState()
    const mine = (d.conversations ?? []).filter((c) => c.assigneeId === user.id).sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    const sms = mine.find((c) => c.channel === 'sms' && c.status === 'Open' && d.contacts.find((x) => x.id === c.contactId)?.smsConsent?.state === 'Opted in')
    const done = mine.find((c) => c.status === 'Done' && c.channel !== 'call')
    const email = mine.find((c) => c.channel === 'email' && c.status === 'Open' && c.id !== done?.id)
    const script = [
      sms && { id: sms.id, body: user.role === 'account-manager' ? 'STOP' : 'Can you call me when you get a minute?' },
      email && { id: email.id, body: 'Following up on my last email. Anything you need from me?' },
      done && { id: done.id, body: 'One more question on this, sorry!' },
    ].filter(Boolean) as { id: string; body: string }[]
    if (!script.length) return
    let seconds = 0
    let next = 0
    const t = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      seconds++
      while (next < script.length && seconds >= AT[next]) {
        const m = script[next++]
        try { dataStore().receiveMessage(m.id, m.body, viewing()) } catch { /* conversation gone (demo reset) */ }
      }
      if (next >= script.length) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [user.id]) // eslint-disable-line react-hooks/exhaustive-deps
}

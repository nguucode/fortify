import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { dataStore, useApp } from './store'
import { useToast } from '@/components/ui/toast'
import { daysBetween, formatUSDate, resolveOffset } from '@/mock/dates'

export const usd = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }))
export const dateOf = (offset: number) => formatUSDate(resolveOffset(offset))
export const offsetOfDate = (d: Date) => daysBetween(new Date(), d)
export function ago(offset: number) {
  const d = -offset
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}
export function inDays(offset: number) {
  if (offset === 0) return 'today'
  if (offset === 1) return 'tomorrow'
  return offset > 0 ? `in ${offset} days` : `${-offset} days ago`
}

/** Name lookups over the live store state. */
export function useLookups() {
  const { data } = useApp()
  return useMemo(() => {
    const users = new Map(data.users.map((u) => [u.id, u]))
    const accounts = new Map(data.accounts.map((a) => [a.id, a]))
    const carriers = new Map(data.carriers.map((c) => [c.id, c]))
    const policies = new Map(data.policies.map((p) => [p.id, p]))
    const offices = new Map(data.offices.map((o) => [o.id, o]))
    return {
      user: (id: string | null | undefined) => (id ? users.get(id) : undefined),
      userName: (id: string | null | undefined) => (id ? (users.get(id)?.name ?? '—') : 'Unassigned'),
      account: (id: string) => accounts.get(id),
      carrier: (id: string) => carriers.get(id),
      carrierName: (id: string) => carriers.get(id)?.name ?? '—',
      policy: (id: string | null) => (id ? policies.get(id) : undefined),
      office: (id: string) => offices.get(id),
    }
  }, [data])
}

/**
 * Every write goes through the mock API (latency, forced errors) before touching the store, so Demo controls
 * can demonstrate failure, and a failed write leaves nothing behind (store actions are transactional).
 */
export function useMutate() {
  const { api } = useApp()
  const toast = useToast()
  const { pathname } = useLocation()
  const route = '/' + pathname.split('/')[1]
  return async function mutate<T>(fn: (store: ReturnType<typeof dataStore>) => T, success?: string): Promise<T> {
    try {
      const out = await api.request(route, () => fn(dataStore()))
      if (success) toast(success, 'success')
      return out
    } catch (e) {
      toast((e as Error).message, 'danger')
      throw e
    }
  }
}

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import seed from '@/mock/data/dataset.json'
import { createMockApi, type DemoControls } from '@/mock/api'
import { buildAccountRows } from '@/domain/accounts'
import type { Dataset, User } from '@/domain/types'

const dataset = seed as Dataset
// View as presets (US-FND-004, spec/ia/mock-data.md shared seed list).
const PRESET_NAMES = ['Dana Whitfield', 'Marisol Reyes', 'Grant Holloway', 'Priya Nair']
export const viewAsUsers: User[] = PRESET_NAMES.map((n) => dataset.users.find((u) => u.name === n)!)

// Dev-only presenter links: ?as=account-manager&demo=error|empty (never shipped in a production build).
const devParams = import.meta.env.DEV ? new URLSearchParams(location.search) : new URLSearchParams()
const demo = devParams.get('demo')
const api = createMockApi({
  latency: devParams.get('latency') !== 'off',
  forceErrorOn: demo === 'error' ? '/' + location.pathname.split('/')[1] : null,
  empty: demo === 'empty',
})

interface AppState {
  data: Dataset
  user: User
  setUser: (u: User) => void
  officeFilter: string | null
  setOfficeFilter: (id: string | null) => void
  api: typeof api
}

const Ctx = createContext<AppState | null>(null)

function readStored(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User>(
    () => viewAsUsers.find((u) => u.role === devParams.get('as')) ?? viewAsUsers.find((u) => u.id === readStored('fortify.viewAs')) ?? viewAsUsers[0],
  )
  const [officeFilter, setOfficeFilter] = useState<string | null>(null)
  const setUser = (u: User) => {
    setUserState(u)
    setOfficeFilter(null)
    try {
      sessionStorage.setItem('fortify.viewAs', u.id)
    } catch {
      /* storage blocked: the choice lasts until reload */
    }
  }
  const value = useMemo(() => ({ data: dataset, user, setUser, officeFilter, setOfficeFilter, api }), [user, officeFilter])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}

export function useDemoControls(): DemoControls {
  return useSyncExternalStore(api.subscribe, api.getControls)
}

let rowsCache: { day: string; rows: ReturnType<typeof buildAccountRows> } | null = null
/** Rows are derived once per day; offsets resolve against today (decision D3). Call invalidateAccountRows() after a mutation. */
export function accountRows() {
  const day = new Date().toDateString()
  if (rowsCache?.day !== day) rowsCache = { day, rows: buildAccountRows(dataset, new Date()) }
  return rowsCache.rows
}
export function invalidateAccountRows() {
  rowsCache = null
}

export function officeName(id: string) {
  const o = dataset.offices.find((x) => x.id === id)
  return o ? `${o.name} ${o.state}` : ''
}

/** Mock API with Demo controls (US-FND-005, spec/ia/mock-data.md): latency, a forced error per route, and empty data. */
export interface DemoControls {
  latency: boolean
  /** Route whose next requests fail, e.g. "/accounts". */
  forceErrorOn: string | null
  empty: boolean
}

export class MockApiError extends Error {}

export function createMockApi(initial: DemoControls, random: () => number = Math.random) {
  let controls = initial
  const listeners = new Set<() => void>()

  return {
    getControls: () => controls,
    setControls(patch: Partial<DemoControls>) {
      controls = { ...controls, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async request<T>(route: string, load: (empty: boolean) => T): Promise<T> {
      if (controls.latency) await new Promise((r) => setTimeout(r, 200 + Math.round(random() * 400)))
      if (controls.forceErrorOn === route) throw new MockApiError("We couldn't load this. Try again.")
      return load(controls.empty)
    },
  }
}

export type MockApi = ReturnType<typeof createMockApi>

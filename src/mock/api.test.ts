import { createMockApi } from './api'

describe('mock API with Demo controls (US-FND-005)', () => {
  const api = () => createMockApi({ latency: false, forceErrorOn: null, empty: false })

  it('resolves the request when no control is set', async () => {
    const a = api()
    await expect(a.request('/accounts', (empty) => (empty ? [] : [1, 2, 3]))).resolves.toEqual([1, 2, 3])
  })

  it('fails only the route a presenter forced an error on', async () => {
    const a = api()
    a.setControls({ forceErrorOn: '/accounts' })
    await expect(a.request('/accounts', () => [1])).rejects.toThrow("We couldn't load this. Try again.")
    await expect(a.request('/today', () => [1])).resolves.toEqual([1])
  })

  it('asks the loader for empty data when Empty is on', async () => {
    const a = api()
    a.setControls({ empty: true })
    await expect(a.request('/accounts', (empty) => (empty ? [] : [1]))).resolves.toEqual([])
  })

  it('waits 200–600ms when latency is on', async () => {
    vi.useFakeTimers()
    const a = createMockApi({ latency: true, forceErrorOn: null, empty: false }, () => 0.5)
    let done = false
    const p = a.request('/accounts', () => 1).then(() => (done = true))
    await vi.advanceTimersByTimeAsync(399)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await p
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  it('notifies subscribers when controls change', () => {
    const a = api()
    const seen: boolean[] = []
    a.subscribe(() => seen.push(a.getControls().latency))
    a.setControls({ latency: true })
    expect(seen).toEqual([true])
  })
})

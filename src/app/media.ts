import { useSyncExternalStore } from 'react'

/** US-FND-011: below 768px the app is read-only and boards fall back to lists. */
const query = '(max-width: 767.98px)'
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(query)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
export const useIsMobile = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)

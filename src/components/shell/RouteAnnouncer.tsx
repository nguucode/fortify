import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * US-FND-012: on every route change, title the document after the page's h1 ("Renewals · Fortify"),
 * move focus to that h1, and announce it politely. Query-string changes (filters, tabs) don't count as navigation.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation()
  const first = useRef(true)
  const live = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    // Wait a frame so the new page (and the dataset-backed h1) has rendered.
    const id = requestAnimationFrame(() => {
      const h1 = document.querySelector<HTMLHeadingElement>('main h1')
      const name = h1?.textContent?.trim()
      document.title = name ? `${name} · Fortify` : 'Fortify'
      if (first.current) {
        first.current = false
        return
      }
      if (h1) {
        h1.tabIndex = -1
        h1.focus({ preventScroll: true })
      }
      if (live.current && name) live.current.textContent = `${name} page`
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])
  return <p ref={live} aria-live="polite" className="sr-only" />
}

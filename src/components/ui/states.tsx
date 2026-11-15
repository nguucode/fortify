import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, type LucideIcon } from 'lucide-react'
import { Button } from './primitives'

/** Shared empty, loading, and error states (US-FND-016). Left-aligned, no illustrations. */
export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1 px-4 pt-12 pb-12">
      <Icon aria-hidden className="mb-2 size-6 text-muted" strokeWidth={1.75} />
      <p className="text-lg font-medium text-strong">{title}</p>
      <p className="max-w-[60ch] text-base text-muted">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ what, refId, onRetry }: { what: string; refId: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-1 px-4 pt-12 pb-12">
      <AlertCircle aria-hidden className="mb-2 size-6 text-danger" strokeWidth={1.75} />
      <p className="text-lg font-medium text-strong">We couldn’t load {what}.</p>
      <p className="text-base text-muted">
        Check your connection or try again. <span className="font-mono text-sm text-label">{refId}</span>
      </p>
      <Button variant="primary" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

/** Skeleton rows appear only when a wait exceeds 150ms, so fast loads never flash. */
export function SkeletonRows({ rows = 10, cols }: { rows?: number; cols: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150)
    return () => clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden className="h-10 border-b border-fill">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-3">
              <span className="block h-2.5 animate-pulse rounded-sm bg-recessed motion-reduce:animate-none" style={{ width: `${40 + ((r * 7 + c * 13) % 45)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

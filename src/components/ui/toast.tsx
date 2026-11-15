import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type Tone = 'success' | 'danger' | 'info'
interface Toast {
  id: number
  tone: Tone
  message: string
}

const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {})
export const useToast = () => useContext(Ctx)

/** Toasts per US-FND-015: bottom-right, 4s, max 3 stacked, errors stay until dismissed. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = next.current++
    setToasts((t) => [{ id, tone, message }, ...t].slice(0, 3))
    if (tone !== 'danger') setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])
  const Icon = { success: CheckCircle2, danger: AlertCircle, info: Info }
  const color = { success: 'text-success', danger: 'text-danger', info: 'text-info' }
  return (
    <Ctx.Provider value={push}>
      {children}
      <ol aria-live="polite" className="fixed right-4 bottom-4 z-50 flex w-90 flex-col gap-2">
        {toasts.map((t) => {
          const I = Icon[t.tone]
          return (
            <li key={t.id} className="flex items-start gap-2 rounded-md bg-surface p-3 shadow-pop" onKeyDown={(e) => e.key === 'Escape' && dismiss(t.id)}>
              <I aria-hidden className={`mt-0.5 size-4 shrink-0 ${color[t.tone]}`} />
              <p className="line-clamp-2 flex-1 text-base text-ink">{t.message}</p>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded-sm text-muted hover:text-strong">
                <X className="size-4" />
              </button>
            </li>
          )
        })}
      </ol>
    </Ctx.Provider>
  )
}

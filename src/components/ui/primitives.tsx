import * as RTooltip from '@radix-ui/react-tooltip'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, Search, X, type LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { changeTone, type DueTone } from '@/domain/urgency'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' }>(
  function Button({ variant = 'secondary', size = 'md', className, ...p }, ref) {
    return (
      <button
        ref={ref}
        {...p}
        className={cx(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
          size === 'md' ? 'h-9 px-3 text-base' : 'h-8 px-2.5 text-sm',
          variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover',
          // A secondary button with aria-pressed is a toggle: pressed reads as recessed with strong text.
          variant === 'secondary' && 'bg-surface text-ink shadow-ring hover:bg-recessed aria-pressed:bg-recessed aria-pressed:text-strong aria-pressed:shadow-control',
          variant === 'ghost' && 'text-label hover:bg-recessed hover:text-strong',
          variant === 'danger' && 'bg-danger text-white hover:bg-danger-text',
          className,
        )}
      />
    )
  },
)

export function Tip({ label, children, side = 'top' }: { label: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' }) {
  return (
    <RTooltip.Root delayDuration={150}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content side={side} sideOffset={6} className="z-50 max-w-80 rounded-md bg-strong px-2 py-1 text-sm text-surface">
          {label}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-sm bg-fill px-1.5 py-0.5 font-sans text-xs text-label">{children}</kbd>
}

const badgeCls = 'inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-fill px-1.5 text-xs font-medium whitespace-nowrap text-label'

/** Count pill: counts only (DESIGN.md › Chips). */
export function CountPill({ n, max, onTint, className }: { n: number | null; /** Cap the display ("99+"). */ max?: number; /** On a tinted surface (a Callout): white pill, ink text. */ onTint?: boolean; className?: string }) {
  const text = n === null ? '—' : max != null && n > max ? `${max}+` : n.toLocaleString('en-US')
  return <span className={cx('tabular inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-xs font-medium whitespace-nowrap', onTint ? 'bg-surface text-ink' : 'bg-fill text-label', className)}>{text}</span>
}

/** The 2px Action Blue progress line: refetch under a table header, sync, palette search. Solid, no pulse. */
export function ProgressLine({ className }: { className?: string }) {
  return <span aria-hidden className={cx('block h-0.5 bg-primary', className)} />
}

/** A premium change as a signed percent, coloured by `changeTone` (rules.md: +10% is a risk, −5% is good news). */
export function RateChange({ pct, className }: { pct: number | null | undefined; className?: string }) {
  if (pct == null) return <span className={cx('text-muted', className)}>—</span>
  const tone = changeTone(pct)
  return <span className={cx('tabular whitespace-nowrap', tone === 'up' && 'font-medium text-danger-text', tone === 'down' && 'font-medium text-success-text', className)}>{pct > 0 ? '+' : pct < 0 ? '−' : ''}{Math.abs(pct * 100).toFixed(1)}%</span>
}

/** Sub-section heading inside a panel, sheet or record (14/600 strong, the Table Header step). */
export function SubHeading({ children, className, as: Tag = 'h3' }: { children: ReactNode; className?: string; as?: 'h2' | 'h3' | 'h4' }) {
  return <Tag className={cx('text-base font-semibold text-strong', className)}>{children}</Tag>
}

/** Neutral badge for plan-like labels and codes (Sample data, Primary, Read only, AI). Never a status. */
export function Badge({ children, icon: Icon, className, title }: { children: ReactNode; icon?: LucideIcon; className?: string; title?: string }) {
  return (
    <span title={title} className={cx(badgeCls, className)}>
      {Icon && <Icon aria-hidden className="size-3" />}
      {children}
    </span>
  )
}

/** Initials avatar: sm 24px for list rows, md 28px for the top bar. */
export function Avatar({ name, size = 'sm', className, labelled }: { name: string; size?: 'sm' | 'md'; className?: string; /** Announce the name: set when no visible name sits beside the avatar. */ labelled?: boolean }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span {...(labelled ? { role: 'img', 'aria-label': name } : { 'aria-hidden': true })} title={name} className={cx('grid shrink-0 place-items-center rounded-full bg-fill text-xs font-medium text-label', size === 'sm' ? 'size-6' : 'size-7', className)}>
      {initials}
    </span>
  )
}

/** Segmented control: md is 36px to sit in a toolbar, sm is 32px for panels and popovers. */
export function Segmented<V extends string>({ options, value, onChange, label, size = 'md', className }: { options: { value: V; label: ReactNode; disabled?: boolean; title?: string }[]; value: V; onChange: (v: V) => void; label: string; size?: 'md' | 'sm'; className?: string }) {
  // Radiogroup keyboard model: one tab stop on the checked item, arrow keys move and select.
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const enabled = options.filter((o) => !o.disabled)
    const next = enabled[(enabled.findIndex((o) => o.value === value) + step + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.value)
    ;(e.currentTarget.querySelector(`[data-value="${CSS.escape(next.value)}"]`) as HTMLElement | null)?.focus()
  }
  const focusable = options.some((o) => o.value === value && !o.disabled) ? value : options.find((o) => !o.disabled)?.value
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={move} className={cx('inline-flex shrink-0 rounded-md bg-recessed p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={value === o.value}
          tabIndex={o.value === focusable ? 0 : -1}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx('rounded-sm px-2.5 text-sm whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50', size === 'md' ? 'h-8' : 'h-7', value === o.value ? 'bg-surface font-medium text-strong shadow-ring' : 'text-label hover:text-strong')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const controlBase = 'rounded-md bg-surface text-ink shadow-control outline-none focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'
/** Form control classes. md (36px) is the default everywhere, sm (32px) only inside footers and dense inline rows. */
export const controlCls = (size: 'md' | 'sm' = 'md') => cx(controlBase, size === 'md' ? 'h-9 px-2.5 text-base' : 'h-8 px-2 text-sm')

export const Select = forwardRef<HTMLSelectElement, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'md' | 'sm' }>(function Select({ size = 'md', className, ...p }, ref) {
  return <select ref={ref} {...p} className={cx(controlCls(size), className)} />
})

/** Search input with a leading icon (36px). */
export function SearchField({ value, onChange, placeholder, label, className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; label: string; className?: string; autoFocus?: boolean }) {
  return (
    <label className={cx('relative w-80 max-sm:w-full', className)}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
      <input type="search" value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(controlCls(), 'w-full pr-3 pl-8')} />
    </label>
  )
}

/** Applied filter chip (28px, white, ring) per DESIGN.md › Chips. */
export function FilterChip({ label, onRemove }: { label: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md bg-surface pr-1 pl-2.5 text-sm text-ink shadow-ring">
      {label}
      <button type="button" aria-label={`Remove ${typeof label === 'string' ? label : 'filter'}`} onClick={onRemove} className="grid size-5 place-items-center rounded-sm text-muted hover:bg-recessed hover:text-strong">
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  )
}

type CalloutTone = 'warning' | 'danger' | 'success' | 'info'
const CALLOUT: Record<CalloutTone, { bg: string; icon: LucideIcon; color: string }> = {
  warning: { bg: 'bg-warning-tint', icon: AlertTriangle, color: 'text-warning-text' },
  danger: { bg: 'bg-danger-tint', icon: AlertCircle, color: 'text-danger-text' },
  success: { bg: 'bg-success-tint', icon: CheckCircle2, color: 'text-success-text' },
  info: { bg: 'bg-info-tint', icon: Info, color: 'text-info-text' },
}
/**
 * Inline message (DESIGN.md › Callouts): tint, 16px tone icon, 14px ink text, one optional action.
 * `bleed` is the full-width banner under a record header (no radius or ring, shell gutters).
 */
export function Callout({ tone, children, action, icon, bleed, role, className }: { tone: CalloutTone; children: ReactNode; action?: ReactNode; icon?: LucideIcon | false; bleed?: boolean; role?: 'alert' | 'status'; className?: string }) {
  const t = CALLOUT[tone]
  const Icon = icon === false ? null : (icon ?? t.icon)
  return (
    <div role={role ?? (tone === 'danger' ? 'alert' : undefined)} className={cx('flex items-start gap-2 text-base text-ink', t.bg, bleed ? 'border-b border-line px-8 py-2.5 max-sm:px-4' : 'rounded-md px-3 py-2 shadow-ring', className)}>
      {Icon && <Icon aria-hidden className={cx('mt-0.5 size-4 shrink-0', t.color)} strokeWidth={1.75} />}
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="-my-1 shrink-0">{action}</div>}
    </div>
  )
}

/** A date or deadline coloured by `dueTone`: soon is warning, overdue is danger; both add a clock. */
export function Due({ tone, children, icon = true, className }: { tone: DueTone; children: ReactNode; icon?: boolean; className?: string }) {
  return (
    <span className={cx('tabular inline-flex items-center gap-1 whitespace-nowrap', tone === 'overdue' && 'font-medium text-danger-text', tone === 'soon' && 'font-medium text-warning-text', className)}>
      {tone && icon && <Clock aria-hidden className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}

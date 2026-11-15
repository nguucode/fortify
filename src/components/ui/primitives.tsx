import * as RTooltip from '@radix-ui/react-tooltip'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost'
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
          variant === 'secondary' && 'bg-surface text-ink shadow-ring hover:bg-recessed',
          variant === 'ghost' && 'text-label hover:bg-recessed hover:text-strong',
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
        <RTooltip.Content side={side} sideOffset={6} className="z-50 max-w-80 rounded-md bg-strong px-2 py-1 text-sm text-white">
          {label}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-sm bg-fill px-1.5 py-0.5 font-sans text-xs text-label">{children}</kbd>
}

export function CountPill({ n }: { n: number | null }) {
  return <span className="tabular rounded-full bg-fill px-1.5 text-xs leading-5 font-medium text-label">{n === null ? '—' : n.toLocaleString('en-US')}</span>
}

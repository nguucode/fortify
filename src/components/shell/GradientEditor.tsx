import { ArrowLeftRight, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cx } from '@/components/ui/primitives'
import { canvasInk } from './canvasInk'

// Curated pairs: six soft ones for light pages, two deep ones that take light text. All pass the readability check.
export const PRESETS = [
  ['Default', '#e8eefc', '#fbe9f3'],
  ['Sky', '#e0f2fe', '#ede9fe'],
  ['Peach', '#ffedd5', '#fce7f3'],
  ['Mint', '#dcfce7', '#e0f2fe'],
  ['Sand', '#fef3c7', '#ffe4e6'],
  ['Fog', '#f1f5f9', '#e2e8f0'],
  ['Midnight', '#1e293b', '#312e81'],
  ['Plum', '#3b0764', '#1e1b4b'],
] as const

const HEX = /^#[0-9a-f]{6}$/i
const css = (from: string, to: string) => `linear-gradient(135deg, ${from}, ${to})`
type Stop = 'from' | 'to'

/**
 * Gradient editor, after Figma/Canva: a live preview bar with a handle per end (pick which end you edit),
 * presets for the common case, swap, and one colour field for the selected end.
 */
export function GradientEditor({ from, to, dark, onChange }: { from: string; to: string; dark: boolean; onChange: (v: { gradFrom: string; gradTo: string }) => void }) {
  const [active, setActive] = useState<Stop>('from')
  const value = active === 'from' ? from : to
  const setStop = (v: string) => onChange(active === 'from' ? { gradFrom: v, gradTo: to } : { gradFrom: from, gradTo: v })
  const handle = (s: Stop, color: string) => (
    <button
      type="button"
      aria-label={s === 'from' ? 'Edit start color' : 'Edit end color'}
      aria-pressed={active === s}
      onClick={() => setActive(s)}
      className={cx('size-6 rounded-full border-2 border-white shadow-pop', active === s && 'ring-2 ring-primary ring-offset-1 ring-offset-surface')}
      style={{ background: color }}
    />
  )
  return (
    <div className="flex w-60 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-strong">Gradient</span>
        <button
          type="button"
          aria-label="Swap colors"
          title="Swap colors"
          onClick={() => onChange({ gradFrom: to, gradTo: from })}
          className="inline-flex size-7 items-center justify-center rounded-md text-label hover:bg-recessed hover:text-strong"
        >
          <ArrowLeftRight aria-hidden className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="relative flex h-9 items-center justify-between rounded-md px-1.5 shadow-ring" style={{ background: css(from, to).replace('135deg', 'to right') }}>
        {handle('from', from)}
        {handle('to', to)}
      </div>
      <HexInput key={active} label={active === 'from' ? 'Start' : 'End'} value={value} onChange={setStop} />
      <div>
        <p className="pb-1.5 text-xs text-muted">Presets</p>
        <div className="grid grid-cols-8 gap-1.5">
          {PRESETS.map(([name, a, b]) => {
            const on = a === from && b === to
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={on}
                title={name}
                onClick={() => onChange({ gradFrom: a, gradTo: b })}
                className={cx('grid size-6 place-items-center rounded-md shadow-ring', on && 'ring-2 ring-primary ring-offset-1 ring-offset-surface')}
                style={{ background: css(a, b) }}
              >
                {on && <Check aria-hidden className={cx('size-3', canvasInk([a, b]).ink === 'light' ? 'text-white' : 'text-black')} strokeWidth={3} />}
              </button>
            )
          })}
        </div>
      </div>
      {!dark && canvasInk([from, to]).worst < 4.5 && (
        <p role="status" className="text-sm text-warning-text">Text may be hard to read on part of this gradient. Bring the two colors closer in lightness.</p>
      )}
      {dark && <p className="text-xs text-muted">In Dark mode these colors tint the dark background.</p>}
    </div>
  )
}

const swatchCls = 'size-5 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0 shadow-ring [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0'

/** Colour well + hex field; the field only commits a full #rrggbb and follows outside changes when not focused. */
function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => { if (document.activeElement !== field.current) setDraft(value) }, [value])
  return (
    <div className="flex h-8 items-center gap-2 rounded-md bg-surface px-2 shadow-control">
      <span className="w-9 text-sm text-label">{label}</span>
      <input type="color" aria-label={`${label} color`} value={value} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value) }} className={swatchCls} />
      <input
        ref={field}
        aria-label={`${label} hex`}
        value={draft}
        spellCheck={false}
        maxLength={7}
        onChange={(e) => { const v = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value; setDraft(v); if (HEX.test(v)) onChange(v.toLowerCase()) }}
        onBlur={() => setDraft(value)}
        className="min-w-0 flex-1 bg-transparent font-mono text-sm text-ink uppercase outline-none"
      />
    </div>
  )
}

import { Bar, BarChart as RBarChart, CartesianGrid, Line, LineChart as RLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * US-FND-020: the only place Recharts is imported. Primary series is the action blue (1px line / solid bar);
 * a second series is a 1px dashed muted line; horizontal hairline grid; no fills, gradients, or 3D.
 * Each chart is role="img" with a one-sentence summary and a visually hidden data table.
 */
export interface Series {
  key: string
  label: string
}
type Format = (n: number) => string
const BLUE = 'var(--color-primary)'
const MUTED = 'var(--color-muted)'
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const fmtUsd: Format = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e4 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n).toLocaleString('en-US')}`)
export const fmtUsdFull: Format = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const fmtPct: Format = (n) => `${(n * 100).toFixed(1)}%`

function DataTable({ data, x, series, format }: { data: Record<string, string | number>[]; x: string; series: Series[]; format: Format }) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          <th>{x}</th>
          {series.map((s) => <th key={s.key}>{s.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i}>
            <td>{d[x]}</td>
            {series.map((s) => <td key={s.key}>{typeof d[s.key] === 'number' ? format(d[s.key] as number) : '—'}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <p className="mt-1 flex gap-4 text-xs text-label" aria-hidden>
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke={i === 0 ? BLUE : MUTED} strokeWidth="1.5" strokeDasharray={i === 0 ? undefined : '3 2'} /></svg>
          {s.label}
        </span>
      ))}
    </p>
  )
}

const tooltipStyle = { contentStyle: { borderRadius: 8, border: 'none', boxShadow: 'var(--shadow-pop)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }, labelStyle: { color: 'var(--color-label)' } }
const axis = { tick: { fontSize: 12, fill: 'var(--color-label)' }, tickLine: false, axisLine: false }

export function LineChart({ data, x, series, summary, height = 200, format = fmtUsd, fullFormat = fmtUsdFull }: { data: Record<string, string | number>[]; x: string; series: Series[]; summary: string; height?: number; format?: Format; fullFormat?: Format }) {
  return (
    <figure>
      <div role="img" aria-label={summary} style={{ height }}>
        <ResponsiveContainer>
          <RLineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey={x} {...axis} />
            <YAxis {...axis} width={56} tickFormatter={format} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => fullFormat(v)} />
            {series.map((s, i) => (
              <Line key={s.key} dataKey={s.key} name={s.label} type="monotone" stroke={i === 0 ? BLUE : MUTED} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i === 0 ? undefined : '4 3'} dot={false} activeDot={{ r: 3 }} isAnimationActive={!reduced()} />
            ))}
          </RLineChart>
        </ResponsiveContainer>
      </div>
      <Legend series={series} />
      <DataTable data={data} x={x} series={series} format={fullFormat} />
    </figure>
  )
}

export function BarChart({ data, x, series, summary, height = 200, format = fmtUsd, fullFormat = fmtUsdFull, layout = 'horizontal' }: { data: Record<string, string | number>[]; x: string; series: Series[]; summary: string; height?: number; format?: Format; fullFormat?: Format; layout?: 'horizontal' | 'vertical' }) {
  const vertical = layout === 'vertical'
  return (
    <figure>
      <div role="img" aria-label={summary} style={{ height }}>
        <ResponsiveContainer>
          <RBarChart data={data} layout={layout} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
            <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--color-line)" />
            {vertical ? (
              <>
                <XAxis type="number" {...axis} tickFormatter={format} />
                <YAxis type="category" dataKey={x} {...axis} width={120} />
              </>
            ) : (
              <>
                <XAxis dataKey={x} {...axis} />
                <YAxis {...axis} width={56} tickFormatter={format} />
              </>
            )}
            <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-recessed)' }} formatter={(v: number) => fullFormat(v)} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={i === 0 ? BLUE : MUTED} radius={2} maxBarSize={28} isAnimationActive={!reduced()} />
            ))}
          </RBarChart>
        </ResponsiveContainer>
      </div>
      <Legend series={series} />
      <DataTable data={data} x={x} series={series} format={fullFormat} />
    </figure>
  )
}

/** Inline trend, no axes: 80x24 by default. */
export function Sparkline({ values, summary, width = 80, height = 24 }: { values: number[]; summary: string; width?: number; height?: number }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <span role="img" aria-label={summary} style={{ display: 'inline-block', width, height }}>
      <ResponsiveContainer>
        <RLineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line dataKey="v" stroke={BLUE} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </RLineChart>
      </ResponsiveContainer>
    </span>
  )
}

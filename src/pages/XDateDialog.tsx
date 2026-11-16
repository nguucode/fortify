import { useState } from 'react'
import { useApp } from '@/app/store'
import { offsetOfDate, useMutate } from '@/app/hooks'
import type { Account, InterestLevel, Line, XDate } from '@/domain/types'
import { Confirm, Field, inputCls } from '@/components/patterns'

const PL: Line[] = ['Auto', 'Home', 'Umbrella', 'Renters', 'Condo', 'Flood', 'Boat']
const CL: Line[] = ['BOP', 'GL', 'WC', 'Commercial auto', 'Commercial umbrella']

/** Add or edit an X-date (when a line renews with another carrier). Shared by Sales tab and the X-dates list. */
export function XDateDialog({ account, xdate, onClose }: { account: Account; xdate?: XDate; onClose: () => void }) {
  const { user } = useApp()
  const mutate = useMutate()
  const iso = (off: number) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const [line, setLine] = useState<Line>(xdate?.line ?? (account.kind === 'Household' ? 'Auto' : 'BOP'))
  const [carrier, setCarrier] = useState(xdate?.currentCarrier ?? '')
  const [premium, setPremium] = useState(xdate?.premium ? String(xdate.premium) : '')
  const [date, setDate] = useState(xdate ? iso(xdate.xDateOffset) : '')
  const [interest, setInterest] = useState<InterestLevel>(xdate?.interestLevel ?? 'Medium')
  return (
    <Confirm
      open
      onOpenChange={(o) => !o && onClose()}
      title={xdate ? 'Edit X-date' : 'Add X-date'}
      body={`When ${account.name}'s ${line} renews with its current carrier.`}
      confirmLabel={xdate ? 'Save' : 'Add X-date'}
      onConfirm={async () => {
        if (!carrier.trim()) throw new Error('Enter the current carrier.')
        if (!date) throw new Error('Choose the X-date.')
        const input = { accountId: account.id, line, currentCarrier: carrier.trim(), premium: Number(premium) || null, xDateOffset: offsetOfDate(new Date(`${date}T12:00:00`)), interestLevel: interest }
        await mutate((s) => (xdate ? s.updateXDate(xdate.id, input, user.id) : s.createXDate(input)), xdate ? 'X-date saved' : 'X-date added')
        onClose()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Line"><select value={line} onChange={(e) => setLine(e.target.value as Line)} className={inputCls}>{(account.kind === 'Household' ? PL : CL).map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Current carrier"><input value={carrier} onChange={(e) => setCarrier(e.target.value)} className={inputCls} /></Field>
        <Field label="Current premium"><input value={premium} onChange={(e) => setPremium(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputCls} /></Field>
        <Field label="X-date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
        <Field label="Interest"><select value={interest} onChange={(e) => setInterest(e.target.value as InterestLevel)} className={inputCls}>{(['High', 'Medium', 'Low', 'Closed'] as const).map((l) => <option key={l}>{l}</option>)}</select></Field>
      </div>
    </Confirm>
  )
}

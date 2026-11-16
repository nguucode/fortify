import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { Sheet, SheetCancel } from './patterns'

const renderSheet = (onOpenChange: (o: boolean) => void) =>
  render(
    <Sheet open onOpenChange={onOpenChange} title="New task" footer={<SheetCancel />}>
      <label>
        Title <input />
      </label>
    </Sheet>,
  )

describe('Sheet unsaved-changes guard (US-FND-014)', () => {
  it('closes straight away when nothing changed', () => {
    const onOpenChange = vi.fn()
    renderSheet(onOpenChange)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
  it('asks "Discard changes?" once a field changed, and only closes on Discard', () => {
    const onOpenChange = vi.fn()
    renderSheet(onOpenChange)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Call Ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByText('Discard changes?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

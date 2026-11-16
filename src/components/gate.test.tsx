import { fireEvent, render, screen } from '@testing-library/react'
import * as RTooltip from '@radix-ui/react-tooltip'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import { Gate } from './patterns'

const renderGate = (allowed: boolean, onClick: () => void) =>
  render(
    <MemoryRouter>
      <RTooltip.Provider>
        <Gate allowed={allowed} reason="Only a Principal can do this.">
          <button onClick={onClick}>Mark won</button>
        </Gate>
      </RTooltip.Provider>
    </MemoryRouter>,
  )

describe('Gate (US-FND-012 no-permission state)', () => {
  it('keeps a blocked control focusable but aria-disabled, and swallows activation', () => {
    const onClick = vi.fn()
    renderGate(false, onClick)
    const btn = screen.getByRole('button', { name: 'Mark won' })
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    btn.focus()
    expect(document.activeElement).toBe(btn)
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })
  it('passes the control through untouched when allowed', () => {
    const onClick = vi.fn()
    renderGate(true, onClick)
    fireEvent.click(screen.getByRole('button', { name: 'Mark won' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

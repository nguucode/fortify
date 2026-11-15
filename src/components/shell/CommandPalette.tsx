import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router'
import { allNavItems, isVisible } from '@/app/sitemap'
import { accountRows, useApp } from '@/app/store'
import { visibleAccounts } from '@/domain/access'

/** Minimal ⌘K palette: navigation plus Accounts in scope. Full search arrives with US-FND-003. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useApp()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const go = (to: string) => {
    onOpenChange(false)
    navigate(to)
  }
  // Accounts appear only once the user types, capped at 20, so opening the palette never mounts ~600 items.
  const term = query.trim().toLowerCase()
  const accounts = open && term
    ? visibleAccounts(user, accountRows())
        .filter((a) => a.lifecycle === 'active' && (a.name.toLowerCase().includes(term) || a.searchText.includes(term)))
        .slice(0, 20)
    : []
  const item = 'flex h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-base data-[selected=true]:bg-recessed'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-strong/20" />
        <Dialog.Content aria-describedby={undefined} className="fixed top-[12vh] left-1/2 z-50 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-lg bg-surface shadow-pop">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Command label="Search">
            <Command.Input value={query} onValueChange={setQuery} autoFocus placeholder="Search accounts, or jump to a page" className="h-12 w-full border-b border-fill px-4 text-lg outline-none" />
            <Command.List className="max-h-[380px] overflow-y-auto p-1.5">
              <Command.Empty className="px-3 py-6 text-base text-muted">No matches in your scope.</Command.Empty>
              <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
                {allNavItems.filter((i) => isVisible(i, user.role)).map((i) => (
                  <Command.Item key={i.id} value={`go ${i.label}`} onSelect={() => go(i.route)} className={item}>
                    {i.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Accounts" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted">
                {accounts.map((a) => (
                  <Command.Item key={a.id} value={`${a.name} ${a.contactName ?? ''} ${a.id}`} onSelect={() => go(`/accounts/${a.id}`)} className={item}>
                    <span className="truncate">{a.name}</span>
                    <span className="ml-auto shrink-0 text-sm text-muted">{a.kind} · {a.officeName}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

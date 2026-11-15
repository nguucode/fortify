import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import * as RTooltip from '@radix-ui/react-tooltip'
import { AppProvider } from '@/app/store'
import { allNavItems } from '@/app/sitemap'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { ToastProvider } from '@/components/ui/toast'
import { AccountsPage } from '@/pages/AccountsPage'
import { NotBuiltPage } from '@/pages/NotBuiltPage'

function Shell() {
  const [palette, setPalette] = useState(false)
  return (
    <div className="flex h-dvh flex-col">
      <TopBar onOpenPalette={() => setPalette(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} />
    </div>
  )
}

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <RTooltip.Provider>
          <BrowserRouter>
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Navigate to="/today" replace />} />
                <Route path="/accounts" element={<AccountsPage />} />
                {allNavItems.filter((i) => i.route !== '/accounts').map((i) => (
                  <Route key={i.id} path={`${i.route}/*`} element={<NotBuiltPage />} />
                ))}
                <Route path="/accounts/:id" element={<NotBuiltPage />} />
                <Route path="*" element={<NotBuiltPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RTooltip.Provider>
      </ToastProvider>
    </AppProvider>
  )
}

import { useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import * as RTooltip from '@radix-ui/react-tooltip'
import { AppProvider } from '@/app/store'
import { allNavItems } from '@/app/sitemap'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { RouteAnnouncer } from '@/components/shell/RouteAnnouncer'
import { ToastProvider } from '@/components/ui/toast'
import { AccountsPage } from '@/pages/AccountsPage'
import { NotBuiltPage } from '@/pages/NotBuiltPage'
import { LeadPage, LeadsPage } from '@/pages/LeadsPages'
import { OpportunityPage, PipelinePage } from '@/pages/PipelinePages'
import { PoliciesPage, PolicyPage } from '@/pages/PoliciesPages'
import { RenewalPage, RenewalsPage } from '@/pages/RenewalsPages'
import { ServicePage, ServiceRequestPage } from '@/pages/ServicePages'
import { AccountPage } from '@/pages/AccountPage'
import { TodayPage } from '@/pages/TodayPage'
import { ProductBacklog, ProductEpic, ProductGlossary, ProductLayout, ProductObjectModel, ProductOverview, ProductRoles, ProductSitemap, ProductStory, ProductStoryMap } from '@/pages/ProductPages'

const BUILT = new Set(['/accounts', '/today', '/leads', '/pipeline', '/policies', '/renewals', '/service', '/product'])

function Shell() {
  const [palette, setPalette] = useState(false)
  return (
    <div className="flex h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] rounded-md bg-surface px-3 py-2 text-base font-medium text-link shadow-pop focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to main content
      </a>
      <TopBar onOpenPalette={() => setPalette(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {/* scroll-padding keeps focused controls clear of sticky record headers (2.4.11). */}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 scroll-pt-40 overflow-y-auto outline-none">
          <Outlet />
        </main>
        <RouteAnnouncer />
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
                <Route path="/accounts/:id" element={<AccountPage />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/leads/:id" element={<LeadPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/pipeline/:id" element={<OpportunityPage />} />
                <Route path="/policies" element={<PoliciesPage />} />
                <Route path="/policies/:id" element={<PolicyPage />} />
                <Route path="/renewals" element={<RenewalsPage />} />
                <Route path="/renewals/:id" element={<RenewalPage />} />
                <Route path="/service" element={<ServicePage />} />
                <Route path="/service/:id" element={<ServiceRequestPage />} />
                <Route path="/product" element={<ProductLayout />}>
                  <Route index element={<ProductOverview />} />
                  <Route path="sitemap" element={<ProductSitemap />} />
                  <Route path="object-model" element={<ProductObjectModel />} />
                  <Route path="roles" element={<ProductRoles />} />
                  <Route path="glossary" element={<ProductGlossary />} />
                  <Route path="backlog" element={<ProductBacklog />} />
                  <Route path="backlog/map" element={<ProductStoryMap />} />
                  <Route path="epics/:code" element={<ProductEpic />} />
                  <Route path="stories/:id" element={<ProductStory />} />
                </Route>
                {allNavItems.filter((i) => !BUILT.has(i.route)).map((i) => (
                  <Route key={i.id} path={`${i.route}/*`} element={<NotBuiltPage />} />
                ))}
                <Route path="*" element={<NotBuiltPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RTooltip.Provider>
      </ToastProvider>
    </AppProvider>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'
import { useIsMobile } from '@/app/media'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import * as RTooltip from '@radix-ui/react-tooltip'
import { AppProvider } from '@/app/store'
import { allNavItems } from '@/app/sitemap'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { RouteAnnouncer } from '@/components/shell/RouteAnnouncer'
import { Shortcuts } from '@/components/shell/Shortcuts'
import { ToastProvider } from '@/components/ui/toast'
import { AccountsPage } from '@/pages/AccountsPage'
import { NotBuiltPage } from '@/pages/NotBuiltPage'
import { LeadPage, LeadsPage } from '@/pages/LeadsPages'
import { OpportunityPage, PipelinePage } from '@/pages/PipelinePages'
import { PoliciesPage, PolicyPage } from '@/pages/PoliciesPages'
import { RenewalPage, RenewalsPage } from '@/pages/RenewalsPages'
import { ServicePage, ServiceRequestPage } from '@/pages/ServicePages'
import { AccountPage } from '@/pages/AccountPage'
import { ContactPage, ContactsPage } from '@/pages/ContactsPages'
import { TasksPage } from '@/pages/TasksPage'
import { XDatesPage } from '@/pages/XDatesPages'
import { CertificatePage, CertificatesPage } from '@/pages/CertificatesPages'
import { ClaimPage, ClaimsPage } from '@/pages/ClaimsPages'
import { InboxPage } from '@/pages/InboxPage'
import { useInboundArrivals } from '@/mock/inboundArrivals'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsCarriers, SettingsDataSync, SettingsIndex, SettingsIntegrations, SettingsLayout, SettingsLicenses, SettingsOffices, SettingsPipeline, SettingsRoles, SettingsTemplates, SettingsUsers } from '@/pages/SettingsPages'
import { CalendarPage } from '@/pages/CalendarPage'
import { TodayPage } from '@/pages/TodayPage'
import { ProductBacklog, ProductEpic, ProductGlossary, ProductLayout, ProductObjectModel, ProductOverview, ProductRoles, ProductSitemap, ProductStory, ProductStoryMap } from '@/pages/ProductPages'

const BUILT = new Set(['/accounts', '/contacts', '/tasks', '/calendar', '/x-dates', '/certificates', '/claims', '/settings', '/inbox', '/reports', '/today', '/leads', '/pipeline', '/policies', '/renewals', '/service', '/product'])

/** US-FND-011: below 768px editing is hidden; say so once per session. */
function ReadOnlyBanner() {
  const mobile = useIsMobile()
  const [gone, setGone] = useState(() => {
    try {
      return sessionStorage.getItem('fortify.readOnlyBanner') === '0'
    } catch {
      return false
    }
  })
  if (!mobile || gone) return null
  return (
    <div className="flex items-center gap-2 border-b border-line bg-recessed px-4 py-2 text-sm text-ink">
      <span className="flex-1">Editing is available on tablet and desktop.</span>
      <button
        aria-label="Dismiss"
        onClick={() => {
          setGone(true)
          try {
            sessionStorage.setItem('fortify.readOnlyBanner', '0')
          } catch {
            /* storage blocked */
          }
        }}
        className="grid size-7 place-items-center rounded-md text-label hover:bg-fill"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}

function Shell() {
  const [palette, setPalette] = useState(false)
  // US-INB-011: the open conversation (if any) reads arrivals at once.
  useInboundArrivals(() => (location.pathname === '/inbox' ? new URLSearchParams(location.search).get('c') : null))
  return (
    <div className="flex h-dvh flex-col">
      <a href="#main" className="sr-only z-[60] rounded-md bg-surface px-3 py-2 text-base font-medium text-link shadow-pop focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to main content
      </a>
      <TopBar onOpenPalette={() => setPalette(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {/* scroll-padding keeps focused controls clear of sticky record headers (2.4.11). */}
        <main id="main" tabIndex={-1} className="m-2.5 min-w-0 flex-1 scroll-pt-40 overflow-y-auto rounded-lg bg-(--chrome-content) shadow-(--chrome-content-ring) outline-none max-sm:m-1.5">
          <ReadOnlyBanner />
          <Outlet />
        </main>
        <RouteAnnouncer />
        <Shortcuts />
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
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/x-dates" element={<XDatesPage />} />
                <Route path="/certificates" element={<CertificatesPage />} />
                <Route path="/certificates/:id" element={<CertificatePage />} />
                <Route path="/claims" element={<ClaimsPage />} />
                <Route path="/claims/:id" element={<ClaimPage />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsIndex />} />
                  <Route path="users" element={<SettingsUsers />} />
                  <Route path="offices" element={<SettingsOffices />} />
                  <Route path="roles" element={<SettingsRoles />} />
                  <Route path="pipeline" element={<SettingsPipeline />} />
                  <Route path="templates" element={<SettingsTemplates />} />
                  <Route path="carriers" element={<SettingsCarriers />} />
                  <Route path="licenses" element={<SettingsLicenses />} />
                  <Route path="data-sync" element={<SettingsDataSync />} />
                  <Route path="integrations" element={<SettingsIntegrations />} />
                </Route>
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/contacts/:id" element={<ContactPage />} />
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
                  <Route path="epics" element={<Navigate to="/product/backlog" replace />} />
                  <Route path="stories" element={<Navigate to="/product/backlog" replace />} />
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

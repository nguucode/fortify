import { Link, useLocation } from 'react-router'
import { Hammer } from 'lucide-react'
import { allNavItems } from '@/app/sitemap'
import { EmptyState } from '@/components/ui/states'

/** Routes from sitemap.yaml that later build waves deliver. Honest placeholder, not a fake screen. */
export function NotBuiltPage() {
  const { pathname } = useLocation()
  const base = '/' + pathname.split('/')[1]
  const item = allNavItems.find((i) => i.route === base)
  const isRecord = pathname.split('/').length > 2
  return (
    <div className="px-8 pt-6">
      <h1 className="text-title font-semibold text-strong">{isRecord ? `${item?.label.replace(/s$/, '') ?? 'Record'} page` : (item?.label ?? 'Not found')}</h1>
      <EmptyState
        icon={Hammer}
        title="Not built yet"
        body={`This screen is specified in the backlog (route ${isRecord ? base + '/:id' : base}) and arrives in a later build wave. See the Product menu for its stories once that ships.`}
        action={<Link to="/accounts" className="text-base font-medium text-link hover:underline">Back to Accounts</Link>}
      />
    </div>
  )
}

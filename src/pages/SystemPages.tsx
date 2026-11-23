import { Link } from 'react-router'
import { Lock, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { Button } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'

/** US-FND-006: out-of-scope records name the owner and offer a (mock) access request. */
export function AccessDenied({ what, owner, area }: { what: string; owner?: string; /** An area of the app (Settings), not a record: names who can use it instead of an owner's Book. */ area?: { who: string } }) {
  const toast = useToast()
  return (
    <div className="px-8 pt-6">
      <EmptyState
        page
        icon={Lock}
        title={area ? `${what} are for ${area.who}` : `You don’t have access to this ${what}`}
        body={area ? 'Ask an Admin if something here needs to change.' : owner ? `It belongs to ${owner}’s Book. Ask them or a Principal to share it.` : 'It is outside your scope.'}
        action={area ? undefined : <Button onClick={() => toast('Access request sent (demo).', 'success')}>Request access</Button>}
      />
    </div>
  )
}

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="px-8 pt-6">
      <EmptyState page icon={SearchX} title={`This ${what} doesn’t exist`} body="It may have been merged, archived, or the link is wrong." action={<Link to="/today" className="text-base font-medium text-link hover:underline">Go to Today</Link>} />
    </div>
  )
}

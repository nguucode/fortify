import type { Dataset, User } from '@/domain/types'
import { dateOf } from './hooks'

/** SET-008 / INB-005: values for {{merge.fields}} from an Account, its Contact, and the sender. */
export function mergeValues(data: Dataset, accountId: string | null, contactId: string | null, user: User): Record<string, string | undefined> {
  const acc = data.accounts.find((a) => a.id === accountId)
  const contact = data.contacts.find((c) => c.id === (contactId ?? acc?.primaryContactId))
  const pol = acc ? data.policies.find((p) => p.accountId === acc.id && data.terms.some((t) => t.policyId === p.id && t.status === 'Active')) : undefined
  const term = pol ? data.terms.filter((x) => x.policyId === pol.id).sort((a, b) => b.expirationOffset - a.expirationOffset)[0] : undefined
  const office = data.offices.find((o) => o.id === (acc?.officeId ?? user.officeId))
  return {
    'account.name': acc?.name,
    'contact.firstName': contact?.firstName ?? contact?.name.split(' ')[0],
    'contact.lastName': contact?.lastName ?? contact?.name.split(' ').slice(1).join(' '),
    'policy.number': pol?.policyNumber,
    'policy.line': pol?.line,
    'policy.carrier': data.carriers.find((c) => c.id === pol?.carrierId)?.name,
    'term.expirationDate': term ? dateOf(term.expirationOffset) : undefined,
    'term.premium': term ? `$${term.premium.toLocaleString('en-US')}` : undefined,
    'user.name': user.name,
    'user.firstName': user.name.split(' ')[0],
    'office.name': office?.name,
    'office.phone': office?.phone,
  }
}

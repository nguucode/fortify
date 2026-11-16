import type { Account, User } from './types'

export type Scope = 'Own' | 'Office' | 'Agency'

/** spec/ia/roles.md › Scope */
export function scopeOf(user: User): Scope {
  if (user.role === 'producer') return 'Own'
  if (user.role === 'account-manager') return 'Office'
  return 'Agency'
}

export function canSeeAccount(user: User, a: Pick<Account, 'producerId' | 'accountManagerId' | 'officeId'>): boolean {
  const scope = scopeOf(user)
  if (scope === 'Agency') return true
  if (scope === 'Office') return a.officeId === user.officeId
  return a.producerId === user.id || a.accountManagerId === user.id
}

export function visibleAccounts<T extends Pick<Account, 'producerId' | 'accountManagerId' | 'officeId'>>(user: User, accounts: T[]): T[] {
  return accounts.filter((a) => canSeeAccount(user, a))
}

/** spec/ia/roles.md › Commission: hidden entirely, never masked. */
export function canSeeCommission(viewer: User, producerId: string): boolean {
  if (viewer.role === 'principal' || viewer.role === 'admin') return true
  return viewer.role === 'producer' && viewer.id === producerId
}

type Scoped = Pick<Account, 'producerId' | 'accountManagerId' | 'officeId'>

/** rules.md: qualifying, disqualifying, and logging attempts belong to the assigned Producer or a Principal. */
export function canWorkLead(user: User, lead: { assigneeId: string | null; officeId: string }): boolean {
  if (user.role === 'principal') return true
  return user.role === 'producer' && lead.assigneeId === user.id
}

/** roles.md: Producer and Principal edit; Account Managers edit Remarket Opportunities only; Admin reads. */
export function canEditOpportunity(user: User, account: Scoped, type: 'New business' | 'Cross-sell' | 'Remarket'): boolean {
  if (!canSeeAccount(user, account)) return false
  if (user.role === 'producer' || user.role === 'principal') return true
  return user.role === 'account-manager' && type === 'Remarket'
}

/** US-REN-004: Account Manager in scope and Principal always; Producer only while remarketing; Admin never. */
export function canEditRenewal(user: User, account: Scoped, status: string): boolean {
  if (!canSeeAccount(user, account)) return false
  if (user.role === 'account-manager' || user.role === 'principal') return true
  return user.role === 'producer' && status === 'Remarketing'
}

/** roles.md "C, E own": Producers edit only Service Requests they created. */
export function canEditService(user: User, account: Scoped, createdById: string): boolean {
  if (!canSeeAccount(user, account)) return false
  if (user.role === 'account-manager' || user.role === 'principal') return true
  return user.role === 'producer' && createdById === user.id
}

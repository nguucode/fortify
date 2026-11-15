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

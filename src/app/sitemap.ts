import { parse } from 'yaml'
import raw from '../../spec/ia/sitemap.yaml?raw'
import type { Role } from '@/domain/types'

/** spec/ia/sitemap.yaml is the single source for navigation (decision F4). Nothing here is hard-coded. */
export interface NavItem {
  id: string
  label: string
  route: string
  visibleTo?: Role[]
  savedViews?: string[]
  flag?: string
}
export interface NavGroup {
  group: string | null
  items: NavItem[]
}
interface Sitemap {
  sidebar: (NavItem | { group: string; items: NavItem[] })[]
  footer: NavItem[]
}

const sitemap = parse(raw) as Sitemap

export const sidebarGroups: NavGroup[] = sitemap.sidebar.reduce<NavGroup[]>((groups, entry) => {
  if ('group' in entry) groups.push({ group: entry.group, items: entry.items })
  else if (groups.length && groups[groups.length - 1].group === null) groups[groups.length - 1].items.push(entry)
  else groups.push({ group: null, items: [entry] })
  return groups
}, [])

export const footerItems: NavItem[] = sitemap.footer

export const allNavItems: NavItem[] = [...sidebarGroups.flatMap((g) => g.items), ...footerItems]

export function isVisible(item: NavItem, role: Role): boolean {
  if (item.flag && import.meta.env[item.flag] === 'false') return false
  return !item.visibleTo || item.visibleTo.includes(role)
}

export function savedViewsFor(route: string): string[] {
  return allNavItems.find((i) => i.route === route)?.savedViews ?? []
}

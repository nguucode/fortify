import { parse } from 'yaml'
import { parseStory, sitemapRoutes, validateSpec, type StoryFrontmatter } from '@/spec/validate'
import sitemapRaw from '../../spec/ia/sitemap.yaml?raw'
import glossaryRaw from '../../GLOSSARY.md?raw'

/** US-PRD-002: every spec file is bundled at build time; the Product menu reads only from here. */
const files = import.meta.glob('../../spec/**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const real = Object.entries(files).filter(([p]) => !p.split('/').pop()!.startsWith('._'))
const rel = (p: string) => p.replace(/^.*\/spec\//, '')

export const EPIC_ORDER = ['FND', 'PRD', 'HOM', 'INB', 'LEA', 'ACC', 'PIP', 'XDT', 'POL', 'REN', 'SRV', 'CRT', 'CLM', 'WRK', 'RPT', 'SET']
export const SECTIONS = ['Story', 'Acceptance criteria', 'UI states', 'Design notes', 'FE notes', 'Mock data'] as const

export interface Story extends StoryFrontmatter {
  path: string
  sections: Record<(typeof SECTIONS)[number], string>
  body: string
}
export interface Epic {
  code: string
  name: string
  route: string
  summary: string
  body: string
}

function splitSections(body: string) {
  const out = {} as Story['sections']
  for (const h of SECTIONS) {
    const m = new RegExp(`^## ${h}\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(body)
    out[h] = m?.[1].trim() ?? ''
  }
  return out
}

export const stories: Story[] = real
  .filter(([p]) => /US-[A-Z]{3}-\d{3}\.md$/.test(p))
  .map(([p, text]) => {
    const { fm, body } = parseStory(text)
    const f = fm as StoryFrontmatter
    return { ...f, dependsOn: f.dependsOn ?? [], path: `spec/${rel(p)}`, body, sections: splitSections(body) }
  })
  .sort((a, b) => EPIC_ORDER.indexOf(a.epic) - EPIC_ORDER.indexOf(b.epic) || a.id.localeCompare(b.id))
export const storyById = new Map(stories.map((s) => [s.id, s]))

export const epics: Epic[] = real
  .filter(([p]) => p.endsWith('/epic.md'))
  .map(([, text]) => {
    const { fm, body } = parseStory(text)
    return { ...(fm as Omit<Epic, 'body'>), body }
  })
  .sort((a, b) => EPIC_ORDER.indexOf(a.code) - EPIC_ORDER.indexOf(b.code))

export const docs = Object.fromEntries(real.filter(([p]) => p.includes('/ia/') || p.endsWith('README.md') || p.endsWith('build-order.md')).map(([p, t]) => [rel(p), t])) as Record<string, string>

export const sitemap = parse(sitemapRaw) as {
  topBar: { id: string; label: string }[]
  sidebar: ({ id: string; label: string; route: string; visibleTo?: string[]; savedViews?: string[]; views?: string[]; tabs?: string[]; record?: string } | { group: string; items: { id: string; label: string; route: string; visibleTo?: string[]; savedViews?: string[]; views?: string[]; tabs?: string[]; record?: string }[] })[]
  footer: { id: string; label: string; route: string; visibleTo?: string[]; pages?: string[] }[]
  system: { id: string; route: string }[]
}
export const routes = sitemapRoutes(sitemapRaw)

/** Stories per route; a story's route is counted under its base route (rules.md). */
export function storiesForRoute(route: string) {
  return stories.filter((s) => s.routes.includes(route))
}

export const sessions = (list: Story[]) => list.reduce((n, s) => n + (s.size === 'M' ? 1 : 0.5), 0)

export const health = validateSpec(
  real.filter(([p]) => /US-[A-Z]{3}-\d{3}\.md$/.test(p)).map(([p, text]) => ({ path: `epics/${rel(p).replace(/^epics\//, '')}`, text })),
  routes,
)

// ---- Glossary (US-PRD-009) ----
export interface Term {
  name: string
  slug: string
  section: string
  definition: string
  avoid: string[]
}
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const glossary: Term[] = (() => {
  const out: Term[] = []
  let section = ''
  const lines = glossaryRaw.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('## ')) section = l.slice(3).trim()
    const m = /^\*\*(.+?)\*\*:\s*$/.exec(l)
    if (!m) continue
    const def: string[] = []
    let avoid: string[] = []
    for (let j = i + 1; j < lines.length && lines[j].trim() && !lines[j].startsWith('**'); j++) {
      if (lines[j].startsWith('_Avoid_:')) avoid = lines[j].replace('_Avoid_:', '').split(',').map((x) => x.trim()).filter(Boolean)
      else def.push(lines[j])
    }
    out.push({ name: m[1], slug: slugify(m[1]), section, definition: def.join(' '), avoid })
  }
  return out
})()

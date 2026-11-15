import { parse } from 'yaml'
import { z } from 'zod'

/** Story frontmatter (spec/README.md). Shared by the validator and the Product menu loader. */
export const StoryFrontmatter = z.object({
  id: z.string().regex(/^US-[A-Z]{3}-\d{3}$/),
  title: z.string().min(1),
  epic: z.string().regex(/^[A-Z]{3}$/),
  roles: z.array(z.enum(['Producer', 'Account Manager', 'Principal', 'Admin'])).min(1),
  priority: z.enum(['P0', 'P1', 'P2']),
  status: z.enum(['Draft', 'Ready', 'In design', 'In build', 'Done']),
  size: z.enum(['S', 'M']),
  routes: z.array(z.string()).min(1),
  dependsOn: z.array(z.string()).default([]),
})
export type StoryFrontmatter = z.infer<typeof StoryFrontmatter>

const SECTIONS = ['Story', 'Acceptance criteria', 'UI states', 'Design notes', 'FE notes', 'Mock data']

export function parseStory(text: string): { fm: unknown; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text)
  if (!m) return { fm: null, body: text }
  return { fm: parse(m[1]), body: m[2] }
}

/** Every route path declared anywhere in sitemap.yaml. */
export function sitemapRoutes(yamlText: string): Set<string> {
  const routes = new Set<string>()
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if ((k === 'route' || k === 'record') && typeof v === 'string') routes.add(v)
        else if (k === 'pages' && Array.isArray(v)) v.forEach((p) => typeof p === 'string' && routes.add(p))
        else walk(v)
      }
    }
  }
  walk(parse(yamlText))
  return routes
}

export function validateSpec(files: { path: string; text: string }[], routes: Set<string>): string[] {
  const errors: string[] = []
  const stories = new Map<string, StoryFrontmatter>()
  const parsed: StoryFrontmatter[] = []

  for (const { path, text } of files) {
    const { fm, body } = parseStory(text)
    const r = StoryFrontmatter.safeParse(fm)
    if (!r.success) {
      errors.push(`${path}: invalid frontmatter (${r.error.issues.map((i) => i.path.join('.')).join(', ')})`)
      continue
    }
    const s = r.data
    if (stories.has(s.id)) errors.push(`${path}: duplicate id ${s.id}`)
    stories.set(s.id, s)
    parsed.push(s)
    const [folder, file] = path.split('/').slice(-2)
    if (file !== `${s.id}.md`) errors.push(`${path}: file name does not match id ${s.id}`)
    if (folder !== s.epic.toLowerCase() || s.id.slice(3, 6) !== s.epic) errors.push(`${path}: epic folder or code does not match ${s.id}`)
    for (const h of SECTIONS) if (!new RegExp(`^## ${h}$`, 'm').test(body)) errors.push(`${path}: missing section "${h}"`)
    for (const route of s.routes) if (!routes.has(route)) errors.push(`${path}: route ${route} not in sitemap`)
  }

  for (const s of parsed) {
    for (const d of s.dependsOn) {
      const dep = stories.get(d)
      if (!dep) errors.push(`${s.id}: unknown dependsOn ${d}`)
      else if (s.priority === 'P0' && dep.priority !== 'P0') errors.push(`${s.id}: P0 depends on ${dep.priority} ${d}`)
    }
  }
  return errors
}

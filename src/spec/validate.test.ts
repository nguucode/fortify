// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { validateSpec, sitemapRoutes } from './validate'

const story = (id: string, fm: Record<string, string>, body = SECTIONS) =>
  `---\nid: ${id}\ntitle: T\nepic: ${id.slice(3, 6)}\nroles: [Producer]\npriority: ${fm.priority ?? 'P1'}\nstatus: Draft\nsize: S\nroutes: [${fm.routes ?? '/accounts'}]\ndependsOn: [${fm.dependsOn ?? ''}]\n---\n${body}`
const SECTIONS = ['Story', 'Acceptance criteria', 'UI states', 'Design notes', 'FE notes', 'Mock data'].map((h) => `## ${h}\n\nx\n`).join('\n')
const routes = new Set(['/accounts', '/today'])

describe('validateSpec rules (decision F5)', () => {
  it('passes a well-formed story', () => {
    expect(validateSpec([{ path: 'epics/acc/US-ACC-001.md', text: story('US-ACC-001', {}) }], routes)).toEqual([])
  })

  it('reports duplicate ids, unknown dependsOn, unknown routes, and missing sections', () => {
    const errs = validateSpec(
      [
        { path: 'epics/acc/US-ACC-001.md', text: story('US-ACC-001', { dependsOn: 'US-ACC-404', routes: '/nowhere' }) },
        { path: 'epics/acc/US-ACC-002.md', text: story('US-ACC-001', {}, '## Story\n') },
      ],
      routes,
    )
    expect(errs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('duplicate id US-ACC-001'),
        expect.stringContaining('unknown dependsOn US-ACC-404'),
        expect.stringContaining('route /nowhere not in sitemap'),
        expect.stringContaining('missing section "Acceptance criteria"'),
        expect.stringContaining('file name does not match id'),
      ]),
    )
  })

  it('reports an Epic folder that does not match the id', () => {
    const errs = validateSpec([{ path: 'epics/lea/US-ACC-001.md', text: story('US-ACC-001', {}) }], routes)
    expect(errs).toEqual([expect.stringContaining('epic folder')])
  })

  it('reports a P0 story that depends on a non-P0 story', () => {
    const errs = validateSpec(
      [
        { path: 'epics/acc/US-ACC-001.md', text: story('US-ACC-001', { priority: 'P0', dependsOn: 'US-ACC-002' }) },
        { path: 'epics/acc/US-ACC-002.md', text: story('US-ACC-002', { priority: 'P1' }) },
      ],
      routes,
    )
    expect(errs).toEqual([expect.stringContaining('P0 depends on P1 US-ACC-002')])
  })
})

describe('the repo spec', () => {
  it('is valid', () => {
    const root = join(import.meta.dirname, '../../spec')
    const files = readdirSync(join(root, 'epics'), { recursive: true, encoding: 'utf8' })
      .filter((f) => /US-[A-Z]{3}-\d{3}\.md$/.test(f) && !f.split('/').pop()!.startsWith('._'))
      .map((f) => ({ path: `epics/${f}`, text: readFileSync(join(root, 'epics', f), 'utf8') }))
    expect(files.length).toBeGreaterThan(190)
    const sitemap = readFileSync(join(root, 'ia/sitemap.yaml'), 'utf8')
    expect(validateSpec(files, sitemapRoutes(sitemap))).toEqual([])
  })
})

import { marked } from 'marked'
import { useNavigate } from 'react-router'
import { routes, storyById } from './spec'

/**
 * US-PRD-003. Renders repo spec markdown (trusted, bundled at build time; never user input).
 * Story IDs link to their story page, spec links map to Product routes, routes in code link to the sitemap.
 */
const SPEC_LINKS: [RegExp, string][] = [
  [/(^|\/)GLOSSARY\.md(#.*)?$/, '/product/glossary'],
  [/(^|\/)rules\.md(#.*)?$/, '/product/object-model#business-rules'],
  [/(^|\/)object-model\.md(#.*)?$/, '/product/object-model'],
  [/(^|\/)roles\.md(#.*)?$/, '/product/roles'],
  [/(^|\/)sitemap\.yaml(#.*)?$/, '/product/sitemap'],
]

function linkify(md: string) {
  // Story IDs outside code spans become links; unknown IDs get a danger underline.
  return md
    .split(/(`[^`]*`)/g)
    .map((part) => {
      if (part.startsWith('`')) {
        const route = part.slice(1, -1)
        return routes.has(route) ? `[${part}](/product/sitemap#route-${encodeURIComponent(route)})` : part
      }
      return part.replace(/\bUS-[A-Z]{3}-\d{3}\b/g, (id) => (storyById.has(id) ? `[${id}](/product/stories/${id})` : `<span class="underline decoration-danger" title="No story with this ID">${id}</span>`))
    })
    .join('')
}

marked.use({
  renderer: {
    link({ href, text }) {
      const mapped = SPEC_LINKS.find(([re]) => re.test(href))?.[1]
      const target = mapped ?? href
      const internal = target.startsWith('/')
      return internal ? `<a href="${target}" data-internal>${text}</a>` : `<a href="${target}" target="_blank" rel="noreferrer">${text}</a>`
    },
  },
})

export function Markdown({ source }: { source: string }) {
  const navigate = useNavigate()
  const html = marked.parse(linkify(source), { async: false }) as string
  return (
    <div
      className="prose-fortify"
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a[data-internal]') as HTMLAnchorElement | null
        if (a) {
          e.preventDefault()
          navigate(a.getAttribute('href')!)
        }
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

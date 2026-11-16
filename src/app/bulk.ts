/** P2 bulk stories: "10 updated, 2 skipped (SR-1012: Done; ...)" */
export function bulkSummary(r: { updated: number; skipped: { id: string; reason: string }[] }, verb = 'updated') {
  if (!r.skipped.length) return `${r.updated} ${verb}`
  const why = r.skipped.slice(0, 3).map((x) => `${x.id}: ${x.reason}`).join('; ')
  return `${r.updated} ${verb}, ${r.skipped.length} skipped (${why}${r.skipped.length > 3 ? '; …' : ''})`
}

/** "Weekly shopping" -> "Weekly-shopping", for building a clean export filename. */
export function slugifyFilenamePart(name: string): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'Shopping-list'
}

/** e.g. "Weekly-shopping.shopping-list.json" */
export function listExportFilename(listName: string): string {
  return `${slugifyFilenamePart(listName)}.shopping-list.json`
}

/** e.g. "ShoppingList-backup-2026-08-07.json" */
export function backupFilename(exportedAt: string): string {
  const date = exportedAt.slice(0, 10)
  return `ShoppingList-backup-${date}.json`
}

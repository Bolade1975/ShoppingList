import { generateId } from '../domain/id'
import type { ArchivedItem } from '../domain/types'
import type { ShoppingListDB } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export async function listArchivedItems(db: ShoppingListDB): Promise<ArchivedItem[]> {
  const items = await db.itemArchive.toArray()
  return items.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getArchivedItemByName(
  db: ShoppingListDB,
  name: string,
): Promise<ArchivedItem | undefined> {
  return db.itemArchive.where('normalizedName').equals(normalizeName(name)).first()
}

/** Autocomplete suggestions: archive entries whose name contains `query`, prefix matches ranked first. */
export async function searchArchivedItems(
  db: ShoppingListDB,
  query: string,
  limit = 8,
): Promise<ArchivedItem[]> {
  const normalizedQuery = normalizeName(query)
  if (!normalizedQuery) return []
  const all = await db.itemArchive.toArray()
  return all
    .filter((item) => item.normalizedName.includes(normalizedQuery))
    .sort((a, b) => {
      const aPrefix = a.normalizedName.startsWith(normalizedQuery)
      const bPrefix = b.normalizedName.startsWith(normalizedQuery)
      if (aPrefix !== bPrefix) return aPrefix ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

export type RememberItemInput = {
  name: string
  categoryId?: string
  unitId?: string
  quantity?: string
}

/**
 * Records or updates an item's usual category/unit/quantity in the archive.
 * Called every time an item is added to or edited on a list or template, so
 * the archive always reflects the most recently used values — including
 * "no category"/"no unit" when that's what the user explicitly chose.
 */
export async function rememberItem(
  db: ShoppingListDB,
  input: RememberItemInput,
): Promise<ArchivedItem> {
  const trimmed = input.name.trim()
  if (!trimmed) throw new Error('Item name is required.')
  const normalizedName = normalizeName(trimmed)
  const existing = await getArchivedItemByName(db, trimmed)
  const record: ArchivedItem = {
    id: existing?.id ?? generateId(),
    name: trimmed,
    normalizedName,
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
    ...(input.quantity !== undefined && input.quantity.trim() !== ''
      ? { lastQuantity: input.quantity }
      : {}),
    updatedAt: nowIso(),
  }
  await db.itemArchive.put(record)
  return record
}

export type UpdateArchivedItemInput = {
  name: string
  categoryId?: string
  unitId?: string
}

/** Edits an archived item's remembered name/category/unit directly from the archive-management screen. */
export async function updateArchivedItem(
  db: ShoppingListDB,
  id: string,
  input: UpdateArchivedItemInput,
): Promise<ArchivedItem> {
  const existing = await db.itemArchive.get(id)
  if (!existing) throw new Error(`Archived item ${id} not found`)
  const name = input.name.trim()
  if (!name) throw new Error('Item name is required.')
  const updated: ArchivedItem = {
    id: existing.id,
    name,
    normalizedName: normalizeName(name),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
    ...(existing.lastQuantity !== undefined ? { lastQuantity: existing.lastQuantity } : {}),
    updatedAt: nowIso(),
  }
  await db.itemArchive.put(updated)
  return updated
}

export async function deleteArchivedItem(db: ShoppingListDB, id: string): Promise<void> {
  await db.itemArchive.delete(id)
}

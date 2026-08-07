import { generateId } from '../domain/id'
import type { Category } from '../domain/types'
import type { ShoppingListDB } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listCategories(db: ShoppingListDB): Promise<Category[]> {
  const categories = await db.categories.toArray()
  return categories.sort((a, b) => a.order - b.order)
}

async function requireCategory(db: ShoppingListDB, id: string): Promise<Category> {
  const category = await db.categories.get(id)
  if (!category) throw new Error(`Category ${id} not found`)
  return category
}

export async function createCategory(db: ShoppingListDB, name: string): Promise<Category> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Category name is required.')
  const existing = await db.categories.count()
  const category: Category = {
    id: generateId(),
    name: trimmed,
    order: existing,
    createdAt: nowIso(),
  }
  await db.categories.add(category)
  return category
}

export async function renameCategory(
  db: ShoppingListDB,
  id: string,
  name: string,
): Promise<Category> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Category name is required.')
  const category = await requireCategory(db, id)
  const updated: Category = { ...category, name: trimmed }
  await db.categories.put(updated)
  return updated
}

export async function deleteCategory(db: ShoppingListDB, id: string): Promise<void> {
  await db.categories.delete(id)
}

/** Persists a full reordering — `orderedIds` must list every category id exactly once. */
export async function reorderCategories(db: ShoppingListDB, orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    await Promise.all(orderedIds.map((id, index) => db.categories.update(id, { order: index })))
  })
}

/**
 * Finds a category by case-insensitive name, or creates one appended to the
 * end of the order — used when importing an item that references a category
 * by name, so re-importing the same file never creates duplicate categories.
 */
export async function findOrCreateCategoryByName(
  db: ShoppingListDB,
  name: string | undefined,
): Promise<string | undefined> {
  const trimmed = name?.trim()
  if (!trimmed) return undefined
  const existing = await db.categories.toArray()
  const match = existing.find((category) => category.name.toLowerCase() === trimmed.toLowerCase())
  if (match) return match.id
  const created = await createCategory(db, trimmed)
  return created.id
}

import Dexie, { type Table } from 'dexie'
import { DEFAULT_CATEGORIES, DEFAULT_UNITS, KOLONIAL_CATEGORY_NAME } from '../domain/constants'
import { generateId } from '../domain/id'
import type { ArchivedItem, Category, ShoppingList, ShoppingTemplate, Unit } from '../domain/types'

const STORES = {
  lists: 'id, status',
  templates: 'id',
  itemArchive: 'id, &normalizedName',
  categories: 'id, order',
  units: 'id',
}

/**
 * Additively inserts the built-in "Kolonial" category for a device that
 * already had a categories table before it was introduced — a brand-new
 * install gets it for free via DEFAULT_CATEGORIES in on('populate') below,
 * so this only ever needs to run once per existing device (Dexie guarantees
 * that as part of the version 1 -> 2 upgrade), but it's also written to be
 * safe to call more than once: if a category named "Kolonial" already
 * exists (case-insensitively), it does nothing.
 *
 * No existing category row is read for anything other than finding where
 * "Andet"/"Other" currently sits, and none is ever written — the new row's
 * `order` is set to a value strictly between that category and whatever
 * currently precedes it (a plain `-0.5` offset), so it slots in without
 * renumbering anything else and without disturbing a user's custom order.
 */
async function insertKolonialCategory(categories: Table<Category, string>): Promise<void> {
  const existing = await categories.toArray()
  const alreadyPresent = existing.some(
    (category) => category.name.trim().toLowerCase() === KOLONIAL_CATEGORY_NAME.toLowerCase(),
  )
  if (alreadyPresent) return

  const otherCategory = existing.find((category) => {
    const normalized = category.name.trim().toLowerCase()
    return normalized === 'other' || normalized === 'andet'
  })
  const order =
    otherCategory !== undefined
      ? otherCategory.order - 0.5
      : existing.length > 0
        ? Math.max(...existing.map((category) => category.order)) + 1
        : 0

  await categories.add({
    id: generateId(),
    name: KOLONIAL_CATEGORY_NAME,
    order,
    createdAt: new Date().toISOString(),
  })
}

// Schema changes must add a new .version(n).stores({...}) call (with an
// .upgrade() function if existing record shapes change) rather than editing
// a previous version in place, so an update to the app never drops or
// corrupts a device's existing lists.
export class ShoppingListDB extends Dexie {
  lists!: Table<ShoppingList, string>
  templates!: Table<ShoppingTemplate, string>
  itemArchive!: Table<ArchivedItem, string>
  categories!: Table<Category, string>
  units!: Table<Unit, string>

  // A name parameter is accepted so tests can create isolated,
  // independently named databases instead of sharing the app's real one.
  constructor(name = 'ShoppingList') {
    super(name)
    this.version(1).stores(STORES)

    // No index/table shape changes — this version only exists to carry the
    // data-only "Kolonial" migration below for devices that already had a
    // database before it was added.
    this.version(2)
      .stores(STORES)
      .upgrade(async (tx) => {
        await insertKolonialCategory(tx.table<Category, string>('categories'))
      })

    // Runs exactly once, the first time this named database is created —
    // never again on later opens — so a fresh install gets a sensible
    // starting point without ever re-seeding over user edits or deletions.
    this.on('populate', () => {
      const now = new Date().toISOString()
      void this.categories.bulkAdd(
        DEFAULT_CATEGORIES.map((name, index) => ({
          id: generateId(),
          name,
          order: index,
          createdAt: now,
        })),
      )
      void this.units.bulkAdd(
        DEFAULT_UNITS.map((name) => ({ id: generateId(), name, createdAt: now })),
      )
    })
  }
}

export const db = new ShoppingListDB()

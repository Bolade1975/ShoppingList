import Dexie, { type Table } from 'dexie'
import { DEFAULT_CATEGORIES, DEFAULT_UNITS } from '../domain/constants'
import { generateId } from '../domain/id'
import type { ArchivedItem, Category, ShoppingList, ShoppingTemplate, Unit } from '../domain/types'

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
    this.version(1).stores({
      lists: 'id, status',
      templates: 'id',
      itemArchive: 'id, &normalizedName',
      categories: 'id, order',
      units: 'id',
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

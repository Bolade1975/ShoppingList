import Dexie, { type Table } from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { generateId } from '../domain/id'
import type { Category } from '../domain/types'
import { listCategories } from './categoryRepository'
import { ShoppingListDB } from './schema'

const STORES = {
  lists: 'id, status',
  templates: 'id',
  itemArchive: 'id, &normalizedName',
  categories: 'id, order',
  units: 'id',
}

/**
 * A stand-in for the pre-"Kolonial" ShoppingListDB — only declares version
 * 1, so opening a real ShoppingListDB against the same database name
 * afterwards must trigger the version 1 -> 2 upgrade exactly as it would on
 * a real device that installed the app before "Kolonial" existed.
 */
class LegacyDB extends Dexie {
  categories!: Table<Category, string>
  constructor(name: string) {
    super(name)
    this.version(1).stores(STORES)
  }
}

async function seedLegacyCategories(name: string, categories: Category[]): Promise<void> {
  const legacy = new LegacyDB(name)
  await legacy.categories.bulkAdd(categories)
  legacy.close()
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: generateId(),
    name: 'Test',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

let dbName: string

beforeEach(() => {
  dbName = `test-kolonial-migration-${crypto.randomUUID()}`
})

describe('"Kolonial" migration for an existing install', () => {
  it('inserts Kolonial immediately before an existing "Other" category without touching any other row', async () => {
    await seedLegacyCategories(dbName, [
      makeCategory({ id: 'c-fruit', name: 'Fruit and vegetables', order: 0 }),
      makeCategory({ id: 'c-dairy', name: 'Dairy', order: 1 }),
      makeCategory({ id: 'c-other', name: 'Other', order: 2 }),
    ])

    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)

    expect(categories.map((c) => c.name)).toEqual([
      'Fruit and vegetables',
      'Dairy',
      'Kolonial',
      'Other',
    ])
    // Every pre-existing row keeps its exact id, name, order and createdAt.
    expect(categories[0]).toMatchObject({ id: 'c-fruit', name: 'Fruit and vegetables', order: 0 })
    expect(categories[1]).toMatchObject({ id: 'c-dairy', name: 'Dairy', order: 1 })
    expect(categories[3]).toMatchObject({ id: 'c-other', name: 'Other', order: 2 })
  })

  it('preserves a customized order — Kolonial slots in right before wherever "Andet" currently sits', async () => {
    // Simulates a user who already reordered categories and renamed "Other" to "Andet".
    await seedLegacyCategories(dbName, [
      makeCategory({ id: 'c-dairy', name: 'Dairy', order: 0 }),
      makeCategory({ id: 'c-andet', name: 'Andet', order: 1 }),
      makeCategory({ id: 'c-fruit', name: 'Fruit and vegetables', order: 2 }),
    ])

    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)

    expect(categories.map((c) => c.name)).toEqual([
      'Dairy',
      'Kolonial',
      'Andet',
      'Fruit and vegetables',
    ])
    expect(categories.map((c) => c.id)).toEqual([
      'c-dairy',
      categories[1]!.id,
      'c-andet',
      'c-fruit',
    ])
  })

  it('appends Kolonial at the end without rearranging anything when no "Other"/"Andet" category exists', async () => {
    await seedLegacyCategories(dbName, [
      makeCategory({ id: 'c-dairy', name: 'Dairy', order: 0 }),
      makeCategory({ id: 'c-fruit', name: 'Fruit and vegetables', order: 1 }),
    ])

    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)

    expect(categories.map((c) => c.name)).toEqual(['Dairy', 'Fruit and vegetables', 'Kolonial'])
    expect(categories.map((c) => c.id)).toEqual(['c-dairy', 'c-fruit', categories[2]!.id])
  })

  it('does not create a duplicate if a "Kolonial" category is already present', async () => {
    await seedLegacyCategories(dbName, [
      makeCategory({ id: 'c-other', name: 'Other', order: 0 }),
      makeCategory({ id: 'c-kolonial', name: 'Kolonial', order: -0.5 }),
    ])

    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)

    expect(categories.filter((c) => c.name.toLowerCase() === 'kolonial')).toHaveLength(1)
  })

  it('matches "Kolonial" case-insensitively so a differently-cased existing entry is not duplicated', async () => {
    await seedLegacyCategories(dbName, [
      makeCategory({ id: 'c-other', name: 'Other', order: 0 }),
      makeCategory({ id: 'c-kolonial', name: 'kolonial', order: -0.5 }),
    ])

    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)

    expect(categories.filter((c) => c.name.toLowerCase() === 'kolonial')).toHaveLength(1)
  })
})

describe('fresh install', () => {
  it('seeds Kolonial once, in the right place, with no migration involved', async () => {
    const db = new ShoppingListDB(dbName)
    const categories = await listCategories(db)
    expect(categories.filter((c) => c.name === 'Kolonial')).toHaveLength(1)
    expect(categories.at(-2)!.name).toBe('Kolonial')
    expect(categories.at(-1)!.name).toBe('Other')
  })
})

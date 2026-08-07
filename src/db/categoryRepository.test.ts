import { beforeEach, describe, expect, it } from 'vitest'
import {
  createCategory,
  deleteCategory,
  findOrCreateCategoryByName,
  listCategories,
  renameCategory,
  reorderCategories,
} from './categoryRepository'
import { ShoppingListDB } from './schema'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-categories-${crypto.randomUUID()}`)
})

describe('default seeding', () => {
  it('seeds the default categories in order on first use', async () => {
    const categories = await listCategories(db)
    expect(categories.length).toBeGreaterThan(0)
    expect(categories[0]!.name).toBe('Fruit and vegetables')
    expect(categories.at(-1)!.name).toBe('Other')
  })
})

describe('createCategory', () => {
  it('appends a new category at the end of the order', async () => {
    const before = await listCategories(db)
    const created = await createCategory(db, 'Bakery specials')
    expect(created.order).toBe(before.length)
  })

  it('rejects an empty name', async () => {
    await expect(createCategory(db, '   ')).rejects.toThrow()
  })
})

describe('renameCategory', () => {
  it('renames without changing order', async () => {
    const category = await createCategory(db, 'Temp')
    const renamed = await renameCategory(db, category.id, 'Renamed')
    expect(renamed.name).toBe('Renamed')
    expect(renamed.order).toBe(category.order)
  })
})

describe('deleteCategory', () => {
  it('removes the category', async () => {
    const category = await createCategory(db, 'Temp')
    await deleteCategory(db, category.id)
    const categories = await listCategories(db)
    expect(categories.find((c) => c.id === category.id)).toBeUndefined()
  })
})

describe('reorderCategories', () => {
  it('persists a full custom order', async () => {
    const categories = await listCategories(db)
    const reversedIds = categories.map((c) => c.id).reverse()
    await reorderCategories(db, reversedIds)
    const reordered = await listCategories(db)
    expect(reordered.map((c) => c.id)).toEqual(reversedIds)
  })
})

describe('findOrCreateCategoryByName', () => {
  it('matches an existing category case-insensitively instead of duplicating it', async () => {
    const before = await listCategories(db)
    const id = await findOrCreateCategoryByName(db, 'dairy')
    const after = await listCategories(db)
    expect(after).toHaveLength(before.length)
    expect(id).toBe(before.find((c) => c.name === 'Dairy')!.id)
  })

  it('creates a new category when no match exists', async () => {
    const before = await listCategories(db)
    const id = await findOrCreateCategoryByName(db, 'Pet supplies')
    const after = await listCategories(db)
    expect(after).toHaveLength(before.length + 1)
    expect(after.find((c) => c.id === id)?.name).toBe('Pet supplies')
  })

  it('returns undefined for an empty/undefined name', async () => {
    expect(await findOrCreateCategoryByName(db, undefined)).toBeUndefined()
    expect(await findOrCreateCategoryByName(db, '   ')).toBeUndefined()
  })
})

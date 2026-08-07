import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteArchivedItem,
  getArchivedItemByName,
  listArchivedItems,
  rememberItem,
  searchArchivedItems,
  updateArchivedItem,
} from './itemArchiveRepository'
import { ShoppingListDB } from './schema'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-archive-${crypto.randomUUID()}`)
})

describe('rememberItem', () => {
  it('creates a new archive entry the first time an item name is seen', async () => {
    const entry = await rememberItem(db, { name: 'Milk', quantity: '2' })
    expect(entry.name).toBe('Milk')
    expect(entry.normalizedName).toBe('milk')
    expect(entry.lastQuantity).toBe('2')
  })

  it('updates the same entry (by case-insensitive name) rather than creating a duplicate', async () => {
    await rememberItem(db, { name: 'Milk', quantity: '1' })
    await rememberItem(db, { name: '  milk  ', quantity: '3' })
    const all = await listArchivedItems(db)
    expect(all).toHaveLength(1)
    expect(all[0]!.lastQuantity).toBe('3')
  })

  it('overwrites the remembered category/unit so future additions use the latest choice', async () => {
    await rememberItem(db, { name: 'Milk', categoryId: 'cat-a', unitId: 'unit-a' })
    const updated = await rememberItem(db, { name: 'Milk', categoryId: 'cat-b' })
    expect(updated.categoryId).toBe('cat-b')
    expect(updated.unitId).toBeUndefined()
  })
})

describe('searchArchivedItems', () => {
  it('ranks prefix matches before substring matches', async () => {
    await rememberItem(db, { name: 'Almond milk' })
    await rememberItem(db, { name: 'Milk' })
    const results = await searchArchivedItems(db, 'milk')
    expect(results.map((r) => r.name)).toEqual(['Milk', 'Almond milk'])
  })

  it('returns nothing for an empty query', async () => {
    await rememberItem(db, { name: 'Milk' })
    expect(await searchArchivedItems(db, '  ')).toEqual([])
  })
})

describe('updateArchivedItem', () => {
  it('renames and reassigns category/unit', async () => {
    const entry = await rememberItem(db, { name: 'Milk', categoryId: 'cat-a' })
    const updated = await updateArchivedItem(db, entry.id, {
      name: 'Whole milk',
      categoryId: 'cat-b',
    })
    expect(updated.name).toBe('Whole milk')
    expect(updated.normalizedName).toBe('whole milk')
    expect(updated.categoryId).toBe('cat-b')
    expect(await getArchivedItemByName(db, 'Milk')).toBeUndefined()
  })
})

describe('deleteArchivedItem', () => {
  it('removes the entry', async () => {
    const entry = await rememberItem(db, { name: 'Milk' })
    await deleteArchivedItem(db, entry.id)
    expect(await listArchivedItems(db)).toEqual([])
  })
})

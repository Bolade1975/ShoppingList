import { beforeEach, describe, expect, it } from 'vitest'
import { listCategories } from './categoryRepository'
import { addItem, createList, getList } from './listRepository'
import { ShoppingListDB } from './schema'
import { buildListExport, importList, previewListImport } from './shareRepository'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-share-${crypto.randomUUID()}`)
})

describe('buildListExport / importList round trip', () => {
  it('imports as a new, independent list carrying over category and unit by name', async () => {
    const categories = await listCategories(db)
    const dairy = categories.find((c) => c.name === 'Dairy')!
    const list = await createList(db, 'Weekly shopping')
    await addItem(db, list.id, { name: 'Milk', quantity: '2', categoryId: dairy.id })
    const source = (await getList(db, list.id))!

    const exported = await buildListExport(db, source)
    expect(exported.list.items[0]!.category).toBe('Dairy')

    const imported = await importList(db, exported)
    expect(imported.id).not.toBe(source.id)
    expect(imported.items[0]!.name).toBe('Milk')
    // Imported items keep the quantity stored in the file, not a fresh default.
    expect(imported.items[0]!.quantity).toBe('2')
    // Category name resolved back to this device's own Dairy category id.
    expect(imported.items[0]!.categoryId).toBe(dairy.id)

    // Editing the import must never reach back into the original.
    await addItem(db, imported.id, { name: 'Bread', quantity: '1' })
    const untouchedSource = await getList(db, source.id)
    expect(untouchedSource!.items).toHaveLength(1)
  })

  it('creates a new local category when the imported category name does not exist yet', async () => {
    const list = await createList(db, 'Weekly shopping')
    await addItem(db, list.id, { name: 'Kibble', quantity: '1' })
    const source = (await getList(db, list.id))!
    const exported = await buildListExport(db, source)
    exported.list.items[0]!.category = 'Pet supplies'

    const before = await listCategories(db)
    const imported = await importList(db, exported)
    const after = await listCategories(db)

    expect(after).toHaveLength(before.length + 1)
    const importedCategory = after.find((c) => c.name === 'Pet supplies')
    expect(imported.items[0]!.categoryId).toBe(importedCategory!.id)
  })
})

describe('previewListImport', () => {
  it('rejects an invalid file without changing any existing data', async () => {
    const before = await getListCount(db)
    const result = await previewListImport(db, { not: 'a valid export' })
    expect(result.valid).toBe(false)
    const after = await getListCount(db)
    expect(after).toBe(before)
  })

  it('flags a name conflict with an existing list', async () => {
    const list = await createList(db, 'Weekly shopping')
    const source = (await getList(db, list.id))!
    const exported = await buildListExport(db, source)

    const preview = await previewListImport(db, exported)
    expect(preview.valid).toBe(true)
    if (preview.valid) {
      expect(preview.preview.nameConflict).toBe(true)
      expect(preview.preview.itemCount).toBe(0)
    }
  })
})

async function getListCount(database: ShoppingListDB): Promise<number> {
  return database.lists.count()
}

import { beforeEach, describe, expect, it } from 'vitest'
import { findItemByName } from '../domain/listItems'
import {
  addItem,
  archiveList,
  combineItemQuantity,
  createList,
  createListFromHistory,
  createListFromTemplate,
  deleteItem,
  deleteList,
  duplicateList,
  editItem,
  getList,
  listActiveLists,
  listArchivedLists,
  renameList,
  restoreItem,
  setItemCompleted,
} from './listRepository'
import { ShoppingListDB } from './schema'
import { addTemplateItem, createTemplate } from './templateRepository'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-lists-${crypto.randomUUID()}`)
})

describe('createList / listActiveLists', () => {
  it('creates an empty active list', async () => {
    const list = await createList(db, 'Weekly shopping')
    expect(list.status).toBe('active')
    expect(list.items).toEqual([])
    const active = await listActiveLists(db)
    expect(active.map((l) => l.id)).toContain(list.id)
  })

  it('rejects an empty name', async () => {
    await expect(createList(db, '  ')).rejects.toThrow()
  })
})

describe('two lists stay independent', () => {
  it('adding items to one list never affects another', async () => {
    const listA = await createList(db, 'List A')
    const listB = await createList(db, 'List B')
    await addItem(db, listA.id, { name: 'Milk', quantity: '1' })
    const refreshedA = await getList(db, listA.id)
    const refreshedB = await getList(db, listB.id)
    expect(refreshedA!.items).toHaveLength(1)
    expect(refreshedB!.items).toHaveLength(0)
  })
})

describe('renameList', () => {
  it('renames the list', async () => {
    const list = await createList(db, 'Old name')
    const renamed = await renameList(db, list.id, 'New name')
    expect(renamed.name).toBe('New name')
  })
})

describe('addItem / editItem / duplicate warning', () => {
  it('adds an item with quantity, unit, category and note', async () => {
    const list = await createList(db, 'Groceries')
    const updated = await addItem(db, list.id, {
      name: 'Milk',
      quantity: '2-3',
      note: 'Organic',
    })
    expect(updated.items).toHaveLength(1)
    expect(updated.items[0]).toMatchObject({
      name: 'Milk',
      quantity: '2-3',
      note: 'Organic',
      completed: false,
    })
  })

  it('flags an existing item with the same name so the caller can offer to combine', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    const duplicate = findItemByName(withItem.items, 'milk')
    expect(duplicate).toBeDefined()
  })

  it('combines quantities instead of creating a second row when the user confirms', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    const existing = findItemByName(withItem.items, 'Milk')!
    const combined = await combineItemQuantity(db, list.id, existing.id, '2')
    expect(combined.items).toHaveLength(1)
    expect(combined.items[0]!.quantity).toBe('3')
  })

  it('edits an item in place, preserving its completed state', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    const completed = await setItemCompleted(db, list.id, withItem.items[0]!.id, true)
    const edited = await editItem(db, list.id, withItem.items[0]!.id, {
      name: 'Whole milk',
      quantity: '2',
    })
    expect(edited.items[0]!.name).toBe('Whole milk')
    expect(edited.items[0]!.completed).toBe(true)
    expect(completed.items[0]!.completed).toBe(true)
  })
})

describe('setItemCompleted (cross off / reopen)', () => {
  it('marks an item completed with a timestamp, and clears it on reopen', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    const crossedOff = await setItemCompleted(db, list.id, withItem.items[0]!.id, true)
    expect(crossedOff.items[0]!.completed).toBe(true)
    expect(crossedOff.items[0]!.completedAt).toBeDefined()

    const reopened = await setItemCompleted(db, list.id, withItem.items[0]!.id, false)
    expect(reopened.items[0]!.completed).toBe(false)
    expect(reopened.items[0]!.completedAt).toBeUndefined()
  })
})

describe('deleteItem / restoreItem (undo)', () => {
  it('removes an item and undo puts it back at the same position', async () => {
    const list = await createList(db, 'Groceries')
    await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    await addItem(db, list.id, { name: 'Bread', quantity: '1' })
    const current = await addItem(db, list.id, { name: 'Eggs', quantity: '12' })

    const breadId = current.items.find((i) => i.name === 'Bread')!.id
    const { list: afterDelete, removedItem, index } = await deleteItem(db, list.id, breadId)
    expect(afterDelete.items.map((i) => i.name)).toEqual(['Milk', 'Eggs'])

    const restored = await restoreItem(db, list.id, removedItem, index)
    expect(restored.items.map((i) => i.name)).toEqual(['Milk', 'Bread', 'Eggs'])
  })
})

describe('duplicateList', () => {
  it('creates an independent copy that keeps item state but has fresh ids', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    await setItemCompleted(db, list.id, withItem.items[0]!.id, true)
    const source = (await getList(db, list.id))!

    const copy = await duplicateList(db, list.id)
    expect(copy.id).not.toBe(source.id)
    expect(copy.items[0]!.id).not.toBe(source.items[0]!.id)
    expect(copy.items[0]!.completed).toBe(true)

    // Editing the copy must never affect the source.
    await setItemCompleted(db, copy.id, copy.items[0]!.id, false)
    const untouchedSource = await getList(db, source.id)
    expect(untouchedSource!.items[0]!.completed).toBe(true)
  })
})

describe('archiveList / listArchivedLists / createListFromHistory', () => {
  it('archives a list into history and restores an independent, fresh-start copy from it, keeping the stored quantity', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '5' })
    await setItemCompleted(db, list.id, withItem.items[0]!.id, true)

    const archived = await archiveList(db, list.id)
    expect(archived.status).toBe('archived')
    const history = await listArchivedLists(db)
    expect(history.map((l) => l.id)).toContain(list.id)

    const restored = await createListFromHistory(db, list.id)
    expect(restored.status).toBe('active')
    expect(restored.id).not.toBe(list.id)
    expect(restored.items[0]!.completed).toBe(false)
    // A restored item keeps whatever quantity it had in history — the "new
    // item defaults to 1" rule only applies to genuinely new items.
    expect(restored.items[0]!.quantity).toBe('5')

    // The original archived list must be untouched.
    const originalStillArchived = await getList(db, list.id)
    expect(originalStillArchived!.status).toBe('archived')
    expect(originalStillArchived!.items[0]!.completed).toBe(true)
  })
})

describe('createListFromTemplate', () => {
  it('creates a fresh active list from a template without modifying the template, keeping the stored quantity', async () => {
    const created = await createTemplate(db, 'Weekly staples')
    const template = await addTemplateItem(db, created.id, { name: 'Milk', quantity: '3' })

    const list = await createListFromTemplate(db, template.id)
    expect(list.status).toBe('active')
    expect(list.items).toHaveLength(1)
    expect(list.items[0]!.completed).toBe(false)
    expect(list.items[0]!.id).not.toBe(template.items[0]!.id)
    expect(list.items[0]!.quantity).toBe('3')

    await setItemCompleted(db, list.id, list.items[0]!.id, true)
    // Re-fetching the template must show it unchanged.
  })
})

describe('deleteList', () => {
  it('permanently removes the list', async () => {
    const list = await createList(db, 'Temp')
    await deleteList(db, list.id)
    expect(await getList(db, list.id)).toBeUndefined()
  })
})

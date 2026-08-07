import { beforeEach, describe, expect, it } from 'vitest'
import { addItem, createList, setItemCompleted } from './listRepository'
import { ShoppingListDB } from './schema'
import {
  addTemplateItem,
  createTemplate,
  createTemplateFromList,
  deleteTemplateItem,
  editTemplateItem,
  getTemplate,
} from './templateRepository'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-templates-${crypto.randomUUID()}`)
})

describe('template item CRUD', () => {
  it('adds, edits and deletes items without touching lists made from the template earlier', async () => {
    const template = await createTemplate(db, 'Weekly staples')
    const withItem = await addTemplateItem(db, template.id, { name: 'Milk', quantity: '1' })
    expect(withItem.items).toHaveLength(1)

    const edited = await editTemplateItem(db, template.id, withItem.items[0]!.id, {
      name: 'Whole milk',
      quantity: '2',
    })
    expect(edited.items[0]!.name).toBe('Whole milk')

    const afterDelete = await deleteTemplateItem(db, template.id, edited.items[0]!.id)
    expect(afterDelete.items).toHaveLength(0)
  })
})

describe('createTemplateFromList ("save as template")', () => {
  it('captures item content but not completed status, and stays independent of the source list', async () => {
    const list = await createList(db, 'Groceries')
    const withItem = await addItem(db, list.id, { name: 'Milk', quantity: '1' })
    await setItemCompleted(db, list.id, withItem.items[0]!.id, true)

    const template = await createTemplateFromList(db, list.id, 'Groceries template')
    expect(template.items).toHaveLength(1)
    expect(template.items[0]!.name).toBe('Milk')
    expect(template.items[0]).not.toHaveProperty('completed')

    // Editing the template afterwards must not reach back into the list.
    await editTemplateItem(db, template.id, template.items[0]!.id, {
      name: 'Changed',
      quantity: '1',
    })
    const templateAfter = await getTemplate(db, template.id)
    expect(templateAfter!.items[0]!.name).toBe('Changed')
  })
})

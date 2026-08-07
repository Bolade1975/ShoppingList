import { combineQuantities } from '../domain/listItems'
import { generateId } from '../domain/id'
import type { ListItem, NewListItemInput, ShoppingList } from '../domain/types'
import { rememberItem } from './itemArchiveRepository'
import type { ShoppingListDB } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

async function requireList(db: ShoppingListDB, id: string): Promise<ShoppingList> {
  const list = await db.lists.get(id)
  if (!list) throw new Error(`List ${id} not found`)
  return list
}

function requireItem(list: ShoppingList, itemId: string): ListItem {
  const item = list.items.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error(`Item ${itemId} not found on list ${list.id}`)
  return item
}

async function rememberFromItem(db: ShoppingListDB, item: ListItem): Promise<void> {
  await rememberItem(db, {
    name: item.name,
    ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
    ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
    ...(item.quantity !== '' ? { quantity: item.quantity } : {}),
  })
}

function buildItem(input: NewListItemInput, id: string, timestamp: string): ListItem {
  return {
    id,
    name: input.name.trim(),
    quantity: input.quantity.trim(),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.note !== undefined && input.note.trim() !== '' ? { note: input.note.trim() } : {}),
    completed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export async function listActiveLists(db: ShoppingListDB): Promise<ShoppingList[]> {
  const lists = await db.lists.where('status').equals('active').toArray()
  return lists.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function listArchivedLists(db: ShoppingListDB): Promise<ShoppingList[]> {
  const lists = await db.lists.where('status').equals('archived').toArray()
  return lists.sort((a, b) =>
    (b.archivedAt ?? b.updatedAt).localeCompare(a.archivedAt ?? a.updatedAt),
  )
}

export async function getList(db: ShoppingListDB, id: string): Promise<ShoppingList | undefined> {
  return db.lists.get(id)
}

export async function createList(db: ShoppingListDB, name: string): Promise<ShoppingList> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('List name is required.')
  const now = nowIso()
  const list: ShoppingList = {
    id: generateId(),
    name: trimmed,
    status: 'active',
    items: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.lists.add(list)
  return list
}

export async function renameList(
  db: ShoppingListDB,
  id: string,
  name: string,
): Promise<ShoppingList> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('List name is required.')
  const list = await requireList(db, id)
  const updated: ShoppingList = { ...list, name: trimmed, updatedAt: nowIso() }
  await db.lists.put(updated)
  return updated
}

/** A literal copy of an existing list, including each item's current completed state. */
export async function duplicateList(
  db: ShoppingListDB,
  id: string,
  name?: string,
): Promise<ShoppingList> {
  const source = await requireList(db, id)
  const now = nowIso()
  const list: ShoppingList = {
    id: generateId(),
    name: name?.trim() || `${source.name} (copy)`,
    status: 'active',
    items: source.items.map((item) => ({ ...item, id: generateId(), updatedAt: now })),
    createdAt: now,
    updatedAt: now,
  }
  await db.lists.add(list)
  return list
}

export async function archiveList(db: ShoppingListDB, id: string): Promise<ShoppingList> {
  const list = await requireList(db, id)
  const now = nowIso()
  const updated: ShoppingList = { ...list, status: 'archived', updatedAt: now, archivedAt: now }
  await db.lists.put(updated)
  return updated
}

export async function deleteList(db: ShoppingListDB, id: string): Promise<void> {
  await db.lists.delete(id)
}

/**
 * Copies a historic (archived) list into a brand-new active list with every
 * item reset to not-completed — for "start shopping again from an old
 * list." The archived original is left exactly as it was.
 */
export async function createListFromHistory(
  db: ShoppingListDB,
  historyListId: string,
  name?: string,
): Promise<ShoppingList> {
  const source = await requireList(db, historyListId)
  const now = nowIso()
  const items: ListItem[] = source.items.map((item) =>
    buildItem(
      {
        name: item.name,
        quantity: item.quantity,
        ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
        ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
        ...(item.note !== undefined ? { note: item.note } : {}),
      },
      generateId(),
      now,
    ),
  )
  const list: ShoppingList = {
    id: generateId(),
    name: name?.trim() || source.name,
    status: 'active',
    items,
    createdAt: now,
    updatedAt: now,
  }
  await db.lists.add(list)
  return list
}

/** Creates a new active list from a template's items — the template itself is never modified. */
export async function createListFromTemplate(
  db: ShoppingListDB,
  templateId: string,
  name?: string,
): Promise<ShoppingList> {
  const template = await db.templates.get(templateId)
  if (!template) throw new Error(`Template ${templateId} not found`)
  const now = nowIso()
  const items: ListItem[] = template.items.map((item) =>
    buildItem(
      {
        name: item.name,
        quantity: item.quantity,
        ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
        ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
        ...(item.note !== undefined ? { note: item.note } : {}),
      },
      generateId(),
      now,
    ),
  )
  const list: ShoppingList = {
    id: generateId(),
    name: name?.trim() || template.name,
    status: 'active',
    items,
    createdAt: now,
    updatedAt: now,
  }
  await db.lists.add(list)
  return list
}

export async function setHideCompleted(
  db: ShoppingListDB,
  listId: string,
  hideCompleted: boolean,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  const updated: ShoppingList = { ...list, hideCompleted, updatedAt: nowIso() }
  await db.lists.put(updated)
  return updated
}

/** Appends a brand-new item — callers are responsible for checking for a same-name duplicate first (see `findItemByName` in domain/listItems.ts) and using `combineItemQuantity` instead when the user chooses to combine. */
export async function addItem(
  db: ShoppingListDB,
  listId: string,
  input: NewListItemInput,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  const now = nowIso()
  const item = buildItem(input, generateId(), now)
  const updated: ShoppingList = { ...list, items: [...list.items, item], updatedAt: now }
  await db.lists.put(updated)
  await rememberFromItem(db, item)
  return updated
}

export async function editItem(
  db: ShoppingListDB,
  listId: string,
  itemId: string,
  input: NewListItemInput,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  const existing = requireItem(list, itemId)
  const now = nowIso()
  const updatedItem: ListItem = {
    ...buildItem(input, existing.id, existing.createdAt),
    updatedAt: now,
    completed: existing.completed,
    ...(existing.completedAt !== undefined ? { completedAt: existing.completedAt } : {}),
  }
  const items = list.items.map((item) => (item.id === itemId ? updatedItem : item))
  const updated: ShoppingList = { ...list, items, updatedAt: now }
  await db.lists.put(updated)
  await rememberFromItem(db, updatedItem)
  return updated
}

export async function setItemCompleted(
  db: ShoppingListDB,
  listId: string,
  itemId: string,
  completed: boolean,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  requireItem(list, itemId)
  const now = nowIso()
  const items = list.items.map((item) => {
    if (item.id !== itemId) return item
    const updatedItem: ListItem = { ...item, completed, updatedAt: now }
    if (completed) {
      updatedItem.completedAt = now
    } else {
      delete updatedItem.completedAt
    }
    return updatedItem
  })
  const updated: ShoppingList = { ...list, items, updatedAt: now }
  await db.lists.put(updated)
  return updated
}

export type DeleteItemResult = {
  list: ShoppingList
  removedItem: ListItem
  index: number
}

export async function deleteItem(
  db: ShoppingListDB,
  listId: string,
  itemId: string,
): Promise<DeleteItemResult> {
  const list = await requireList(db, listId)
  const index = list.items.findIndex((item) => item.id === itemId)
  if (index === -1) throw new Error(`Item ${itemId} not found on list ${listId}`)
  const removedItem = list.items[index]!
  const items = [...list.items.slice(0, index), ...list.items.slice(index + 1)]
  const updated: ShoppingList = { ...list, items, updatedAt: nowIso() }
  await db.lists.put(updated)
  return { list: updated, removedItem, index }
}

/** Re-inserts a previously deleted item at its original position — the "Undo" action right after deleting one. */
export async function restoreItem(
  db: ShoppingListDB,
  listId: string,
  item: ListItem,
  index: number,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  const boundedIndex = Math.min(Math.max(index, 0), list.items.length)
  const items = [...list.items.slice(0, boundedIndex), item, ...list.items.slice(boundedIndex)]
  const updated: ShoppingList = { ...list, items, updatedAt: nowIso() }
  await db.lists.put(updated)
  return updated
}

/** Merges `additionalQuantity` into an existing item instead of adding a separate row — the "combine" choice from the duplicate-item warning. */
export async function combineItemQuantity(
  db: ShoppingListDB,
  listId: string,
  existingItemId: string,
  additionalQuantity: string,
): Promise<ShoppingList> {
  const list = await requireList(db, listId)
  const existing = requireItem(list, existingItemId)
  const now = nowIso()
  const combined: ListItem = {
    ...existing,
    quantity: combineQuantities(existing.quantity, additionalQuantity),
    updatedAt: now,
  }
  const items = list.items.map((item) => (item.id === existingItemId ? combined : item))
  const updated: ShoppingList = { ...list, items, updatedAt: now }
  await db.lists.put(updated)
  await rememberFromItem(db, combined)
  return updated
}

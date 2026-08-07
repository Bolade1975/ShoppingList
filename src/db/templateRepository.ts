import { generateId } from '../domain/id'
import type { NewListItemInput, ShoppingTemplate, TemplateItem } from '../domain/types'
import { rememberItem } from './itemArchiveRepository'
import type { ShoppingListDB } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

async function requireTemplate(db: ShoppingListDB, id: string): Promise<ShoppingTemplate> {
  const template = await db.templates.get(id)
  if (!template) throw new Error(`Template ${id} not found`)
  return template
}

function buildTemplateItem(input: NewListItemInput, id: string): TemplateItem {
  return {
    id,
    name: input.name.trim(),
    quantity: input.quantity.trim(),
    ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.note !== undefined && input.note.trim() !== '' ? { note: input.note.trim() } : {}),
  }
}

async function rememberFromTemplateItem(db: ShoppingListDB, item: TemplateItem): Promise<void> {
  await rememberItem(db, {
    name: item.name,
    ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
    ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
    ...(item.quantity !== '' ? { quantity: item.quantity } : {}),
  })
}

export async function listTemplates(db: ShoppingListDB): Promise<ShoppingTemplate[]> {
  const templates = await db.templates.toArray()
  return templates.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTemplate(
  db: ShoppingListDB,
  id: string,
): Promise<ShoppingTemplate | undefined> {
  return db.templates.get(id)
}

export async function createTemplate(db: ShoppingListDB, name: string): Promise<ShoppingTemplate> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Template name is required.')
  const now = nowIso()
  const template: ShoppingTemplate = {
    id: generateId(),
    name: trimmed,
    items: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.templates.add(template)
  return template
}

export async function renameTemplate(
  db: ShoppingListDB,
  id: string,
  name: string,
): Promise<ShoppingTemplate> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Template name is required.')
  const template = await requireTemplate(db, id)
  const updated: ShoppingTemplate = { ...template, name: trimmed, updatedAt: nowIso() }
  await db.templates.put(updated)
  return updated
}

export async function deleteTemplate(db: ShoppingListDB, id: string): Promise<void> {
  await db.templates.delete(id)
}

export async function addTemplateItem(
  db: ShoppingListDB,
  id: string,
  input: NewListItemInput,
): Promise<ShoppingTemplate> {
  const template = await requireTemplate(db, id)
  const item = buildTemplateItem(input, generateId())
  const updated: ShoppingTemplate = {
    ...template,
    items: [...template.items, item],
    updatedAt: nowIso(),
  }
  await db.templates.put(updated)
  await rememberFromTemplateItem(db, item)
  return updated
}

export async function editTemplateItem(
  db: ShoppingListDB,
  id: string,
  itemId: string,
  input: NewListItemInput,
): Promise<ShoppingTemplate> {
  const template = await requireTemplate(db, id)
  if (!template.items.some((item) => item.id === itemId)) {
    throw new Error(`Item ${itemId} not found on template ${id}`)
  }
  const updatedItem = buildTemplateItem(input, itemId)
  const items = template.items.map((item) => (item.id === itemId ? updatedItem : item))
  const updated: ShoppingTemplate = { ...template, items, updatedAt: nowIso() }
  await db.templates.put(updated)
  await rememberFromTemplateItem(db, updatedItem)
  return updated
}

export async function deleteTemplateItem(
  db: ShoppingListDB,
  id: string,
  itemId: string,
): Promise<ShoppingTemplate> {
  const template = await requireTemplate(db, id)
  const items = template.items.filter((item) => item.id !== itemId)
  const updated: ShoppingTemplate = { ...template, items, updatedAt: nowIso() }
  await db.templates.put(updated)
  return updated
}

/**
 * "Save a list as a reusable template" — copies the list's items (dropping
 * their completed status, which is meaningless for a template) into a
 * brand-new template. The source list is untouched, and later edits to
 * either one never affect the other.
 */
export async function createTemplateFromList(
  db: ShoppingListDB,
  listId: string,
  name?: string,
): Promise<ShoppingTemplate> {
  const list = await db.lists.get(listId)
  if (!list) throw new Error(`List ${listId} not found`)
  const now = nowIso()
  const items: TemplateItem[] = list.items.map((item) =>
    buildTemplateItem(
      {
        name: item.name,
        quantity: item.quantity,
        ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
        ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
        ...(item.note !== undefined ? { note: item.note } : {}),
      },
      generateId(),
    ),
  )
  const template: ShoppingTemplate = {
    id: generateId(),
    name: name?.trim() || list.name,
    items,
    createdAt: now,
    updatedAt: now,
  }
  await db.templates.add(template)
  return template
}

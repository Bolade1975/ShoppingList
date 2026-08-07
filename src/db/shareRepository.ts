import { type ShareResult, shareOrDownloadJson } from '../domain/downloadFile'
import { generateId } from '../domain/id'
import {
  LIST_EXPORT_SCHEMA_VERSION,
  type ListExportFile,
  validateListExportFile,
} from '../domain/listExportSchema'
import { categoriesById, toPortableItem, unitsById } from '../domain/portable'
import { listExportFilename } from '../domain/slug'
import type { ListItem, ShoppingList } from '../domain/types'
import { findOrCreateCategoryByName, listCategories } from './categoryRepository'
import { rememberItem } from './itemArchiveRepository'
import type { ShoppingListDB } from './schema'
import { findOrCreateUnitByName, listUnits } from './unitRepository'

function nowIso(): string {
  return new Date().toISOString()
}

export async function buildListExport(
  db: ShoppingListDB,
  list: ShoppingList,
): Promise<ListExportFile> {
  const [categories, units] = await Promise.all([listCategories(db), listUnits(db)])
  const catLookup = categoriesById(categories)
  const unitLookup = unitsById(units)
  return {
    schemaVersion: LIST_EXPORT_SCHEMA_VERSION,
    appName: 'ShoppingList',
    fileType: 'list',
    exportedAt: nowIso(),
    list: {
      name: list.name,
      items: list.items.map((item) => toPortableItem(item, catLookup, unitLookup)),
    },
  }
}

/** "Send copy" / "Email list" — shares (or downloads) a versioned export of one list. Sending never mutates the list, and later edits on either end are never synchronized back. */
export async function shareList(db: ShoppingListDB, list: ShoppingList): Promise<ShareResult> {
  const file = await buildListExport(db, list)
  return shareOrDownloadJson(listExportFilename(list.name), file, list.name)
}

export type ListImportPreview = {
  name: string
  itemCount: number
  nameConflict: boolean
}

export type ListImportParseResult =
  | { valid: true; file: ListExportFile; preview: ListImportPreview }
  | { valid: false; error: string }

/** Validates a picked file and reports a name/item-count preview before the user confirms the import. */
export async function previewListImport(
  db: ShoppingListDB,
  raw: unknown,
): Promise<ListImportParseResult> {
  const result = validateListExportFile(raw)
  if (!result.valid) return result
  const existingLists = await db.lists.toArray()
  const nameConflict = existingLists.some(
    (list) => list.name.trim().toLowerCase() === result.file.list.name.trim().toLowerCase(),
  )
  return {
    valid: true,
    file: result.file,
    preview: {
      name: result.file.list.name,
      itemCount: result.file.list.items.length,
      nameConflict,
    },
  }
}

/**
 * Imports a previously validated export as a brand-new, independent active
 * list. Never overwrites or reactivates anything that already exists —
 * `nameOverride` is how the caller resolves a name conflict flagged by
 * `previewListImport`. Category and unit names from the file are matched to
 * (or created in) this device's own categories/units, and every item name is
 * added to this device's item archive.
 */
export async function importList(
  db: ShoppingListDB,
  file: ListExportFile,
  nameOverride?: string,
): Promise<ShoppingList> {
  const now = nowIso()
  const items: ListItem[] = []
  for (const portable of file.list.items) {
    const categoryId = await findOrCreateCategoryByName(db, portable.category)
    const unitId = await findOrCreateUnitByName(db, portable.unit)
    const item: ListItem = {
      id: generateId(),
      name: portable.name,
      quantity: portable.quantity,
      ...(unitId !== undefined ? { unitId } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(portable.note !== undefined ? { note: portable.note } : {}),
      completed: portable.completed,
      ...(portable.completedAt !== undefined ? { completedAt: portable.completedAt } : {}),
      createdAt: now,
      updatedAt: now,
    }
    items.push(item)
    await rememberItem(db, {
      name: item.name,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(unitId !== undefined ? { unitId } : {}),
      ...(item.quantity !== '' ? { quantity: item.quantity } : {}),
    })
  }
  const list: ShoppingList = {
    id: generateId(),
    name: (nameOverride ?? file.list.name).trim(),
    status: 'active',
    items,
    createdAt: now,
    updatedAt: now,
  }
  await db.lists.add(list)
  return list
}

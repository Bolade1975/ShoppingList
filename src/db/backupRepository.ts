import { BACKUP_SCHEMA_VERSION, type BackupFile, validateBackupFile } from '../domain/backupSchema'
import { saveJsonWithPicker, type ShareResult, shareOrDownloadJson } from '../domain/downloadFile'
import { generateId } from '../domain/id'
import {
  categoriesById,
  toPortableItem,
  toPortableTemplateItem,
  unitsById,
} from '../domain/portable'
import { backupFilename } from '../domain/slug'
import type {
  ArchivedItem,
  Category,
  ListItem,
  ShoppingList,
  ShoppingTemplate,
  TemplateItem,
  Unit,
} from '../domain/types'
import { findOrCreateCategoryByName, listCategories } from './categoryRepository'
import { normalizeName } from './itemArchiveRepository'
import type { ShoppingListDB } from './schema'
import { findOrCreateUnitByName, listUnits } from './unitRepository'

function nowIso(): string {
  return new Date().toISOString()
}

function categoryNameFor(entry: ArchivedItem, lookup: Map<string, Category>): string | undefined {
  return entry.categoryId !== undefined ? lookup.get(entry.categoryId)?.name : undefined
}

function unitNameFor(entry: ArchivedItem, lookup: Map<string, Unit>): string | undefined {
  return entry.unitId !== undefined ? lookup.get(entry.unitId)?.name : undefined
}

/** Gathers every table into the single-file backup format. Read-only. */
export async function buildBackup(db: ShoppingListDB): Promise<BackupFile> {
  const [categories, units, lists, templates, itemArchive] = await Promise.all([
    listCategories(db),
    listUnits(db),
    db.lists.toArray(),
    db.templates.toArray(),
    db.itemArchive.toArray(),
  ])
  const catLookup = categoriesById(categories)
  const unitLookup = unitsById(units)

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appName: 'ShoppingList',
    fileType: 'backup',
    exportedAt: nowIso(),
    categories: categories.map((category) => ({ name: category.name, order: category.order })),
    units: units.map((unit) => ({ name: unit.name })),
    lists: lists.map((list) => ({
      id: list.id,
      name: list.name,
      status: list.status,
      items: list.items.map((item) => toPortableItem(item, catLookup, unitLookup)),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      ...(list.archivedAt !== undefined ? { archivedAt: list.archivedAt } : {}),
    })),
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      items: template.items.map((item) => toPortableTemplateItem(item, catLookup, unitLookup)),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    })),
    itemArchive: itemArchive.map((entry) => {
      const category = categoryNameFor(entry, catLookup)
      const unit = unitNameFor(entry, unitLookup)
      return {
        name: entry.name,
        ...(category !== undefined ? { category } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(entry.lastQuantity !== undefined ? { lastQuantity: entry.lastQuantity } : {}),
        updatedAt: entry.updatedAt,
      }
    }),
  }
}

/** "Export all data" — offers a native Save As on desktop, falls back to a plain download. */
export async function downloadBackup(db: ShoppingListDB): Promise<void> {
  const backup = await buildBackup(db)
  await saveJsonWithPicker(backupFilename(backup.exportedAt), backup)
}

/** Lets a backup be sent through the share sheet too (e.g. straight into a Files/iCloud Drive folder or an email to yourself). */
export async function shareBackup(db: ShoppingListDB): Promise<ShareResult> {
  const backup = await buildBackup(db)
  return shareOrDownloadJson(backupFilename(backup.exportedAt), backup, 'Shopping List backup')
}

export { validateBackupFile }
export type { BackupFile }

function resolvePortableItemToListItem(
  portable: BackupFile['lists'][number]['items'][number],
  categoryIdByName: Map<string, string>,
  unitIdByName: Map<string, string>,
): ListItem {
  const categoryId = portable.category
    ? categoryIdByName.get(portable.category.toLowerCase())
    : undefined
  const unitId = portable.unit ? unitIdByName.get(portable.unit.toLowerCase()) : undefined
  return {
    id: portable.id,
    name: portable.name,
    quantity: portable.quantity,
    ...(unitId !== undefined ? { unitId } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(portable.note !== undefined ? { note: portable.note } : {}),
    completed: portable.completed,
    ...(portable.completedAt !== undefined ? { completedAt: portable.completedAt } : {}),
    createdAt: portable.createdAt,
    updatedAt: portable.updatedAt,
  }
}

function resolvePortableTemplateItem(
  portable: BackupFile['templates'][number]['items'][number],
  categoryIdByName: Map<string, string>,
  unitIdByName: Map<string, string>,
): TemplateItem {
  const categoryId = portable.category
    ? categoryIdByName.get(portable.category.toLowerCase())
    : undefined
  const unitId = portable.unit ? unitIdByName.get(portable.unit.toLowerCase()) : undefined
  return {
    id: portable.id,
    name: portable.name,
    quantity: portable.quantity,
    ...(unitId !== undefined ? { unitId } : {}),
    ...(categoryId !== undefined ? { categoryId } : {}),
    ...(portable.note !== undefined ? { note: portable.note } : {}),
  }
}

const REPLACE_TABLE_NAMES = ['lists', 'templates', 'itemArchive', 'categories', 'units'] as const

/** Wipes every table and restores exactly what's in the backup. Caller is responsible for confirming with the user first. */
export async function replaceAllData(db: ShoppingListDB, backup: BackupFile): Promise<void> {
  await db.transaction('rw', REPLACE_TABLE_NAMES, async () => {
    await Promise.all([
      db.lists.clear(),
      db.templates.clear(),
      db.itemArchive.clear(),
      db.categories.clear(),
      db.units.clear(),
    ])

    const now = nowIso()
    const categoryRecords: Category[] = backup.categories.map((category) => ({
      id: generateId(),
      name: category.name,
      order: category.order,
      createdAt: now,
    }))
    const unitRecords: Unit[] = backup.units.map((unit) => ({
      id: generateId(),
      name: unit.name,
      createdAt: now,
    }))
    if (categoryRecords.length > 0) await db.categories.bulkAdd(categoryRecords)
    if (unitRecords.length > 0) await db.units.bulkAdd(unitRecords)

    const categoryIdByName = new Map(categoryRecords.map((c) => [c.name.toLowerCase(), c.id]))
    const unitIdByName = new Map(unitRecords.map((u) => [u.name.toLowerCase(), u.id]))

    const lists: ShoppingList[] = backup.lists.map((list) => ({
      id: list.id,
      name: list.name,
      status: list.status,
      items: list.items.map((item) =>
        resolvePortableItemToListItem(item, categoryIdByName, unitIdByName),
      ),
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      ...(list.archivedAt !== undefined ? { archivedAt: list.archivedAt } : {}),
    }))
    const templates: ShoppingTemplate[] = backup.templates.map((template) => ({
      id: template.id,
      name: template.name,
      items: template.items.map((item) =>
        resolvePortableTemplateItem(item, categoryIdByName, unitIdByName),
      ),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    }))
    const archiveEntries: ArchivedItem[] = backup.itemArchive.map((entry) => {
      const categoryId = entry.category
        ? categoryIdByName.get(entry.category.toLowerCase())
        : undefined
      const unitId = entry.unit ? unitIdByName.get(entry.unit.toLowerCase()) : undefined
      return {
        id: generateId(),
        name: entry.name,
        normalizedName: normalizeName(entry.name),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(unitId !== undefined ? { unitId } : {}),
        ...(entry.lastQuantity !== undefined ? { lastQuantity: entry.lastQuantity } : {}),
        updatedAt: entry.updatedAt,
      }
    })

    if (lists.length > 0) await db.lists.bulkAdd(lists)
    if (templates.length > 0) await db.templates.bulkAdd(templates)
    if (archiveEntries.length > 0) await db.itemArchive.bulkAdd(archiveEntries)
  })
}

function isNewer(incomingUpdatedAt: string, existingUpdatedAt: string): boolean {
  return incomingUpdatedAt > existingUpdatedAt
}

export type MergeSummary = {
  lists: { added: number; updated: number }
  templates: { added: number; updated: number }
  itemArchive: { added: number; updated: number }
  categoriesAdded: number
  unitsAdded: number
}

/**
 * Merges a backup into existing data instead of replacing it: a record
 * whose id doesn't exist locally is added; one that does exist is only
 * overwritten when the incoming copy's `updatedAt` is newer. Nothing
 * existing is ever deleted by a merge. Categories and units are matched (or
 * created) by name so merging the same backup twice never duplicates them.
 */
export async function mergeBackupData(
  db: ShoppingListDB,
  backup: BackupFile,
): Promise<MergeSummary> {
  return db.transaction(
    'rw',
    ['lists', 'templates', 'itemArchive', 'categories', 'units'],
    async () => {
      const categoriesBefore = await db.categories.count()
      const unitsBefore = await db.units.count()

      const categoryIdByName = new Map<string, string>()
      for (const category of backup.categories) {
        const id = await findOrCreateCategoryByName(db, category.name)
        if (id !== undefined) categoryIdByName.set(category.name.toLowerCase(), id)
      }
      const unitIdByName = new Map<string, string>()
      for (const unit of backup.units) {
        const id = await findOrCreateUnitByName(db, unit.name)
        if (id !== undefined) unitIdByName.set(unit.name.toLowerCase(), id)
      }

      const categoriesAdded = (await db.categories.count()) - categoriesBefore
      const unitsAdded = (await db.units.count()) - unitsBefore

      let listsAdded = 0
      let listsUpdated = 0
      for (const portableList of backup.lists) {
        const existing = await db.lists.get(portableList.id)
        const candidate: ShoppingList = {
          id: portableList.id,
          name: portableList.name,
          status: portableList.status,
          items: portableList.items.map((item) =>
            resolvePortableItemToListItem(item, categoryIdByName, unitIdByName),
          ),
          createdAt: portableList.createdAt,
          updatedAt: portableList.updatedAt,
          ...(portableList.archivedAt !== undefined ? { archivedAt: portableList.archivedAt } : {}),
        }
        if (!existing) {
          await db.lists.add(candidate)
          listsAdded++
        } else if (isNewer(candidate.updatedAt, existing.updatedAt)) {
          await db.lists.put(candidate)
          listsUpdated++
        }
      }

      let templatesAdded = 0
      let templatesUpdated = 0
      for (const portableTemplate of backup.templates) {
        const existing = await db.templates.get(portableTemplate.id)
        const candidate: ShoppingTemplate = {
          id: portableTemplate.id,
          name: portableTemplate.name,
          items: portableTemplate.items.map((item) =>
            resolvePortableTemplateItem(item, categoryIdByName, unitIdByName),
          ),
          createdAt: portableTemplate.createdAt,
          updatedAt: portableTemplate.updatedAt,
        }
        if (!existing) {
          await db.templates.add(candidate)
          templatesAdded++
        } else if (isNewer(candidate.updatedAt, existing.updatedAt)) {
          await db.templates.put(candidate)
          templatesUpdated++
        }
      }

      let archiveAdded = 0
      let archiveUpdated = 0
      for (const entry of backup.itemArchive) {
        const normalized = normalizeName(entry.name)
        const existing = await db.itemArchive.where('normalizedName').equals(normalized).first()
        const categoryId = entry.category
          ? categoryIdByName.get(entry.category.toLowerCase())
          : undefined
        const unitId = entry.unit ? unitIdByName.get(entry.unit.toLowerCase()) : undefined
        const candidate: ArchivedItem = {
          id: existing?.id ?? generateId(),
          name: entry.name,
          normalizedName: normalized,
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(unitId !== undefined ? { unitId } : {}),
          ...(entry.lastQuantity !== undefined ? { lastQuantity: entry.lastQuantity } : {}),
          updatedAt: entry.updatedAt,
        }
        if (!existing) {
          await db.itemArchive.add(candidate)
          archiveAdded++
        } else if (isNewer(candidate.updatedAt, existing.updatedAt)) {
          await db.itemArchive.put(candidate)
          archiveUpdated++
        }
      }

      return {
        lists: { added: listsAdded, updated: listsUpdated },
        templates: { added: templatesAdded, updated: templatesUpdated },
        itemArchive: { added: archiveAdded, updated: archiveUpdated },
        categoriesAdded,
        unitsAdded,
      }
    },
  )
}

export type RestoreStrategy = 'replace' | 'merge'

export async function restoreBackup(
  db: ShoppingListDB,
  backup: BackupFile,
  strategy: RestoreStrategy,
): Promise<MergeSummary | undefined> {
  if (strategy === 'replace') {
    await replaceAllData(db, backup)
    return undefined
  }
  return mergeBackupData(db, backup)
}

/** Validates a picked file before any restore UI is shown. */
export function previewBackup(raw: unknown) {
  return validateBackupFile(raw)
}

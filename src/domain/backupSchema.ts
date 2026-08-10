import { z } from 'zod'

// Validates a full-data backup file. Like listExportSchema.ts, this is the
// one trust boundary for backup restore — nothing is written to IndexedDB
// until this returns `valid: true`.
export const BACKUP_SCHEMA_VERSION = 1

const portableItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string(),
  unit: z.string().optional(),
  category: z.string().optional(),
  note: z.string().optional(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const portableTemplateItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string(),
  unit: z.string().optional(),
  category: z.string().optional(),
  note: z.string().optional(),
})

const portableListSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['active', 'archived']),
  items: z.array(portableItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().optional(),
})

const portableTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  items: z.array(portableTemplateItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const portableCategorySchema = z.object({
  name: z.string().min(1),
  order: z.number(),
})

const portableUnitSchema = z.object({
  name: z.string().min(1),
})

const portableArchivedItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  unit: z.string().optional(),
  lastQuantity: z.string().optional(),
  updatedAt: z.string(),
})

export const backupFileSchema = z.object({
  schemaVersion: z.number(),
  appName: z.literal('ShoppingList'),
  fileType: z.literal('backup'),
  exportedAt: z.string(),
  categories: z.array(portableCategorySchema),
  units: z.array(portableUnitSchema),
  lists: z.array(portableListSchema),
  templates: z.array(portableTemplateSchema),
  itemArchive: z.array(portableArchivedItemSchema),
})

export type BackupFile = z.infer<typeof backupFileSchema>

export type BackupParseResult =
  { valid: true; backup: BackupFile } | { valid: false; error: string }

export function validateBackupFile(raw: unknown): BackupParseResult {
  const result = backupFileSchema.safeParse(raw)
  if (!result.success) {
    return {
      valid: false,
      error: 'Denne fil er ikke en gyldig Indkøbsliste-sikkerhedskopi (ukendt struktur).',
    }
  }
  if (result.data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      valid: false,
      error:
        'Denne sikkerhedskopi blev oprettet af en nyere version af appen og kan ikke gendannes her.',
    }
  }
  return { valid: true, backup: result.data }
}

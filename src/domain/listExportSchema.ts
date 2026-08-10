import { z } from 'zod'

// Validates a single-list share/export file — the "Send copy" / "Email
// list" format. This is untrusted, hand-editable JSON from outside the app,
// so nothing from it is written to IndexedDB until this passes.
export const LIST_EXPORT_SCHEMA_VERSION = 1

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

export const listExportFileSchema = z.object({
  schemaVersion: z.number(),
  appName: z.literal('ShoppingList'),
  fileType: z.literal('list'),
  exportedAt: z.string(),
  list: z.object({
    name: z.string().min(1),
    items: z.array(portableItemSchema),
  }),
})

export type ListExportFile = z.infer<typeof listExportFileSchema>

export type ListExportParseResult =
  { valid: true; file: ListExportFile } | { valid: false; error: string }

export function validateListExportFile(raw: unknown): ListExportParseResult {
  const result = listExportFileSchema.safeParse(raw)
  if (!result.success) {
    return {
      valid: false,
      error: 'Denne fil er ikke en gyldig indkøbsliste-eksport (ukendt struktur).',
    }
  }
  if (result.data.schemaVersion > LIST_EXPORT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: 'Denne fil blev eksporteret af en nyere version af appen og kan ikke importeres her.',
    }
  }
  return { valid: true, file: result.data }
}

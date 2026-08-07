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
      error: 'This file is not a valid shopping list export (unrecognized structure).',
    }
  }
  if (result.data.schemaVersion > LIST_EXPORT_SCHEMA_VERSION) {
    return {
      valid: false,
      error: 'This file was exported by a newer version of the app and cannot be imported here.',
    }
  }
  return { valid: true, file: result.data }
}

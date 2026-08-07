import { describe, expect, it } from 'vitest'
import { LIST_EXPORT_SCHEMA_VERSION, validateListExportFile } from './listExportSchema'

function validFile() {
  return {
    schemaVersion: LIST_EXPORT_SCHEMA_VERSION,
    appName: 'ShoppingList',
    fileType: 'list',
    exportedAt: '2026-08-07T00:00:00.000Z',
    list: {
      name: 'Weekly shopping',
      items: [
        {
          id: 'item-1',
          name: 'Milk',
          quantity: '2',
          unit: 'litres',
          category: 'Dairy',
          completed: false,
          createdAt: '2026-08-07T00:00:00.000Z',
          updatedAt: '2026-08-07T00:00:00.000Z',
        },
      ],
    },
  }
}

describe('validateListExportFile', () => {
  it('accepts a well-formed export', () => {
    const result = validateListExportFile(validFile())
    expect(result.valid).toBe(true)
  })

  it('rejects garbage input', () => {
    expect(validateListExportFile({ hello: 'world' }).valid).toBe(false)
    expect(validateListExportFile(null).valid).toBe(false)
    expect(validateListExportFile('a string').valid).toBe(false)
  })

  it('rejects a file from a different app', () => {
    const file = { ...validFile(), appName: 'TrainTrack' }
    expect(validateListExportFile(file).valid).toBe(false)
  })

  it('rejects a file exported by a newer schema version', () => {
    const file = { ...validFile(), schemaVersion: LIST_EXPORT_SCHEMA_VERSION + 1 }
    const result = validateListExportFile(file)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/newer version/)
  })

  it('rejects an item missing a required field', () => {
    const file = validFile()
    // @ts-expect-error deliberately malformed for the test
    delete file.list.items[0].quantity
    expect(validateListExportFile(file).valid).toBe(false)
  })
})

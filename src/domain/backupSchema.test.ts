import { describe, expect, it } from 'vitest'
import { BACKUP_SCHEMA_VERSION, validateBackupFile } from './backupSchema'

function validBackup() {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appName: 'ShoppingList',
    fileType: 'backup',
    exportedAt: '2026-08-07T00:00:00.000Z',
    categories: [{ name: 'Dairy', order: 0 }],
    units: [{ name: 'litres' }],
    lists: [
      {
        id: 'list-1',
        name: 'Weekly shopping',
        status: 'active',
        items: [
          {
            id: 'item-1',
            name: 'Milk',
            quantity: '2',
            category: 'Dairy',
            unit: 'litres',
            completed: false,
            createdAt: '2026-08-07T00:00:00.000Z',
            updatedAt: '2026-08-07T00:00:00.000Z',
          },
        ],
        createdAt: '2026-08-07T00:00:00.000Z',
        updatedAt: '2026-08-07T00:00:00.000Z',
      },
    ],
    templates: [],
    itemArchive: [
      { name: 'Milk', category: 'Dairy', unit: 'litres', updatedAt: '2026-08-07T00:00:00.000Z' },
    ],
  }
}

describe('validateBackupFile', () => {
  it('accepts a well-formed backup', () => {
    expect(validateBackupFile(validBackup()).valid).toBe(true)
  })

  it('rejects garbage input without touching anything', () => {
    expect(validateBackupFile({ foo: 'bar' }).valid).toBe(false)
    expect(validateBackupFile(42).valid).toBe(false)
    expect(validateBackupFile(undefined).valid).toBe(false)
  })

  it('rejects a file from a different app', () => {
    expect(validateBackupFile({ ...validBackup(), appName: 'TrainTrack' }).valid).toBe(false)
  })

  it('rejects an invalid list status', () => {
    const backup = validBackup()
    // @ts-expect-error deliberately malformed for the test
    backup.lists[0].status = 'deleted'
    expect(validateBackupFile(backup).valid).toBe(false)
  })

  it('rejects a newer schema version', () => {
    const result = validateBackupFile({
      ...validBackup(),
      schemaVersion: BACKUP_SCHEMA_VERSION + 1,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/nyere version/)
  })
})

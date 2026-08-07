import { beforeEach, describe, expect, it } from 'vitest'
import { validateBackupFile } from '../domain/backupSchema'
import { listCategories } from './categoryRepository'
import { rememberItem } from './itemArchiveRepository'
import { addItem, createList, getList } from './listRepository'
import { ShoppingListDB } from './schema'
import { buildBackup, mergeBackupData, replaceAllData } from './backupRepository'

let db: ShoppingListDB

beforeEach(() => {
  db = new ShoppingListDB(`test-backup-${crypto.randomUUID()}`)
})

async function seed(database: ShoppingListDB) {
  const categories = await listCategories(database)
  const dairy = categories.find((c) => c.name === 'Dairy')!
  const list = await createList(database, 'Weekly shopping')
  await addItem(database, list.id, { name: 'Milk', quantity: '2', categoryId: dairy.id })
  await rememberItem(database, { name: 'Milk', categoryId: dairy.id, quantity: '2' })
  return list
}

describe('buildBackup', () => {
  it('produces a file that validates against the backup schema', async () => {
    await seed(db)
    const backup = await buildBackup(db)
    expect(validateBackupFile(backup).valid).toBe(true)
  })
})

describe('replaceAllData', () => {
  it('wipes existing data and restores exactly what is in the backup', async () => {
    await seed(db)
    const backup = await buildBackup(db)

    const other = new ShoppingListDB(`test-backup-restore-${crypto.randomUUID()}`)
    await createList(other, 'Should be wiped')

    await replaceAllData(other, backup)

    const lists = await other.lists.toArray()
    expect(lists).toHaveLength(1)
    expect(lists[0]!.name).toBe('Weekly shopping')
    expect(lists.find((l) => l.name === 'Should be wiped')).toBeUndefined()

    const categories = await listCategories(other)
    expect(categories.find((c) => c.name === 'Dairy')).toBeDefined()
    expect(lists[0]!.items[0]!.categoryId).toBe(categories.find((c) => c.name === 'Dairy')!.id)
  })
})

describe('mergeBackupData', () => {
  it('adds records that do not exist locally yet, without touching existing ones', async () => {
    await seed(db)

    const other = new ShoppingListDB(`test-backup-merge-${crypto.randomUUID()}`)
    const localOnly = await createList(other, 'Local only list')
    const backup = await buildBackup(db)

    const summary = await mergeBackupData(other, backup)
    expect(summary.lists.added).toBe(1)

    const lists = await other.lists.toArray()
    expect(lists.map((l) => l.name).sort()).toEqual(['Local only list', 'Weekly shopping'])
    expect(await getList(other, localOnly.id)).toBeDefined()
  })

  it('only overwrites an existing record when the incoming copy is newer', async () => {
    const list = await seed(db)
    const backup = await buildBackup(db)

    const other = new ShoppingListDB(`test-backup-merge-newer-${crypto.randomUUID()}`)
    await replaceAllData(other, backup)

    // Make the local copy newer than the backup by editing it after building the backup.
    await addItem(other, list.id, { name: 'Bread', quantity: '1' })
    const localNow = await getList(other, list.id)

    const summary = await mergeBackupData(other, backup)
    expect(summary.lists.updated).toBe(0)
    const afterMerge = await getList(other, list.id)
    expect(afterMerge!.items).toHaveLength(localNow!.items.length)
  })

  it('does not duplicate categories or units already matched by name', async () => {
    await seed(db)
    const backup = await buildBackup(db)

    const other = new ShoppingListDB(`test-backup-merge-cats-${crypto.randomUUID()}`)
    await replaceAllData(other, backup)
    const before = await listCategories(other)

    await mergeBackupData(other, backup)
    const after = await listCategories(other)
    expect(after).toHaveLength(before.length)
  })
})

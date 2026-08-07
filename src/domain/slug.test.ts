import { describe, expect, it } from 'vitest'
import { backupFilename, listExportFilename, slugifyFilenamePart } from './slug'

describe('slugifyFilenamePart', () => {
  it('replaces whitespace with hyphens', () => {
    expect(slugifyFilenamePart('Weekly shopping')).toBe('Weekly-shopping')
  })

  it('strips characters unsafe for filenames', () => {
    expect(slugifyFilenamePart("Mom & Dad's / list?")).toBe('Mom-Dad-s-list')
  })

  it('falls back to a default when the name is empty after slugifying', () => {
    expect(slugifyFilenamePart('   ')).toBe('Shopping-list')
    expect(slugifyFilenamePart('!!!')).toBe('Shopping-list')
  })
})

describe('listExportFilename', () => {
  it('builds the documented filename shape', () => {
    expect(listExportFilename('Weekly shopping')).toBe('Weekly-shopping.shopping-list.json')
  })
})

describe('backupFilename', () => {
  it('embeds the export date', () => {
    expect(backupFilename('2026-08-07T12:34:56.000Z')).toBe('ShoppingList-backup-2026-08-07.json')
  })
})

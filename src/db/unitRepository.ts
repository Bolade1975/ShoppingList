import { generateId } from '../domain/id'
import type { Unit } from '../domain/types'
import type { ShoppingListDB } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listUnits(db: ShoppingListDB): Promise<Unit[]> {
  const units = await db.units.toArray()
  return units.sort((a, b) => a.name.localeCompare(b.name))
}

async function requireUnit(db: ShoppingListDB, id: string): Promise<Unit> {
  const unit = await db.units.get(id)
  if (!unit) throw new Error(`Unit ${id} not found`)
  return unit
}

export async function createUnit(db: ShoppingListDB, name: string): Promise<Unit> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Unit name is required.')
  const unit: Unit = { id: generateId(), name: trimmed, createdAt: nowIso() }
  await db.units.add(unit)
  return unit
}

export async function renameUnit(db: ShoppingListDB, id: string, name: string): Promise<Unit> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Unit name is required.')
  const unit = await requireUnit(db, id)
  const updated: Unit = { ...unit, name: trimmed }
  await db.units.put(updated)
  return updated
}

export async function deleteUnit(db: ShoppingListDB, id: string): Promise<void> {
  await db.units.delete(id)
}

/**
 * Finds a unit by case-insensitive name, or creates one — used when
 * importing an item that references a unit by name, so re-importing the
 * same file never creates duplicate units.
 */
export async function findOrCreateUnitByName(
  db: ShoppingListDB,
  name: string | undefined,
): Promise<string | undefined> {
  const trimmed = name?.trim()
  if (!trimmed) return undefined
  const existing = await db.units.toArray()
  const match = existing.find((unit) => unit.name.toLowerCase() === trimmed.toLowerCase())
  if (match) return match.id
  const created = await createUnit(db, trimmed)
  return created.id
}

import type { Category, ListItem, TemplateItem, Unit } from './types'

// The "portable" shapes are what leave the device in an export/backup file
// and what comes back in on import. They reference categories and units by
// NAME rather than by the device-local id stored internally, because ids are
// meaningless once a file crosses to another phone — see shareRepository.ts
// and backupRepository.ts for the name<->id resolution that happens at the
// data-access boundary.

export type PortableItem = {
  id: string
  name: string
  quantity: string
  unit?: string
  category?: string
  note?: string
  completed: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type PortableTemplateItem = {
  id: string
  name: string
  quantity: string
  unit?: string
  category?: string
  note?: string
}

function nameOf(id: string | undefined, byId: Map<string, { name: string }>): string | undefined {
  if (!id) return undefined
  return byId.get(id)?.name
}

export function categoriesById(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]))
}

export function unitsById(units: Unit[]): Map<string, Unit> {
  return new Map(units.map((unit) => [unit.id, unit]))
}

export function toPortableItem(
  item: ListItem,
  categoriesLookup: Map<string, Category>,
  unitsLookup: Map<string, Unit>,
): PortableItem {
  const category = nameOf(item.categoryId, categoriesLookup)
  const unit = nameOf(item.unitId, unitsLookup)
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    ...(category !== undefined ? { category } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(item.note !== undefined ? { note: item.note } : {}),
    completed: item.completed,
    ...(item.completedAt !== undefined ? { completedAt: item.completedAt } : {}),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function toPortableTemplateItem(
  item: TemplateItem,
  categoriesLookup: Map<string, Category>,
  unitsLookup: Map<string, Unit>,
): PortableTemplateItem {
  const category = nameOf(item.categoryId, categoriesLookup)
  const unit = nameOf(item.unitId, unitsLookup)
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    ...(category !== undefined ? { category } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(item.note !== undefined ? { note: item.note } : {}),
  }
}

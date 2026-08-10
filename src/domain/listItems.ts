import { UNCATEGORIZED_LABEL } from './constants'
import type { Category, ListItem } from './types'

export function countRemaining(items: ListItem[]): number {
  return items.filter((item) => !item.completed).length
}

/** Case/whitespace-insensitive lookup, used to warn about likely duplicates before adding a new item. */
export function findItemByName(items: ListItem[], name: string): ListItem | undefined {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return undefined
  return items.find((item) => item.name.trim().toLowerCase() === normalized)
}

function parseNumericQuantity(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : undefined
}

/**
 * Combines two quantity strings. When both are plain numbers they're summed
 * ("2" + "1" -> "3"); otherwise quantity is free text ("2-3", "1 large") that
 * can't be combined arithmetically, so the two are concatenated instead
 * ("1 large" + "2" -> "1 large + 2") rather than silently dropping either.
 */
export function combineQuantities(a: string, b: string): string {
  const numA = parseNumericQuantity(a)
  const numB = parseNumericQuantity(b)
  if (numA !== undefined && numB !== undefined) {
    const sum = Math.round((numA + numB) * 100) / 100
    return String(sum)
  }
  const trimmedA = a.trim()
  const trimmedB = b.trim()
  if (!trimmedA) return trimmedB
  if (!trimmedB) return trimmedA
  return `${trimmedA} + ${trimmedB}`
}

export type ItemGroup = {
  categoryId: string | undefined
  label: string
  items: ListItem[]
}

/**
 * Groups items by category, in the configured category order, with an
 * "Other" bucket last for items whose category is unset or points at a
 * category that's since been deleted. Within each group, not-completed
 * items come first and completed items sink to the bottom.
 */
export function groupItemsByCategory(items: ListItem[], categories: Category[]): ItemGroup[] {
  const orderedCategories = [...categories].sort((a, b) => a.order - b.order)
  const groups = new Map<string, ItemGroup>()
  for (const category of orderedCategories) {
    groups.set(category.id, { categoryId: category.id, label: category.name, items: [] })
  }
  const other: ItemGroup = { categoryId: undefined, label: UNCATEGORIZED_LABEL, items: [] }

  for (const item of items) {
    const group = item.categoryId !== undefined ? groups.get(item.categoryId) : undefined
    ;(group ?? other).items.push(item)
  }

  const result = [...groups.values(), other].filter((group) => group.items.length > 0)
  for (const group of result) {
    group.items = [...group.items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }
  return result
}

/**
 * Category groups for the not-completed items only — used together with
 * `getCompletedItems` so a list's completed items sit in one flat section
 * below every category, instead of at the bottom of each category.
 */
export function groupActiveItemsByCategory(items: ListItem[], categories: Category[]): ItemGroup[] {
  return groupItemsByCategory(
    items.filter((item) => !item.completed),
    categories,
  )
}

/** All completed items across every category, alphabetical — the flat "completed" section at the bottom of an active list. */
export function getCompletedItems(items: ListItem[]): ListItem[] {
  return items.filter((item) => item.completed).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * A quantity safe to display: falls back to "1" for the rare case of a
 * blank/whitespace-only stored quantity (e.g. very old data from before
 * quantity was required). Never writes anything back to storage — purely a
 * rendering fallback.
 */
export function displayQuantity(quantity: string): string {
  const trimmed = quantity.trim()
  return trimmed === '' ? '1' : trimmed
}

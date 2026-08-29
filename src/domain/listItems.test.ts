import { describe, expect, it } from 'vitest'
import {
  combineQuantities,
  countRemaining,
  displayQuantity,
  findActiveItemByName,
  findItemByName,
  getCompletedItems,
  groupActiveItemsByCategory,
  groupItemsByCategory,
} from './listItems'
import type { Category, ListItem } from './types'

function makeItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: overrides.id ?? 'item-1',
    name: 'Milk',
    quantity: '1',
    completed: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('combineQuantities', () => {
  it('sums two numeric quantities', () => {
    expect(combineQuantities('2', '1')).toBe('3')
  })

  it('sums decimal quantities', () => {
    expect(combineQuantities('1.5', '0.5')).toBe('2')
  })

  it('concatenates free-text quantities that cannot be summed', () => {
    expect(combineQuantities('1 large', '2')).toBe('1 large + 2')
    expect(combineQuantities('2-3', '1')).toBe('2-3 + 1')
  })

  it('falls back to whichever side is non-empty', () => {
    expect(combineQuantities('', '2')).toBe('2')
    expect(combineQuantities('2', '')).toBe('2')
  })
})

describe('findItemByName', () => {
  it('matches case- and whitespace-insensitively', () => {
    const items = [makeItem({ name: 'Milk' })]
    expect(findItemByName(items, '  milk  ')).toBe(items[0])
    expect(findItemByName(items, 'MILK')).toBe(items[0])
  })

  it('returns undefined when nothing matches', () => {
    expect(findItemByName([makeItem({ name: 'Milk' })], 'Bread')).toBeUndefined()
  })

  it('matches a completed item too — used elsewhere the completed state must not matter', () => {
    const items = [makeItem({ name: 'Milk', completed: true })]
    expect(findItemByName(items, 'Milk')).toBe(items[0])
  })
})

describe('findActiveItemByName', () => {
  it('matches an active (not-completed) item with the same name', () => {
    const items = [makeItem({ id: 'a', name: 'Milk', completed: false })]
    expect(findActiveItemByName(items, 'Milk')).toBe(items[0])
  })

  it('does not match a completed item, even when it is the only one with that name', () => {
    const items = [makeItem({ id: 'a', name: 'Milk', completed: true })]
    expect(findActiveItemByName(items, 'Milk')).toBeUndefined()
  })

  it('matches the active item when both an active and a completed item share the name', () => {
    const completed = makeItem({ id: 'a', name: 'Milk', completed: true })
    const active = makeItem({ id: 'b', name: 'Milk', completed: false })
    const result = findActiveItemByName([completed, active], 'Milk')
    expect(result).toBe(active)
  })

  it('is case- and whitespace-insensitive, same as findItemByName', () => {
    const items = [makeItem({ name: 'Gulerødder', completed: false })]
    expect(findActiveItemByName(items, '  gulerødder  ')).toBe(items[0])
    expect(findActiveItemByName(items, 'GULERØDDER')).toBe(items[0])
  })
})

describe('countRemaining', () => {
  it('counts only not-completed items', () => {
    const items = [
      makeItem({ id: 'a', completed: false }),
      makeItem({ id: 'b', completed: true }),
      makeItem({ id: 'c', completed: false }),
    ]
    expect(countRemaining(items)).toBe(2)
  })
})

describe('groupItemsByCategory', () => {
  const categories: Category[] = [
    { id: 'cat-produce', name: 'Fruit and vegetables', order: 0, createdAt: '' },
    { id: 'cat-dairy', name: 'Dairy', order: 1, createdAt: '' },
  ]

  it('groups items under their category, following category order', () => {
    const items = [
      makeItem({ id: '1', name: 'Milk', categoryId: 'cat-dairy' }),
      makeItem({ id: '2', name: 'Apple', categoryId: 'cat-produce' }),
    ]
    const groups = groupItemsByCategory(items, categories)
    expect(groups.map((g) => g.label)).toEqual(['Fruit and vegetables', 'Dairy'])
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Apple'])
  })

  it('places uncategorized items and items with a deleted category under Other, last', () => {
    const items = [
      makeItem({ id: '1', name: 'Mystery item', categoryId: 'cat-deleted' }),
      makeItem({ id: '2', name: 'Milk', categoryId: 'cat-dairy' }),
      makeItem({ id: '3', name: 'No category' }),
    ]
    const groups = groupItemsByCategory(items, categories)
    expect(groups.at(-1)!.label).toBe('Other')
    expect(
      groups
        .at(-1)!
        .items.map((i) => i.name)
        .sort(),
    ).toEqual(['Mystery item', 'No category'])
  })

  it('omits empty groups', () => {
    const items = [makeItem({ id: '1', name: 'Milk', categoryId: 'cat-dairy' })]
    const groups = groupItemsByCategory(items, categories)
    expect(groups).toHaveLength(1)
  })

  it('sorts completed items to the bottom within a group', () => {
    const items = [
      makeItem({ id: '1', name: 'Butter', categoryId: 'cat-dairy', completed: true }),
      makeItem({ id: '2', name: 'Milk', categoryId: 'cat-dairy', completed: false }),
    ]
    const groups = groupItemsByCategory(items, categories)
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Milk', 'Butter'])
  })
})

describe('groupActiveItemsByCategory', () => {
  const categories: Category[] = [
    { id: 'cat-produce', name: 'Fruit and vegetables', order: 0, createdAt: '' },
    { id: 'cat-dairy', name: 'Dairy', order: 1, createdAt: '' },
  ]

  it('excludes completed items entirely, leaving only not-completed items grouped by category', () => {
    const items = [
      makeItem({ id: '1', name: 'Milk', categoryId: 'cat-dairy', completed: false }),
      makeItem({ id: '2', name: 'Butter', categoryId: 'cat-dairy', completed: true }),
      makeItem({ id: '3', name: 'Apple', categoryId: 'cat-produce', completed: false }),
    ]
    const groups = groupActiveItemsByCategory(items, categories)
    expect(groups.map((g) => g.label)).toEqual(['Fruit and vegetables', 'Dairy'])
    expect(groups.flatMap((g) => g.items.map((i) => i.name))).toEqual(['Apple', 'Milk'])
  })

  it('produces no groups at all when every item is completed', () => {
    const items = [makeItem({ id: '1', name: 'Milk', categoryId: 'cat-dairy', completed: true })]
    expect(groupActiveItemsByCategory(items, categories)).toEqual([])
  })
})

describe('getCompletedItems', () => {
  it('returns only completed items, across every category, sorted alphabetically', () => {
    const items = [
      makeItem({ id: '1', name: 'Zucchini', categoryId: 'cat-produce', completed: true }),
      makeItem({ id: '2', name: 'Apple', categoryId: 'cat-produce', completed: false }),
      makeItem({ id: '3', name: 'Butter', categoryId: 'cat-dairy', completed: true }),
    ]
    expect(getCompletedItems(items).map((i) => i.name)).toEqual(['Butter', 'Zucchini'])
  })

  it('returns an empty array when nothing is completed', () => {
    expect(getCompletedItems([makeItem({ completed: false })])).toEqual([])
  })
})

describe('displayQuantity', () => {
  it('passes through a real quantity unchanged', () => {
    expect(displayQuantity('2')).toBe('2')
    expect(displayQuantity('2-3')).toBe('2-3')
  })

  it('falls back to "1" for a blank stored quantity without altering the source value', () => {
    const stored = '   '
    expect(displayQuantity(stored)).toBe('1')
    expect(stored).toBe('   ')
  })
})

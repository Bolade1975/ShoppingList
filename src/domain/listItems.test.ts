import { describe, expect, it } from 'vitest'
import {
  combineQuantities,
  countRemaining,
  findItemByName,
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

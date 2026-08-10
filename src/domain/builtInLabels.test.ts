import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES, DEFAULT_UNITS } from './constants'
import { displayCategoryLabel, displayUnitLabel } from './builtInLabels'

describe('displayCategoryLabel', () => {
  it('translates every default (English) category to Danish', () => {
    const translated = DEFAULT_CATEGORIES.map(displayCategoryLabel)
    expect(translated).toEqual([
      'Frugt og grønt',
      'Mejeriprodukter',
      'Kød og fisk',
      'Ost',
      'Brød og bager',
      'Frostvarer',
      'Drikkevarer',
      'Husholdning',
      'Personlig pleje',
      'Andet',
    ])
  })

  it('matches case-insensitively', () => {
    expect(displayCategoryLabel('DAIRY')).toBe('Mejeriprodukter')
    expect(displayCategoryLabel('dairy')).toBe('Mejeriprodukter')
  })

  it('never touches the stored English name itself, only what is displayed', () => {
    // The mapping is a pure function of the input string — it must not be
    // possible for it to mutate or otherwise report anything besides text.
    const input = 'Dairy'
    displayCategoryLabel(input)
    expect(input).toBe('Dairy')
  })

  it('returns a custom or user-renamed category name unchanged', () => {
    expect(displayCategoryLabel('Pet supplies')).toBe('Pet supplies')
    expect(displayCategoryLabel('Mine egne varer')).toBe('Mine egne varer')
  })

  it('never produces the same Danish label for two different stored names, avoiding accidental duplicates', () => {
    const labels = DEFAULT_CATEGORIES.map(displayCategoryLabel)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('displayUnitLabel', () => {
  it('translates every default (English) unit to Danish', () => {
    const translated = DEFAULT_UNITS.map(displayUnitLabel)
    expect(translated).toEqual([
      'stk.',
      'pakker',
      'poser',
      'flasker',
      'dåser',
      'kg',
      'g',
      'liter',
      'ml',
    ])
  })

  it('keeps international abbreviations unchanged', () => {
    expect(displayUnitLabel('kg')).toBe('kg')
    expect(displayUnitLabel('g')).toBe('g')
    expect(displayUnitLabel('ml')).toBe('ml')
  })

  it('returns a custom unit name unchanged', () => {
    expect(displayUnitLabel('rolls')).toBe('rolls')
  })
})

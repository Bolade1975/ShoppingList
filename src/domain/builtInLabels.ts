// Display-only translation for the built-in categories/units seeded by
// domain/constants.ts. The underlying stored `name` stays in English forever
// — it's the durable identity used for category/unit matching on import and
// backup merge (see db/categoryRepository.ts and db/unitRepository.ts) — so
// this file must never be used to decide identity or equality, only to
// choose what text to render. A custom or user-renamed category/unit simply
// doesn't match any key here and passes through unchanged, exactly as the
// user typed it.

const CATEGORY_LABELS_DA: Readonly<Record<string, string>> = {
  'fruit and vegetables': 'Frugt og grønt',
  dairy: 'Mejeriprodukter',
  'meat and fish': 'Kød og fisk',
  cheese: 'Ost og pålæg',
  'bread and bakery': 'Brød og bager',
  frozen: 'Frostvarer',
  drinks: 'Drikkevarer',
  household: 'Husholdning',
  'personal care': 'Personlig pleje',
  other: 'Andet',
}

const UNIT_LABELS_DA: Readonly<Record<string, string>> = {
  pcs: 'stk.',
  packages: 'pakker',
  bags: 'poser',
  bottles: 'flasker',
  cans: 'dåser',
  kg: 'kg',
  g: 'g',
  litres: 'liter',
  ml: 'ml',
}

/** Translates a built-in category name for display; any other name (custom or renamed) is returned unchanged. */
export function displayCategoryLabel(name: string): string {
  return CATEGORY_LABELS_DA[name.trim().toLowerCase()] ?? name
}

/** Translates a built-in unit name for display; any other name (custom or renamed) is returned unchanged. */
export function displayUnitLabel(name: string): string {
  return UNIT_LABELS_DA[name.trim().toLowerCase()] ?? name
}

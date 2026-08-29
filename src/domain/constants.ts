/** Seeded once into the categories table on first run; the user can rename, reorder or delete any of these afterwards. */
export const DEFAULT_CATEGORIES: readonly string[] = [
  'Fruit and vegetables',
  'Dairy',
  'Meat and fish',
  'Cheese',
  'Bread and bakery',
  'Frozen',
  'Drinks',
  'Household',
  'Personal care',
  'Kolonial',
  'Other',
]

/**
 * The "Kolonial" category name, shared between the fresh-install seed list
 * above and the additive schema migration (see db/schema.ts) that inserts
 * it into installs that already existed before it was added. Kept as its
 * own constant so both places stay in sync and so the migration's
 * idempotency check has one canonical string to compare against.
 */
export const KOLONIAL_CATEGORY_NAME = 'Kolonial'

/** Seeded once into the units table on first run. */
export const DEFAULT_UNITS: readonly string[] = [
  'pcs',
  'packages',
  'bags',
  'bottles',
  'cans',
  'kg',
  'g',
  'litres',
  'ml',
]

/** Label shown for items whose categoryId is unset or points at a deleted category. */
export const UNCATEGORIZED_LABEL = 'Other'

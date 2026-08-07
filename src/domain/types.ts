export type Category = {
  id: string
  name: string
  /** Sort position within the categories list — the order items are grouped in on a list. */
  order: number
  createdAt: string
}

export type Unit = {
  id: string
  name: string
  createdAt: string
}

/** An item on an active or archived shopping list. */
export type ListItem = {
  id: string
  name: string
  /** Free text: "3", "2-3", "1 large" are all valid. */
  quantity: string
  unitId?: string
  /** Undefined means uncategorized — displayed and grouped under "Other". */
  categoryId?: string
  note?: string
  completed: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type ListStatus = 'active' | 'archived'

export type ShoppingList = {
  id: string
  name: string
  status: ListStatus
  items: ListItem[]
  /** Per-list "hide completed items" display preference, persisted across app restarts. Absent is treated as false. */
  hideCompleted?: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

/** An item within a reusable template. No completed/note-of-the-moment state. */
export type TemplateItem = {
  id: string
  name: string
  quantity: string
  unitId?: string
  categoryId?: string
  note?: string
}

export type ShoppingTemplate = {
  id: string
  name: string
  items: TemplateItem[]
  createdAt: string
  updatedAt: string
}

/** Per-device memory of every item name ever added, for autocomplete + smart defaults. */
export type ArchivedItem = {
  id: string
  name: string
  /** Lowercased/trimmed form of `name`, used as the unique lookup key. */
  normalizedName: string
  categoryId?: string
  unitId?: string
  lastQuantity?: string
  updatedAt: string
}

export type NewListItemInput = {
  name: string
  quantity: string
  unitId?: string
  categoryId?: string
  note?: string
}

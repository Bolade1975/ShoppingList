import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { ItemForm } from '../../components/ItemForm'
import { QuickAddItemForm } from '../../components/QuickAddItemForm'
import { Toast } from '../../components/Toast'
import { listCategories } from '../../db/categoryRepository'
import {
  addItem,
  combineItemQuantity,
  deleteItem,
  editItem,
  getList,
  restoreItem,
  setHideCompleted,
  setItemCompleted,
} from '../../db/listRepository'
import { db } from '../../db/schema'
import { shareList } from '../../db/shareRepository'
import { listUnits } from '../../db/unitRepository'
import { displayCategoryLabel } from '../../domain/builtInLabels'
import {
  displayQuantity,
  findActiveItemByName,
  getCompletedItems,
  groupActiveItemsByCategory,
} from '../../domain/listItems'
import type { Category, ListItem, NewListItemInput } from '../../domain/types'
import { strings } from '../../strings'

type ListDetailScreenProps = {
  listId: string
  onBack: () => void
}

type PendingDuplicate = { input: NewListItemInput; existingItem: ListItem }
type UndoState =
  { kind: 'delete'; item: ListItem; index: number } | { kind: 'complete'; itemId: string }

const UNDO_TIMEOUT_MS = 6000

function itemAriaLabel(item: ListItem): string {
  return strings.listDetail.itemRowAriaTemplate
    .replace('{name}', item.name)
    .replace('{quantity}', displayQuantity(item.quantity))
}

function categoryHintFor(item: ListItem, categories: Category[]): string {
  const category = categories.find((candidate) => candidate.id === item.categoryId)
  return displayCategoryLabel(category?.name ?? strings.common.other)
}

export function ListDetailScreen({ listId, onBack }: ListDetailScreenProps) {
  const list = useLiveQuery(() => getList(db, listId), [listId])
  const categories = useLiveQuery(() => listCategories(db), []) ?? []
  const units = useLiveQuery(() => listUnits(db), []) ?? []

  const [pendingDuplicate, setPendingDuplicate] = useState<PendingDuplicate | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [undoState, setUndoState] = useState<UndoState | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
    }
  }, [])

  function scheduleUndoClear() {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setUndoState(null), UNDO_TIMEOUT_MS)
  }

  if (!list) {
    return (
      <div>
        <button type="button" className="back-button" onClick={onBack}>
          {strings.listDetail.backButton}
        </button>
      </div>
    )
  }

  async function handleAddItem(input: NewListItemInput) {
    const existingItem = findActiveItemByName(list!.items, input.name)
    if (existingItem) {
      setPendingDuplicate({ input, existingItem })
      return
    }
    await addItem(db, listId, input)
  }

  async function handleCombine() {
    if (!pendingDuplicate) return
    await combineItemQuantity(
      db,
      listId,
      pendingDuplicate.existingItem.id,
      pendingDuplicate.input.quantity,
    )
    setPendingDuplicate(null)
  }

  async function handleAddSeparately() {
    if (!pendingDuplicate) return
    await addItem(db, listId, pendingDuplicate.input)
    setPendingDuplicate(null)
  }

  async function handleToggleComplete(item: ListItem) {
    if (item.completed) {
      await setItemCompleted(db, listId, item.id, false)
      return
    }
    await setItemCompleted(db, listId, item.id, true)
    setUndoState({ kind: 'complete', itemId: item.id })
    scheduleUndoClear()
  }

  async function handleDelete(item: ListItem, index: number) {
    await deleteItem(db, listId, item.id)
    setUndoState({ kind: 'delete', item, index })
    scheduleUndoClear()
  }

  async function handleUndo() {
    if (!undoState) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    if (undoState.kind === 'delete') {
      await restoreItem(db, listId, undoState.item, undoState.index)
    } else {
      await setItemCompleted(db, listId, undoState.itemId, false)
    }
    setUndoState(null)
  }

  async function handleEditSubmit(itemId: string, input: NewListItemInput) {
    await editItem(db, listId, itemId, input)
    setEditingItemId(null)
  }

  async function handleToggleHideCompleted() {
    await setHideCompleted(db, listId, !list!.hideCompleted)
  }

  async function handleShare() {
    await shareList(db, list!)
  }

  function renderItemRow(item: ListItem, showCategoryHint: boolean) {
    if (editingItemId === item.id) {
      return (
        <li key={item.id}>
          <div className="quick-add">
            <ItemForm
              categories={categories}
              units={units}
              submitLabel={strings.common.save}
              initialValue={{
                name: item.name,
                quantity: item.quantity,
                ...(item.unitId !== undefined ? { unitId: item.unitId } : {}),
                ...(item.categoryId !== undefined ? { categoryId: item.categoryId } : {}),
                ...(item.note !== undefined ? { note: item.note } : {}),
              }}
              onSubmit={(input) => handleEditSubmit(item.id, input)}
              onCancel={() => setEditingItemId(null)}
            />
          </div>
        </li>
      )
    }

    const index = list!.items.findIndex((candidate) => candidate.id === item.id)

    return (
      <li key={item.id} className="item-row" data-completed={item.completed}>
        <button
          type="button"
          className="item-row__checkbox"
          aria-label={
            item.completed ? strings.listDetail.reopenAria : strings.listDetail.crossOffAria
          }
          onClick={() => handleToggleComplete(item)}
        >
          {item.completed ? '✓' : ''}
        </button>
        <span className="item-row__quantity">{displayQuantity(item.quantity)}</span>
        <button
          type="button"
          className="item-row__name-button"
          aria-label={itemAriaLabel(item)}
          onClick={() => setEditingItemId(item.id)}
        >
          <span className="item-row__name">{item.name}</span>
          {showCategoryHint && (
            <span className="item-row__category-hint">{categoryHintFor(item, categories)}</span>
          )}
        </button>
        <span className="item-row__actions">
          <button
            type="button"
            className="icon-button"
            aria-label={strings.listDetail.deleteItemAria}
            onClick={() => handleDelete(item, index)}
          >
            ✕
          </button>
        </span>
      </li>
    )
  }

  const hideCompleted = Boolean(list.hideCompleted)
  const activeGroups = groupActiveItemsByCategory(list.items, categories)
  const completedItems = getCompletedItems(list.items)
  const hasCompleted = completedItems.length > 0

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.listDetail.backButton}
      </button>

      <div className="screen__header-row">
        <h1 className="screen__title">{list.name}</h1>
        <button type="button" className="button button--compact" onClick={handleShare}>
          {strings.lists.shareButton}
        </button>
      </div>

      <QuickAddItemForm categories={categories} onSubmit={handleAddItem} />

      {pendingDuplicate && (
        <div className="duplicate-warning">
          <p>
            {strings.listDetail.duplicateWarningTemplate.replace(
              '{name}',
              pendingDuplicate.existingItem.name,
            )}
          </p>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={handleCombine}>
              {strings.listDetail.combineButton}
            </button>
            <button type="button" className="button button--muted" onClick={handleAddSeparately}>
              {strings.listDetail.addSeparatelyButton}
            </button>
          </div>
        </div>
      )}

      {list.items.length === 0 && (
        <p className="screen__placeholder">{strings.listDetail.emptyItems}</p>
      )}

      {activeGroups.map((group) => (
        <div key={group.categoryId ?? 'other'} className="category-group">
          <h2 className="category-group__heading">{displayCategoryLabel(group.label)}</h2>
          <ul className="item-list">{group.items.map((item) => renderItemRow(item, false))}</ul>
        </div>
      ))}

      {hasCompleted && (
        <button type="button" className="completed-toggle" onClick={handleToggleHideCompleted}>
          {hideCompleted ? strings.listDetail.showCompleted : strings.listDetail.hideCompleted}
        </button>
      )}

      {hasCompleted && !hideCompleted && (
        <div className="category-group category-group--completed">
          <h2 className="category-group__heading">{strings.listDetail.completedHeading}</h2>
          <ul className="item-list">{completedItems.map((item) => renderItemRow(item, true))}</ul>
        </div>
      )}

      {undoState && (
        <Toast
          message={
            undoState.kind === 'delete'
              ? strings.listDetail.deletedToast
              : strings.listDetail.completedToast
          }
          actionLabel={strings.common.undo}
          onAction={handleUndo}
        />
      )}
    </div>
  )
}

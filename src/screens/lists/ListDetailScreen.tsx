import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { ItemForm } from '../../components/ItemForm'
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
import { findItemByName, groupItemsByCategory } from '../../domain/listItems'
import type { ListItem, NewListItemInput } from '../../domain/types'
import { strings } from '../../strings'

type ListDetailScreenProps = {
  listId: string
  onBack: () => void
}

type PendingDuplicate = { input: NewListItemInput; existingItem: ListItem }
type UndoState =
  { kind: 'delete'; item: ListItem; index: number } | { kind: 'complete'; itemId: string }

const UNDO_TIMEOUT_MS = 6000

function itemMeta(item: ListItem, unitName: string | undefined): string {
  return [item.quantity, unitName].filter(Boolean).join(' ')
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
    const existingItem = findItemByName(list!.items, input.name)
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

  const hideCompleted = Boolean(list.hideCompleted)
  const visibleItems = hideCompleted ? list.items.filter((item) => !item.completed) : list.items
  const groups = groupItemsByCategory(visibleItems, categories)
  const hasCompleted = list.items.some((item) => item.completed)

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

      <div className="quick-add">
        <p className="quick-add__heading">{strings.listDetail.addItemHeading}</p>
        <ItemForm
          categories={categories}
          units={units}
          submitLabel={strings.listDetail.addButton}
          resetAfterSubmit
          onSubmit={handleAddItem}
        />
      </div>

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

      {hasCompleted && (
        <button type="button" className="completed-toggle" onClick={handleToggleHideCompleted}>
          {hideCompleted ? strings.listDetail.showCompleted : strings.listDetail.hideCompleted}
        </button>
      )}

      {list.items.length === 0 && (
        <p className="screen__placeholder">{strings.listDetail.emptyItems}</p>
      )}

      {groups.map((group) => (
        <div key={group.categoryId ?? 'other'} className="category-group">
          <h2 className="category-group__heading">{group.label}</h2>
          <ul className="item-list">
            {group.items.map((item) => {
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

              const unitName = units.find((unit) => unit.id === item.unitId)?.name
              const index = list.items.findIndex((candidate) => candidate.id === item.id)

              return (
                <li key={item.id} className="item-row" data-completed={item.completed}>
                  <button
                    type="button"
                    className="item-row__checkbox"
                    aria-label={item.completed ? 'Reopen item' : 'Cross off item'}
                    onClick={() => handleToggleComplete(item)}
                  >
                    {item.completed ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    className="item-row__body"
                    onClick={() => handleToggleComplete(item)}
                  >
                    <span className="item-row__name">{item.name}</span>
                    <span className="item-row__meta">{itemMeta(item, unitName)}</span>
                    {item.note && <span className="item-row__note">{item.note}</span>}
                  </button>
                  <span className="item-row__actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Edit item"
                      onClick={() => setEditingItemId(item.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Delete item"
                      onClick={() => handleDelete(item, index)}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

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

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  reorderCategories,
} from '../../db/categoryRepository'
import { db } from '../../db/schema'
import type { Category } from '../../domain/types'
import { strings } from '../../strings'

type CategoriesScreenProps = {
  onBack: () => void
}

export function CategoriesScreen({ onBack }: CategoriesScreenProps) {
  const categories = useLiveQuery(() => listCategories(db), []) ?? []
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    await createCategory(db, newName)
    setNewName('')
  }

  async function handleRename(category: Category) {
    if (!renameValue.trim()) return
    await renameCategory(db, category.id, renameValue)
    setRenamingId(null)
  }

  async function handleDelete(category: Category) {
    await deleteCategory(db, category.id)
    setDeleteConfirmId(null)
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const reordered = [...categories]
    const moved = reordered[index]!
    reordered[index] = reordered[targetIndex]!
    reordered[targetIndex] = moved
    await reorderCategories(
      db,
      reordered.map((category) => category.id),
    )
  }

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.common.back}
      </button>
      <h1 className="screen__title">{strings.categories.screenTitle}</h1>
      <p className="screen__subtitle">{strings.categories.subtitle}</p>

      <div className="form-row">
        <div className="field">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={strings.categories.newPlaceholder}
          />
        </div>
        <button type="button" className="button button--primary" onClick={handleAdd}>
          {strings.common.add}
        </button>
      </div>

      {categories.length === 0 && <p className="screen__placeholder">{strings.categories.empty}</p>}

      {categories.map((category, index) => (
        <div key={category.id}>
          {renamingId === category.id ? (
            <div className="reorder-row">
              <input
                type="text"
                autoFocus
                className="reorder-row__name"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
              />
              <button
                type="button"
                className="button button--compact"
                onClick={() => handleRename(category)}
              >
                {strings.common.save}
              </button>
              <button
                type="button"
                className="button button--compact button--muted"
                onClick={() => setRenamingId(null)}
              >
                {strings.common.cancel}
              </button>
            </div>
          ) : (
            <div className="reorder-row">
              <span className="reorder-row__name">{category.name}</span>
              <div className="reorder-row__buttons">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => handleMove(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === categories.length - 1}
                  onClick={() => handleMove(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Rename"
                  onClick={() => {
                    setRenamingId(category.id)
                    setRenameValue(category.name)
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setDeleteConfirmId(category.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {deleteConfirmId === category.id && (
            <div className="entry-row__confirm">
              <span className="form-error">{strings.categories.deleteConfirmPrompt}</span>
              <div className="form-actions">
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => handleDelete(category)}
                >
                  {strings.common.delete}
                </button>
                <button
                  type="button"
                  className="button button--muted"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  {strings.common.cancel}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

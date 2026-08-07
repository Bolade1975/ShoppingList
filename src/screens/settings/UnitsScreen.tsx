import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/schema'
import { createUnit, deleteUnit, listUnits, renameUnit } from '../../db/unitRepository'
import type { Unit } from '../../domain/types'
import { strings } from '../../strings'

type UnitsScreenProps = {
  onBack: () => void
}

export function UnitsScreen({ onBack }: UnitsScreenProps) {
  const units = useLiveQuery(() => listUnits(db), []) ?? []
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    await createUnit(db, newName)
    setNewName('')
  }

  async function handleRename(unit: Unit) {
    if (!renameValue.trim()) return
    await renameUnit(db, unit.id, renameValue)
    setRenamingId(null)
  }

  async function handleDelete(unit: Unit) {
    await deleteUnit(db, unit.id)
    setDeleteConfirmId(null)
  }

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.common.back}
      </button>
      <h1 className="screen__title">{strings.units.screenTitle}</h1>

      <div className="form-row">
        <div className="field">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={strings.units.newPlaceholder}
          />
        </div>
        <button type="button" className="button button--primary" onClick={handleAdd}>
          {strings.common.add}
        </button>
      </div>

      {units.length === 0 && <p className="screen__placeholder">{strings.units.empty}</p>}

      {units.map((unit) => (
        <div key={unit.id}>
          {renamingId === unit.id ? (
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
                onClick={() => handleRename(unit)}
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
              <span className="reorder-row__name">{unit.name}</span>
              <div className="reorder-row__buttons">
                <button
                  type="button"
                  aria-label="Rename"
                  onClick={() => {
                    setRenamingId(unit.id)
                    setRenameValue(unit.name)
                  }}
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setDeleteConfirmId(unit.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {deleteConfirmId === unit.id && (
            <div className="entry-row__confirm">
              <span className="form-error">{strings.units.deleteConfirmPrompt}</span>
              <div className="form-actions">
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => handleDelete(unit)}
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

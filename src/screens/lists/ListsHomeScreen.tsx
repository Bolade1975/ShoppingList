import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { countRemaining } from '../../domain/listItems'
import type { ShoppingList } from '../../domain/types'
import {
  archiveList,
  createList,
  deleteList,
  duplicateList,
  listActiveLists,
  renameList,
} from '../../db/listRepository'
import { db } from '../../db/schema'
import { shareList } from '../../db/shareRepository'
import { createTemplateFromList } from '../../db/templateRepository'
import { strings } from '../../strings'

type ListsHomeScreenProps = {
  onSelect: (listId: string) => void
}

type Panel =
  | { kind: 'menu' }
  | { kind: 'rename'; value: string }
  | { kind: 'template'; value: string }
  | { kind: 'archiveConfirm' }
  | { kind: 'deleteConfirm' }

type ActivePanel = { listId: string; panel: Panel } | null

export function ListsHomeScreen({ onSelect }: ListsHomeScreenProps) {
  const lists = useLiveQuery(() => listActiveLists(db), [])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ActivePanel>(null)

  async function handleCreate() {
    if (!newName.trim()) {
      setError('List name is required.')
      return
    }
    const list = await createList(db, newName)
    setNewName('')
    setCreating(false)
    setError(null)
    onSelect(list.id)
  }

  function closePanel() {
    setActive(null)
  }

  async function handleRename(list: ShoppingList, value: string) {
    if (!value.trim()) return
    await renameList(db, list.id, value)
    closePanel()
  }

  async function handleDuplicate(list: ShoppingList) {
    await duplicateList(db, list.id)
    closePanel()
  }

  async function handleSaveAsTemplate(list: ShoppingList, value: string) {
    await createTemplateFromList(db, list.id, value || undefined)
    closePanel()
  }

  async function handleArchive(list: ShoppingList) {
    await archiveList(db, list.id)
    closePanel()
  }

  async function handleDelete(list: ShoppingList) {
    await deleteList(db, list.id)
    closePanel()
  }

  async function handleShare(list: ShoppingList) {
    await shareList(db, list)
    closePanel()
  }

  return (
    <div>
      <div className="screen__header-row">
        <h1 className="screen__title">{strings.lists.screenTitle}</h1>
        {!creating && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setCreating(true)}
          >
            {strings.lists.newListButton}
          </button>
        )}
      </div>

      {creating && (
        <div className="quick-add">
          <div className="field">
            <label className="field__label" htmlFor="new-list-name">
              {strings.common.nameLabel}
            </label>
            <input
              id="new-list-name"
              type="text"
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={strings.lists.newListPlaceholder}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={handleCreate}>
              {strings.common.add}
            </button>
            <button
              type="button"
              className="button button--muted"
              onClick={() => {
                setCreating(false)
                setNewName('')
                setError(null)
              }}
            >
              {strings.common.cancel}
            </button>
          </div>
        </div>
      )}

      {lists?.length === 0 && !creating && (
        <p className="screen__placeholder">{strings.lists.empty}</p>
      )}

      <ul className="entry-list">
        {lists?.map((list) => {
          const isActive = active?.listId === list.id
          const panel = isActive ? active.panel : null
          const remaining = countRemaining(list.items)

          return (
            <li key={list.id} className="entry-row">
              <div className="entry-row__main">
                <button
                  type="button"
                  className="entry-row__main-tap"
                  onClick={() => onSelect(list.id)}
                >
                  <span className="entry-row__name">{list.name}</span>
                  <br />
                  <span className="entry-row__meta">
                    {remaining > 0
                      ? strings.lists.remainingTemplate.replace('{count}', String(remaining))
                      : strings.lists.allDoneLabel}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="More actions"
                  onClick={() =>
                    setActive(
                      isActive && panel?.kind === 'menu'
                        ? null
                        : { listId: list.id, panel: { kind: 'menu' } },
                    )
                  }
                >
                  ⋯
                </button>
              </div>

              {panel?.kind === 'menu' && (
                <div className="entry-row__actions">
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() =>
                      setActive({ listId: list.id, panel: { kind: 'rename', value: list.name } })
                    }
                  >
                    {strings.common.rename}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() => handleDuplicate(list)}
                  >
                    {strings.lists.duplicateButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() =>
                      setActive({ listId: list.id, panel: { kind: 'template', value: list.name } })
                    }
                  >
                    {strings.lists.saveAsTemplateButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() => handleShare(list)}
                  >
                    {strings.lists.shareButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() =>
                      setActive({ listId: list.id, panel: { kind: 'archiveConfirm' } })
                    }
                  >
                    {strings.lists.archiveButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact button--danger"
                    onClick={() => setActive({ listId: list.id, panel: { kind: 'deleteConfirm' } })}
                  >
                    {strings.common.delete}
                  </button>
                </div>
              )}

              {panel?.kind === 'rename' && (
                <div className="entry-row__confirm">
                  <input
                    type="text"
                    autoFocus
                    value={panel.value}
                    onChange={(event) =>
                      setActive({
                        listId: list.id,
                        panel: { kind: 'rename', value: event.target.value },
                      })
                    }
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleRename(list, panel.value)}
                    >
                      {strings.common.save}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'template' && (
                <div className="entry-row__confirm">
                  <span>{strings.lists.saveAsTemplatePrompt}</span>
                  <input
                    type="text"
                    autoFocus
                    value={panel.value}
                    placeholder={strings.lists.templateNameLabel}
                    onChange={(event) =>
                      setActive({
                        listId: list.id,
                        panel: { kind: 'template', value: event.target.value },
                      })
                    }
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleSaveAsTemplate(list, panel.value)}
                    >
                      {strings.common.save}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'archiveConfirm' && (
                <div className="entry-row__confirm">
                  <span>{strings.lists.archiveConfirmPrompt}</span>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleArchive(list)}
                    >
                      {strings.lists.archiveButton}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'deleteConfirm' && (
                <div className="entry-row__confirm">
                  <span className="form-error">{strings.lists.deleteConfirmPrompt}</span>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => handleDelete(list)}
                    >
                      {strings.common.delete}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

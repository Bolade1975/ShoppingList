import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { formatDisplayDate } from '../../domain/formatDate'
import type { ShoppingList } from '../../domain/types'
import { createListFromHistory, deleteList, listArchivedLists } from '../../db/listRepository'
import { db } from '../../db/schema'
import { shareList } from '../../db/shareRepository'
import { strings } from '../../strings'

type HistoryListScreenProps = {
  onSelect: (listId: string) => void
}

type Panel = { kind: 'menu' } | { kind: 'restore'; value: string } | { kind: 'deleteConfirm' }
type ActivePanel = { listId: string; panel: Panel } | null

export function HistoryListScreen({ onSelect }: HistoryListScreenProps) {
  const lists = useLiveQuery(() => listArchivedLists(db), [])
  const [active, setActive] = useState<ActivePanel>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function closePanel() {
    setActive(null)
  }

  async function handleRestore(list: ShoppingList, value: string) {
    const created = await createListFromHistory(db, list.id, value || undefined)
    closePanel()
    setSuccessMessage(strings.importList.successTemplate.replace('{name}', created.name))
    setTimeout(() => setSuccessMessage(null), 4000)
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
      <h1 className="screen__title">{strings.history.screenTitle}</h1>

      {successMessage && <p className="form-success">{successMessage}</p>}

      {lists?.length === 0 && <p className="screen__placeholder">{strings.history.empty}</p>}

      <ul className="entry-list">
        {lists?.map((list) => {
          const isActive = active?.listId === list.id
          const panel = isActive ? active.panel : null

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
                    {strings.history.archivedOnTemplate.replace(
                      '{date}',
                      formatDisplayDate(list.archivedAt ?? list.updatedAt),
                    )}
                    {' · '}
                    {strings.history.itemsCountTemplate.replace(
                      '{count}',
                      String(list.items.length),
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={strings.a11y.moreActions}
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
                    className="button button--compact button--primary"
                    onClick={() =>
                      setActive({ listId: list.id, panel: { kind: 'restore', value: list.name } })
                    }
                  >
                    {strings.history.restoreButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() => handleShare(list)}
                  >
                    {strings.history.shareButton}
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

              {panel?.kind === 'restore' && (
                <div className="entry-row__confirm">
                  <span>{strings.history.restorePrompt}</span>
                  <input
                    type="text"
                    autoFocus
                    value={panel.value}
                    placeholder={strings.history.newListNameLabel}
                    onChange={(event) =>
                      setActive({
                        listId: list.id,
                        panel: { kind: 'restore', value: event.target.value },
                      })
                    }
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleRestore(list, panel.value)}
                    >
                      {strings.history.restoreButton}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'deleteConfirm' && (
                <div className="entry-row__confirm">
                  <span className="form-error">{strings.history.deleteConfirmPrompt}</span>
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

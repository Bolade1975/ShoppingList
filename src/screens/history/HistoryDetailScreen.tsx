import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listCategories } from '../../db/categoryRepository'
import { createListFromHistory, getList } from '../../db/listRepository'
import { db } from '../../db/schema'
import { shareList } from '../../db/shareRepository'
import { listUnits } from '../../db/unitRepository'
import { formatDisplayDate } from '../../domain/formatDate'
import { groupItemsByCategory } from '../../domain/listItems'
import type { ListItem } from '../../domain/types'
import { strings } from '../../strings'

type HistoryDetailScreenProps = {
  listId: string
  onBack: () => void
}

function itemMeta(item: ListItem, unitName: string | undefined): string {
  return [item.quantity, unitName].filter(Boolean).join(' ')
}

export function HistoryDetailScreen({ listId, onBack }: HistoryDetailScreenProps) {
  const list = useLiveQuery(() => getList(db, listId), [listId])
  const categories = useLiveQuery(() => listCategories(db), []) ?? []
  const units = useLiveQuery(() => listUnits(db), []) ?? []
  const [restoring, setRestoring] = useState(false)
  const [restoreName, setRestoreName] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!list) {
    return (
      <button type="button" className="back-button" onClick={onBack}>
        {strings.history.backButton}
      </button>
    )
  }

  async function handleRestore() {
    const created = await createListFromHistory(db, listId, restoreName || undefined)
    setRestoring(false)
    setSuccessMessage(strings.importList.successTemplate.replace('{name}', created.name))
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  async function handleShare() {
    await shareList(db, list!)
  }

  const groups = groupItemsByCategory(list.items, categories)

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.history.backButton}
      </button>

      <div className="screen__header-row">
        <h1 className="screen__title">{list.name}</h1>
      </div>
      <p className="screen__subtitle">
        {strings.history.archivedOnTemplate.replace(
          '{date}',
          formatDisplayDate(list.archivedAt ?? list.updatedAt),
        )}
      </p>

      {successMessage && <p className="form-success">{successMessage}</p>}

      <div className="form-actions">
        {!restoring && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setRestoring(true)
              setRestoreName(list.name)
            }}
          >
            {strings.history.restoreButton}
          </button>
        )}
        <button type="button" className="button" onClick={handleShare}>
          {strings.history.shareButton}
        </button>
      </div>

      {restoring && (
        <div className="quick-add">
          <p>{strings.history.restorePrompt}</p>
          <div className="field">
            <label className="field__label" htmlFor="restore-name">
              {strings.history.newListNameLabel}
            </label>
            <input
              id="restore-name"
              type="text"
              autoFocus
              value={restoreName}
              onChange={(event) => setRestoreName(event.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={handleRestore}>
              {strings.history.restoreButton}
            </button>
            <button
              type="button"
              className="button button--muted"
              onClick={() => setRestoring(false)}
            >
              {strings.common.cancel}
            </button>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.categoryId ?? 'other'} className="category-group">
          <h2 className="category-group__heading">{group.label}</h2>
          <ul className="item-list">
            {group.items.map((item) => {
              const unitName = units.find((unit) => unit.id === item.unitId)?.name
              return (
                <li key={item.id} className="item-row" data-completed={item.completed}>
                  <span className="item-row__checkbox">{item.completed ? '✓' : ''}</span>
                  <span className="item-row__body">
                    <span className="item-row__name">{item.name}</span>
                    <span className="item-row__meta">{itemMeta(item, unitName)}</span>
                    {item.note && <span className="item-row__note">{item.note}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

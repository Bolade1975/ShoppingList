import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listCategories } from '../../db/categoryRepository'
import {
  deleteArchivedItem,
  listArchivedItems,
  updateArchivedItem,
} from '../../db/itemArchiveRepository'
import { db } from '../../db/schema'
import { listUnits } from '../../db/unitRepository'
import { displayCategoryLabel, displayUnitLabel } from '../../domain/builtInLabels'
import type { ArchivedItem } from '../../domain/types'
import { strings } from '../../strings'

type Panel =
  { kind: 'edit'; name: string; categoryId: string; unitId: string } | { kind: 'deleteConfirm' }
type ActivePanel = { itemId: string; panel: Panel } | null

export function ArchiveSection() {
  const items = useLiveQuery(() => listArchivedItems(db), [])
  const categories = useLiveQuery(() => listCategories(db), []) ?? []
  const units = useLiveQuery(() => listUnits(db), []) ?? []
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<ActivePanel>(null)

  function closePanel() {
    setActive(null)
  }

  async function handleSave(item: ArchivedItem, panel: Extract<Panel, { kind: 'edit' }>) {
    if (!panel.name.trim()) return
    await updateArchivedItem(db, item.id, {
      name: panel.name,
      ...(panel.categoryId ? { categoryId: panel.categoryId } : {}),
      ...(panel.unitId ? { unitId: panel.unitId } : {}),
    })
    closePanel()
  }

  async function handleDelete(item: ArchivedItem) {
    await deleteArchivedItem(db, item.id)
    closePanel()
  }

  const filtered = query.trim()
    ? (items ?? []).filter((item) => item.normalizedName.includes(query.trim().toLowerCase()))
    : items

  return (
    <div>
      <h1 className="screen__title">{strings.archive.screenTitle}</h1>
      <p className="screen__subtitle">{strings.archive.subtitle}</p>

      {items && items.length > 0 && (
        <div className="field">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={strings.archive.searchPlaceholder}
          />
        </div>
      )}

      {items?.length === 0 && <p className="screen__placeholder">{strings.archive.empty}</p>}

      <ul className="entry-list">
        {filtered?.map((item) => {
          const isActive = active?.itemId === item.id
          const panel = isActive ? active.panel : null
          const categoryName = categories.find((c) => c.id === item.categoryId)?.name
          const unitName = units.find((u) => u.id === item.unitId)?.name
          const categoryDisplay =
            categoryName !== undefined ? displayCategoryLabel(categoryName) : undefined
          const unitDisplay = unitName !== undefined ? displayUnitLabel(unitName) : undefined

          return (
            <li key={item.id} className="entry-row">
              <div className="entry-row__main">
                <button
                  type="button"
                  className="entry-row__main-tap"
                  onClick={() =>
                    setActive({
                      itemId: item.id,
                      panel: {
                        kind: 'edit',
                        name: item.name,
                        categoryId: item.categoryId ?? '',
                        unitId: item.unitId ?? '',
                      },
                    })
                  }
                >
                  <span className="entry-row__name">{item.name}</span>
                  <br />
                  <span className="entry-row__meta">
                    {[categoryDisplay, unitDisplay].filter(Boolean).join(' · ') ||
                      strings.common.none}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={strings.archive.deleteFromArchiveAria}
                  onClick={() => setActive({ itemId: item.id, panel: { kind: 'deleteConfirm' } })}
                >
                  ✕
                </button>
              </div>

              {panel?.kind === 'edit' && (
                <div className="entry-row__confirm">
                  <div className="field">
                    <label className="field__label">{strings.common.nameLabel}</label>
                    <input
                      type="text"
                      value={panel.name}
                      onChange={(event) =>
                        setActive({
                          itemId: item.id,
                          panel: { ...panel, name: event.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label className="field__label">{strings.archive.usualCategoryLabel}</label>
                      <select
                        value={panel.categoryId}
                        onChange={(event) =>
                          setActive({
                            itemId: item.id,
                            panel: { ...panel, categoryId: event.target.value },
                          })
                        }
                      >
                        <option value="">{strings.common.other}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {displayCategoryLabel(category.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field__label">{strings.archive.usualUnitLabel}</label>
                      <select
                        value={panel.unitId}
                        onChange={(event) =>
                          setActive({
                            itemId: item.id,
                            panel: { ...panel, unitId: event.target.value },
                          })
                        }
                      >
                        <option value="">{strings.common.none}</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {displayUnitLabel(unit.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {item.lastQuantity && (
                    <p className="screen__placeholder">
                      {strings.archive.lastQuantityLabel}: {item.lastQuantity}
                    </p>
                  )}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleSave(item, panel)}
                    >
                      {strings.common.save}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'deleteConfirm' && (
                <div className="entry-row__confirm">
                  <span className="form-error">{strings.archive.deleteConfirmPrompt}</span>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => handleDelete(item)}
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

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ItemForm } from '../../components/ItemForm'
import { listCategories } from '../../db/categoryRepository'
import { db } from '../../db/schema'
import {
  addTemplateItem,
  deleteTemplateItem,
  editTemplateItem,
  getTemplate,
} from '../../db/templateRepository'
import { listUnits } from '../../db/unitRepository'
import { groupItemsByCategory } from '../../domain/listItems'
import type { NewListItemInput, TemplateItem } from '../../domain/types'
import { strings } from '../../strings'

type TemplateDetailScreenProps = {
  templateId: string
  onBack: () => void
}

function itemMeta(item: TemplateItem, unitName: string | undefined): string {
  return [item.quantity, unitName].filter(Boolean).join(' ')
}

export function TemplateDetailScreen({ templateId, onBack }: TemplateDetailScreenProps) {
  const template = useLiveQuery(() => getTemplate(db, templateId), [templateId])
  const categories = useLiveQuery(() => listCategories(db), []) ?? []
  const units = useLiveQuery(() => listUnits(db), []) ?? []
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (!template) {
    return (
      <button type="button" className="back-button" onClick={onBack}>
        {strings.templateDetail.backButton}
      </button>
    )
  }

  async function handleAdd(input: NewListItemInput) {
    await addTemplateItem(db, templateId, input)
  }

  async function handleEditSubmit(itemId: string, input: NewListItemInput) {
    await editTemplateItem(db, templateId, itemId, input)
    setEditingItemId(null)
  }

  async function handleDelete(itemId: string) {
    await deleteTemplateItem(db, templateId, itemId)
    setDeleteConfirmId(null)
  }

  // Templates have no completed status or timestamps; groupItemsByCategory only reads
  // `completed`/`name` for sorting, so these are stable placeholders, not real data.
  const asListItems = template.items.map((item) => ({
    ...item,
    completed: false as const,
    createdAt: '',
    updatedAt: '',
  }))
  const groups = groupItemsByCategory(asListItems, categories)

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.templateDetail.backButton}
      </button>
      <h1 className="screen__title">{template.name}</h1>

      <div className="quick-add">
        <p className="quick-add__heading">{strings.templateDetail.addItemHeading}</p>
        <ItemForm
          categories={categories}
          units={units}
          submitLabel={strings.templateDetail.addButton}
          resetAfterSubmit
          onSubmit={handleAdd}
        />
      </div>

      {template.items.length === 0 && (
        <p className="screen__placeholder">{strings.templateDetail.emptyItems}</p>
      )}

      {groups.map((group) => (
        <div key={group.categoryId ?? 'other'} className="category-group">
          <h2 className="category-group__heading">{group.label}</h2>
          <ul className="item-list">
            {group.items.map((groupedItem) => {
              const item = template.items.find((candidate) => candidate.id === groupedItem.id)!

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

              return (
                <li key={item.id} className="item-row">
                  <span className="item-row__body">
                    <span className="item-row__name">{item.name}</span>
                    <span className="item-row__meta">{itemMeta(item, unitName)}</span>
                    {item.note && <span className="item-row__note">{item.note}</span>}
                  </span>
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
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      ✕
                    </button>
                  </span>
                  {deleteConfirmId === item.id && (
                    <div className="entry-row__confirm">
                      <span className="form-error">
                        {strings.templateDetail.deleteItemConfirmPrompt}
                      </span>
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button button--danger"
                          onClick={() => handleDelete(item.id)}
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
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

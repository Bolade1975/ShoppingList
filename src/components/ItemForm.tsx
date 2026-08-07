import { useLiveQuery } from 'dexie-react-hooks'
import { type FormEvent, useState } from 'react'
import { searchArchivedItems } from '../db/itemArchiveRepository'
import { db } from '../db/schema'
import type { ArchivedItem, Category, NewListItemInput, Unit } from '../domain/types'
import { strings } from '../strings'

type ItemFormProps = {
  categories: Category[]
  units: Unit[]
  initialValue?: NewListItemInput
  submitLabel: string
  onSubmit: (value: NewListItemInput) => void
  onCancel?: () => void
  /** Quick-add mode: clears the form after each submit instead of leaving the last entry filled in, so the user can add several items without reopening anything. */
  resetAfterSubmit?: boolean
  autoFocus?: boolean
}

function suggestionMeta(item: ArchivedItem, categories: Category[], units: Unit[]): string {
  const categoryName = categories.find((c) => c.id === item.categoryId)?.name
  const unitName = units.find((u) => u.id === item.unitId)?.name
  return [categoryName, unitName].filter((value): value is string => Boolean(value)).join(' · ')
}

export function ItemForm({
  categories,
  units,
  initialValue,
  submitLabel,
  onSubmit,
  onCancel,
  resetAfterSubmit = false,
  autoFocus = false,
}: ItemFormProps) {
  const [name, setName] = useState(initialValue?.name ?? '')
  const [quantity, setQuantity] = useState(initialValue?.quantity ?? '')
  const [unitId, setUnitId] = useState(initialValue?.unitId ?? '')
  const [categoryId, setCategoryId] = useState(initialValue?.categoryId ?? '')
  const [note, setNote] = useState(initialValue?.note ?? '')
  const [showNote, setShowNote] = useState(Boolean(initialValue?.note))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions =
    useLiveQuery(
      () => (name.trim() ? searchArchivedItems(db, name) : Promise.resolve([])),
      [name],
    ) ?? []

  function applySuggestion(item: ArchivedItem) {
    setName(item.name)
    if (item.categoryId !== undefined) setCategoryId(item.categoryId)
    if (item.unitId !== undefined) setUnitId(item.unitId)
    if (item.lastQuantity !== undefined && !quantity.trim()) setQuantity(item.lastQuantity)
    setShowSuggestions(false)
  }

  function resetForm() {
    setName('')
    setQuantity('')
    setUnitId('')
    setCategoryId('')
    setNote('')
    setShowNote(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Item name is required.')
      return
    }
    if (!quantity.trim()) {
      setError('Quantity is required.')
      return
    }
    setError(null)
    const value: NewListItemInput = {
      name,
      quantity,
      ...(unitId ? { unitId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(note.trim() ? { note } : {}),
    }
    onSubmit(value)
    if (resetAfterSubmit) resetForm()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field autocomplete">
        <label className="field__label" htmlFor="item-name">
          {strings.common.nameLabel}
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          autoFocus={autoFocus}
          onChange={(event) => {
            setName(event.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={strings.listDetail.itemNamePlaceholder}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="autocomplete__list">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  className="autocomplete__option"
                  onMouseDown={() => applySuggestion(suggestion)}
                >
                  {suggestion.name}
                  {suggestionMeta(suggestion, categories, units) && (
                    <span className="autocomplete__option-meta">
                      {suggestionMeta(suggestion, categories, units)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-row">
        <div className="field">
          <label className="field__label" htmlFor="item-quantity">
            {strings.common.quantityLabel}
          </label>
          <input
            id="item-quantity"
            type="text"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={strings.listDetail.quantityPlaceholder}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="item-unit">
            {strings.common.unitLabel}
          </label>
          <select id="item-unit" value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="">{strings.common.none}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="item-category">
          {strings.common.categoryLabel}
        </label>
        <select
          id="item-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">{strings.common.other}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {showNote ? (
        <div className="field">
          <label className="field__label" htmlFor="item-note">
            {strings.common.noteLabel} {strings.common.optional}
          </label>
          <input
            id="item-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={strings.listDetail.notePlaceholder}
          />
        </div>
      ) : (
        <button type="button" className="link-button" onClick={() => setShowNote(true)}>
          {strings.listDetail.addNoteButton}
        </button>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="button button--primary">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button button--muted" onClick={onCancel}>
            {strings.common.cancel}
          </button>
        )}
      </div>
    </form>
  )
}

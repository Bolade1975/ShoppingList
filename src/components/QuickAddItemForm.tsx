import { useLiveQuery } from 'dexie-react-hooks'
import { type FormEvent, useRef, useState } from 'react'
import { searchArchivedItems } from '../db/itemArchiveRepository'
import { db } from '../db/schema'
import { displayCategoryLabel } from '../domain/builtInLabels'
import type { ArchivedItem, Category, NewListItemInput } from '../domain/types'
import { strings } from '../strings'

type QuickAddItemFormProps = {
  categories: Category[]
  onSubmit: (value: NewListItemInput) => void
}

/**
 * Compact "Name + Category" entry row for fast repeated item entry. A new
 * item always gets quantity "1" — the user opens the item's details editor
 * afterwards to change quantity, unit, or add a note. Selecting an
 * autocomplete suggestion silently applies its remembered unit (never shown
 * here) and visibly applies its remembered category.
 */
export function QuickAddItemForm({ categories, onSubmit }: QuickAddItemFormProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const suggestions =
    useLiveQuery(
      () => (name.trim() ? searchArchivedItems(db, name) : Promise.resolve([])),
      [name],
    ) ?? []

  function applySuggestion(item: ArchivedItem) {
    setName(item.name)
    setCategoryId(item.categoryId ?? '')
    setUnitId(item.unitId ?? '')
    setShowSuggestions(false)
    nameInputRef.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError(strings.common.nameRequiredError)
      return
    }
    setError(null)
    const value: NewListItemInput = {
      name,
      quantity: '1',
      ...(unitId ? { unitId } : {}),
      ...(categoryId ? { categoryId } : {}),
    }
    onSubmit(value)
    setName('')
    setCategoryId('')
    setUnitId('')
    setShowSuggestions(false)
    // Not awaiting the parent's (async) save keeps refocus instant, so several
    // items can be entered back-to-back without waiting on each IndexedDB write.
    nameInputRef.current?.focus()
  }

  return (
    <form className="quick-add-row" onSubmit={handleSubmit}>
      <div className="quick-add-row__fields">
        <div className="autocomplete quick-add-row__name">
          <label className="sr-only" htmlFor="quick-add-name">
            {strings.listDetail.quickAddNameAria}
          </label>
          <input
            id="quick-add-name"
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setShowSuggestions(true)
              setError(null)
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
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select
          className="quick-add-row__category"
          aria-label={strings.listDetail.quickAddCategoryAria}
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          <option value="">{strings.common.other}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {displayCategoryLabel(category.name)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="quick-add-row__submit"
          aria-label={strings.listDetail.quickAddSubmitAria}
        >
          +
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  )
}

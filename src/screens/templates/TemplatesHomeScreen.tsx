import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { createListFromTemplate } from '../../db/listRepository'
import { db } from '../../db/schema'
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  renameTemplate,
} from '../../db/templateRepository'
import type { ShoppingTemplate } from '../../domain/types'
import { strings } from '../../strings'

type TemplatesHomeScreenProps = {
  onSelect: (templateId: string) => void
}

type Panel =
  | { kind: 'menu' }
  | { kind: 'rename'; value: string }
  | { kind: 'use'; value: string }
  | { kind: 'deleteConfirm' }

type ActivePanel = { templateId: string; panel: Panel } | null

export function TemplatesHomeScreen({ onSelect }: TemplatesHomeScreenProps) {
  const templates = useLiveQuery(() => listTemplates(db), [])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ActivePanel>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleCreate() {
    if (!newName.trim()) {
      setError('Template name is required.')
      return
    }
    const template = await createTemplate(db, newName)
    setNewName('')
    setCreating(false)
    setError(null)
    onSelect(template.id)
  }

  function closePanel() {
    setActive(null)
  }

  async function handleRename(template: ShoppingTemplate, value: string) {
    if (!value.trim()) return
    await renameTemplate(db, template.id, value)
    closePanel()
  }

  async function handleDelete(template: ShoppingTemplate) {
    await deleteTemplate(db, template.id)
    closePanel()
  }

  async function handleUseTemplate(template: ShoppingTemplate, value: string) {
    const list = await createListFromTemplate(db, template.id, value || undefined)
    closePanel()
    setSuccessMessage(strings.importList.successTemplate.replace('{name}', list.name))
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  return (
    <div>
      <div className="screen__header-row">
        <h1 className="screen__title">{strings.templates.screenTitle}</h1>
        {!creating && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setCreating(true)}
          >
            {strings.templates.newTemplateButton}
          </button>
        )}
      </div>

      {successMessage && <p className="form-success">{successMessage}</p>}

      {creating && (
        <div className="quick-add">
          <div className="field">
            <label className="field__label" htmlFor="new-template-name">
              {strings.common.nameLabel}
            </label>
            <input
              id="new-template-name"
              type="text"
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={strings.templates.newTemplatePlaceholder}
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

      {templates?.length === 0 && !creating && (
        <p className="screen__placeholder">{strings.templates.empty}</p>
      )}

      <ul className="entry-list">
        {templates?.map((template) => {
          const isActive = active?.templateId === template.id
          const panel = isActive ? active.panel : null

          return (
            <li key={template.id} className="entry-row">
              <div className="entry-row__main">
                <button
                  type="button"
                  className="entry-row__main-tap"
                  onClick={() => onSelect(template.id)}
                >
                  <span className="entry-row__name">{template.name}</span>
                  <br />
                  <span className="entry-row__meta">
                    {strings.history.itemsCountTemplate.replace(
                      '{count}',
                      String(template.items.length),
                    )}
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
                        : { templateId: template.id, panel: { kind: 'menu' } },
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
                      setActive({
                        templateId: template.id,
                        panel: { kind: 'use', value: template.name },
                      })
                    }
                  >
                    {strings.templates.useTemplateButton}
                  </button>
                  <button
                    type="button"
                    className="button button--compact"
                    onClick={() =>
                      setActive({
                        templateId: template.id,
                        panel: { kind: 'rename', value: template.name },
                      })
                    }
                  >
                    {strings.common.rename}
                  </button>
                  <button
                    type="button"
                    className="button button--compact button--danger"
                    onClick={() =>
                      setActive({ templateId: template.id, panel: { kind: 'deleteConfirm' } })
                    }
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
                        templateId: template.id,
                        panel: { kind: 'rename', value: event.target.value },
                      })
                    }
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleRename(template, panel.value)}
                    >
                      {strings.common.save}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'use' && (
                <div className="entry-row__confirm">
                  <span>{strings.templates.useTemplatePrompt}</span>
                  <input
                    type="text"
                    autoFocus
                    value={panel.value}
                    placeholder={strings.templates.newListNameLabel}
                    onChange={(event) =>
                      setActive({
                        templateId: template.id,
                        panel: { kind: 'use', value: event.target.value },
                      })
                    }
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => handleUseTemplate(template, panel.value)}
                    >
                      {strings.templates.useTemplateButton}
                    </button>
                    <button type="button" className="button button--muted" onClick={closePanel}>
                      {strings.common.cancel}
                    </button>
                  </div>
                </div>
              )}

              {panel?.kind === 'deleteConfirm' && (
                <div className="entry-row__confirm">
                  <span className="form-error">{strings.templates.deleteConfirmPrompt}</span>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--danger"
                      onClick={() => handleDelete(template)}
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

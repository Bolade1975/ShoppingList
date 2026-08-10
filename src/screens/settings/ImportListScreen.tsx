import { useRef, useState } from 'react'
import { db } from '../../db/schema'
import { importList, previewListImport, type ListImportPreview } from '../../db/shareRepository'
import type { ListExportFile } from '../../domain/listExportSchema'
import { strings } from '../../strings'

type ImportListScreenProps = {
  onBack: () => void
}

type LoadedFile = { file: ListExportFile; preview: ListImportPreview }

export function ImportListScreen({ onBack }: ImportListScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)
  const [newName, setNewName] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setLoaded(null)
    setSuccessMessage(null)

    let raw: unknown
    try {
      const text = await file.text()
      raw = JSON.parse(text)
    } catch {
      setError(strings.importList.invalidFileError)
      return
    }

    const result = await previewListImport(db, raw)
    if (!result.valid) {
      setError(result.error)
      return
    }
    setLoaded({ file: result.file, preview: result.preview })
    setNewName(
      result.preview.nameConflict ? `${result.preview.name} (importeret)` : result.preview.name,
    )
  }

  async function handleConfirmImport() {
    if (!loaded) return
    const imported = await importList(db, loaded.file, newName)
    setLoaded(null)
    setSuccessMessage(strings.importList.successTemplate.replace('{name}', imported.name))
  }

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.common.back}
      </button>
      <h1 className="screen__title">{strings.importList.title}</h1>

      {successMessage && <p className="form-success">{successMessage}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="button button--primary"
        onClick={() => fileInputRef.current?.click()}
      >
        {strings.importList.pickFileButton}
      </button>

      {error && <p className="form-error">{error}</p>}

      {loaded && (
        <div className="quick-add">
          <p>
            <strong>{loaded.preview.name}</strong>
            {' — '}
            {strings.importList.previewItemsTemplate.replace(
              '{count}',
              String(loaded.preview.itemCount),
            )}
          </p>
          {loaded.preview.nameConflict && (
            <p className="form-error">
              {strings.importList.nameConflictWarning.replace('{name}', loaded.preview.name)}
            </p>
          )}
          <div className="field">
            <label className="field__label" htmlFor="import-new-name">
              {strings.importList.newNameLabel}
            </label>
            <input
              id="import-new-name"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={handleConfirmImport}>
              {strings.importList.importButton}
            </button>
            <button type="button" className="button button--muted" onClick={() => setLoaded(null)}>
              {strings.common.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

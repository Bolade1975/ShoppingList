import { useRef, useState } from 'react'
import {
  downloadBackup,
  type MergeSummary,
  type RestoreStrategy,
  restoreBackup,
  validateBackupFile,
} from '../../db/backupRepository'
import { db } from '../../db/schema'
import type { BackupFile } from '../../domain/backupSchema'
import { strings } from '../../strings'

type BackupScreenProps = {
  onBack: () => void
}

export function BackupScreen({ onBack }: BackupScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exportMessage, setExportMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedBackup, setLoadedBackup] = useState<BackupFile | null>(null)
  const [strategy, setStrategy] = useState<RestoreStrategy>('merge')
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  async function handleExport() {
    await downloadBackup(db)
    setExportMessage(strings.backup.exportSuccessToast)
    setTimeout(() => setExportMessage(null), 4000)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setLoadedBackup(null)
    setResultMessage(null)

    let raw: unknown
    try {
      const text = await file.text()
      raw = JSON.parse(text)
    } catch {
      setError(strings.backup.invalidFileError)
      return
    }

    const result = validateBackupFile(raw)
    if (!result.valid) {
      setError(result.error)
      return
    }
    setLoadedBackup(result.backup)
  }

  async function handleRestore() {
    if (!loadedBackup) return
    if (strategy === 'replace' && !confirmingReplace) {
      setConfirmingReplace(true)
      return
    }
    const summary = await restoreBackup(db, loadedBackup, strategy)
    setLoadedBackup(null)
    setConfirmingReplace(false)
    setResultMessage(
      strategy === 'replace' ? strings.backup.replaceSuccessToast : formatMergeSummary(summary!),
    )
  }

  function formatMergeSummary(summary: MergeSummary): string {
    return strings.backup.mergeSummaryTemplate
      .replace('{listsAdded}', String(summary.lists.added))
      .replace('{listsUpdated}', String(summary.lists.updated))
  }

  return (
    <div>
      <button type="button" className="back-button" onClick={onBack}>
        {strings.common.back}
      </button>
      <h1 className="screen__title">{strings.settings.backupHeading}</h1>

      <div className="settings-block">
        <p className="settings-block__hint">{strings.settings.exportAllHint}</p>
        {exportMessage && <p className="form-success">{exportMessage}</p>}
        <button type="button" className="button button--primary" onClick={handleExport}>
          {strings.settings.exportAllButton}
        </button>
      </div>

      <div className="settings-block">
        <h2 className="settings-block__heading">{strings.backup.restoreTitle}</h2>

        {resultMessage && <p className="form-success">{resultMessage}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button type="button" className="button" onClick={() => fileInputRef.current?.click()}>
          {strings.backup.pickFileButton}
        </button>

        {error && <p className="form-error">{error}</p>}

        {loadedBackup && (
          <div className="quick-add">
            <p>
              {loadedBackup.lists.length} lists · {loadedBackup.templates.length} templates ·{' '}
              {loadedBackup.itemArchive.length} archived items
            </p>
            <p className="field__label">{strings.backup.strategyLabel}</p>
            <label className="checkbox-option">
              <input
                type="radio"
                name="restore-strategy"
                checked={strategy === 'merge'}
                onChange={() => {
                  setStrategy('merge')
                  setConfirmingReplace(false)
                }}
              />
              {strings.backup.strategyMerge}
            </label>
            <p className="screen__placeholder">{strings.backup.strategyMergeHint}</p>
            <label className="checkbox-option">
              <input
                type="radio"
                name="restore-strategy"
                checked={strategy === 'replace'}
                onChange={() => {
                  setStrategy('replace')
                  setConfirmingReplace(false)
                }}
              />
              {strings.backup.strategyReplace}
            </label>
            <p className="screen__placeholder">{strings.backup.strategyReplaceHint}</p>

            {confirmingReplace && (
              <p className="form-error">{strings.backup.replaceConfirmPrompt}</p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className={
                  strategy === 'replace' ? 'button button--danger' : 'button button--primary'
                }
                onClick={handleRestore}
              >
                {confirmingReplace ? strings.common.confirm : strings.backup.restoreButton}
              </button>
              <button
                type="button"
                className="button button--muted"
                onClick={() => {
                  setLoadedBackup(null)
                  setConfirmingReplace(false)
                }}
              >
                {strings.common.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

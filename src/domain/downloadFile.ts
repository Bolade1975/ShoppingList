/** Builds a downloadable/shareable JSON file, pretty-printed for human readability if opened directly. */
export function jsonFile(filename: string, data: unknown): File {
  const json = JSON.stringify(data, null, 2)
  return new File([json], filename, { type: 'application/json' })
}

/** Triggers a browser download of `data` as JSON, via a throwaway object URL. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// The File System Access API's showSaveFilePicker isn't in TypeScript's
// bundled DOM lib (Chromium-only, not yet on a standards track TS ships
// types for), so it's declared here as an optional method — feature-detected
// at call time, never assumed present.
type SaveFilePickerOptions = {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }
}

/**
 * Same JSON payload as `downloadJson`, but offers a native "Save As" picker
 * first via the File System Access API — Chromium desktop browsers only —
 * so the user can choose exactly where a backup file goes. Falls back to
 * `downloadJson`'s automatic behavior wherever the API isn't available.
 * Returns `false` only when the picker was shown and the user explicitly
 * cancelled it (nothing saved); `true` otherwise.
 */
export async function saveJsonWithPicker(filename: string, data: unknown): Promise<boolean> {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false
    }
  }
  downloadJson(filename, data)
  return true
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Tries the Web Share API with a file attachment first — this is what shows
 * the iPhone share sheet, letting the user pick Mail or any other app. Falls
 * back to a plain browser download wherever file sharing isn't supported
 * (desktop Safari/Firefox, older iOS): the caller should tell the user they
 * can attach the downloaded file to an email manually in that case.
 * Returns 'cancelled' only when the user dismissed the native share sheet
 * without picking a target — that is a deliberate choice, not a failure.
 */
export async function shareOrDownloadJson(
  filename: string,
  data: unknown,
  shareTitle: string,
): Promise<ShareResult> {
  const file = jsonFile(filename, data)
  const nav: Navigator & {
    canShare?: (data?: ShareData) => boolean
    share?: (data?: ShareData) => Promise<void>
  } = navigator

  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    const shareData = { files: [file], title: shareTitle }
    if (nav.canShare(shareData)) {
      try {
        await nav.share(shareData)
        return 'shared'
      } catch (error) {
        // The user closing the share sheet without picking a target is a
        // deliberate "don't send" choice, not an error to fall back from.
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      }
    }
  }
  downloadJson(filename, data)
  return 'downloaded'
}

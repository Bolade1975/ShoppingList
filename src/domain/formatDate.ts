/** ISO timestamp -> a short human-readable date, e.g. "Aug 6, 2026". */
export function formatDisplayDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Fixed to 'en-US' rather than the device locale: every other UI string in
  // the app is English (src/strings/en.ts), so the date format should match
  // regardless of the phone's region settings until a locale switch is added
  // alongside a second strings file.
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

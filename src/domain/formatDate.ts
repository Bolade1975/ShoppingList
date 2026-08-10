/** ISO timestamp -> a short human-readable date, e.g. "6. aug. 2026". */
export function formatDisplayDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // Fixed to 'da-DK' rather than the device locale: every other UI string in
  // the app is Danish (src/strings/da.ts), so the date format should match
  // regardless of the phone's region settings until a language switch is added.
  return date.toLocaleDateString('da-DK', { year: 'numeric', month: 'short', day: 'numeric' })
}

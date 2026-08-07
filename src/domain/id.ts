// crypto.randomUUID() is only available in secure contexts (HTTPS, or the
// special-cased http://localhost). Testing over the LAN from a phone during
// development uses a plain http://<ip> address, which is NOT a secure
// context even though the page loads normally — so this falls back to
// building a UUID from crypto.getRandomValues(), which has no such
// restriction and is available everywhere.
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to the manual fallback below.
    }
  }
  return uuidV4FromRandomValues()
}

function uuidV4FromRandomValues(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80 // variant 10

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

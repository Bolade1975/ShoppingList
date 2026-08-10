import { da } from './da'

// Single active-language export. `en.ts` is kept as the historical/reference
// translation; if a language switch is ever added, this becomes a lookup
// keyed by a language setting instead of a direct re-export.
export const strings = da

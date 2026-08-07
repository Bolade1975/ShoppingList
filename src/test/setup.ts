// jsdom has no real IndexedDB implementation; fake-indexeddb polyfills the
// global so Dexie-backed code can be unit tested without a real browser.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

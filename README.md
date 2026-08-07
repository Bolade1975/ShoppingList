# Shopping List

A simple, installable shopping-list Progressive Web App (PWA). Runs entirely in the browser,
installs on an iPhone Home Screen, and stores all data locally on the device — no account, no
backend, no cloud database, no cost. Built with the same stack and conventions as the GolfStats
and TrainTrack apps in the sibling folders, but kept fully offline/local-only: no Supabase,
Firebase, authentication, or synchronized/shared lists.

Live at **https://bolade1975.github.io/ShoppingList/**.

Multiple simultaneous active lists, category-grouped items with autocomplete from a per-device
item archive, templates, history (archive/restore), custom categories and units with reordering,
duplicate-item detection with a combine option, undo for cross-off/delete, single-list export
("Send copy" / import) via the iPhone share sheet, and full backup/restore (merge or replace) are
all implemented.

## Required free software

Install these once, in this order:

1. **[Node.js LTS](https://nodejs.org/)** — the JavaScript runtime that runs the build tools.
2. **[Git](https://git-scm.com/)** — version control.
3. A code editor such as **[VS Code](https://code.visualstudio.com/)** (optional).

## Install project dependencies

```
npm install
```

## Start the development server

```
npm run dev
```

Opens at `http://localhost:5173` by default. To test on a physical iPhone over Wi-Fi:

```
npm run dev -- --host
```

Then open the printed "Network" URL in Safari on the iPhone.

## Run tests / checks

```
npm run test         # Vitest, once
npm run test:watch   # Vitest, watch mode
npm run typecheck
npm run lint
npm run format:check  # npm run format to auto-fix
```

## Production build

```
npm run build
```

Produces an installable build (with PWA manifest and service worker) in `dist/`.

```
npm run preview
```

Serves the production build locally — closer to real hosting than `npm run dev`.

## Deploy to GitHub Pages

Deployment is fully automated: [.github/workflows/deploy.yml](.github/workflows/deploy.yml) runs on
every push to `master` — it installs dependencies, runs the full quality-gate check suite
(typecheck, lint, format:check, test, build), then publishes `dist/` to GitHub Pages via the
official `actions/configure-pages` / `actions/upload-pages-artifact` / `actions/deploy-pages`
actions. If any check fails, the workflow stops before anything is deployed. `configure-pages`
enables the repo's Pages source (GitHub Actions) automatically on first run — no manual Settings
step needed. This makes hosting genuinely free: GitHub Pages has no cost for a public repository.

To trigger a deploy manually without pushing a commit, use the **Run workflow** button on the
[Actions tab](https://github.com/Bolade1975/ShoppingList/actions/workflows/deploy.yml) (the
workflow also listens for `workflow_dispatch`).

## Install on an iPhone (Add to Home Screen)

1. Open **https://bolade1975.github.io/ShoppingList/** in **Safari** on the iPhone (must be Safari
   for "Add to Home Screen" — Chrome and other browsers don't support it on iOS).
2. Tap the **Share** icon (square with an arrow pointing up) in Safari's toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name (defaults to "Shopping List") and tap **Add**.
5. A Shopping List icon appears on the Home Screen. Opening it launches the app full-screen,
   without Safari's address bar, and it keeps working with **no internet connection** — every
   screen reads and writes the device's local IndexedDB directly, and the service worker
   precaches the whole app shell the first time it's loaded.

## Data and privacy

All lists, templates, the item archive, categories and units live in the browser's IndexedDB on
the device — nothing is sent to any server, and there is no account or sign-in of any kind.
Installing the app on a second phone starts with completely empty, independent data; the two
phones never see each other's lists unless you explicitly use **Send copy** (via the iPhone share
sheet, or a plain file download as a fallback) on one phone and **Import a list** on the other.
Importing always creates a brand-new independent list — it never overwrites anything, and later
edits on either phone are never synchronized back.

Because everything lives only on the device, **use Settings → Backup → Export all data**
periodically, and definitely before deleting the app, clearing Safari's site data, or switching to
a new phone — none of those local-storage safeguards from Apple prevent you from losing everything
if you skip this. A backup file can be restored later by merging into existing data or by fully
replacing it (with a confirmation step either way).

## Limitations

- The Web Share API (used for "Send copy" and backup export) is not available in every browser —
  the app automatically falls back to a plain file download, with the file named for easy manual
  attachment to an email.
- The File System Access API's "Save As" picker (used as a nicer way to choose where a backup file
  goes) is Chromium-desktop-only as of early 2026; Safari and Firefox fall back to a normal
  download.
- iOS may clear a PWA's local storage after extended periods of disuse (Apple's general Safari
  storage-eviction policy for any site, PWA or not) — regular backups are the only real protection
  against this.

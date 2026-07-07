# Joplin Explorer — Project Notes

Things that aren't obvious from the code or the Joplin docs. If you're about to release, start with **Release pipeline**.

---

## Release pipeline (CRITICAL)

`publish/plugin.jpl` is a **gzipped tar archive** containing its own copy of `manifest.json`. Joplin uses the **outer** manifest (or the npm registry metadata) to decide whether an update is available, but reads the version actually installed from the **inner** manifest inside the `.jpl`.

If these disagree, Joplin gets stuck in an update loop: it sees a newer outer version, downloads and installs the `.jpl`, the inner manifest still reports the old version, on next restart Joplin prompts again — forever.

**Before every release:**

1. Bump version in BOTH `src/manifest.json` AND `package.json`.
2. Run `npm run dist` — this MUST regenerate `publish/plugin.jpl` so the inner manifest matches.
3. Verify the inner manifest:
   ```
   tar -xzf publish/plugin.jpl -C /tmp/check && cat /tmp/check/manifest.json
   ```
   Inner version MUST equal `src/manifest.json`'s version.
4. Only then `npm publish` and upload `publish/plugin.jpl` to the GitHub release.

`publish/plugin.jpl` is NOT tracked in git (`.gitignore` covers the whole `publish/` directory). `scripts/pack-jpl.js` is the only thing that rebuilds it. **Do not skip it, do not hand-edit the .jpl.**

Between v1.2.0 and v1.2.3 nothing refreshed `publish/plugin.jpl`. The outer manifest advanced; the inner one was frozen at v1.2.2. Users got trapped in the update loop. v1.2.4 fixed the build. Do not let this recur.

### Semver

`1.2.1.1` is **not** a valid semver — npm will reject it. Use `1.2.2`. Patch bumps only have three components.

### npm publishing

- npm Granular Access Tokens default to **7-day expiration**. Set longer if you need.
- For security-key users, the token MUST have **"Bypass 2FA when publishing"** checked. Without it, `npm publish` errors with `EOTP` and a security-key user cannot satisfy the prompt.
- `npm unpublish` is only allowed within 24h. After that, the broken version stays forever — bump and move on, optionally `npm deprecate`.
- Default to one-shot tokens: generate → publish → delete.

---

## Plugin runtime context

- The plugin entry (`src/index.ts`) runs in **Node.js context** inside Joplin's plugin host — `fs`, `path`, `crypto`, `process`, etc. are all available.
- `joplin` is injected as a **global** at runtime. Use `declare const joplin: any;` at the top of `src/index.ts`. **Do NOT add `import joplin from 'api'`** — it breaks the build with "Cannot find module 'api'". The `api/` stub was removed in commit c84a518.
- The webview (`src/webview/panel.js`) runs in a sandboxed browser-like context. It cannot import npm packages — it's loaded as a plain script via `copy-webpack-plugin`. Communicate with the host via `webviewApi.postMessage` / `joplin.views.panels.postMessage`.
- `process.env.HOME` is not set on Windows (it's `USERPROFILE`). Code that expands `~/` paths must handle this — currently `normalizeLocalIconPath` only expands on POSIX. Acceptable since `~/` is a Unix convention.

## Joplin API quirks

- `SettingItemType` numeric values: `Int=1`, `String=2`, `Bool=3`, `Array=4`, `Object=5`, `Button=6`.
- Settings registration must use `joplin.settings.registerSettings({...})` (**plural**). The singular `registerSetting()` is deprecated and silently fails — manifest as the panel hanging at "Loading..." with no error.
- `joplin.workspace.onNoteChange(handler)` fires very frequently while a user is typing in the editor. **Always debounce** (we use 600 ms) — direct refresh per fire is unusable.
- `joplin.settings.onChange` event payload has `event.keys: string[]`.
- `joplin.data.get(['search'], { query, ... })` uses **FTS5 with tokenization** — it does **not** substring-match. Querying `"8121R"` will not find `"KY8121R"`. We combine FTS results with a local case-insensitive title substring scan against `allNotesCache` to compensate. Don't lose that fallback.
- `joplin.plugins.dataDir()` returns a per-plugin persistent directory. Use it for caches like icon files; never write under the install location.

## Webview drag-and-drop pitfalls

- HTML5 `effectAllowed` and `dropEffect` must agree. `effectAllowed='move'` **rejects** `dropEffect='copy'` and produces a "forbidden" cursor with no visible error. If you see the forbidden cursor on a drop target you think you set up correctly, this is almost always the cause.
- `event.target` inside `dragover`/`drop` can be a **Text node** (`nodeType === 3`) — Text nodes have no `.closest()` method. Always do `if (el && el.nodeType === 3) el = el.parentElement;` before calling `.closest()`.
- For drag highlights, use CSS `outline` (not `border`) — `border` shifts layout and causes content to jump during drag-over.
- Position drop-zone hints with `position: sticky; bottom: 0` (gated by a `dragging-active` class on the container) for the bottom create-notebook zone — `position: fixed` works for hover overlays but won't scroll with the tree.
- The dragging-active class is added on `dragstart` and removed on `dragend`/`drop`. Splitting `clearDropIndicators()` (visual only) from `endDrag()` (also removes `dragging-active`) prevents flickering when moving between targets.

## XSS

- The webview is HTML built from JS strings (`setHtml`). Anything that came from a user-controlled source (note title, folder name, search query, pinned label) must go through `escapeHtml` before being concatenated into HTML.
- `highlightText(text, query)` must escape `text` **always**, including when `query` is empty — the early-return path bit us once. Treat `escapeHtml` as the default and `<mark>` injection as the deliberate exception.
- For image icons sourced from user settings: the `src` attribute value still goes through `escapeHtml`. `data:image/svg+xml` is acceptable because browsers disable scripts inside SVG loaded via `<img>`.

## v1.3.0 refactor notes (2026-07)

- **Notes are fetched with ONE paginated `['notes']` query** (`getAllNotes`) and grouped by `parent_id` locally. Do not reintroduce per-folder `['folders', id, 'notes']` loops - that was O(folder count) API call series.
- **Folder collapse/expand never re-renders the panel.** The webview toggles `.collapsed` on the row + children (`toggleFolderLocal`), both open/closed icon variants are always in the DOM (CSS picks one), and the backend `toggleFolder`/`togglePinnedCollapse` handlers ONLY record state. Full refresh on a toggle would refetch everything and reset scroll.
- **Icon setting resolution is cached** (`resolveIconSettingCached`, keyed settingKey:value). The settings onChange handler calls `clearIconResolveCache()` - keep that pairing.
- **`scripts/pack-jpl.js` asserts version consistency** across src/manifest.json, package.json and publish/manifest.json and exits non-zero on mismatch. This is the guard against the v1.2.0-1.2.3 update-loop incident; never bypass it.
- **Big message branches live in named functions** (`handleSearch`, `handleContextMenu`, `handleDragDrop`) inside onStart; the onMessage chain stays thin. i18n tables live in `src/i18n.ts`.
- **panel.js has a single document-level click dispatcher** (ordered: ctx-item, menu close, search tag/folder, pinned header, section header, tree item, toolbar). The old five separate listeners depended on registration order and handled clicks on already-detached menu items.
- Folder lookups go through the `folderById` map rebuilt in `refreshPanel`; don't add linear `allFoldersCache` scans for id lookups.
- Tag search shows counts from ONE bounded call per tag (`limit: 100`, `"100+"` when has_more). Exact counting via full pagination made searches crawl.

## Project conventions

- **Not based on `generator-joplin`.** This project has its own simplified webpack config plus `scripts/pack-jpl.js`. The official template's gulp pipeline, plugin config file, and helper scripts are absent — don't assume they exist.
- **Pinned items** are stored as a **single ordered array** `[{id, type}]`, not split into `{notes: [], folders: []}`. Single array is required for arbitrary cross-type reordering. `loadPinned()` has migration logic for the old shape — don't remove it.
- **Deleted pinned items are auto-cleaned** every `refreshPanel` by filtering against current folder/note id sets. If you change the refresh path, keep this filter.
- **Native dialogs** (`showNativeInput`, `showNativeConfirm`, `showNativeInfo`) are this project's reusable wrappers around `joplin.views.dialogs`. Use them instead of `window.prompt`/`confirm` (which don't exist in the plugin host).
- **`updateNote` postMessage** updates one note's title/icon in place without rebuilding the whole tree. Falls back to full `refreshPanel` when the change moves the note to another folder or breaks current sort order.

## Build outputs

- `publish/index.js` — webpack-bundled plugin host code
- `publish/manifest.json` — copied from `src/manifest.json` by webpack
- `publish/webview/` — copied from `src/webview/` by webpack
- `publish/plugin.jpl` — gzipped tar of the three above, produced by `scripts/pack-jpl.js`

The `files` field in `package.json` includes the whole `publish/` directory — anything in there ships to npm.

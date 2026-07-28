# Joplin Explorer — Project Notes

Things that aren't obvious from the code or the Joplin docs. If you're about to release, start with **Release pipeline**.

---

## Workflow with the user (IMPORTANT)

- **Do not publish eagerly.** Default loop while iterating: edit → `npx webpack --env production` → `node scripts/pack-jpl.js` → tell the user it's in `publish/`, and let them test. Only bump the version, tag, GitHub-release and `npm publish` **when the user says 发布 / "release"**.
- The user tests via **Development plugins** pointed at the repo root (`D:\repos\Joplin-explorer`), so a rebuild + Joplin restart is enough — no "install from file" needed. Note a dev-loaded plugin conflicts with the store-installed copy (same id); one must be disabled.
- Commit locally during development; push together with the release.

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
- The token lives in `D:\repos\.npm-publish-token.txt` (one level above the repos, so it is never git-tracked). That file is a **memo**, not a bare token — extract the value with a regex (`npm_[A-Za-z0-9]+`) before writing `.npmrc`. Dumping the whole file in makes `npm publish` fail with a misleading **404** (npm masks auth failures as 404).

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

## Theming (CSS variables)

- **`--joplin-color2` is the SIDEBAR TEXT colour, not an accent.** In light themes Joplin's sidebar is dark with white text, so `color2` is *white* — using it for borders/outlines/text on the panel background makes them invisible on light themes. Use **`--joplin-url-color`** as the accent (it is guaranteed readable against the background in every theme). Fixed across all 10 usages in PR #30; don't reintroduce it.
- `--joplin-selected-color` works well for focus rings / soft highlights.
- **Always sanity-check new CSS against a light theme.** The whole `color2` class of bugs shipped because development only ever happened on a dark theme.

## Import / export via the native engine

- Plugins **cannot enumerate** `InteropService.modules()`, so a plugin can never reproduce the full File > Import list (which is built per module × source).
- `importFrom` **with no arguments** shows a generic type prompt. For multi-source formats (md/html/enex, which accept both file and directory) `sourceType` is then unset and the picker degrades to *directory selection* on Windows. Passing partial options is worse: the block that auto-fills `destinationFolderId`/`outputFormat` is skipped entirely. If calling it programmatically, pass **all** of `{sourcePath, importFormat, outputFormat, sourceType, destinationFolderId}`.
- **`joplin.interop.registerImportModule` is the supported way to add a format.** Registered modules appear in File > Import (MenuBar listens for `modulesChanged`). `onExec` receives `{sourcePath, options, warnings}`; the target notebook is `options.destinationFolderId`. The native menu label renders as `FORMAT - description`, so don't repeat the format name in the description.
- We deliberately **do not ship our own importer**: the native one converts *and* attaches images as resources. Explorer only contributes the CSV modules (Markdown table / code block). See v1.6.0.
- **`openFolder` selects the folder AND opens its first note.** That side effect makes it unsuitable for "sync the panel's clicked folder to Joplin's selection" — expanding a notebook must not open a note.

## The plugin API sandbox proxy

`joplin.*` is an IPC proxy that accumulates the property path. **Never stash a namespace in a variable or probe a method with property access:**

```ts
const interop = joplin.interop;
if (interop.registerImportModule) { ... }   // WRONG: path becomes
                                            // "joplin.interop.registerImportModule.registerImportModule"
await joplin.interop.registerImportModule({ ... });  // RIGHT: full chain, every call
```

Wrap in try/catch for older cores instead of feature-detecting by property access.

## Webview drag-and-drop pitfalls

- HTML5 `effectAllowed` and `dropEffect` must agree. `effectAllowed='move'` **rejects** `dropEffect='copy'` and produces a "forbidden" cursor with no visible error. If you see the forbidden cursor on a drop target you think you set up correctly, this is almost always the cause.
- `event.target` inside `dragover`/`drop` can be a **Text node** (`nodeType === 3`) — Text nodes have no `.closest()` method. Always do `if (el && el.nodeType === 3) el = el.parentElement;` before calling `.closest()`.
- For drag highlights, use CSS `outline` (not `border`) — `border` shifts layout and causes content to jump during drag-over.
- **Keep the internal payload OFF `text/plain`.** It used to carry our `{id,type,pinned}` JSON, which meant dropping a note into the editor inserted that blob in front of the link. The native note list sets no `text/plain` at all. We now use the custom mime **`text/x-je-item`** and leave `text/plain` empty, so external drops see only Joplin's own `text/x-jop-note-ids` payload and produce a clean `[title](:/id)` link (#21).
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

## Panel scrolling & reveal

- A `MutationObserver` restores `_savedScrollTop` after every `setHtml`. **Any programmatic scroll must run after it** (`requestAnimationFrame`) *and* update `_savedScrollTop` afterwards, or the restore silently undoes it. This is why the original auto-reveal appeared to do nothing.
- Two deliberately different behaviours: auto-reveal on selection change scrolls **only when the row is off-screen** (`block:'nearest'`-ish, avoids jitter); explicit actions (toolbar reveal button, exiting search) **always centre** the note. Don't unify them.
- Dialog HTML built for `joplin.views.dialogs` must use a fixed `width` + `max-width:100%` with `word-break`, not `min-width` — `min-width` overflows the auto-sized dialog webview and clips text on the right (#22/#26).

## Icons and glyphs

- Font glyphs sit at font-determined positions inside their em box, so `align-items:center` centres the *box*, not the visible mark — pixel-nudging is guesswork. For small UI arrows, draw a **geometric CSS triangle** (zero-size box + borders) instead; flex centring is then exact. Applied to `.ctx-sub-arrow`.
- Multiple drill-in submenus can coexist in one context menu; the template must be resolved as the drill row's **immediate next sibling**, not by `querySelector` on the menu (which always returned the first one).

## Build outputs

- `publish/index.js` — webpack-bundled plugin host code
- `publish/manifest.json` — copied from `src/manifest.json` by webpack
- `publish/webview/` — copied from `src/webview/` by webpack
- `publish/plugin.jpl` — gzipped tar of the three above, produced by `scripts/pack-jpl.js`

The `files` field in `package.json` includes the whole `publish/` directory — anything in there ships to npm.

## npm 发布方式迁移备忘（截止 2027-01）

npm 安全策略收紧（github.blog changelog 2026-07-08）：

- 2026-08 起：绕过 2FA 的 token 不能再做账号/包管理操作（本仓库只用它 publish，无影响）
- **2027-01 起：绕过 2FA 的 token 不能再直接 npm publish —— 当前发布流程会失效**
- 届时迁移到 trusted publishing（OIDC）：GitHub Actions 打 tag 触发构建+发布，npm 包与仓库绑定，无需长期 token
- 当前流程：发布时写临时 .npmrc + Automation token（token 位置见 D:\repos\.npm-publish-token.txt，短期有效，过期找用户要新的）
- 另：npm v12 起 install 默认禁用依赖的 postinstall/git/remote —— 升级 npm 后构建异常先查这个（npm approve-scripts）

# Joplin Explorer — Project Notes

## Release pipeline (CRITICAL)

The Joplin plugin format `publish/plugin.jpl` is a **gzipped tar archive** that contains its own copy of `manifest.json`. Joplin reads the **outer** `publish/manifest.json` (or the npm registry metadata) to decide whether an update is available, but extracts the version that's actually installed from the **inner** manifest inside the `.jpl`.

If these two version numbers disagree, Joplin gets stuck in an update loop: it sees a newer outer version, downloads and installs the `.jpl`, the inner manifest still reports the old version, and on next restart Joplin prompts to update again — forever.

**Therefore, before every release:**

1. Bump the version in BOTH `src/manifest.json` AND `package.json`.
2. Run `npm run dist` — this MUST regenerate `publish/plugin.jpl` so the inner manifest matches.
3. Verify the inner manifest:
   ```
   tar -xzf publish/plugin.jpl -C /tmp/check && cat /tmp/check/manifest.json
   ```
   The version inside MUST equal `src/manifest.json`'s version. If not, something is wrong with `scripts/pack-jpl.js`.
4. Only then `npm publish` and upload `publish/plugin.jpl` to the GitHub release.

`publish/plugin.jpl` is NOT tracked in git (`.gitignore` covers the whole `publish/` directory). The build script `scripts/pack-jpl.js` is the only thing that rebuilds it. Do not skip it, and do not hand-edit the file.

### Why this matters

Between v1.2.0 and v1.2.3 the build pipeline silently stopped refreshing `publish/plugin.jpl`. Every release published a stale `.jpl` whose inner manifest was frozen at v1.2.2, while the outer manifest advanced normally. Users got trapped in an "update available → install → restart → update available" loop until v1.2.4 fixed the build. **Do not let this happen again.**

## Plugin runtime context

- The plugin entry (`src/index.ts`) runs in Node.js context inside Joplin's plugin host — `fs`, `path`, `crypto`, `process` are all available.
- `joplin` is injected as a global at runtime (`declare const joplin: any` at the top of `src/index.ts`). Do NOT add `import joplin from 'api'` back — it breaks the build with "Cannot find module 'api'".
- The webview (`src/webview/panel.js`) runs in a sandboxed browser-like context. It cannot import npm packages — it's loaded as a plain script via webpack's `copy-webpack-plugin`. Communicate with the host via `webviewApi.postMessage` / `joplin.views.panels.postMessage`.
- `SettingItemType` numeric values: `Int=1`, `String=2`, `Bool=3`, `Array=4`, `Object=5`, `Button=6`.
- Settings registration must use `joplin.settings.registerSettings({...})` (plural). The singular `registerSetting()` is deprecated and silently fails to register, which manifests as the panel hanging at "Loading...".

## Build outputs

- `publish/index.js` — webpack-bundled plugin host code
- `publish/manifest.json` — copied from `src/manifest.json` by webpack
- `publish/webview/` — copied from `src/webview/` by webpack
- `publish/plugin.jpl` — gzipped tar of the three above, produced by `scripts/pack-jpl.js`

Anything published to npm includes the entire `publish/` directory (see the `files` field in `package.json`).

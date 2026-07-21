# Joplin Explorer — Roadmap

This document outlines the current state and long-term direction of **Joplin Explorer**, a unified tree-view sidebar plugin for Joplin.

---

## ✅ Current Features (v1.5.x)

**Tree & navigation**
- Unified tree view (notebooks + notes), auto-expand to current note
- Collapse All / Expand All toggle
- Manual refresh button
- Scroll position retention
- Real-time search: notes, notebooks, tags, with highlighted results

**Tags**
- Tags section below the tree — every tag as a folder, notes lazy-loaded
- Note count badges; empty tags hidden (mirrors Joplin's sidebar)
- Drag a note onto a tag to assign it; right-click to rename/delete tags or remove a note from a tag
- "Show tags section" setting

**Pinned**
- Pin notes and notebooks; drag to reorder within the pinned section

**Sorting & drag/drop**
- Sorting: updated time / title / manual (persists across restarts)
- Manual sort: drag notes to an exact position; folders drag-ordered too
- Drag & drop moving with clear drop indicators, edge auto-scroll, drag-to-empty-area to create a notebook

**Context menus** (near-parity with Joplin's native menus)
- Notes: open / open in new window, set tags, note-todo switch, toggle completed, move to notebook, duplicate, copy Markdown / external link, publish note, Export drill-in submenu (PDF / MD / MD+Front Matter / JEX / HTML), rename, note info, delete (always last)
- Notebooks: new note/todo/sub-notebook, rename, export, delete

**Trash** (v1.5)
- Collapsible Trash section: deleted notebooks nest hierarchically and expand to show their notes; deleted notes open read-only
- Restore / delete permanently per item (cascading folder delete); empty trash from the header's context menu — [#7](https://github.com/lim0513/joplin-explorer/issues/7)

**Auto refresh** (v1.5)
- Changes made by other plugins or sync appear automatically (data API change-events polling, off-switch in settings) — [#6](https://github.com/lim0513/joplin-explorer/issues/6)

**Hover preview** (v1.5.1)
- Hover a note to see title, type, size, created/updated times and a body snippet (length setting)

**Smart folders** (v1.5.2)
- Recently updated and Open to-dos built-ins, plus custom rules using Joplin search syntax; result limit setting, count badges

**Note-row badges** (v1.5.4)
- Checkbox progress pie on notes containing markdown checkboxes (native-style, aligned with folder counts)
- Link badge on published notes; click opens the publish dialog

**Section layout** (v1.5.9)
- Reorder the sidebar sections (pinned / smart folders / notebooks / tags / trash) via a settings key list — [#9](https://github.com/lim0513/joplin-explorer/issues/9) — thanks [@CJeffyB](https://github.com/CJeffyB)
- Adjustable spacing above each section divider

**Notebook export fix** (v1.5.10)
- Notebook right-click export now works: drill-in format submenu (JEX / Markdown / MD+Front Matter / HTML) + directory picker; failures show a dialog instead of being swallowed

**Import files** (v1.5.11)
- Notebook right-click "Import files": multi-select txt/md picker, each file becomes a note (title = file name without extension). Encoding-aware (UTF-8 with GBK fallback, BOM stripped)

**Trash & locate fixes** (v1.5.12)
- Restoring a note whose notebook is also trashed now offers to restore the notebook too (instead of silently dropping the note to the root)
- Clicking a note under a tag now locates and expands the main tree to it

**Collapse-button browsing fix** (v1.5.13)
- Manually expanding a folder after Collapse All flips the button back to Collapse, so restoring never wipes fresh browsing — [#11](https://github.com/lim0513/joplin-explorer/issues/11), thanks [@CJeffyB](https://github.com/CJeffyB)

**Drag & tag fixes** (v1.5.14)
- Panel drags carry Joplin's native mime payload: drop a note into the editor to insert a link (Canvas-ready for 3.7) — [#12](https://github.com/lim0513/joplin-explorer/issues/12)
- Empty pinned section shows a temporary drop target during drag, enabling the first drag-to-pin — [#13](https://github.com/lim0513/joplin-explorer/issues/13)
- Trashed notes no longer appear under tags nor inflate tag counts — [#15](https://github.com/lim0513/joplin-explorer/issues/15) (all three thanks to [@CJeffyB](https://github.com/CJeffyB))

**Drop-target follow-up** (v1.5.15)
- The empty-pinned drop target floats sticky at the viewport top, and its injection no longer breaks dragging

**Nested trash collapse** (v1.5.16)
- Nested trash notebooks collapse correctly (sub-notebooks fold away with their parent); README screenshots added

**Issue batch #16–20** (v1.5.17)
- Note icon configurable + default 📄 — [#20](https://github.com/lim0513/joplin-explorer/issues/20); double-click opens a note in a new window — [#18](https://github.com/lim0513/joplin-explorer/issues/18); native New-notebook dialog — [#16](https://github.com/lim0513/joplin-explorer/issues/16); Expand-mode fixes — [#17](https://github.com/lim0513/joplin-explorer/issues/17); Collapse scope + Collapse-only mode — [#19](https://github.com/lim0513/joplin-explorer/issues/19) (all thanks to [@CJeffyB](https://github.com/CJeffyB))

**Plugin listing** (v1.5.18)
- Plugin icon (16/32/48/128) + screenshots added to the manifest for the plugin website listing

**Dialog & context-menu fixes** (v1.5.19)
- Rename / delete-confirm dialogs no longer truncate long note names — text wraps and the dialog width adapts — [#22](https://github.com/lim0513/joplin-explorer/issues/22), [#26](https://github.com/lim0513/joplin-explorer/issues/26); the rename input now auto-focuses and selects its text
- Note right-click adds "Edit in external editor" — [#24](https://github.com/lim0513/joplin-explorer/issues/24) (all thanks to [@CJeffyB](https://github.com/CJeffyB))

**Collapse-all fix** (v1.5.20)
- "Collapse all (with sections)" now also folds the Smart Folders section body (a DOM-id mismatch had left it open)

**Smart-folder badge fix** (v1.5.21)
- Notes listed under a smart folder (Open to-dos, etc.) now show the checkbox progress pie / published badge — the initial fetch was missing the badge data

**Misc**
- Emoji / custom image notebook icons
- Sync button with status feedback
- View state (folder/section collapse) persists across restarts, with restore-on-startup and tags-default options
- Settings UI (icons, toggles, tags section)
- i18n: EN / ZH-CN / ZH-TW / RU / JA

---

## 🎨 v1.6 — UI / UX Options

- [ ] Sidebar layout options: line height, indentation depth, show/hide updated time
- [ ] Auto icons based on note type
- [ ] More import formats: CSV (as Markdown table), HTML (converted to Markdown) — [#14](https://github.com/lim0513/joplin-explorer/issues/14)
- [ ] Per-note custom icons + paired open/close folder icons (icon stored in user_data; mind scroll performance) — [#23](https://github.com/lim0513/joplin-explorer/issues/23), thanks [@CJeffyB](https://github.com/CJeffyB)

---

## 🧩 v2.0 — Major Release

- [ ] **Explorer API** — register custom nodes, context menu items, programmatic highlighting
- [ ] **Multi-window Explorer**
- [ ] **Advanced sorting rul
# Joplin Explorer — Roadmap

This document outlines the current state and long-term direction of **Joplin Explorer**, a unified tree-view sidebar plugin for Joplin.

---

## ✅ Current Features (v1.4.x)

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
- Restore / delete permanently per item (cascading folder delete); empty trash from the header's context menu

**Auto refresh** (v1.5)
- Changes made by other plugins or sync appear automatically (data API change-events polling, off-switch in settings) — [#6](https://github.com/lim0513/joplin-explorer/issues/6)

**Misc**
- Emoji / custom image notebook icons
- Sync button with status feedback
- View state (folder/section collapse) persists across restarts, with restore-on-startup and tags-default options
- Settings UI (icons, toggles, tags section)
- i18n: EN / ZH-CN / ZH-TW / RU / JA

---

## 🚀 v1.5.1 — Planned

- [x] **Hover preview** — note summary on hover, configurable length

## 🚀 v1.5.2 — Planned

- [x] **Smart folders** — recently updated / uncompleted to-dos / rule-based (custom rules via Joplin search syntax)

---

## 🎨 v1.6 — UI / UX Options

- [ ] Sidebar layout options: line height, indentation depth, show/hide updated time
- [ ] Auto icons based on note type

---

## 🧩 v2.0 — Major Release

- [ ] **Explorer API** — register custom nodes, context menu items, programmatic highlighting
- [ ] **Multi-window Explorer**
- [ ] **Advanced sorting rules** — created time, word count, tag count

---

## Contributions

Contributions are welcome!
Please open an issue or submit a pull request if you'd like to help shape the future of Joplin Explorer.

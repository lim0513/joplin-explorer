# Joplin Explorer

A unified sidebar plugin for [Joplin](https://joplinapp.org/) that displays notebooks and notes together in a single tree view — like a file explorer.

[中文说明](README-CN.md)

## Features

- **Unified Tree View** — Notebooks and notes displayed in one collapsible panel
- **Custom Icons** — Shows emoji icons set in notebook settings
- **Favorites (Pin)** — Pin notes and notebooks to a collapsible section at the top of the tree; drag items to the pinned section to pin, drag within to reorder; persists across restarts
- **Enhanced Search** — Search notes, notebooks, and tags simultaneously with keyword highlighting; results grouped in collapsible sections; local title substring matching for partial queries (e.g. "8121R" finds "KY8121R")
- **Sort** — Toggle between sorting by update time or title (ascending/descending)
- **Context Menus**
  - Notebooks: pin/unpin, new note, new to-do, new sub-notebook, rename, export, delete
  - Notes: pin/unpin, open, open in new window, copy Markdown link, duplicate, switch note/to-do type, toggle completed, rename, view properties, delete
- **Drag & Drop** — Move notes between notebooks, reorganize folder hierarchy; drag to empty area to create a new notebook; drag to pinned section to pin
- **Sync Button** — Trigger synchronization with status feedback (syncing → done)
- **Auto Expand** — Automatically expands to the currently selected note on startup
- **Collapse All** — One-click collapse all notebooks
- **Scroll Position** — Preserved when navigating between notes
- **i18n** — Supports Simplified Chinese, Traditional Chinese, English, and Japanese (follows Joplin's locale setting)

## Install

### From File

1. Download `joplin-explorer.jpl` from the [latest release](https://github.com/lim0513/joplin-explorer/releases/latest)
2. In Joplin, go to **Tools → Options → Plugins**
3. Click the gear icon and select **Install from file**
4. Choose the downloaded `.jpl` file
5. Restart Joplin

## Usage

After installation, the Explorer panel appears on the side of the editor. You can:

- **Click** a notebook to expand/collapse it
- **Click** a note to open it
- **Right-click** for context menu actions (including pin/unpin)
- **Drag** notes or notebooks to reorganize; drag to the bottom zone to create a new notebook; drag to the pinned section to pin
- Use the **toolbar** at the top for quick actions (new notebook/note/to-do, sort, collapse all)
- Use the **search bar** to search notes, notebooks, and tags
- Click **Sync** at the bottom to trigger synchronization

## Development

```bash
# Install dependencies
npm install

# Build
npm run dist

# Watch mode
npm run dev
```

The built plugin is output to the `publish/` directory. To test locally, set `plugins.devPluginPaths` in Joplin's settings to point to the `publish/` directory.

## License

MIT

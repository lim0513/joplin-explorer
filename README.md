# Joplin Explorer

A unified sidebar plugin for [Joplin](https://joplinapp.org/) that displays notebooks and notes together in a single tree view — like a file explorer.

[中文说明](README-CN.md)

## Screenshot

> TODO: Add screenshot

## Features

- **Unified Tree View** — Notebooks and notes displayed in one collapsible panel
- **Custom Icons** — Shows emoji icons set in notebook settings
- **Search** — Real-time filter to quickly find notes by title
- **Sort** — Toggle between sorting by update time or title (ascending/descending)
- **Context Menus**
  - Notebooks: new note, new to-do, new sub-notebook, rename, export, delete
  - Notes: open, open in new window, copy Markdown link, duplicate, switch note/to-do type, toggle completed, rename, move to notebook, view properties, delete
- **Drag & Drop** — Move notes between notebooks, reorganize folder hierarchy
- **Sync Button** — Trigger synchronization with status feedback (syncing → done)
- **Auto Expand** — Automatically expands to the currently selected note on startup
- **Collapse All** — One-click collapse all notebooks
- **Scroll Position** — Preserved when navigating between notes
- **i18n** — Supports Simplified Chinese, Traditional Chinese, and English (follows Joplin's locale setting)

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
- **Right-click** for context menu actions
- **Drag** notes or notebooks to reorganize them
- Use the **toolbar** at the top for quick actions (new notebook/note/to-do, sort, collapse all)
- Use the **search bar** to filter notes by title
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

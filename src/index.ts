// Joplin plugin runtime provides `joplin` as a global variable at runtime.
// We intentionally do NOT `import joplin from 'api'` because webpack would
// emit `require("api")`, which the Joplin plugin loader does not resolve
// (see plugin_index.html "Cannot find module 'api'" error).
declare const joplin: any;

const nodeFs = require('fs');
const nodePath = require('path');
const nodeCrypto = require('crypto');

import { I18nStrings, getI18n } from './i18n';

interface IconRenderData {
  type: 'text' | 'image';
  value: string;
}

/* ======================== Types ======================== */
interface FolderItem {
  id: string;
  title: string;
  parent_id: string;
  icon?: string;
  order?: number;
}

interface NoteItem {
  id: string;
  title: string;
  parent_id: string;
  is_todo: number;
  todo_completed: number;
  updated_time: number;
  user_updated_time: number;
  order?: number;
}

interface TreeNode {
  type: 'folder' | 'note';
  id: string;
  title: string;
  parent_id?: string;
  icon?: string;
  is_todo?: number;
  todo_completed?: number;
  order?: number;
  note_count?: number;
  total_count?: number;
  children?: TreeNode[];
}

/* ======================== Data helpers ======================== */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const iconMimeTypes: { [ext: string]: string } = {
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function normalizeLocalIconPath(value: string): string | null {
  const trimmed = value.trim();
  if (/^file:\/\//i.test(trimmed)) {
    return decodeURIComponent(trimmed.replace(/^file:\/\//i, ''));
  }
  if (trimmed.indexOf('~/') === 0 && process && process.env && process.env.HOME) {
    return nodePath.join(process.env.HOME, trimmed.substring(2));
  }
  if (nodePath.isAbsolute(trimmed)) return trimmed;
  return null;
}

function renderIconHtml(icon: IconRenderData, extraClass: string): string {
  const className = 'icon' + (extraClass ? ' ' + extraClass : '');
  if (icon.type === 'image') {
    return '<span class="' + className + '"><img class="custom-icon" src="' + escapeHtml(icon.value) + '" /></span>';
  }
  return '<span class="' + className + '">' + escapeHtml(icon.value) + '</span>';
}

// resolveIconSetting does file IO + base64 for local icon paths, so results
// are cached per (settingKey, value). The cache is cleared from the settings
// onChange handler; a changed value also naturally misses the cache.
const iconResolveCache: { [cacheKey: string]: IconRenderData } = {};

function clearIconResolveCache(): void {
  for (const k of Object.keys(iconResolveCache)) delete iconResolveCache[k];
}

async function resolveIconSettingCached(value: any, fallbackText: string, settingKey: string, dataDir: string): Promise<IconRenderData> {
  const cacheKey = settingKey + ':' + String(value);
  if (iconResolveCache[cacheKey]) return iconResolveCache[cacheKey];
  const resolved = await resolveIconSetting(value, fallbackText, settingKey, dataDir);
  iconResolveCache[cacheKey] = resolved;
  return resolved;
}

async function resolveIconSetting(value: any, fallbackText: string, settingKey: string, dataDir: string): Promise<IconRenderData> {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return { type: 'text', value: fallbackText };

  if (/^data:image\//i.test(text) || /^https?:\/\//i.test(text)) {
    return { type: 'image', value: text };
  }

  const localPath = normalizeLocalIconPath(text);
  if (!localPath) return { type: 'text', value: text };

  const ext = nodePath.extname(localPath).toLowerCase();
  const mimeType = iconMimeTypes[ext];
  if (!mimeType) {
    console.warn('Joplin Explorer: unsupported icon file type', localPath);
    return { type: 'text', value: fallbackText };
  }

  const iconsDir = nodePath.join(dataDir, 'custom-icons');
  const pathHash = nodeCrypto.createHash('sha1').update(localPath).digest('hex');
  const destination = nodePath.join(iconsDir, settingKey + '-' + pathHash + ext);

  try {
    await nodeFs.promises.mkdir(iconsDir, { recursive: true });
    const stat = await nodeFs.promises.stat(localPath);
    if (stat.isFile()) await nodeFs.promises.copyFile(localPath, destination);
  } catch (err) {
    // If the original file disappeared, keep using the cached copy when possible.
    console.warn('Joplin Explorer: failed to copy icon file', localPath, err);
  }

  try {
    const content = await nodeFs.promises.readFile(destination);
    return { type: 'image', value: 'data:' + mimeType + ';base64,' + content.toString('base64') };
  } catch (err) {
    console.warn('Joplin Explorer: failed to load icon file', destination, err);
    return { type: 'text', value: fallbackText };
  }
}

async function getAllFolders(): Promise<FolderItem[]> {
  let folders: FolderItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await joplin.data.get(['folders'], {
      fields: ['id', 'title', 'parent_id', 'icon'],
      page, limit: 100,
    });
    folders = folders.concat(result.items);
    hasMore = result.has_more;
    page++;
  }
  return folders;
}

// One paginated query for ALL notes, then group by parent_id locally.
// Replaces the old per-folder query loop: O(total notes / 100) API calls
// instead of O(folder count) call series.
async function getAllNotes(): Promise<NoteItem[]> {
  let notes: NoteItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await joplin.data.get(['notes'], {
      fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time', 'user_updated_time', 'order'],
      page, limit: 100,
    });
    notes = notes.concat(result.items);
    hasMore = result.has_more;
    page++;
  }
  return notes;
}

// Sibling folders are ordered by their `order` field DESC (matching Joplin's
// own custom notebook order), falling back to title ASC when orders tie (e.g.
// folders that have never been manually reordered all have order 0).
function compareFolders(a: TreeNode, b: TreeNode): number {
  const oa = a.order || 0;
  const ob = b.order || 0;
  if (oa !== ob) return ob - oa;
  return (a.title || '').localeCompare(b.title || '');
}

function buildTree(folders: FolderItem[], notesByFolder: { [id: string]: NoteItem[] }): TreeNode[] {
  const folderMap: { [id: string]: TreeNode } = {};
  const childFolders: { [id: string]: TreeNode[] } = {};
  const childNotes: { [id: string]: TreeNode[] } = {};
  for (const f of folders) {
    folderMap[f.id] = {
      type: 'folder', id: f.id, title: f.title,
      parent_id: f.parent_id, icon: f.icon, order: f.order || 0,
      note_count: 0, children: [],
    };
    childFolders[f.id] = [];
    childNotes[f.id] = [];
  }
  for (const fid of Object.keys(notesByFolder)) {
    if (childNotes[fid]) {
      for (const n of notesByFolder[fid]) {
        childNotes[fid].push({
          type: 'note', id: n.id, title: n.title || '(untitled)',
          is_todo: n.is_todo, todo_completed: n.todo_completed,
        });
      }
    }
  }
  const rootFolders: TreeNode[] = [];
  for (const f of folders) {
    const node = folderMap[f.id];
    if (f.parent_id && folderMap[f.parent_id]) {
      childFolders[f.parent_id].push(node);
    } else {
      rootFolders.push(node);
    }
  }
  // Assemble each folder's children: sub-folders (sorted) first, then notes
  // (already sorted by the active note sort). Then recurse.
  function assemble(node: TreeNode): void {
    const subs = childFolders[node.id].sort(compareFolders);
    for (const s of subs) assemble(s);
    node.note_count = childNotes[node.id].length;
    node.children = subs.concat(childNotes[node.id]);
  }
  rootFolders.sort(compareFolders);
  for (const rf of rootFolders) assemble(rf);
  const roots: TreeNode[] = rootFolders;

  // Recursively compute total note count including sub-folders
  function calcTotalCount(node: TreeNode): number {
    let total = 0;
    if (!node.children) return 0;
    for (const child of node.children) {
      if (child.type === 'note') {
        total++;
      } else if (child.type === 'folder') {
        calcTotalCount(child);
        total += child.total_count || 0;
      }
    }
    node.total_count = total;
    return total;
  }
  for (const root of roots) calcTotalCount(root);

  return roots;
}

function getFolderIcon(node: TreeNode, isCollapsed = true, openIcon: IconRenderData = { type: 'text', value: '\uD83D\uDCC2' }, closedIcon: IconRenderData = { type: 'text', value: '\uD83D\uDCC1' }): IconRenderData {
  let iconData: any = node.icon;
  if (iconData && typeof iconData === 'string') {
    try { iconData = JSON.parse(iconData); } catch (e) { iconData = null; }
  }
  if (iconData && iconData.emoji) return { type: 'text', value: String(iconData.emoji) };
  return isCollapsed ? closedIcon : openIcon;
}

function getNoteIcon(note: { is_todo?: number, todo_completed?: number }): string {
  if (note.is_todo) return note.todo_completed ? '\u2611' : '\u2610';
  return '\uD83D\uDCDD';
}

function renderTreeHtml(nodes: TreeNode[], selectedNoteId: string, collapsedSet: { [id: string]: boolean }, level = 0, showFolderToggles = true, openFolderIcon: IconRenderData = { type: 'text', value: '\uD83D\uDCC2' }, closedFolderIcon: IconRenderData = { type: 'text', value: '\uD83D\uDCC1' }): string {
  let html = '';
  for (const node of nodes) {
    const indent = 8 + level * 18;
    if (node.type === 'folder') {
      const count = node.total_count || node.note_count || 0;
      const isCollapsed = collapsedSet[node.id] === true;
      const arrowChar = isCollapsed ? '\u25B6' : '\u25BC';
      const toggleClass = isCollapsed ? 'toggle' : 'toggle expanded';
      html += '<div class="tree-item folder' + (isCollapsed ? ' collapsed' : '') + '" style="padding-left:' + indent + 'px" data-id="' + node.id + '" data-type="folder">';
      if (showFolderToggles) html += '<span class="' + toggleClass + '">' + arrowChar + '</span>';
      // Both icon variants are always in the DOM; CSS picks one via the
      // .collapsed class so the webview can toggle folders without a
      // full panel re-render (no backend roundtrip, scroll position kept).
      html += renderIconHtml(getFolderIcon(node, false, openFolderIcon, closedFolderIcon), 'folder-icon icon-when-open');
      html += renderIconHtml(getFolderIcon(node, true, openFolderIcon, closedFolderIcon), 'folder-icon icon-when-collapsed');
      html += '<span class="label">' + escapeHtml(node.title) + '</span>';
      html += '<span class="count">' + count + '</span>';
      html += '</div>';
      html += '<div class="children' + (isCollapsed ? ' collapsed' : '') + '" data-folder-id="' + node.id + '">';
      if (node.children) {
        html += renderTreeHtml(node.children, selectedNoteId, collapsedSet, level + 1, showFolderToggles, openFolderIcon, closedFolderIcon);
      }
      html += '</div>';
    } else {
      const selected = node.id === selectedNoteId ? ' selected' : '';
      const icon = getNoteIcon(node);
      html += '<div class="tree-item note' + selected + '" style="padding-left:' + indent + 'px" data-id="' + node.id + '" data-type="note" data-todo="' + (node.is_todo ? 1 : 0) + '">';
      html += '<span class="icon note-icon">' + icon + '</span>';
      html += '<span class="label">' + escapeHtml(node.title) + '</span>';
      html += '</div>';
    }
  }
  return html;
}

function sortNotes(notes: NoteItem[], sortMode: string): NoteItem[] {
  const sorted = notes.slice();
  switch (sortMode) {
    case 'title_asc': sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
    case 'title_desc': sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
    case 'updated_asc': sorted.sort((a, b) => (a.user_updated_time || 0) - (b.user_updated_time || 0)); break;
    case 'manual':
      sorted.sort((a, b) => {
        const oa = a.order || 0;
        const ob = b.order || 0;
        if (oa !== ob) return ob - oa;
        return (b.user_updated_time || 0) - (a.user_updated_time || 0);
      });
      break;
    default: sorted.sort((a, b) => (b.user_updated_time || 0) - (a.user_updated_time || 0)); break;
  }
  return sorted;
}

/* ======================== Plugin ======================== */
joplin.plugins.register({
  onStart: async function () {
    const locale = (await joplin.settings.globalValue('locale')) || 'en_US';
    const t = getI18n(locale);

    const panel = await joplin.views.panels.create('notesInListPanel');
    await joplin.views.panels.addScript(panel, 'webview/panel.css');
    await joplin.views.panels.addScript(panel, 'webview/panel.js');
    await joplin.views.panels.setHtml(panel, '<div id="notes-in-list-root"><p style="padding:12px;">' + t.loading + '</p></div>');
    await joplin.views.panels.show(panel, true);

    // Register settings for pinned items persistence
    try {
      await joplin.settings.registerSection('joplinExplorer', { label: 'Joplin Explorer', iconName: 'fas fa-columns' });
      await joplin.settings.registerSettings({
        'pinnedItems': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '{"notes":[],"folders":[]}',
          public: false,
          label: 'Pinned Items (JSON)',
        },
        'folderOrder': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '{}',
          public: false,
          label: 'Folder Manual Order (JSON)',
        },
        'noteSortMode': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: 'updated_desc',
          public: false,
          label: 'Note Sort Mode',
        },
        'uiState': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '{}',
          public: false,
          label: 'UI State (JSON)',
        },
        'showTagsSection': {
          section: 'joplinExplorer',
          type: 3, // SettingItemType.Bool = 3
          value: true,
          public: true,
          label: 'Show tags section',
          description: 'Show Joplin tags as folders below the notebook tree.',
        },
        'autoRefresh': {
          section: 'joplinExplorer',
          type: 3, // SettingItemType.Bool = 3
          value: true,
          public: true,
          label: 'Auto refresh on external changes',
          description: 'Poll Joplin\'s change feed every 5 seconds and refresh the panel when notes are created, moved or deleted by other plugins or sync. Edits to the currently open note are ignored (they already update live).',
        },
        'restoreUiState': {
          section: 'joplinExplorer',
          type: 3, // SettingItemType.Bool = 3
          value: true,
          public: true,
          label: 'Restore last view state on startup',
          description: 'Remember collapsed/expanded folders and sections between sessions. When off, the tree starts fully collapsed.',
        },
        'tagsDefaultExpanded': {
          section: 'joplinExplorer',
          type: 3, // SettingItemType.Bool = 3
          value: false,
          public: true,
          label: 'Tags section expanded by default',
          description: 'Only used when the last view state is not restored: start with the tags section expanded.',
        },
        'expandAllMode': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: 'restore',
          isEnum: true,
          options: {
            restore: 'Restore the state before Collapse All',
            skeleton: 'Folders only (leaf notebooks stay collapsed)',
            all: 'Everything',
          },
          public: true,
          label: 'Expand All behavior',
          description: 'What the Expand All button restores. Default: the tree as it was before the last Collapse All.',
        },
        'showFolderToggles': {
          section: 'joplinExplorer',
          type: 3, // SettingItemType.Bool = 3
          value: true,
          public: true,
          label: 'Show toggle arrows',
          description: 'Show expand/collapse arrows before folders and the pinned section.',
        },
        'openFolderIcon': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '\uD83D\uDCC2',
          public: true,
          label: 'Open folder icon',
          description: 'Emoji, image URL, data URI, or local image path for expanded folders without a custom notebook icon.',
        },
        'closedFolderIcon': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '\uD83D\uDCC1',
          public: true,
          label: 'Closed folder icon',
          description: 'Emoji, image URL, data URI, or local image path for collapsed folders without a custom notebook icon.',
        },
        'openPinnedIcon': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '\uD83D\uDCCC',
          public: true,
          label: 'Open pinned icon',
          description: 'Emoji, image URL, data URI, or local image path for the expanded pinned section.',
        },
        'closedPinnedIcon': {
          section: 'joplinExplorer',
          type: 2, // SettingItemType.String = 2
          value: '\uD83D\uDCCC',
          public: true,
          label: 'Closed pinned icon',
          description: 'Emoji, image URL, data URI, or local image path for the collapsed pinned section.',
        },
      });
    } catch (err) {
      console.error('Joplin Explorer: failed to register settings', err);
    }

    // Native dialogs
    const inputDialog = await joplin.views.dialogs.create('explorerInputDialog');
    const confirmDialog = await joplin.views.dialogs.create('explorerConfirmDialog');
    const infoDialog = await joplin.views.dialogs.create('explorerInfoDialog');

    async function showNativeConfirm(message: string): Promise<boolean> {
      await joplin.views.dialogs.setHtml(confirmDialog,
        '<div style="padding:10px;min-width:280px;">'
        + '<div style="font-size:13px;">' + escapeHtml(message) + '</div>'
        + '</div>'
      );
      await joplin.views.dialogs.setButtons(confirmDialog, [
        { id: 'ok', title: 'OK' },
        { id: 'cancel', title: t.cancel || 'Cancel' },
      ]);
      const result = await joplin.views.dialogs.open(confirmDialog);
      return result.id === 'ok';
    }

    async function showNativeInfo(title: string, body: string): Promise<void> {
      await joplin.views.dialogs.setHtml(infoDialog,
        '<div style="padding:10px;min-width:320px;">'
        + '<div style="font-size:14px;font-weight:bold;margin-bottom:10px;">' + escapeHtml(title) + '</div>'
        + '<div style="font-size:12px;line-height:1.8;white-space:pre-wrap;">' + escapeHtml(body) + '</div>'
        + '</div>'
      );
      await joplin.views.dialogs.setButtons(infoDialog, [
        { id: 'ok', title: 'OK' },
      ]);
      await joplin.views.dialogs.open(infoDialog);
    }

    async function showNativeInput(label: string, defaultValue: string): Promise<string | null> {
      await joplin.views.dialogs.setHtml(inputDialog,
        '<div style="padding:10px;min-width:300px;">'
        + '<div style="margin-bottom:8px;font-size:13px;">' + escapeHtml(label) + '</div>'
        + '<form name="inputForm">'
        + '<input name="value" type="text" value="' + escapeHtml(defaultValue || '') + '" '
        + 'style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:13px;" />'
        + '</form>'
        + '</div>'
      );
      await joplin.views.dialogs.setButtons(inputDialog, [
        { id: 'ok', title: 'OK' },
        { id: 'cancel', title: t.cancel || 'Cancel' },
      ]);
      const result: any = await joplin.views.dialogs.open(inputDialog);
      if (result.id === 'ok' && result.formData && result.formData.inputForm) {
        return result.formData.inputForm.value || null;
      }
      return null;
    }

    let selectedNoteId = '';
    let collapsedFolders: { [id: string]: boolean } = {};
    let currentSort = 'updated_desc';
    // Restore the last sort mode - it used to reset to updated_desc on restart.
    try {
      const savedSort = String((await joplin.settings.value('noteSortMode')) || '');
      if (['updated_desc', 'updated_asc', 'title_asc', 'title_desc', 'manual'].indexOf(savedSort) >= 0) currentSort = savedSort;
    } catch (_) { /* keep default */ }
    let allFoldersCache: FolderItem[] = [];
    let folderById: { [id: string]: FolderItem } = {};
    let allNotesCache: NoteItem[] = [];
    let pinnedItems: { id: string, type: string }[] = [];
    let pinnedCollapsed = false;
    let tagsCollapsed = false;
    let trashCollapsed = true;
    // Folder-collapse state captured when the user hits Collapse All, so
    // Expand All (mode: restore) can bring the tree back - survives webview
    // re-renders because it lives here and rides the root dataset.
    let collapseSnapshot: string[] | null = null;
    let allTagsCache: { id: string, title: string, count: string }[] = [];
    // Folder manual order lives in a plugin setting, NOT the Joplin `folders`
    // table: older Joplin builds have no `order` column on folders (querying it
    // throws "no such column: order"). Map is folderId -> order (higher = top).
    let folderOrder: { [id: string]: number } = {};
    let isFirstLoad = true;
    // Collapse states used to reset on every app start - restore them,
    // unless the user prefers a fully collapsed start.
    let uiStateLoaded = false;
    // Non-restored default: tags section collapsed unless opted in.
    tagsCollapsed = (await joplin.settings.value('tagsDefaultExpanded')) !== true;
    if ((await joplin.settings.value('restoreUiState')) !== false) {
      try {
        const uiRaw = String((await joplin.settings.value('uiState')) || '{}');
        const ui = JSON.parse(uiRaw);
        if (ui && typeof ui === 'object') {
          if (ui.collapsedFolders && typeof ui.collapsedFolders === 'object' && !Array.isArray(ui.collapsedFolders)) {
            collapsedFolders = ui.collapsedFolders;
            uiStateLoaded = true;
          }
          if (typeof ui.tagsCollapsed === 'boolean') tagsCollapsed = ui.tagsCollapsed;
          if (typeof ui.pinnedCollapsed === 'boolean') pinnedCollapsed = ui.pinnedCollapsed;
          if (typeof ui.trashCollapsed === 'boolean') trashCollapsed = ui.trashCollapsed;
        }
      } catch (_) { /* defaults */ }
    }
    let uiStateTimer: any = null;
    function saveUiState(): void {
      if (uiStateTimer) clearTimeout(uiStateTimer);
      uiStateTimer = setTimeout(async () => {
        uiStateTimer = null;
        try {
          await joplin.settings.setValue('uiState', JSON.stringify({ collapsedFolders, tagsCollapsed, pinnedCollapsed, trashCollapsed }));
        } catch (err) {
          console.error('Joplin Explorer: failed to save UI state', err);
        }
      }, 500);
    }
    const pluginDataDir = await joplin.plugins.dataDir();
    let refreshTimer: any = null;

    function scheduleRefreshPanel(delay = 600): void {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(async () => {
        refreshTimer = null;
        await refreshPanel();
      }, delay);
    }

    let noteChangeTimer: any = null;
    let pendingNoteChangeIds: { [id: string]: boolean } = {};

    function scheduleNoteUpdate(noteId: string): void {
      pendingNoteChangeIds[noteId] = true;
      if (noteChangeTimer) clearTimeout(noteChangeTimer);
      noteChangeTimer = setTimeout(async () => {
        noteChangeTimer = null;
        const ids = Object.keys(pendingNoteChangeIds);
        pendingNoteChangeIds = {};
        for (const id of ids) await updateNoteInPanel(id);
      }, 600);
    }

    async function loadPinned(): Promise<void> {
      try {
        const raw = await joplin.settings.value('pinnedItems');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        // Migrate old format {notes:[], folders:[]} to new [{id, type}]
        if (parsed && !Array.isArray(parsed) && parsed.notes && parsed.folders) {
          pinnedItems = [];
          for (const fid of parsed.folders) pinnedItems.push({ id: fid, type: 'folder' });
          for (const nid of parsed.notes) pinnedItems.push({ id: nid, type: 'note' });
          await savePinned();
        } else if (Array.isArray(parsed)) {
          pinnedItems = parsed;
        }
      } catch (_) {
        pinnedItems = [];
      }
    }

    async function savePinned(): Promise<void> {
      try {
        await joplin.settings.setValue('pinnedItems', JSON.stringify(pinnedItems));
      } catch (err) {
        console.error('Joplin Explorer: failed to save pinned items', err);
      }
    }

    async function loadFolderOrder(): Promise<void> {
      try {
        const raw = await joplin.settings.value('folderOrder');
        const parsed = raw ? JSON.parse(raw) : {};
        folderOrder = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      } catch (_) {
        folderOrder = {};
      }
    }

    async function saveFolderOrder(): Promise<void> {
      try {
        await joplin.settings.setValue('folderOrder', JSON.stringify(folderOrder));
      } catch (err) {
        console.error('Joplin Explorer: failed to save folder order', err);
      }
    }

    function expandToFolder(folderId: string): void {
      let parentId: string | null = folderId;
      while (parentId) {
        delete collapsedFolders[parentId];
        const found: FolderItem | undefined = folderById[parentId];
        parentId = found ? found.parent_id : null;
      }
    }

    async function refreshPanel(): Promise<void> {
      try {
        const folders = await getAllFolders();
        // Attach manual order from our own setting (Joplin folders have no
        // `order` column). Prune orders for folders that no longer exist.
        await loadFolderOrder();
        let orderPruned = false;
        const liveFolderIds = new Set(folders.map((f) => f.id));
        for (const id of Object.keys(folderOrder)) {
          if (!liveFolderIds.has(id)) { delete folderOrder[id]; orderPruned = true; }
        }
        if (orderPruned) await saveFolderOrder();
        for (const f of folders) f.order = folderOrder[f.id] || 0;
        allFoldersCache = folders;
        folderById = {};
        for (const f of folders) folderById[f.id] = f;

        if (isFirstLoad) {
          if (!uiStateLoaded) {
            for (const f of folders) collapsedFolders[f.id] = true;
          }
          const currentNote = await joplin.workspace.selectedNote();
          if (currentNote) {
            selectedNoteId = currentNote.id;
            expandToFolder(currentNote.parent_id);
          }
          isFirstLoad = false;
        }

        const fetchedNotes = await getAllNotes();
        const notesByFolder: { [id: string]: NoteItem[] } = {};
        for (const f of folders) notesByFolder[f.id] = [];
        for (const n of fetchedNotes) {
          if (notesByFolder[n.parent_id]) notesByFolder[n.parent_id].push(n);
        }
        for (const fid of Object.keys(notesByFolder)) {
          notesByFolder[fid] = sortNotes(notesByFolder[fid], currentSort);
        }

        // Notes cache for local substring search (only notes in known folders)
        const allNotes: NoteItem[] = [];
        for (const fid of Object.keys(notesByFolder)) {
          for (const n of notesByFolder[fid]) allNotes.push(n);
        }
        allNotesCache = allNotes;

        const showFolderToggles = await joplin.settings.value('showFolderToggles');
        const openFolderIconSetting = await joplin.settings.value('openFolderIcon');
        const closedFolderIconSetting = await joplin.settings.value('closedFolderIcon');
        const openPinnedIconSetting = await joplin.settings.value('openPinnedIcon');
        const closedPinnedIconSetting = await joplin.settings.value('closedPinnedIcon');
        const openFolderIcon = await resolveIconSettingCached(openFolderIconSetting, '\uD83D\uDCC2', 'openFolderIcon', pluginDataDir);
        const closedFolderIcon = await resolveIconSettingCached(closedFolderIconSetting, '\uD83D\uDCC1', 'closedFolderIcon', pluginDataDir);
        const openPinnedIcon = await resolveIconSettingCached(openPinnedIconSetting, '\uD83D\uDCCC', 'openPinnedIcon', pluginDataDir);
        const closedPinnedIcon = await resolveIconSettingCached(closedPinnedIconSetting, '\uD83D\uDCCC', 'closedPinnedIcon', pluginDataDir);
        const showToggleArrows = showFolderToggles !== false;
        const tree = buildTree(folders, notesByFolder);
        const treeHtml = renderTreeHtml(tree, selectedNoteId, collapsedFolders, 0, showToggleArrows, openFolderIcon, closedFolderIcon);

        // Tags section data: every tag, sorted by title. Notes load lazily
        // on first expand, so this is one cheap paginated query.
        const showTagsSection = (await joplin.settings.value('showTagsSection')) !== false;
        if (!showTagsSection) { allTagsCache = []; } else try {
          let tags: any[] = [];
          let tPage = 1;
          let tMore = true;
          while (tMore) {
            const tr = await joplin.data.get(['tags'], { fields: ['id', 'title'], page: tPage, limit: 100 });
            tags = tags.concat(tr.items);
            tMore = tr.has_more;
            tPage++;
          }
          tags.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          // Joplin keeps empty tags in the database but hides them in its
          // sidebar - do the same, and grab a bounded note count while at it
          // (up to 100, then "100+" - same policy as search tag counts).
          // Skipped for very large tag sets to keep refresh cheap.
          let counts: string[] = tags.map(() => '');
          if (tags.length <= 200) {
            counts = await Promise.all(tags.map((x: any) =>
              joplin.data.get(['tags', x.id, 'notes'], { fields: ['id'], limit: 100 })
                .then((r: any) => r.items.length === 0 ? '0' : (r.has_more ? '100+' : String(r.items.length)))
                .catch(() => '')
            ));
            tags = tags.filter((_x: any, i: number) => counts[i] !== '0');
            counts = counts.filter((c: string) => c !== '0');
          }
          allTagsCache = tags.map((x: any, i: number) => ({ id: x.id, title: x.title || '', count: counts[i] || '' }));
        } catch (_) { allTagsCache = []; }

        // Build pinned section
        await loadPinned();
        const folderIdSet = new Set(folders.map(f => f.id));
        const noteIdSet = new Set(allNotes.map(n => n.id));
        // Auto-clean deleted items
        const before = pinnedItems.length;
        pinnedItems = pinnedItems.filter(p =>
          p.type === 'folder' ? folderIdSet.has(p.id) : noteIdSet.has(p.id)
        );
        if (pinnedItems.length !== before) await savePinned();

        let pinnedHtml = '';
        const pinnedCount = pinnedItems.length;
        if (pinnedCount > 0) {
          const pinnedArrow = pinnedCollapsed ? '\u25B6' : '\u25BC';
          pinnedHtml += '<div class="pinned-section-header' + (pinnedCollapsed ? ' collapsed' : '') + '" id="pinned-header">';
          if (showToggleArrows) pinnedHtml += '<span class="toggle">' + pinnedArrow + '</span>';
          pinnedHtml += renderIconHtml(openPinnedIcon, 'icon-when-open')
            + renderIconHtml(closedPinnedIcon, 'icon-when-collapsed')
            + '<span class="label">' + t.pinned + ' (' + pinnedCount + ')</span>'
            + '</div>';
          pinnedHtml += '<div class="pinned-section-body' + (pinnedCollapsed ? ' collapsed' : '') + '" id="pinned-body">';
          for (const p of pinnedItems) {
            if (p.type === 'folder') {
              const folder = folderById[p.id] || null;
              if (folder) {
                const fi = getFolderIcon(folder as any, true, openFolderIcon, closedFolderIcon);
                pinnedHtml += '<div class="tree-item folder pinned-item" data-id="' + folder.id + '" data-type="folder">';
                pinnedHtml += renderIconHtml(fi, 'folder-icon');
                pinnedHtml += '<span class="label">' + escapeHtml(folder.title) + '</span>';
                pinnedHtml += '</div>';
              }
            } else {
              let note: NoteItem | null = null;
              for (const n of allNotes) { if (n.id === p.id) { note = n; break; } }
              if (note) {
                const selected = note.id === selectedNoteId ? ' selected' : '';
                const icon = getNoteIcon(note);
                pinnedHtml += '<div class="tree-item note pinned-item' + selected + '" data-id="' + note.id + '" data-type="note" data-todo="' + (note.is_todo ? 1 : 0) + '">';
                pinnedHtml += '<span class="icon note-icon">' + icon + '</span>';
                pinnedHtml += '<span class="label">' + escapeHtml(note.title) + '</span>';
                pinnedHtml += '</div>';
              }
            }
          }
          pinnedHtml += '</div>';
        }

        // Tags section: each tag is a collapsible folder row; children are
        // filled lazily by the webview via tagFolderNotes.
        let tagsHtml = '';
        if (allTagsCache.length > 0) {
          const tagsArrow = tagsCollapsed ? '\u25B6' : '\u25BC';
          tagsHtml += '<div class="tags-section-header' + (tagsCollapsed ? ' collapsed' : '') + '" id="tags-header">';
          if (showToggleArrows) tagsHtml += '<span class="toggle">' + tagsArrow + '</span>';
          tagsHtml += '<span class="icon">\uD83C\uDFF7\uFE0F</span>'
            + '<span class="label">' + t.tags + ' (' + allTagsCache.length + ')</span>'
            + '</div>';
          tagsHtml += '<div class="tags-section-body' + (tagsCollapsed ? ' collapsed' : '') + '" id="tags-body">';
          for (const tg of allTagsCache) {
            tagsHtml += '<div class="tree-item folder tag-folder collapsed" data-tag-id="' + tg.id + '" data-type="tag">';
            if (showToggleArrows) tagsHtml += '<span class="toggle">\u25B6</span>';
            tagsHtml += '<span class="icon">\uD83C\uDFF7\uFE0F</span>';
            tagsHtml += '<span class="label">' + escapeHtml(tg.title) + '</span>';
            if (tg.count) tagsHtml += '<span class="count">' + tg.count + '</span>';
            tagsHtml += '</div>';
            tagsHtml += '<div class="tag-children collapsed" data-tag-id="' + tg.id + '"></div>';
          }
          tagsHtml += '</div>';
        }

        // Trash section: shown only when something is in the trash. One
        // limit:1 probe (deleted notes sort first with order_by deleted_time
        // DESC + include_deleted) keeps the refresh cost negligible.
        let trashHtml = '';
        try {
          const tprobe = await joplin.data.get(['notes'], {
            fields: ['id', 'deleted_time'],
            include_deleted: 1, order_by: 'deleted_time', order_dir: 'DESC', limit: 1,
          });
          if (tprobe.items && tprobe.items.length && tprobe.items[0].deleted_time > 0) {
            const trashArrow = trashCollapsed ? '\u25B6' : '\u25BC';
            trashHtml += '<div class="trash-section-header' + (trashCollapsed ? ' collapsed' : '') + '" id="trash-header">';
            if (showToggleArrows) trashHtml += '<span class="toggle">' + trashArrow + '</span>';
            trashHtml += '<span class="icon">\uD83D\uDDD1\uFE0F</span>'
              + '<span class="label">' + t.trash + '</span>'
              + '</div>';
            trashHtml += '<div class="trash-children' + (trashCollapsed ? ' collapsed' : '') + '" id="trash-children"></div>';
          }
        } catch (_) { /* include_deleted unsupported - no trash section */ }

        const pinnedJson = escapeHtml(JSON.stringify(pinnedItems));
        const allFoldersCollapsed = folders.length > 0 && folders.every((f) => collapsedFolders[f.id] === true);
        const sortLabels: { [k: string]: string } = {
          'updated_desc': t.sortUpdatedDesc, 'updated_asc': t.sortUpdatedAsc,
          'title_asc': t.sortTitleAsc, 'title_desc': t.sortTitleDesc,
          'manual': t.sortManual,
        };

        const i18nJson = escapeHtml(JSON.stringify(t));

        const expandAllMode = String((await joplin.settings.value('expandAllMode')) || 'restore');
        const html = '<div id="notes-in-list-root" data-i18n="' + i18nJson + '" data-pinned="' + pinnedJson + '" data-sort="' + escapeHtml(currentSort) + '" data-expand-mode="' + escapeHtml(expandAllMode) + '" data-collapse-snapshot="' + escapeHtml(JSON.stringify(collapseSnapshot)) + '">'
          + '  <div class="toolbar">'
          + '    <button id="btn-new" title="' + t.newItem + '">\uFF0B</button>'
          + '    <button id="btn-sort" title="' + t.sort + '">' + sortLabels[currentSort] + '</button>'
          + '    <button id="btn-collapse-all" data-mode="' + (allFoldersCollapsed ? 'expand' : 'collapse') + '" title="' + (allFoldersCollapsed ? t.expandAll : t.collapseAll) + '">' + (allFoldersCollapsed ? '\u25BC' : '\u25B2') + '</button>'
          + '    <button id="btn-refresh" title="' + t.refresh + '">\u21BB</button>'
          + '  </div>'
          + '  <div class="search-bar">'
          + '    <input id="search-input" type="text" placeholder="\uD83D\uDD0D ' + t.search + '" />'
          + '  </div>'
          + '  <div id="tree-container">' + pinnedHtml + treeHtml + tagsHtml + trashHtml
          + '    <div id="drop-zone-empty" class="drop-zone-empty">+ ' + t.dropCreateNotebook + '</div>'
          + '  </div>'
          + '  <div id="search-results" style="display:none;"></div>'
          + '  <div class="bottom-bar">'
          + '    <button id="btn-sync" title="' + t.sync + '">\uD83D\uDD04 ' + t.sync + '</button>'
          + '  </div>'
          + '</div>';

        await joplin.views.panels.setHtml(panel, html);
      } catch (err) {
        console.error('Notes In List: refresh error', err);
        await joplin.views.panels.setHtml(panel, '<div style="padding:12px;color:red;">Error: ' + escapeHtml(String(err)) + '</div>');
      }
    }

    async function updateNoteInPanel(noteId: string): Promise<void> {
      try {
        const cachedIndex = allNotesCache.findIndex((note) => note.id === noteId);
        const note = await joplin.data.get(['notes', noteId], {
          fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time', 'user_updated_time', 'order'],
        });

        if (cachedIndex < 0 || allNotesCache[cachedIndex].parent_id !== note.parent_id) {
          await refreshPanel();
          return;
        }

        const oldNote = allNotesCache[cachedIndex];
        const titleSortChanged = currentSort.indexOf('title_') === 0 && (oldNote.title || '') !== (note.title || '');
        const updatedSortChanged = currentSort.indexOf('updated_') === 0 && oldNote.user_updated_time !== note.user_updated_time;
        allNotesCache[cachedIndex] = note;

        if (titleSortChanged || updatedSortChanged) {
          await refreshPanel();
          return;
        }

        await joplin.views.panels.postMessage(panel, {
          name: 'updateNote',
          id: note.id,
          title: note.title || '(untitled)',
          icon: getNoteIcon(note),
        });
      } catch (_) {
        await refreshPanel();
      }
    }

    await joplin.settings.onChange(async (event: any) => {
      if (event.keys && event.keys.indexOf('autoRefresh') >= 0) {
        await applyAutoRefreshSetting();
      }
      if (event.keys && (
        event.keys.indexOf('expandAllMode') >= 0
        || event.keys.indexOf('showTagsSection') >= 0
        || event.keys.indexOf('showFolderToggles') >= 0
        || event.keys.indexOf('openFolderIcon') >= 0
        || event.keys.indexOf('closedFolderIcon') >= 0
        || event.keys.indexOf('openPinnedIcon') >= 0
        || event.keys.indexOf('closedPinnedIcon') >= 0
      )) {
        clearIconResolveCache();
        await refreshPanel();
      }
    });

    async function handleSearch(msg: any): Promise<void> {

        const query = msg.query;
        if (!query || !query.trim()) {
          await joplin.views.panels.postMessage(panel, { name: 'searchResults', results: null, query: '', searchId: msg.searchId });
          return;
        }
        try {
          const lowerQuery = query.toLowerCase();
          const folderNameMap: { [id: string]: string } = {};
          for (const f of allFoldersCache) folderNameMap[f.id] = f.title;

          // ---- Notes: Joplin FTS + local title substring fallback ----
          let searchResults: any[] = [];
          let page = 1;
          let hasMore = true;
          while (hasMore && searchResults.length < 100) {
            const result = await joplin.data.get(['search'], {
              query,
              fields: ['id', 'title', 'body', 'parent_id', 'is_todo', 'todo_completed'],
              page, limit: 20,
            });
            searchResults = searchResults.concat(result.items);
            hasMore = result.has_more;
            page++;
          }
          // Local title substring (catches partial matches FTS misses)
          const ftsIds = new Set(searchResults.map((n: any) => n.id));
          const titleMatches: any[] = [];
          for (const n of allNotesCache) {
            if (!ftsIds.has(n.id) && (n.title || '').toLowerCase().indexOf(lowerQuery) >= 0) {
              titleMatches.push(n);
            }
          }
          for (let i = 0; i < titleMatches.length && i < 50; i++) {
            try {
              const full = await joplin.data.get(['notes', titleMatches[i].id], {
                fields: ['id', 'title', 'body', 'parent_id', 'is_todo', 'todo_completed'],
              });
              searchResults.push(full);
            } catch (_) { /* note may have been deleted */ }
          }

          const noteItems = [] as any[];
          for (const note of searchResults) {
            let snippet = '';
            const body = note.body || '';
            const lowerBody = body.toLowerCase();
            const matchIdx = lowerBody.indexOf(lowerQuery);
            if (matchIdx >= 0) {
              const start = Math.max(0, matchIdx - 40);
              const end = Math.min(body.length, matchIdx + lowerQuery.length + 80);
              snippet = (start > 0 ? '...' : '') + body.substring(start, end).replace(/\n/g, ' ') + (end < body.length ? '...' : '');
            } else {
              snippet = body.substring(0, 120).replace(/\n/g, ' ') + (body.length > 120 ? '...' : '');
            }
            noteItems.push({
              id: note.id,
              title: note.title || '(untitled)',
              is_todo: note.is_todo,
              todo_completed: note.todo_completed,
              snippet,
              folderName: folderNameMap[note.parent_id] || '',
            });
          }

          // ---- Tags: search by title substring ----
          let allTags: any[] = [];
          let tagPage = 1;
          let tagHasMore = true;
          while (tagHasMore) {
            const tagResult = await joplin.data.get(['tags'], {
              fields: ['id', 'title'],
              page: tagPage, limit: 100,
            });
            allTags = allTags.concat(tagResult.items);
            tagHasMore = tagResult.has_more;
            tagPage++;
          }
          const tagItems = [] as any[];
          for (const tag of allTags) {
            if ((tag.title || '').toLowerCase().indexOf(lowerQuery) >= 0) {
              // One bounded call per tag: exact count up to 100, then "100+".
              // (Full pagination per matching tag made searches crawl.)
              let noteCount: any = 0;
              try {
                const r = await joplin.data.get(['tags', tag.id, 'notes'], { fields: ['id'], limit: 100 });
                noteCount = r.has_more ? (r.items.length + '+') : r.items.length;
              } catch (_) {}
              tagItems.push({ id: tag.id, title: tag.title, noteCount });
            }
          }

          // ---- Folders: local substring search ----
          const folderItems = [] as any[];
          for (const f of allFoldersCache) {
            if ((f.title || '').toLowerCase().indexOf(lowerQuery) >= 0) {
              // f.icon is a JSON STRING from the data API - parse it here so the
              // webview gets a ready-to-render emoji (it used to read .emoji off
              // the raw string, which never worked).
              let iconEmoji = '';
              if (f.icon && typeof f.icon === 'string') {
                try {
                  const parsedIcon = JSON.parse(f.icon);
                  if (parsedIcon && parsedIcon.emoji) iconEmoji = String(parsedIcon.emoji);
                } catch (_) { /* not JSON - ignore */ }
              }
              folderItems.push({ id: f.id, title: f.title, parent_id: f.parent_id, iconEmoji });
            }
          }

          await joplin.views.panels.postMessage(panel, {
            name: 'searchResults',
            notes: noteItems,
            tags: tagItems,
            folders: folderItems,
            query,
            searchId: msg.searchId,
          });
        } catch (err) {
          console.error('Joplin Explorer: search error', err);
        }
    }

    async function fetchTagNotes(tagId: string): Promise<any[]> {
      let notes: any[] = [];
      let p = 1;
      let more = true;
      while (more && notes.length < 200) {
        const r = await joplin.data.get(['tags', tagId, 'notes'], {
          fields: ['id', 'title', 'is_todo', 'todo_completed'],
          page: p, limit: 50,
        });
        notes = notes.concat(r.items);
        more = r.has_more;
        p++;
      }
      return notes.map((n: any) => ({
        id: n.id, title: n.title || '(untitled)',
        is_todo: n.is_todo, todo_completed: n.todo_completed,
      }));
    }

    // Deleted notes sort first under order_by deleted_time DESC, so we can
    // page through just the deleted prefix instead of scanning everything.
    async function fetchTrashNotes(): Promise<any[]> {
      const out: any[] = [];
      let p = 1;
      let more = true;
      while (more && out.length < 200) {
        const r = await joplin.data.get(['notes'], {
          fields: ['id', 'title', 'is_todo', 'todo_completed', 'deleted_time'],
          include_deleted: 1, order_by: 'deleted_time', order_dir: 'DESC',
          page: p, limit: 50,
        });
        let hitLive = false;
        for (const n of (r.items || [])) {
          if (!n.deleted_time) { hitLive = true; break; }
          out.push({ id: n.id, title: n.title || '(untitled)', is_todo: n.is_todo, todo_completed: n.todo_completed });
        }
        if (hitLive) break;
        more = r.has_more;
        p++;
      }
      return out;
    }

    async function handleContextMenu(msg: any): Promise<void> {

        const action = msg.action;
        const id = msg.id;
        const itemType = msg.itemType;
        try {
          if (itemType === 'folder') {
            switch (action) {
              case 'newNote': {
                const newNote = await joplin.data.post(['notes'], null, { title: t.newNote, parent_id: id });
                await joplin.commands.execute('openNote', newNote.id);
                selectedNoteId = newNote.id;
                expandToFolder(id);
                break;
              }
              case 'newTodo': {
                const newTodo = await joplin.data.post(['notes'], null, { title: t.newTodo, parent_id: id, is_todo: 1 });
                await joplin.commands.execute('openNote', newTodo.id);
                selectedNoteId = newTodo.id;
                expandToFolder(id);
                break;
              }
              case 'newSubNotebook': {
                const subName = await showNativeInput(t.newNotebook, '');
                if (subName && subName.trim()) {
                  const newFolder = await joplin.data.post(['folders'], null, { title: subName.trim(), parent_id: id });
                  delete collapsedFolders[id];
                  delete collapsedFolders[newFolder.id];
                }
                break;
              }
              case 'deleteFolder': {
                const folderInfo = await joplin.data.get(['folders', id], { fields: ['title'] });
                if (await showNativeConfirm(t.confirmDeleteFolder + '\n\n' + folderInfo.title)) {
                  await joplin.data.delete(['folders', id]);
                }
                break;
              }
              case 'renameFolder': {
                const folderData = await joplin.data.get(['folders', id], { fields: ['title'] });
                const newFolderName = await showNativeInput(t.promptRename, folderData.title);
                if (newFolderName && newFolderName.trim()) {
                  await joplin.data.put(['folders', id], null, { title: newFolderName.trim() });
                }
                break;
              }
              case 'exportFolder':
                try { await joplin.commands.execute('exportFolders', [id]); } catch (e) {}
                break;
              case 'pinFolder': {
                if (!pinnedItems.some(p => p.id === id)) {
                  pinnedItems.push({ id, type: 'folder' });
                  await savePinned();
                }
                break;
              }
              case 'unpinFolder': {
                pinnedItems = pinnedItems.filter(p => p.id !== id);
                await savePinned();
                break;
              }
            }
          } else if (itemType === 'note') {
            switch (action) {
              case 'openNote':
                await joplin.commands.execute('openNote', id);
                selectedNoteId = id;
                break;
              case 'openInNewWindow':
                try { await joplin.commands.execute('openNoteInNewWindow', id); }
                catch (e) { await joplin.commands.execute('openNote', id); }
                break;
              case 'copyLink': {
                const linkNote = await joplin.data.get(['notes', id], { fields: ['id', 'title'] });
                const mdLink = '[' + linkNote.title + '](:/' + linkNote.id + ')';
                try {
                  await (joplin as any).clipboard.writeText(mdLink);
                } catch (e) {
                  await joplin.views.panels.postMessage(panel, { name: 'copyText', text: mdLink });
                }
                break;
              }
              case 'duplicateNote': {
                const srcNote = await joplin.data.get(['notes', id], { fields: ['title', 'body', 'parent_id', 'is_todo'] });
                const dupNote = await joplin.data.post(['notes'], null, {
                  title: srcNote.title + ' (copy)', body: srcNote.body,
                  parent_id: srcNote.parent_id, is_todo: srcNote.is_todo,
                });
                await joplin.commands.execute('openNote', dupNote.id);
                selectedNoteId = dupNote.id;
                break;
              }
              case 'switchNoteType': {
                const sn = await joplin.data.get(['notes', id], { fields: ['is_todo'] });
                await joplin.data.put(['notes', id], null, { is_todo: sn.is_todo ? 0 : 1 });
                break;
              }
              case 'toggleTodo': {
                const tn = await joplin.data.get(['notes', id], { fields: ['is_todo', 'todo_completed'] });
                if (tn.is_todo) {
                  await joplin.data.put(['notes', id], null, { todo_completed: tn.todo_completed ? 0 : Date.now() });
                }
                break;
              }
              case 'publishNote':
                try { await joplin.commands.execute('showShareNoteDialog', [id]); } catch (e) {}
                break;
              case 'exportPdf':
                try { await joplin.commands.execute('exportPdf', [id]); } catch (e) {}
                break;
              case 'exportNote': {
                // Directory-target formats (md/jex/html...): pick the folder
                // ourselves, then run the desktop exportNotes command.
                try {
                  const dirs = await joplin.views.dialogs.showOpenDialog({ properties: ['openDirectory'] });
                  const dir = Array.isArray(dirs) ? dirs[0] : dirs;
                  if (dir) await joplin.commands.execute('exportNotes', [id], msg.format || 'md', dir);
                } catch (e) {
                  console.error('Joplin Explorer: exportNote error', e);
                }
                break;
              }
              case 'setTags':
                try { await joplin.commands.execute('setTags', [id]); } catch (e) {}
                break;
              case 'moveToFolderDialog':
                try { await joplin.commands.execute('moveToFolder', [id]); } catch (e) {}
                break;
              case 'copyExternalLink': {
                const extLink = 'joplin://x-callback-url/openNote?id=' + id;
                try {
                  await (joplin as any).clipboard.writeText(extLink);
                } catch (e) {
                  await joplin.views.panels.postMessage(panel, { name: 'copyText', text: extLink });
                }
                break;
              }
              case 'renameNote': {
                const noteData = await joplin.data.get(['notes', id], { fields: ['title'] });
                const newNoteName = await showNativeInput(t.promptRename, noteData.title);
                if (newNoteName && newNoteName.trim()) {
                  await joplin.data.put(['notes', id], null, { title: newNoteName.trim() });
                }
                break;
              }
              case 'moveNote': {
                if (msg.targetFolderName) {
                  let targetFolder: FolderItem | null = null;
                  for (const f of allFoldersCache) {
                    if (f.title === msg.targetFolderName) { targetFolder = f; break; }
                  }
                  if (targetFolder) {
                    await joplin.data.put(['notes', id], null, { parent_id: targetFolder.id });
                  }
                }
                break;
              }
              case 'noteInfo': {
                const info = await joplin.data.get(['notes', id], { fields: ['id', 'title', 'created_time', 'updated_time', 'is_todo', 'parent_id', 'body'] });
                const pTitle = folderById[info.parent_id] ? folderById[info.parent_id].title : '';
                const bodyLen = (info.body || '').length;
                const infoBody = 'ID: ' + info.id
                  + '\n' + (t.ctxRenameNote || 'Title') + ': ' + info.title
                  + '\n' + (t.newNotebook || 'Notebook') + ': ' + pTitle
                  + '\n' + (t.sortUpdatedDesc ? t.sortUpdatedDesc.replace(/[↓↑\u2193\u2191]\s*/, '') : 'Created') + ': ' + new Date(info.created_time).toLocaleString()
                  + '\n' + (t.sortUpdatedAsc ? t.sortUpdatedAsc.replace(/[↓↑\u2193\u2191]\s*/, '') : 'Updated') + ': ' + new Date(info.updated_time).toLocaleString()
                  + '\nType: ' + (info.is_todo ? 'To-do' : 'Note')
                  + '\nSize: ' + bodyLen + ' chars';
                await showNativeInfo(info.title, infoBody);
                break;
              }
              case 'deleteNote': {
                const noteForDel = await joplin.data.get(['notes', id], { fields: ['title'] });
                if (await showNativeConfirm(t.confirmDeleteNote + '\n\n' + noteForDel.title)) {
                  await joplin.data.delete(['notes', id]);
                }
                break;
              }
              case 'untagNote': {
                if (msg.tagId) {
                  await joplin.data.delete(['tags', msg.tagId, 'notes', id]);
                  // The tags section HTML is unchanged, so the follow-up
                  // refreshPanel gets de-duped - update the open list directly.
                  try {
                    const notes = await fetchTagNotes(msg.tagId);
                    await joplin.views.panels.postMessage(panel, { name: 'tagFolderNotes', tagId: msg.tagId, notes });
                  } catch (_) { /* list refreshes on next expand */ }
                }
                break;
              }
              case 'pinNote': {
                if (!pinnedItems.some(p => p.id === id)) {
                  pinnedItems.push({ id, type: 'note' });
                  await savePinned();
                }
                break;
              }
              case 'unpinNote': {
                pinnedItems = pinnedItems.filter(p => p.id !== id);
                await savePinned();
                break;
              }
            }
          } else if (itemType === 'tag') {
            switch (action) {
              case 'renameTag': {
                const tagData = await joplin.data.get(['tags', id], { fields: ['title'] });
                const newTagName = await showNativeInput(t.ctxRenameTag, tagData.title);
                if (newTagName && newTagName.trim()) {
                  await joplin.data.put(['tags', id], null, { title: newTagName.trim() });
                }
                break;
              }
              case 'deleteTag': {
                const tagDel = await joplin.data.get(['tags', id], { fields: ['title'] });
                if (await showNativeConfirm(t.confirmDeleteTag + '\n\n' + tagDel.title)) {
                  await joplin.data.delete(['tags', id]);
                }
                break;
              }
            }
          } else if (itemType === 'trashNote') {
            switch (action) {
              case 'restoreNote':
                try { await joplin.commands.execute('restoreNote', [id]); } catch (e) {}
                break;
              case 'permanentDeleteNote': {
                const permaNote = await joplin.data.get(['notes', id], { fields: ['title'], include_deleted: 1 });
                if (await showNativeConfirm(t.confirmDeleteNote + '\n\n' + (permaNote ? permaNote.title : ''))) {
                  try { await joplin.data.delete(['notes', id], { permanent: '1' }); } catch (e) {
                    try { await joplin.commands.execute('permanentlyDeleteNote', [id]); } catch (_) {}
                  }
                }
                break;
              }
            }
            // The trash children live only in the DOM - push the fresh list
            // (the follow-up full refresh may be de-duped by setHtml).
            try {
              await joplin.views.panels.postMessage(panel, { name: 'trashNotes', notes: await fetchTrashNotes() });
            } catch (_) {}
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: context menu error', err);
        }
    }

    async function reorderNoteToPosition(dragId: string, targetNoteId: string, position: 'above' | 'below'): Promise<void> {
      const targetInfo = await joplin.data.get(['notes', targetNoteId], { fields: ['parent_id'] });
      const targetFolderId = targetInfo.parent_id;
      const others: NoteItem[] = allNotesCache
        .filter((n) => n.parent_id === targetFolderId && n.id !== dragId)
        .sort((a, b) => {
          const oa = a.order || 0;
          const ob = b.order || 0;
          if (oa !== ob) return ob - oa;
          return (b.user_updated_time || 0) - (a.user_updated_time || 0);
        });
      const targetIdx = others.findIndex((n) => n.id === targetNoteId);
      const insertIdx = targetIdx < 0 ? others.length : (position === 'above' ? targetIdx : targetIdx + 1);
      const prev: NoteItem | null = insertIdx > 0 ? others[insertIdx - 1] : null;
      const next: NoteItem | null = insertIdx < others.length ? others[insertIdx] : null;
      const prevOrder = prev ? (prev.order || 0) : null;
      const nextOrder = next ? (next.order || 0) : null;
      const allZero = others.every((n) => (n.order || 0) === 0);
      const tooClose = prevOrder !== null && nextOrder !== null && prevOrder - nextOrder < 2;
      const GAP = 1000000;
      if (allZero || tooClose) {
        const base = Date.now();
        const flow: (NoteItem | null)[] = others.slice();
        flow.splice(insertIdx, 0, null);
        let dragOrder = base;
        const writes: Promise<any>[] = [];
        for (let i = 0; i < flow.length; i++) {
          const val = base - i * GAP;
          const item = flow[i];
          if (item === null) {
            dragOrder = val;
          } else {
            writes.push(joplin.data.put(['notes', item.id], null, { order: val }));
          }
        }
        await Promise.all(writes);
        await joplin.data.put(['notes', dragId], null, { parent_id: targetFolderId, order: dragOrder });
        return;
      }
      let newOrder: number;
      if (prevOrder !== null && nextOrder !== null) {
        newOrder = (prevOrder + nextOrder) / 2;
      } else if (prevOrder !== null) {
        newOrder = prevOrder - GAP;
      } else if (nextOrder !== null) {
        newOrder = nextOrder + GAP;
      } else {
        newOrder = Date.now();
      }
      await joplin.data.put(['notes', dragId], null, { parent_id: targetFolderId, order: newOrder });
    }

    // Reorder a folder to a slot above/below a sibling. Mirrors
    // reorderNoteToPosition but operates on the folders that share the target's
    // parent, and persists order into the folderOrder setting (folders have no
    // `order` column). A cycle guard prevents nesting a folder in its own subtree.
    async function reorderFolderToPosition(dragId: string, targetFolderId: string, position: 'above' | 'below'): Promise<void> {
      const targetFolder = folderById[targetFolderId];
      const dragFolder = folderById[dragId];
      if (!targetFolder || !dragFolder || dragId === targetFolderId) return;
      const parentId = targetFolder.parent_id || '';
      // Cycle guard: walk up from the destination parent; if we reach dragId,
      // the move would nest dragId inside its own descendant.
      let walk: string = parentId;
      while (walk) {
        if (walk === dragId) return;
        walk = (folderById[walk] && folderById[walk].parent_id) || '';
      }
      const siblings: FolderItem[] = allFoldersCache
        .filter((f) => (f.parent_id || '') === parentId && f.id !== dragId)
        .sort((a, b) => {
          const oa = a.order || 0;
          const ob = b.order || 0;
          if (oa !== ob) return ob - oa;
          return (a.title || '').localeCompare(b.title || '');
        });
      const targetIdx = siblings.findIndex((f) => f.id === targetFolderId);
      const insertIdx = targetIdx < 0 ? siblings.length : (position === 'above' ? targetIdx : targetIdx + 1);
      const prev: FolderItem | null = insertIdx > 0 ? siblings[insertIdx - 1] : null;
      const next: FolderItem | null = insertIdx < siblings.length ? siblings[insertIdx] : null;
      const prevOrder = prev ? (prev.order || 0) : null;
      const nextOrder = next ? (next.order || 0) : null;
      const allZero = siblings.every((f) => (f.order || 0) === 0);
      const tooClose = prevOrder !== null && nextOrder !== null && prevOrder - nextOrder < 2;
      const GAP = 1000000;
      // Reparent through the API (parent_id is a real column); persist the
      // order values into our own folderOrder setting.
      const needsReparent = (dragFolder.parent_id || '') !== parentId;
      if (needsReparent) {
        await joplin.data.put(['folders', dragId], null, { parent_id: parentId });
      }
      if (allZero || tooClose) {
        const base = Date.now();
        const flow: (FolderItem | null)[] = siblings.slice();
        flow.splice(insertIdx, 0, null);
        for (let i = 0; i < flow.length; i++) {
          const val = base - i * GAP;
          const item = flow[i];
          if (item === null) {
            folderOrder[dragId] = val;
          } else {
            folderOrder[item.id] = val;
          }
        }
        await saveFolderOrder();
        return;
      }
      let newOrder: number;
      if (prevOrder !== null && nextOrder !== null) {
        newOrder = (prevOrder + nextOrder) / 2;
      } else if (prevOrder !== null) {
        newOrder = prevOrder - GAP;
      } else if (nextOrder !== null) {
        newOrder = nextOrder + GAP;
      } else {
        newOrder = Date.now();
      }
      folderOrder[dragId] = newOrder;
      await saveFolderOrder();
    }

    async function handleDragDrop(msg: any): Promise<void> {

        try {
          const dragId = msg.dragId;
          const dragType = msg.dragType;
          const targetId = msg.targetId;
          const position = msg.position; // 'into', 'above', 'below'

          if (dragType === 'note') {
            const targetIsFolder = !!folderById[targetId];
            if (targetIsFolder) {
              // Dropping a note anywhere on a folder means "move into it"
              // (above/below on a folder edge is treated the same, so a note
              // dropped near a folder's border still lands inside it).
              await joplin.data.put(['notes', dragId], null, { parent_id: targetId });
            } else {
              // Target is a note. Only reorder to an exact slot when the panel
              // is actually in manual sort - otherwise the sort decides the
              // position and we just move the note into the target's folder.
              // The gate lives here (not in the webview) so a stale/missing
              // data-sort attribute can't silently drop us into a plain move
              // that bumps updated_time and makes the note jump to the top.
              const targetNote = await joplin.data.get(['notes', targetId], { fields: ['parent_id'] });
              if (currentSort === 'manual' && (position === 'above' || position === 'below')) {
                await reorderNoteToPosition(dragId, targetId, position);
              } else {
                await joplin.data.put(['notes', dragId], null, { parent_id: targetNote.parent_id });
              }
            }
          } else if (dragType === 'folder') {
            const targetIsFolder = !!folderById[targetId];
            if (position === 'into') {
              if (targetIsFolder && dragId !== targetId) {
                await joplin.data.put(['folders', dragId], null, { parent_id: targetId });
              }
            } else if (targetIsFolder && (position === 'above' || position === 'below')) {
              // Reorder among the target's siblings (and reparent if the target
              // lives under a different parent). Folder order is honoured in
              // every sort mode since folders have no time/title sort here.
              await reorderFolderToPosition(dragId, targetId, position);
            }
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: drag drop error', err);
        }
    }

    await joplin.views.panels.onMessage(panel, async (msg: any) => {
      if (msg.name === 'openNote') {
        selectedNoteId = msg.id;
        await joplin.commands.execute('openNote', msg.id);
      } else if (msg.name === 'refresh') {
        await refreshPanel();
      } else if (msg.name === 'toggleFolder') {
        // State bookkeeping only - the webview already toggled the DOM
        // locally. Re-rendering here would refetch everything and reset
        // the scroll position for a simple collapse click.
        if (collapsedFolders[msg.id]) { delete collapsedFolders[msg.id]; }
        else { collapsedFolders[msg.id] = true; }
        saveUiState();
      } else if (msg.name === 'collapseAll') {
        // The webview already collapsed every folder in the DOM locally.
        // We must NOT refreshPanel here: Joplin's setHtml de-dupes identical
        // content, so after a manual (DOM-only) expand the re-rendered
        // "all collapsed" HTML equals the last one sent and the update is
        // silently skipped - making the collapse button appear dead. So we
        // only record state for the next real refresh (mirrors toggleFolder).
        for (const f of allFoldersCache) collapsedFolders[f.id] = true;
        if (Array.isArray(msg.prevCollapsed)) collapseSnapshot = msg.prevCollapsed.map(String);
        saveUiState();
      } else if (msg.name === 'expandAll') {
        // Record-only, like collapseAll. Skeleton expand: the webview keeps
        // leaf folders collapsed and reports them back.
        collapsedFolders = {};
        if (Array.isArray(msg.collapsedIds)) {
          for (const cid of msg.collapsedIds) collapsedFolders[String(cid)] = true;
        }
        saveUiState();
      } else if (msg.name === 'refreshView') {
        await refreshPanel();
      } else if (msg.name === 'newNotebook') {
        const folderName = await showNativeInput(t.promptNewNotebookName, '');
        if (!folderName || !folderName.trim()) return;
        const newFolder = await joplin.data.post(['folders'], null, { title: folderName.trim() });
        delete collapsedFolders[newFolder.id];
        await refreshPanel();
        await joplin.views.panels.postMessage(panel, { name: 'scrollToFolder', folderId: newFolder.id });
      } else if (msg.name === 'newNote') {
        await joplin.commands.execute('newNote');
        const nn = await joplin.workspace.selectedNote();
        if (nn) { selectedNoteId = nn.id; expandToFolder(nn.parent_id); }
        await refreshPanel();
      } else if (msg.name === 'newTodo') {
        await joplin.commands.execute('newTodo');
        const nt = await joplin.workspace.selectedNote();
        if (nt) { selectedNoteId = nt.id; expandToFolder(nt.parent_id); }
        await refreshPanel();
      } else if (msg.name === 'search') {
        await handleSearch(msg);
      } else if (msg.name === 'loadTagNotes') {
        // User clicked a tag in search results -> load its notes
        try {
          const tagId = msg.tagId;
          let notes: any[] = [];
          let p = 1;
          let more = true;
          while (more && notes.length < 100) {
            const r = await joplin.data.get(['tags', tagId, 'notes'], {
              fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed'],
              page: p, limit: 50,
            });
            notes = notes.concat(r.items);
            more = r.has_more;
            p++;
          }
          const folderNameMap: { [id: string]: string } = {};
          for (const f of allFoldersCache) folderNameMap[f.id] = f.title;
          const items = notes.map((n: any) => ({
            id: n.id,
            title: n.title || '(untitled)',
            is_todo: n.is_todo,
            todo_completed: n.todo_completed,
            snippet: '',
            folderName: folderNameMap[n.parent_id] || '',
          }));
          await joplin.views.panels.postMessage(panel, { name: 'tagNotes', tagId, notes: items });
        } catch (err) {
          console.error('Joplin Explorer: loadTagNotes error', err);
        }
      } else if (msg.name === 'toggleTagsSection') {
        // State bookkeeping only - the webview toggled the DOM locally.
        tagsCollapsed = !tagsCollapsed;
        saveUiState();
      } else if (msg.name === 'tagFolderNotes') {
        try {
          const notes = await fetchTagNotes(msg.tagId);
          await joplin.views.panels.postMessage(panel, { name: 'tagFolderNotes', tagId: msg.tagId, notes });
        } catch (err) {
          console.error('Joplin Explorer: tagFolderNotes error', err);
        }
      } else if (msg.name === 'tagNoteAdd') {
        // Note dropped onto a tag folder - assign the tag, then push the
        // fresh note list so an expanded tag updates in place.
        try {
          await joplin.data.post(['tags', msg.tagId, 'notes'], null, { id: msg.noteId });
          const notes = await fetchTagNotes(msg.tagId);
          await joplin.views.panels.postMessage(panel, { name: 'tagFolderNotes', tagId: msg.tagId, notes });
        } catch (err) {
          console.error('Joplin Explorer: tagNoteAdd error', err);
        }
      } else if (msg.name === 'toggleTrashSection') {
        // State bookkeeping only - the webview toggled the DOM locally.
        trashCollapsed = !trashCollapsed;
        saveUiState();
      } else if (msg.name === 'trashNotes') {
        try {
          await joplin.views.panels.postMessage(panel, { name: 'trashNotes', notes: await fetchTrashNotes() });
        } catch (err) {
          console.error('Joplin Explorer: trashNotes error', err);
        }
      } else if (msg.name === 'locateFolder') {
        // User clicked a folder in search results -> expand to it in tree
        try {
          expandToFolder(msg.folderId);
          await refreshPanel();
          // Exit search mode and scroll to the target folder
          await joplin.views.panels.postMessage(panel, {
            name: 'exitSearchAndLocate',
            folderId: msg.folderId,
          });
        } catch (err) {
          console.error('Joplin Explorer: locateFolder error', err);
        }
      } else if (msg.name === 'locatePinnedFolder') {
        try {
          expandToFolder(msg.folderId);
          await refreshPanel();
          await joplin.views.panels.postMessage(panel, {
            name: 'scrollToFolder',
            folderId: msg.folderId,
          });
        } catch (err) {
          console.error('Joplin Explorer: locatePinnedFolder error', err);
        }
      } else if (msg.name === 'reorderPinned') {
        try {
          const dragId = msg.dragId;
          const targetId = msg.targetId;
          const position = msg.position; // 'before' or 'after'
          const dragIdx = pinnedItems.findIndex(p => p.id === dragId);
          if (dragIdx < 0) return;
          const item = pinnedItems[dragIdx];
          pinnedItems.splice(dragIdx, 1);
          let targetIdx = pinnedItems.findIndex(p => p.id === targetId);
          if (targetIdx < 0) { pinnedItems.push(item); } else {
            if (position === 'after') targetIdx++;
            pinnedItems.splice(targetIdx, 0, item);
          }
          await savePinned();
          await refreshPanel();
        } catch (err) {
          console.error('Joplin Explorer: reorderPinned error', err);
        }
      } else if (msg.name === 'togglePinnedCollapse') {
        // State bookkeeping only - the webview toggled the DOM locally.
        pinnedCollapsed = !pinnedCollapsed;
        saveUiState();
      } else if (msg.name === 'cycleSort') {
        const sortModes = ['updated_desc', 'updated_asc', 'title_asc', 'title_desc', 'manual'];
        const idx = sortModes.indexOf(currentSort);
        currentSort = sortModes[(idx + 1) % sortModes.length];
        try { await joplin.settings.setValue('noteSortMode', currentSort); } catch (_) { /* non-fatal */ }
        await refreshPanel();
      } else if (msg.name === 'sync') {
        try {
          await joplin.commands.execute('synchronize');
        } catch (e: any) {
          console.error('Joplin Explorer: sync command failed', e);
          await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'error' });
          const msgBody = (e && e.message) ? String(e.message) : String(e);
          await showNativeInfo(t.syncFailed, msgBody);
        }
      } else if (msg.name === 'contextMenu') {
        await handleContextMenu(msg);
      } else if (msg.name === 'dragDrop') {
        await handleDragDrop(msg);
      } else if (msg.name === 'dragToEmpty') {
        try {
          const dragId = msg.dragId;
          const dragType = msg.dragType;
          const name = await showNativeInput(t.promptNewNotebookName, '');
          if (!name || !name.trim()) return;
          const newFolder = await joplin.data.post(['folders'], null, { title: name.trim() });
          if (dragType === 'note') {
            await joplin.data.put(['notes', dragId], null, { parent_id: newFolder.id });
          } else if (dragType === 'folder') {
            if (dragId !== newFolder.id) {
              await joplin.data.put(['folders', dragId], null, { parent_id: newFolder.id });
            }
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: drag to empty error', err);
        }
      }
    });

    /* ---------- auto refresh via the data API change-events feed ---------- */
    // GET /events returns item changes since a cursor (verified against the
    // Joplin source: rest/routes/events.ts). Much cheaper and more precise
    // than re-querying: no changes means an empty round-trip every 5s.
    let eventsCursor = '';
    let eventsTimer: any = null;

    async function pollEvents(): Promise<void> {
      try {
        if (!eventsCursor) {
          const init = await joplin.data.get(['events']);
          eventsCursor = String(init.cursor || '');
          return;
        }
        let relevant = false;
        let guard = 0;
        while (guard++ < 20) {
          const r = await joplin.data.get(['events'], { cursor: eventsCursor });
          for (const ch of (r.items || [])) {
            // Skip pure updates of the selected note - that's the editor's
            // autosave, and the panel already tracks it via onNoteChange.
            if (Number(ch.type) === 2 && ch.item_id === selectedNoteId) continue;
            relevant = true;
          }
          if (r.cursor) eventsCursor = String(r.cursor);
          if (!r.has_more) break;
        }
        if (relevant) scheduleRefreshPanel(300);
      } catch (err) {
        // Events API unavailable (older Joplin) - disable quietly.
        if (eventsTimer) { clearInterval(eventsTimer); eventsTimer = null; }
        console.warn('Joplin Explorer: change-events polling disabled', err);
      }
    }

    async function applyAutoRefreshSetting(): Promise<void> {
      const on = (await joplin.settings.value('autoRefresh')) !== false;
      if (eventsTimer) { clearInterval(eventsTimer); eventsTimer = null; }
      if (on) {
        eventsCursor = '';
        await pollEvents(); // grab the initial cursor right away
        eventsTimer = setInterval(pollEvents, 5000);
      }
    }
    await applyAutoRefreshSetting();

    await joplin.workspace.onNoteSelectionChange(async () => {
      const note = await joplin.workspace.selectedNote();
      if (note && note.id !== selectedNoteId) {
        selectedNoteId = note.id;
        await joplin.views.panels.postMessage(panel, { name: 'selectNote', id: note.id });
      }
    });

    await joplin.workspace.onNoteChange(async (event: any) => {
      if (event && event.id) scheduleNoteUpdate(event.id);
      else scheduleRefreshPanel();
    });

    try {
      await joplin.workspace.onSyncStart(async () => {
        await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'syncing' });
      });
    } catch (err) {
      console.warn('Joplin Explorer: onSyncStart not available', err);
    }

    try {
      await joplin.workspace.onSyncComplete(async (event: any) => {
        const withErrors = !!(event && event.withErrors);
        await refreshPanel();
        await joplin.views.panels.postMessage(panel, {
          name: 'syncState',
          state: withErrors ? 'error' : 'done',
        });
        if (withErrors) {
          await showNativeInfo(t.syncFailed,
            'Joplin reported errors during synchronisation. Open the Synchronisation Status screen (Tools → Synchronisation Status) to see the details.');
        }
      });
    } catch (err) {
      console.warn('Joplin Explorer: onSyncComplete not available', err);
    }

    await refreshPanel();
  },
});

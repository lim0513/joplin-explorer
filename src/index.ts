// Joplin plugin runtime provides `joplin` as a global variable at runtime.
// We intentionally do NOT `import joplin from 'api'` because webpack would
// emit `require("api")`, which the Joplin plugin loader does not resolve
// (see plugin_index.html "Cannot find module 'api'" error).
declare const joplin: any;

/* ======================== Types ======================== */
interface FolderItem {
  id: string;
  title: string;
  parent_id: string;
  icon?: string;
}

interface NoteItem {
  id: string;
  title: string;
  parent_id: string;
  is_todo: number;
  todo_completed: number;
  updated_time: number;
  user_updated_time: number;
}

interface TreeNode {
  type: 'folder' | 'note';
  id: string;
  title: string;
  parent_id?: string;
  icon?: string;
  is_todo?: number;
  todo_completed?: number;
  note_count?: number;
  total_count?: number;
  children?: TreeNode[];
}

interface I18nStrings { [key: string]: string; }

/* ======================== i18n ======================== */
const i18nData: { [locale: string]: I18nStrings } = {
  'zh_CN': {
    newNotebook: '新建笔记本', newNote: '新建笔记', newTodo: '新建待办',
    sort: '排序', collapseAll: '全部折叠', expandAll: '全部展开',
    search: '搜索笔记内容...', searchResultCount: '找到 {count} 条结果',
    searchNoResult: '没有找到匹配的笔记', searching: '搜索中...',
    sync: '同步', syncing: '同步中...', syncDone: '\u2714 同步完成', loading: '加载中...',
    sortUpdatedDesc: '\u2193 修改时间', sortUpdatedAsc: '\u2191 修改时间',
    sortTitleAsc: '\u2191 标题', sortTitleDesc: '\u2193 标题',
    ctxNewNoteHere: '在此新建笔记', ctxNewTodoHere: '在此新建待办',
    ctxNewSubNotebook: '新建子笔记本', ctxRenameFolder: '重命名',
    ctxExportFolder: '导出笔记本', ctxDeleteFolder: '删除笔记本',
    ctxOpenNote: '打开笔记', ctxOpenInNewWindow: '在新窗口中打开',
    ctxCopyLink: '复制 Markdown 链接', ctxDuplicateNote: '复制副本',
    ctxSwitchNoteType: '笔记/待办 切换', ctxToggleTodo: '切换完成状态',
    ctxRenameNote: '重命名', ctxMoveNote: '移动到笔记本...',
    ctxNoteInfo: '笔记属性', ctxDeleteNote: '删除笔记',
    confirmDeleteFolder: '确定删除此笔记本及其所有内容吗？',
    confirmDeleteNote: '确定删除此笔记吗？',
    promptRename: '请输入新名称：',
    promptMoveNote: '请输入目标笔记本名称：',
    promptNewNotebookName: '请输入新笔记本名称：',
    dropCreateNotebook: '释放以创建新笔记本',
    searchSectionNotes: '笔记',
    searchSectionTags: '标签',
    searchSectionFolders: '笔记本',
    searchTagNoteCount: '{count} 条笔记',
    cancel: '取消',
  },
  'zh_TW': {
    newNotebook: '新建筆記本', newNote: '新建筆記', newTodo: '新建待辦',
    sort: '排序', collapseAll: '全部摺疊', expandAll: '全部展開',
    search: '搜尋筆記內容...', searchResultCount: '找到 {count} 條結果',
    searchNoResult: '沒有找到匹配的筆記', searching: '搜尋中...',
    sync: '同步', syncing: '同步中...', syncDone: '\u2714 同步完成', loading: '載入中...',
    sortUpdatedDesc: '\u2193 修改時間', sortUpdatedAsc: '\u2191 修改時間',
    sortTitleAsc: '\u2191 標題', sortTitleDesc: '\u2193 標題',
    ctxNewNoteHere: '在此新建筆記', ctxNewTodoHere: '在此新建待辦',
    ctxNewSubNotebook: '新建子筆記本', ctxRenameFolder: '重新命名',
    ctxExportFolder: '匯出筆記本', ctxDeleteFolder: '刪除筆記本',
    ctxOpenNote: '開啟筆記', ctxOpenInNewWindow: '在新視窗中開啟',
    ctxCopyLink: '複製 Markdown 連結', ctxDuplicateNote: '複製副本',
    ctxSwitchNoteType: '筆記/待辦 切換', ctxToggleTodo: '切換完成狀態',
    ctxRenameNote: '重新命名', ctxMoveNote: '移動到筆記本...',
    ctxNoteInfo: '筆記屬性', ctxDeleteNote: '刪除筆記',
    confirmDeleteFolder: '確定刪除此筆記本及其所有內容嗎？',
    confirmDeleteNote: '確定刪除此筆記嗎？',
    promptRename: '請輸入新名稱：', promptMoveNote: '請輸入目標筆記本名稱：',
    promptNewNotebookName: '請輸入新筆記本名稱：',
    dropCreateNotebook: '釋放以建立新筆記本',
    searchSectionNotes: '筆記',
    searchSectionTags: '標籤',
    searchSectionFolders: '筆記本',
    searchTagNoteCount: '{count} 條筆記',
    cancel: '取消',
  },
  'en_US': {
    newNotebook: 'New Notebook', newNote: 'New Note', newTodo: 'New To-do',
    sort: 'Sort', collapseAll: 'Collapse All', expandAll: 'Expand All',
    search: 'Search note contents...', searchResultCount: '{count} results found',
    searchNoResult: 'No matching notes found', searching: 'Searching...',
    sync: 'Synchronise', syncing: 'Syncing...', syncDone: '\u2714 Sync Done', loading: 'Loading...',
    sortUpdatedDesc: '\u2193 Updated', sortUpdatedAsc: '\u2191 Updated',
    sortTitleAsc: '\u2191 Title', sortTitleDesc: '\u2193 Title',
    ctxNewNoteHere: 'New Note Here', ctxNewTodoHere: 'New To-do Here',
    ctxNewSubNotebook: 'New Sub-notebook', ctxRenameFolder: 'Rename',
    ctxExportFolder: 'Export Notebook', ctxDeleteFolder: 'Delete Notebook',
    ctxOpenNote: 'Open Note', ctxOpenInNewWindow: 'Open in New Window',
    ctxCopyLink: 'Copy Markdown Link', ctxDuplicateNote: 'Duplicate',
    ctxSwitchNoteType: 'Switch Note/To-do', ctxToggleTodo: 'Toggle Completed',
    ctxRenameNote: 'Rename', ctxMoveNote: 'Move to Notebook...',
    ctxNoteInfo: 'Note Properties', ctxDeleteNote: 'Delete Note',
    confirmDeleteFolder: 'Delete this notebook and all its contents?',
    confirmDeleteNote: 'Delete this note?',
    promptRename: 'Enter new name:', promptMoveNote: 'Enter target notebook name:',
    promptNewNotebookName: 'Enter new notebook name:',
    dropCreateNotebook: 'Release to create a new notebook',
    searchSectionNotes: 'Notes',
    searchSectionTags: 'Tags',
    searchSectionFolders: 'Notebooks',
    searchTagNoteCount: '{count} notes',
    cancel: 'Cancel',
  },
  'ja_JP': {
    newNotebook: '新規ノートブック', newNote: '新規ノート', newTodo: '新規タスク',
    sort: '並べ替え', collapseAll: 'すべて折りたたむ', expandAll: 'すべて展開',
    search: 'ノート内容を検索...', searchResultCount: '{count} 件の結果',
    searchNoResult: '一致するノートが見つかりません', searching: '検索中...',
    sync: '同期', syncing: '同期中...', syncDone: '✔ 同期完了', loading: '読み込み中...',
    sortUpdatedDesc: '↓ 更新日時', sortUpdatedAsc: '↑ 更新日時',
    sortTitleAsc: '↑ タイトル', sortTitleDesc: '↓ タイトル',
    ctxNewNoteHere: 'ここに新規ノート', ctxNewTodoHere: 'ここに新規タスク',
    ctxNewSubNotebook: '新規サブノートブック', ctxRenameFolder: '名前を変更',
    ctxExportFolder: 'ノートブックをエクスポート', ctxDeleteFolder: 'ノートブックを削除',
    ctxOpenNote: 'ノートを開く', ctxOpenInNewWindow: '新しいウィンドウで開く',
    ctxCopyLink: 'Markdownリンクをコピー', ctxDuplicateNote: '複製',
    ctxSwitchNoteType: 'ノート/タスク切り替え', ctxToggleTodo: '完了状態を切り替え',
    ctxRenameNote: '名前を変更', ctxMoveNote: 'ノートブックに移動...',
    ctxNoteInfo: 'ノートプロパティ', ctxDeleteNote: 'ノートを削除',
    confirmDeleteFolder: 'このノートブックとその内容をすべて削除しますか？',
    confirmDeleteNote: 'このノートを削除しますか？',
    promptRename: '新しい名前を入力：', promptMoveNote: '移動先のノートブック名：',
    promptNewNotebookName: '新しいノートブック名を入力：',
    dropCreateNotebook: 'ドロップして新規ノートブックを作成',
    searchSectionNotes: 'ノート',
    searchSectionTags: 'タグ',
    searchSectionFolders: 'ノートブック',
    searchTagNoteCount: '{count} 件のノート',
    cancel: 'キャンセル',
  },
};

function getI18n(locale: string): I18nStrings {
  return i18nData[locale] || i18nData[locale.split('_')[0]] || i18nData['en_US'];
}

/* ======================== Data helpers ======================== */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

async function getNotesInFolder(folderId: string): Promise<NoteItem[]> {
  let notes: NoteItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await joplin.data.get(['folders', folderId, 'notes'], {
      fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time', 'user_updated_time'],
      page, limit: 100,
      order_by: 'user_updated_time', order_dir: 'DESC',
    });
    notes = notes.concat(result.items);
    hasMore = result.has_more;
    page++;
  }
  return notes;
}

function buildTree(folders: FolderItem[], notesByFolder: { [id: string]: NoteItem[] }): TreeNode[] {
  const folderMap: { [id: string]: TreeNode } = {};
  for (const f of folders) {
    folderMap[f.id] = {
      type: 'folder', id: f.id, title: f.title,
      parent_id: f.parent_id, icon: f.icon, note_count: 0, children: [],
    };
  }
  for (const fid of Object.keys(notesByFolder)) {
    const folder = folderMap[fid];
    if (folder) {
      const notes = notesByFolder[fid];
      folder.note_count = notes.length;
      for (const n of notes) {
        folder.children!.push({
          type: 'note', id: n.id, title: n.title || '(untitled)',
          is_todo: n.is_todo, todo_completed: n.todo_completed,
        });
      }
    }
  }
  const roots: TreeNode[] = [];
  for (const f of folders) {
    const node = folderMap[f.id];
    if (f.parent_id && folderMap[f.parent_id]) {
      folderMap[f.parent_id].children!.unshift(node);
    } else {
      roots.push(node);
    }
  }

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

function getFolderIcon(node: TreeNode): string {
  let iconData: any = node.icon;
  if (iconData && typeof iconData === 'string') {
    try { iconData = JSON.parse(iconData); } catch (e) { iconData = null; }
  }
  if (iconData && iconData.emoji) return iconData.emoji;
  return '\uD83D\uDCC2';
}

function renderTreeHtml(nodes: TreeNode[], selectedNoteId: string, collapsedSet: { [id: string]: boolean }, level = 0): string {
  let html = '';
  for (const node of nodes) {
    const indent = level * 18;
    if (node.type === 'folder') {
      const count = node.total_count || node.note_count || 0;
      const isCollapsed = collapsedSet[node.id];
      const arrowChar = isCollapsed ? '\u25B6' : '\u25BC';
      const toggleClass = isCollapsed ? 'toggle' : 'toggle expanded';
      html += '<div class="tree-item folder" style="padding-left:' + indent + 'px" data-id="' + node.id + '" data-type="folder">';
      html += '<span class="' + toggleClass + '">' + arrowChar + '</span>';
      html += '<span class="icon folder-icon">' + getFolderIcon(node) + '</span>';
      html += '<span class="label">' + escapeHtml(node.title) + '</span>';
      html += '<span class="count">' + count + '</span>';
      html += '</div>';
      html += '<div class="children' + (isCollapsed ? ' collapsed' : '') + '" data-folder-id="' + node.id + '">';
      if (node.children) {
        html += renderTreeHtml(node.children, selectedNoteId, collapsedSet, level + 1);
      }
      html += '</div>';
    } else {
      const selected = node.id === selectedNoteId ? ' selected' : '';
      let icon = '\uD83D\uDCDD';
      if (node.is_todo) {
        icon = node.todo_completed ? '\u2611' : '\u2610';
      }
      html += '<div class="tree-item note' + selected + '" style="padding-left:' + indent + 'px" data-id="' + node.id + '" data-type="note">';
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
    let allFoldersCache: FolderItem[] = [];
    let allNotesCache: NoteItem[] = [];
    let isFirstLoad = true;

    function expandToFolder(folderId: string): void {
      let parentId: string | null = folderId;
      while (parentId) {
        delete collapsedFolders[parentId];
        let found: FolderItem | null = null;
        for (const f of allFoldersCache) {
          if (f.id === parentId) { found = f; break; }
        }
        parentId = found ? found.parent_id : null;
      }
    }

    async function refreshPanel(): Promise<void> {
      try {
        const folders = await getAllFolders();
        allFoldersCache = folders;

        if (isFirstLoad) {
          for (const f of folders) collapsedFolders[f.id] = true;
          const currentNote = await joplin.workspace.selectedNote();
          if (currentNote) {
            selectedNoteId = currentNote.id;
            let parentId: string | null = currentNote.parent_id;
            while (parentId) {
              delete collapsedFolders[parentId];
              let parentFolder: FolderItem | null = null;
              for (const f of folders) {
                if (f.id === parentId) { parentFolder = f; break; }
              }
              parentId = parentFolder ? parentFolder.parent_id : null;
            }
          }
          isFirstLoad = false;
        }

        const notesByFolder: { [id: string]: NoteItem[] } = {};
        const batchSize = 10;
        for (let i = 0; i < folders.length; i += batchSize) {
          const batch = folders.slice(i, i + batchSize);
          const results = await Promise.all(batch.map((f) => getNotesInFolder(f.id)));
          for (let j = 0; j < batch.length; j++) {
            notesByFolder[batch[j].id] = sortNotes(results[j], currentSort);
          }
        }

        // Flatten all notes into a cache for local substring search
        const allNotes: NoteItem[] = [];
        for (const fid of Object.keys(notesByFolder)) {
          for (const n of notesByFolder[fid]) allNotes.push(n);
        }
        allNotesCache = allNotes;

        const tree = buildTree(folders, notesByFolder);
        const treeHtml = renderTreeHtml(tree, selectedNoteId, collapsedFolders);

        const sortLabels: { [k: string]: string } = {
          'updated_desc': t.sortUpdatedDesc, 'updated_asc': t.sortUpdatedAsc,
          'title_asc': t.sortTitleAsc, 'title_desc': t.sortTitleDesc,
        };

        const i18nJson = escapeHtml(JSON.stringify(t));

        const html = '<div id="notes-in-list-root" data-i18n="' + i18nJson + '">'
          + '  <div class="toolbar">'
          + '    <button id="btn-new-notebook" title="' + t.newNotebook + '">\uD83D\uDCC1+</button>'
          + '    <button id="btn-new-note" title="' + t.newNote + '">\uD83D\uDCDD+</button>'
          + '    <button id="btn-new-todo" title="' + t.newTodo + '">\u2610+</button>'
          + '    <button id="btn-sort" title="' + t.sort + '">' + sortLabels[currentSort] + '</button>'
          + '    <button id="btn-collapse-all" title="' + t.collapseAll + '">\u25B2</button>'
          + '  </div>'
          + '  <div class="search-bar">'
          + '    <input id="search-input" type="text" placeholder="\uD83D\uDD0D ' + t.search + '" />'
          + '  </div>'
          + '  <div id="tree-container">' + treeHtml + '</div>'
          + '  <div id="empty-drop-hint">' + t.dropCreateNotebook + '</div>'
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

    await joplin.views.panels.onMessage(panel, async (msg: any) => {
      if (msg.name === 'openNote') {
        selectedNoteId = msg.id;
        await joplin.commands.execute('openNote', msg.id);
      } else if (msg.name === 'refresh') {
        await refreshPanel();
      } else if (msg.name === 'toggleFolder') {
        if (collapsedFolders[msg.id]) { delete collapsedFolders[msg.id]; }
        else { collapsedFolders[msg.id] = true; }
        await refreshPanel();
      } else if (msg.name === 'collapseAll') {
        const folders = await getAllFolders();
        for (const f of folders) collapsedFolders[f.id] = true;
        await refreshPanel();
      } else if (msg.name === 'expandAll') {
        collapsedFolders = {};
        await refreshPanel();
      } else if (msg.name === 'newNotebook') {
        await joplin.commands.execute('newFolder');
        await refreshPanel();
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
              // Count notes for this tag
              let noteCount = 0;
              try {
                const r = await joplin.data.get(['tags', tag.id, 'notes'], { fields: ['id'], limit: 1 });
                noteCount = r.items.length + (r.has_more ? '+' as any : 0);
                // Get accurate count
                if (r.has_more) {
                  let cnt = r.items.length;
                  let p = 2;
                  let more = true;
                  while (more) {
                    const r2 = await joplin.data.get(['tags', tag.id, 'notes'], { fields: ['id'], page: p, limit: 100 });
                    cnt += r2.items.length;
                    more = r2.has_more;
                    p++;
                  }
                  noteCount = cnt;
                }
              } catch (_) {}
              tagItems.push({ id: tag.id, title: tag.title, noteCount });
            }
          }

          // ---- Folders: local substring search ----
          const folderItems = [] as any[];
          for (const f of allFoldersCache) {
            if ((f.title || '').toLowerCase().indexOf(lowerQuery) >= 0) {
              folderItems.push({ id: f.id, title: f.title, parent_id: f.parent_id, icon: f.icon });
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
      } else if (msg.name === 'cycleSort') {
        const sortModes = ['updated_desc', 'updated_asc', 'title_asc', 'title_desc'];
        const idx = sortModes.indexOf(currentSort);
        currentSort = sortModes[(idx + 1) % sortModes.length];
        await refreshPanel();
      } else if (msg.name === 'sync') {
        await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'syncing' });
        try {
          await joplin.commands.execute('synchronize');
        } catch (e) {
          console.error('Joplin Explorer: sync error', e);
        }
        await new Promise((r) => setTimeout(r, 3000));
        await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'done' });
        await refreshPanel();
      } else if (msg.name === 'contextMenu') {
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
                  await joplin.data.post(['folders'], null, { title: subName.trim(), parent_id: id });
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
                let pTitle = '';
                for (const f of allFoldersCache) {
                  if (f.id === info.parent_id) { pTitle = f.title; break; }
                }
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
            }
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: context menu error', err);
        }
      } else if (msg.name === 'dragDrop') {
        try {
          const dragId = msg.dragId;
          const dragType = msg.dragType;
          const targetId = msg.targetId;
          const position = msg.position; // 'into', 'above', 'below'

          if (dragType === 'note') {
            if (position === 'into') {
              let targetFolderId = targetId;
              let isFolder = false;
              for (const f of allFoldersCache) {
                if (f.id === targetId) { isFolder = true; break; }
              }
              if (!isFolder) {
                const targetNote = await joplin.data.get(['notes', targetId], { fields: ['parent_id'] });
                targetFolderId = targetNote.parent_id;
              }
              await joplin.data.put(['notes', dragId], null, { parent_id: targetFolderId });
            }
          } else if (dragType === 'folder') {
            if (position === 'into') {
              if (dragId !== targetId) {
                await joplin.data.put(['folders', dragId], null, { parent_id: targetId });
              }
            } else {
              let targetFolder: FolderItem | null = null;
              for (const f of allFoldersCache) {
                if (f.id === targetId) { targetFolder = f; break; }
              }
              if (targetFolder) {
                await joplin.data.put(['folders', dragId], null, { parent_id: targetFolder.parent_id || '' });
              }
            }
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: drag drop error', err);
        }
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

    await joplin.workspace.onNoteSelectionChange(async () => {
      const note = await joplin.workspace.selectedNote();
      if (note && note.id !== selectedNoteId) {
        selectedNoteId = note.id;
        await joplin.views.panels.postMessage(panel, { name: 'selectNote', id: note.id });
      }
    });

    await refreshPanel();
  },
});

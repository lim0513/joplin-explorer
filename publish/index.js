/* Notes In List Plugin - notebooks and notes in a single tree view */

/* ======================== i18n ======================== */
var i18nData = {
  'zh_CN': {
    newNotebook: '新建笔记本', newNote: '新建笔记', newTodo: '新建待办',
    sort: '排序', collapseAll: '全部折叠', expandAll: '全部展开',
    search: '搜索笔记内容...', searchResultCount: '找到 {count} 条结果',
    searchNoResult: '没有找到匹配的笔记', searching: '搜索中...',
    sync: '同步', syncing: '同步中...', syncDone: '\u2714 同步完成', loading: '加载中...',
    sortUpdatedDesc: '\u2193 修改时间', sortUpdatedAsc: '\u2191 修改时间',
    sortTitleAsc: '\u2191 标题', sortTitleDesc: '\u2193 标题',
    // Folder context menu
    ctxNewNoteHere: '在此新建笔记', ctxNewTodoHere: '在此新建待办',
    ctxNewSubNotebook: '新建子笔记本', ctxRenameFolder: '重命名',
    ctxExportFolder: '导出笔记本', ctxDeleteFolder: '删除笔记本',
    // Note context menu
    ctxOpenNote: '打开笔记', ctxOpenInNewWindow: '在新窗口中打开',
    ctxCopyLink: '复制 Markdown 链接', ctxDuplicateNote: '复制副本',
    ctxSwitchNoteType: '笔记/待办 切换', ctxToggleTodo: '切换完成状态',
    ctxRenameNote: '重命名', ctxMoveNote: '移动到笔记本...',
    ctxNoteInfo: '笔记属性', ctxDeleteNote: '删除笔记',
    // Confirm dialogs
    confirmDeleteFolder: '确定删除此笔记本及其所有内容吗？',
    confirmDeleteNote: '确定删除此笔记吗？',
    promptRename: '请输入新名称：',
    promptMoveNote: '请输入目标笔记本名称：',
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
    cancel: 'Cancel',
  },
  'ja_JP': {
    newNotebook: '\u65B0\u898F\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF', newNote: '\u65B0\u898F\u30CE\u30FC\u30C8', newTodo: '\u65B0\u898F\u30BF\u30B9\u30AF',
    sort: '\u4E26\u3079\u66FF\u3048', collapseAll: '\u3059\u3079\u3066\u6298\u308A\u305F\u305F\u3080', expandAll: '\u3059\u3079\u3066\u5C55\u958B',
    search: '\u30CE\u30FC\u30C8\u5185\u5BB9\u3092\u691C\u7D22...', searchResultCount: '{count} \u4EF6\u306E\u7D50\u679C',
    searchNoResult: '\u4E00\u81F4\u3059\u308B\u30CE\u30FC\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093', searching: '\u691C\u7D22\u4E2D...',
    sync: '\u540C\u671F', syncing: '\u540C\u671F\u4E2D...', syncDone: '\u2714 \u540C\u671F\u5B8C\u4E86', loading: '\u8AAD\u307F\u8FBC\u307F\u4E2D...',
    sortUpdatedDesc: '\u2193 \u66F4\u65B0\u65E5\u6642', sortUpdatedAsc: '\u2191 \u66F4\u65B0\u65E5\u6642',
    sortTitleAsc: '\u2191 \u30BF\u30A4\u30C8\u30EB', sortTitleDesc: '\u2193 \u30BF\u30A4\u30C8\u30EB',
    ctxNewNoteHere: '\u3053\u3053\u306B\u65B0\u898F\u30CE\u30FC\u30C8', ctxNewTodoHere: '\u3053\u3053\u306B\u65B0\u898F\u30BF\u30B9\u30AF',
    ctxNewSubNotebook: '\u65B0\u898F\u30B5\u30D6\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF', ctxRenameFolder: '\u540D\u524D\u3092\u5909\u66F4',
    ctxExportFolder: '\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8', ctxDeleteFolder: '\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF\u3092\u524A\u9664',
    ctxOpenNote: '\u30CE\u30FC\u30C8\u3092\u958B\u304F', ctxOpenInNewWindow: '\u65B0\u3057\u3044\u30A6\u30A3\u30F3\u30C9\u30A6\u3067\u958B\u304F',
    ctxCopyLink: 'Markdown\u30EA\u30F3\u30AF\u3092\u30B3\u30D4\u30FC', ctxDuplicateNote: '\u8907\u88FD',
    ctxSwitchNoteType: '\u30CE\u30FC\u30C8/\u30BF\u30B9\u30AF\u5207\u308A\u66FF\u3048', ctxToggleTodo: '\u5B8C\u4E86\u72B6\u614B\u3092\u5207\u308A\u66FF\u3048',
    ctxRenameNote: '\u540D\u524D\u3092\u5909\u66F4', ctxMoveNote: '\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF\u306B\u79FB\u52D5...',
    ctxNoteInfo: '\u30CE\u30FC\u30C8\u30D7\u30ED\u30D1\u30C6\u30A3', ctxDeleteNote: '\u30CE\u30FC\u30C8\u3092\u524A\u9664',
    confirmDeleteFolder: '\u3053\u306E\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF\u3068\u305D\u306E\u5185\u5BB9\u3092\u3059\u3079\u3066\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F',
    confirmDeleteNote: '\u3053\u306E\u30CE\u30FC\u30C8\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F',
    promptRename: '\u65B0\u3057\u3044\u540D\u524D\u3092\u5165\u529B\uFF1A', promptMoveNote: '\u79FB\u52D5\u5148\u306E\u30CE\u30FC\u30C8\u30D6\u30C3\u30AF\u540D\uFF1A',
    cancel: '\u30AD\u30E3\u30F3\u30BB\u30EB',
  },
};

function getI18n(locale) {
  return i18nData[locale] || i18nData[locale.split('_')[0]] || i18nData['en_US'];
}

/* ======================== Data helpers ======================== */
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function getAllFolders() {
  var folders = [];
  var page = 1;
  var hasMore = true;
  while (hasMore) {
    var result = await joplin.data.get(['folders'], {
      fields: ['id', 'title', 'parent_id', 'icon'],
      page: page, limit: 100,
    });
    folders = folders.concat(result.items);
    hasMore = result.has_more;
    page++;
  }
  return folders;
}

async function getNotesInFolder(folderId) {
  var notes = [];
  var page = 1;
  var hasMore = true;
  while (hasMore) {
    var result = await joplin.data.get(['folders', folderId, 'notes'], {
      fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time', 'user_updated_time'],
      page: page, limit: 100,
      order_by: 'user_updated_time', order_dir: 'DESC',
    });
    notes = notes.concat(result.items);
    hasMore = result.has_more;
    page++;
  }
  return notes;
}

function buildTree(folders, notesByFolder) {
  var folderMap = {};
  for (var i = 0; i < folders.length; i++) {
    var f = folders[i];
    folderMap[f.id] = {
      type: 'folder', id: f.id, title: f.title,
      parent_id: f.parent_id, icon: f.icon, note_count: 0, children: [],
    };
  }
  var folderIds = Object.keys(notesByFolder);
  for (var i = 0; i < folderIds.length; i++) {
    var fid = folderIds[i];
    var folder = folderMap[fid];
    if (folder) {
      var notes = notesByFolder[fid];
      folder.note_count = notes.length;
      for (var j = 0; j < notes.length; j++) {
        var n = notes[j];
        folder.children.push({
          type: 'note', id: n.id, title: n.title || '(untitled)',
          is_todo: n.is_todo, todo_completed: n.todo_completed,
        });
      }
    }
  }
  var roots = [];
  for (var i = 0; i < folders.length; i++) {
    var f = folders[i];
    var node = folderMap[f.id];
    if (f.parent_id && folderMap[f.parent_id]) {
      folderMap[f.parent_id].children.unshift(node);
    } else {
      roots.push(node);
    }
  }

  // Recursively compute total note count including sub-folders
  function calcTotalCount(node) {
    var total = 0;
    if (!node.children) return 0;
    for (var i = 0; i < node.children.length; i++) {
      var child = node.children[i];
      if (child.type === 'note') {
        total++;
      } else if (child.type === 'folder') {
        calcTotalCount(child);
        total += child.total_count;
      }
    }
    node.total_count = total + (node.note_count || 0) - (node.note_count || 0);
    // note_count is direct notes only (already counted in children), total_count is all
    node.total_count = total;
    return total;
  }
  for (var i = 0; i < roots.length; i++) {
    calcTotalCount(roots[i]);
  }

  return roots;
}

function getFolderIcon(node) {
  var iconData = node.icon;
  if (iconData && typeof iconData === 'string') {
    try { iconData = JSON.parse(iconData); } catch(e) { iconData = null; }
  }
  if (iconData && iconData.emoji) return iconData.emoji;
  return '\uD83D\uDCC2';
}

function renderTreeHtml(nodes, selectedNoteId, collapsedSet, level) {
  level = level || 0;
  var html = '';
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var indent = level * 18;
    if (node.type === 'folder') {
      var count = node.total_count || node.note_count || 0;
      var isCollapsed = collapsedSet[node.id];
      var arrowChar = isCollapsed ? '\u25B6' : '\u25BC';
      var toggleClass = isCollapsed ? 'toggle' : 'toggle expanded';
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
      var selected = node.id === selectedNoteId ? ' selected' : '';
      var icon = '\uD83D\uDCDD';
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

/* ======================== Plugin ======================== */
joplin.plugins.register({
  onStart: async function () {
    // Get locale
    var locale = await joplin.settings.globalValue('locale') || 'en_US';
    var t = getI18n(locale);

    var panel = await joplin.views.panels.create('notesInListPanel');
    await joplin.views.panels.addScript(panel, 'webview/panel.css');
    await joplin.views.panels.addScript(panel, 'webview/panel.js');
    await joplin.views.panels.setHtml(panel, '<div id="notes-in-list-root"><p style="padding:12px;">' + t.loading + '</p></div>');
    await joplin.views.panels.show(panel, true);

    var selectedNoteId = '';
    var collapsedFolders = {};
    var currentSort = 'updated_desc';
    var allFoldersCache = [];
    var isFirstLoad = true;

    function sortNotes(notes, sortMode) {
      var sorted = notes.slice();
      switch (sortMode) {
        case 'title_asc': sorted.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); }); break;
        case 'title_desc': sorted.sort(function(a, b) { return (b.title || '').localeCompare(a.title || ''); }); break;
        case 'updated_asc': sorted.sort(function(a, b) { return (a.user_updated_time || 0) - (b.user_updated_time || 0); }); break;
        default: sorted.sort(function(a, b) { return (b.user_updated_time || 0) - (a.user_updated_time || 0); }); break;
      }
      return sorted;
    }

    async function refreshPanel() {
      try {
        var folders = await getAllFolders();
        allFoldersCache = folders;

        // Default: all folders collapsed, then expand path to current note
        if (isFirstLoad) {
          for (var fi = 0; fi < folders.length; fi++) {
            collapsedFolders[folders[fi].id] = true;
          }
          // Expand the path to the currently selected note
          var currentNote = await joplin.workspace.selectedNote();
          if (currentNote) {
            selectedNoteId = currentNote.id;
            var parentId = currentNote.parent_id;
            while (parentId) {
              delete collapsedFolders[parentId];
              var parentFolder = null;
              for (var pi = 0; pi < folders.length; pi++) {
                if (folders[pi].id === parentId) { parentFolder = folders[pi]; break; }
              }
              parentId = parentFolder ? parentFolder.parent_id : null;
            }
          }
          isFirstLoad = false;
        }

        var notesByFolder = {};

        var batchSize = 10;
        for (var i = 0; i < folders.length; i += batchSize) {
          var batch = folders.slice(i, i + batchSize);
          var promises = [];
          for (var j = 0; j < batch.length; j++) promises.push(getNotesInFolder(batch[j].id));
          var results = await Promise.all(promises);
          for (var j = 0; j < batch.length; j++) notesByFolder[batch[j].id] = sortNotes(results[j], currentSort);
        }

        var tree = buildTree(folders, notesByFolder);
        var treeHtml = renderTreeHtml(tree, selectedNoteId, collapsedFolders);

        var sortLabels = {
          'updated_desc': t.sortUpdatedDesc, 'updated_asc': t.sortUpdatedAsc,
          'title_asc': t.sortTitleAsc, 'title_desc': t.sortTitleDesc,
        };

        // Pass i18n via data attribute (inline scripts may not execute in webview)
        var i18nJson = escapeHtml(JSON.stringify(t));

        var html = '<div id="notes-in-list-root" data-i18n="' + i18nJson + '">'
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

    await joplin.views.panels.onMessage(panel, async function(msg) {
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
        var folders = await getAllFolders();
        for (var i = 0; i < folders.length; i++) collapsedFolders[folders[i].id] = true;
        await refreshPanel();
      } else if (msg.name === 'expandAll') {
        collapsedFolders = {};
        await refreshPanel();
      } else if (msg.name === 'newNotebook') {
        await joplin.commands.execute('newFolder');
        await refreshPanel();
      } else if (msg.name === 'newNote') {
        await joplin.commands.execute('newNote');
        await refreshPanel();
      } else if (msg.name === 'newTodo') {
        await joplin.commands.execute('newTodo');
        await refreshPanel();
      } else if (msg.name === 'search') {
        var query = msg.query;
        if (!query || !query.trim()) {
          // Empty query: tell webview to clear search results
          await joplin.views.panels.postMessage(panel, { name: 'searchResults', results: null, query: '', searchId: msg.searchId });
          return;
        }
        try {
          var searchResults = [];
          var page = 1;
          var hasMore = true;
          while (hasMore && searchResults.length < 100) {
            var result = await joplin.data.get(['search'], {
              query: query,
              fields: ['id', 'title', 'body', 'parent_id', 'is_todo', 'todo_completed'],
              page: page, limit: 20,
            });
            searchResults = searchResults.concat(result.items);
            hasMore = result.has_more;
            page++;
          }
          // Build folder name lookup
          var folderNameMap = {};
          for (var i = 0; i < allFoldersCache.length; i++) {
            folderNameMap[allFoldersCache[i].id] = allFoldersCache[i].title;
          }
          // Extract snippet around the matched keyword
          var items = [];
          for (var i = 0; i < searchResults.length; i++) {
            var note = searchResults[i];
            var snippet = '';
            var body = note.body || '';
            var lowerBody = body.toLowerCase();
            var lowerQuery = query.toLowerCase();
            var matchIdx = lowerBody.indexOf(lowerQuery);
            if (matchIdx >= 0) {
              var start = Math.max(0, matchIdx - 40);
              var end = Math.min(body.length, matchIdx + lowerQuery.length + 80);
              snippet = (start > 0 ? '...' : '') + body.substring(start, end).replace(/\n/g, ' ') + (end < body.length ? '...' : '');
            } else {
              // Title match - show beginning of body
              snippet = body.substring(0, 120).replace(/\n/g, ' ') + (body.length > 120 ? '...' : '');
            }
            items.push({
              id: note.id,
              title: note.title || '(untitled)',
              is_todo: note.is_todo,
              todo_completed: note.todo_completed,
              snippet: snippet,
              folderName: folderNameMap[note.parent_id] || '',
            });
          }
          await joplin.views.panels.postMessage(panel, { name: 'searchResults', results: items, query: query, searchId: msg.searchId });
        } catch (err) {
          console.error('Joplin Explorer: search error', err);
        }
      } else if (msg.name === 'cycleSort') {
        var sortModes = ['updated_desc', 'updated_asc', 'title_asc', 'title_desc'];
        var idx = sortModes.indexOf(currentSort);
        currentSort = sortModes[(idx + 1) % sortModes.length];
        await refreshPanel();
      } else if (msg.name === 'sync') {
        await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'syncing' });
        try {
          await joplin.commands.execute('synchronize');
        } catch(e) {
          console.error('Joplin Explorer: sync error', e);
        }
        // Keep "syncing" visible for a few seconds, then show "done" briefly
        await new Promise(function(r) { setTimeout(r, 3000); });
        await joplin.views.panels.postMessage(panel, { name: 'syncState', state: 'done' });
        await refreshPanel();
      } else if (msg.name === 'contextMenu') {
        var action = msg.action;
        var id = msg.id;
        var itemType = msg.itemType;
        try {
          if (itemType === 'folder') {
            switch (action) {
              case 'newNote':
                var newNote = await joplin.data.post(['notes'], null, { title: t.newNote, parent_id: id });
                await joplin.commands.execute('openNote', newNote.id);
                selectedNoteId = newNote.id;
                break;
              case 'newTodo':
                var newTodo = await joplin.data.post(['notes'], null, { title: t.newTodo, parent_id: id, is_todo: 1 });
                await joplin.commands.execute('openNote', newTodo.id);
                selectedNoteId = newTodo.id;
                break;
              case 'newSubNotebook':
                await joplin.data.post(['folders'], null, { title: t.newNotebook, parent_id: id });
                break;
              case 'deleteFolder':
                await joplin.data.delete(['folders', id]);
                break;
              case 'renameFolder':
                if (msg.newTitle) await joplin.data.put(['folders', id], null, { title: msg.newTitle });
                break;
              case 'exportFolder':
                try { await joplin.commands.execute('exportFolders', [id]); } catch(e) {}
                break;
            }
          } else if (itemType === 'note') {
            switch (action) {
              case 'openNote':
                await joplin.commands.execute('openNote', id);
                selectedNoteId = id;
                break;
              case 'openInNewWindow':
                try { await joplin.commands.execute('openNoteInNewWindow', id); } catch(e) {
                  // Fallback: just open in main window
                  await joplin.commands.execute('openNote', id);
                }
                break;
              case 'copyLink':
                var linkNote = await joplin.data.get(['notes', id], { fields: ['id', 'title'] });
                var mdLink = '[' + linkNote.title + '](:/' + linkNote.id + ')';
                try {
                  await joplin.clipboard.writeText(mdLink);
                } catch(e) {
                  // Fallback: send link text to webview for copying
                  await joplin.views.panels.postMessage(panel, { name: 'copyText', text: mdLink });
                }
                break;
              case 'duplicateNote':
                var srcNote = await joplin.data.get(['notes', id], { fields: ['title', 'body', 'parent_id', 'is_todo'] });
                var dupNote = await joplin.data.post(['notes'], null, {
                  title: srcNote.title + ' (copy)', body: srcNote.body,
                  parent_id: srcNote.parent_id, is_todo: srcNote.is_todo,
                });
                await joplin.commands.execute('openNote', dupNote.id);
                selectedNoteId = dupNote.id;
                break;
              case 'switchNoteType':
                var sn = await joplin.data.get(['notes', id], { fields: ['is_todo'] });
                await joplin.data.put(['notes', id], null, { is_todo: sn.is_todo ? 0 : 1 });
                break;
              case 'toggleTodo':
                var tn = await joplin.data.get(['notes', id], { fields: ['is_todo', 'todo_completed'] });
                if (tn.is_todo) {
                  await joplin.data.put(['notes', id], null, { todo_completed: tn.todo_completed ? 0 : Date.now() });
                }
                break;
              case 'renameNote':
                if (msg.newTitle) await joplin.data.put(['notes', id], null, { title: msg.newTitle });
                break;
              case 'moveNote':
                if (msg.targetFolderName) {
                  var targetFolder = null;
                  for (var i = 0; i < allFoldersCache.length; i++) {
                    if (allFoldersCache[i].title === msg.targetFolderName) {
                      targetFolder = allFoldersCache[i]; break;
                    }
                  }
                  if (targetFolder) {
                    await joplin.data.put(['notes', id], null, { parent_id: targetFolder.id });
                  }
                }
                break;
              case 'noteInfo':
                var info = await joplin.data.get(['notes', id], { fields: ['id', 'title', 'created_time', 'updated_time', 'is_todo', 'parent_id'] });
                var parentTitle = '';
                for (var i = 0; i < allFoldersCache.length; i++) {
                  if (allFoldersCache[i].id === info.parent_id) { parentTitle = allFoldersCache[i].title; break; }
                }
                var infoText = 'ID: ' + info.id
                  + '\nTitle: ' + info.title
                  + '\nNotebook: ' + parentTitle
                  + '\nCreated: ' + new Date(info.created_time).toLocaleString()
                  + '\nUpdated: ' + new Date(info.updated_time).toLocaleString()
                  + '\nType: ' + (info.is_todo ? 'To-do' : 'Note');
                // Send info back to webview to display
                return { name: 'showInfo', text: infoText };
              case 'deleteNote':
                await joplin.data.delete(['notes', id]);
                break;
            }
          }
          await refreshPanel();
        } catch (err) {
          console.error('Notes In List: context menu error', err);
        }
      } else if (msg.name === 'dragDrop') {
        try {
          var dragId = msg.dragId;
          var dragType = msg.dragType;
          var targetId = msg.targetId;
          var position = msg.position; // 'into', 'above', 'below'

          if (dragType === 'note') {
            // Move note to target folder
            if (msg.position === 'into') {
              // Find which folder the target belongs to
              var targetFolderId = targetId;
              // If target is a note, find its parent folder
              if (msg.dragType === 'note') {
                // Check if targetId is a folder
                var isFolder = false;
                for (var i = 0; i < allFoldersCache.length; i++) {
                  if (allFoldersCache[i].id === targetId) { isFolder = true; break; }
                }
                if (!isFolder) {
                  // Target is a note, get its parent_id
                  var targetNote = await joplin.data.get(['notes', targetId], { fields: ['parent_id'] });
                  targetFolderId = targetNote.parent_id;
                }
              }
              await joplin.data.put(['notes', dragId], null, { parent_id: targetFolderId });
            }
          } else if (dragType === 'folder') {
            if (position === 'into') {
              // Move folder as child of target folder
              if (dragId !== targetId) {
                await joplin.data.put(['folders', dragId], null, { parent_id: targetId });
              }
            } else {
              // Move folder to same parent as target folder
              var targetFolder = null;
              for (var i = 0; i < allFoldersCache.length; i++) {
                if (allFoldersCache[i].id === targetId) { targetFolder = allFoldersCache[i]; break; }
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
      }
    });

    await joplin.workspace.onNoteSelectionChange(async function() {
      var note = await joplin.workspace.selectedNote();
      if (note && note.id !== selectedNoteId) {
        selectedNoteId = note.id;
        // Only send selection update to webview, don't re-render everything
        await joplin.views.panels.postMessage(panel, { name: 'selectNote', id: note.id });
      }
    });

    await refreshPanel();
  },
});

/* Webview script for Notes In List panel */

// Persist scroll position across setHtml calls
var _savedScrollTop = 0;
var _isFirstRender = true;

function postMsg(msg) {
  webviewApi.postMessage(msg);
}

// Save scroll position continuously
document.addEventListener('scroll', function(e) {
  if (e.target && e.target.id === 'tree-container') {
    _savedScrollTop = e.target.scrollTop;
  }
}, true);

// Observe DOM changes to restore scroll position after setHtml
var _observer = new MutationObserver(function() {
  var container = document.getElementById('tree-container');
  if (!container) return;

  if (_isFirstRender) {
    _isFirstRender = false;
    var selected = container.querySelector('.tree-item.note.selected');
    if (selected) {
      setTimeout(function() {
        selected.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }, 30);
    }
  } else {
    container.scrollTop = _savedScrollTop;
  }
});
_observer.observe(document.body, { childList: true, subtree: true });

function loadI18n() {
  var root = document.getElementById('notes-in-list-root');
  if (root && root.dataset.i18n) {
    try { window._i18n = JSON.parse(root.dataset.i18n); } catch(e) {}
  }
}

function T(key) {
  if (!window._i18n) loadI18n();
  return (window._i18n && window._i18n[key]) || key;
}

function getPinnedData() {
  var root = document.getElementById('notes-in-list-root');
  if (root && root.dataset.pinned) {
    try { return JSON.parse(root.dataset.pinned); } catch(e) {}
  }
  return [];
}

function isPinned(id) {
  var data = getPinnedData();
  for (var i = 0; i < data.length; i++) {
    if (data[i].id === id) return true;
  }
  return false;
}

// Inline input dialog (replaces prompt() which may not work in webview)
function showInlineInput(label, defaultValue, callback) {
  var existing = document.getElementById('inline-input-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'inline-input-overlay';
  overlay.className = 'inline-input-overlay';
  overlay.innerHTML = '<div class="inline-input-dialog">'
    + '<div class="inline-input-label">' + label + '</div>'
    + '<input class="inline-input-field" type="text" value="' + (defaultValue || '').replace(/"/g, '&quot;') + '" />'
    + '<div class="inline-input-buttons">'
    + '<button class="inline-input-ok">OK</button>'
    + '<button class="inline-input-cancel">' + (T('cancel') || 'Cancel') + '</button>'
    + '</div></div>';

  document.body.appendChild(overlay);

  var input = overlay.querySelector('.inline-input-field');
  input.focus();
  input.select();

  function submit() {
    var val = input.value;
    overlay.remove();
    callback(val);
  }
  function cancel() {
    overlay.remove();
    callback(null);
  }

  overlay.querySelector('.inline-input-ok').addEventListener('click', submit);
  overlay.querySelector('.inline-input-cancel').addEventListener('click', cancel);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') cancel();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) cancel();
  });
}

// Left click: open note / toggle folder / search result actions
document.addEventListener('click', function(e) {
  var existingMenu = document.getElementById('ctx-menu');
  if (existingMenu) existingMenu.remove();

  // Click on a tag in search results -> load its notes
  var tagItem = e.target.closest('.search-tag-item');
  if (tagItem) {
    var tagId = tagItem.dataset.tagId;
    if (tagId) postMsg({ name: 'loadTagNotes', tagId: tagId });
    return;
  }

  // Click on a folder in search results -> locate in tree
  var folderItem = e.target.closest('.search-folder-item');
  if (folderItem) {
    var folderId = folderItem.dataset.folderId;
    if (folderId) postMsg({ name: 'locateFolder', folderId: folderId });
    return;
  }

  var item = e.target.closest('.tree-item');
  if (!item) return;

  var type = item.dataset.type;
  var id = item.dataset.id;
  var isPinnedItem = item.classList.contains('pinned-item');

  if (type === 'note') {
    document.querySelectorAll('.tree-item.note.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
    item.classList.add('selected');
    postMsg({ name: 'openNote', id: id });
  }

  if (type === 'folder') {
    if (isPinnedItem) {
      // Pinned folder: expand to it in tree and scroll
      postMsg({ name: 'locatePinnedFolder', folderId: id });
    } else {
      postMsg({ name: 'toggleFolder', id: id });
    }
  }
});

// Right click: context menu
document.addEventListener('contextmenu', function(e) {
  var existingMenu = document.getElementById('ctx-menu');
  if (existingMenu) existingMenu.remove();

  var item = e.target.closest('.tree-item');
  if (!item) return;

  e.preventDefault();

  var type = item.dataset.type;
  var id = item.dataset.id;
  var title = '';
  var labelEl = item.querySelector('.label');
  if (labelEl) title = labelEl.textContent;

  var menuHtml = '<div id="ctx-menu" class="context-menu" style="left:' + e.pageX + 'px;top:' + e.pageY + 'px;">';

  if (type === 'folder') {
    var isFolderPinned = isPinned(id);
    menuHtml += '<div class="ctx-item" data-action="' + (isFolderPinned ? 'unpinFolder' : 'pinFolder') + '" data-id="' + id + '" data-type="folder">' + (isFolderPinned ? T('ctxUnpin') : T('ctxPin')) + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="newNote" data-id="' + id + '" data-type="folder">' + T('ctxNewNoteHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newTodo" data-id="' + id + '" data-type="folder">' + T('ctxNewTodoHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newSubNotebook" data-id="' + id + '" data-type="folder">' + T('ctxNewSubNotebook') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameFolder" data-id="' + id + '" data-type="folder" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameFolder') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="exportFolder" data-id="' + id + '" data-type="folder">' + T('ctxExportFolder') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteFolder" data-id="' + id + '" data-type="folder">' + T('ctxDeleteFolder') + '</div>';
  } else if (type === 'note') {
    var isNotePinned = isPinned(id);
    menuHtml += '<div class="ctx-item" data-action="' + (isNotePinned ? 'unpinNote' : 'pinNote') + '" data-id="' + id + '" data-type="note">' + (isNotePinned ? T('ctxUnpin') : T('ctxPin')) + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="openNote" data-id="' + id + '" data-type="note">' + T('ctxOpenNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="openInNewWindow" data-id="' + id + '" data-type="note">' + T('ctxOpenInNewWindow') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="copyLink" data-id="' + id + '" data-type="note">' + T('ctxCopyLink') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="duplicateNote" data-id="' + id + '" data-type="note">' + T('ctxDuplicateNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="switchNoteType" data-id="' + id + '" data-type="note">' + T('ctxSwitchNoteType') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="toggleTodo" data-id="' + id + '" data-type="note">' + T('ctxToggleTodo') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameNote" data-id="' + id + '" data-type="note" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="noteInfo" data-id="' + id + '" data-type="note">' + T('ctxNoteInfo') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteNote" data-id="' + id + '" data-type="note">' + T('ctxDeleteNote') + '</div>';
  }

  menuHtml += '</div>';
  document.body.insertAdjacentHTML('beforeend', menuHtml);

  var menu = document.getElementById('ctx-menu');
  var rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';
});

// Context menu item click
document.addEventListener('click', function(e) {
  var ctxItem = e.target.closest('.ctx-item');
  if (!ctxItem) return;

  var action = ctxItem.dataset.action;
  var id = ctxItem.dataset.id;
  var itemType = ctxItem.dataset.type;

  // All dialogs handled by backend using native Joplin dialogs
  postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType });

  var menu = document.getElementById('ctx-menu');
  if (menu) menu.remove();
});

// Close context menu
document.addEventListener('mousedown', function(e) {
  if (!e.target.closest('#ctx-menu')) {
    var menu = document.getElementById('ctx-menu');
    if (menu) menu.remove();
  }
});

// Pinned section collapse/expand
document.addEventListener('click', function(e) {
  var pinnedHeader = e.target.closest('.pinned-section-header');
  if (pinnedHeader) {
    postMsg({ name: 'togglePinnedCollapse' });
    return;
  }
});

// Search section collapse/expand
document.addEventListener('click', function(e) {
  var header = e.target.closest('.search-section-header');
  if (!header) return;
  var sectionId = header.dataset.section;
  var body = document.getElementById('search-section-' + sectionId);
  if (!body) return;
  var toggle = header.querySelector('.section-toggle');
  if (body.classList.contains('collapsed')) {
    body.classList.remove('collapsed');
    if (toggle) toggle.textContent = '\u25BC';
  } else {
    body.classList.add('collapsed');
    if (toggle) toggle.textContent = '\u25B6';
  }
});

// Toolbar buttons
document.addEventListener('click', function(e) {
  var btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'btn-new-notebook': postMsg({ name: 'newNotebook' }); break;
    case 'btn-new-note': postMsg({ name: 'newNote' }); break;
    case 'btn-new-todo': postMsg({ name: 'newTodo' }); break;
    case 'btn-sort': postMsg({ name: 'cycleSort' }); break;
    case 'btn-collapse-all': postMsg({ name: 'collapseAll' }); break;
    case 'btn-sync':
      var syncBtn = document.getElementById('btn-sync');
      if (syncBtn && !syncBtn.disabled) {
        syncBtn.disabled = true;
        syncBtn.classList.add('syncing');
        syncBtn.textContent = '\uD83D\uDD04 ' + T('syncing');
        postMsg({ name: 'sync' });
      }
      break;
  }
});

// Listen for messages from plugin backend
webviewApi.onMessage(function(msg) {
  if (!msg || !msg.message) return;
  var m = msg.message;

  if (m.name === 'syncState') {
    var syncBtn = document.getElementById('btn-sync');
    if (!syncBtn) return;
    if (m.state === 'done') {
      syncBtn.classList.remove('syncing');
      syncBtn.classList.add('sync-done');
      syncBtn.textContent = T('syncDone');
      // Show "done" for 2 seconds, then restore
      setTimeout(function() {
        var btn = document.getElementById('btn-sync');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('sync-done');
          btn.textContent = '\uD83D\uDD04 ' + T('sync');
        }
      }, 2000);
    }
  } else if (m.name === 'searchResults') {
    // Ignore stale search results
    if (m.searchId !== undefined && m.searchId !== _searchId) return;
    if (!m.notes && !m.tags && !m.folders) {
      if (_searchMode) exitSearchMode();
    } else {
      renderSearchResults(m.notes || [], m.tags || [], m.folders || [], m.query);
    }
  } else if (m.name === 'tagNotes') {
    // Expand tag inline with its notes
    expandTagNotes(m.tagId, m.notes);
  } else if (m.name === 'scrollToFolder') {
    setTimeout(function() {
      var el = document.querySelector('.tree-item.folder:not(.pinned-item)[data-id="' + m.folderId + '"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('locate-flash');
        setTimeout(function() { el.classList.remove('locate-flash'); }, 1500);
      }
    }, 80);
  } else if (m.name === 'exitSearch') {
    var input = document.getElementById('search-input');
    if (input) input.value = '';
    if (_searchMode) exitSearchMode();
  } else if (m.name === 'exitSearchAndLocate') {
    var input2 = document.getElementById('search-input');
    if (input2) input2.value = '';
    _searchMode = false;
    showSearchContainer(false);
    // Scroll to the folder and flash-highlight it
    setTimeout(function() {
      var el = document.querySelector('.tree-item.folder[data-id="' + m.folderId + '"]');
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('locate-flash');
        setTimeout(function() { el.classList.remove('locate-flash'); }, 1500);
      }
    }, 80);
  } else if (m.name === 'copyText') {
    // Fallback clipboard copy via webview
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(m.text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = m.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  } else if (m.name === 'selectNote') {
    // Update selection without full re-render
    document.querySelectorAll('.tree-item.note.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
    var noteEl = document.querySelector('.tree-item.note[data-id="' + m.id + '"]');
    if (noteEl) {
      noteEl.classList.add('selected');
      noteEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
});

// ======================== Drag & Drop ========================
// Make tree items draggable
document.addEventListener('mousedown', function(e) {
  var item = e.target.closest('.tree-item');
  if (!item || e.button !== 0) return;
  item.setAttribute('draggable', 'true');
});

document.addEventListener('dragstart', function(e) {
  var item = e.target.closest('.tree-item');
  if (!item) return;
  var isPinned = item.classList.contains('pinned-item');
  e.dataTransfer.setData('text/plain', JSON.stringify({
    id: item.dataset.id,
    type: item.dataset.type,
    pinned: isPinned,
  }));
  e.dataTransfer.effectAllowed = 'move';
  item.classList.add('dragging');
  // Show drop zones during drag
  var tc = document.getElementById('tree-container');
  if (tc) tc.classList.add('dragging-active');
});

function clearDropIndicators() {
  document.querySelectorAll('.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
  document.querySelectorAll('.drop-above').forEach(function(el) { el.classList.remove('drop-above'); });
  document.querySelectorAll('.drop-below').forEach(function(el) { el.classList.remove('drop-below'); });
}

function endDrag() {
  clearDropIndicators();
  var tc = document.getElementById('tree-container');
  if (tc) tc.classList.remove('dragging-active');
}

document.addEventListener('dragend', function(e) {
  var item = e.target.closest('.tree-item');
  if (item) {
    item.classList.remove('dragging');
    item.removeAttribute('draggable');
  }
  endDrag();
});

document.addEventListener('dragover', function(e) {
  var el = e.target;
  if (el && el.nodeType === 3) el = el.parentElement; // text node -> parent element
  if (!el) return;
  var target = el.closest('.tree-item');
  var treeContainer = document.getElementById('tree-container');

  // Drop zone (sticky bottom) — always accept
  var onDropZone = el.closest('#drop-zone-empty');
  if (onDropZone) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return;
  }

  // Pinned section — accept drops (to pin or reorder)
  var inPinnedArea = el.closest('.pinned-section-header') || el.closest('.pinned-section-body');
  if (inPinnedArea) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropIndicators();
    // Show above/below indicators on pinned items for reorder
    if (target && target.classList.contains('pinned-item')) {
      var rect2 = target.getBoundingClientRect();
      var y2 = e.clientY - rect2.top;
      if (y2 < rect2.height * 0.5) {
        target.classList.add('drop-above');
      } else {
        target.classList.add('drop-below');
      }
    }
    return;
  }

  // Normal tree-item not found — ignore
  if (!target) return;

  // Pinned items can ONLY be reordered within the pinned section, not dropped into the tree
  var draggingEl = document.querySelector('.tree-item.dragging');
  if (draggingEl && draggingEl.classList.contains('pinned-item')) return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Clean previous indicators
  clearDropIndicators();

  var targetType = target.dataset.type;
  var rect = target.getBoundingClientRect();
  var y = e.clientY - rect.top;
  var height = rect.height;

  if (targetType === 'folder') {
    // Top 25%: drop above, middle 50%: drop into, bottom 25%: drop below
    if (y < height * 0.25) {
      target.classList.add('drop-above');
    } else if (y > height * 0.75) {
      target.classList.add('drop-below');
    } else {
      target.classList.add('drop-target');
    }
  } else {
    // Notes: just show drop-target (will move to same folder)
    if (y < height * 0.5) {
      target.classList.add('drop-above');
    } else {
      target.classList.add('drop-below');
    }
  }
});

document.addEventListener('dragleave', function(e) {
  var target = e.target.closest('.tree-item');
  if (target) {
    target.classList.remove('drop-target');
    target.classList.remove('drop-above');
    target.classList.remove('drop-below');
  }
  // If leaving the tree-container entirely, clear empty-drop hint
  var treeContainer = document.getElementById('tree-container');
  if (treeContainer && e.target === treeContainer) {
    treeContainer.classList.remove('drop-empty');
  }
});

document.addEventListener('drop', function(e) {
  e.preventDefault();
  var el0 = e.target;
  if (el0 && el0.nodeType === 3) el0 = el0.parentElement;
  var target = el0 ? el0.closest('.tree-item') : null;
  var treeContainer = document.getElementById('tree-container');

  var data;
  try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(err) { endDrag(); return; }

  var dragId = data.id;
  var dragType = data.type;

  var isDragFromPinned = data.pinned;

  // Drop on drop zone -> create new notebook
  var onDZ = el0 ? el0.closest('#drop-zone-empty') : null;
  if (onDZ) {
    postMsg({ name: 'dragToEmpty', dragId: dragId, dragType: dragType });
    endDrag();
    return;
  }

  // Drop on pinned section
  var onPinnedArea2 = el0 ? (el0.closest('.pinned-section-header') || el0.closest('.pinned-section-body')) : null;
  if (onPinnedArea2) {
    if (isDragFromPinned) {
      // Reorder within pinned section
      var pinnedTarget = target && target.classList.contains('pinned-item') ? target : null;
      if (pinnedTarget && pinnedTarget.dataset.id !== dragId) {
        var rect2 = pinnedTarget.getBoundingClientRect();
        var y2 = e.clientY - rect2.top;
        var pos2 = y2 < rect2.height * 0.5 ? 'before' : 'after';
        postMsg({ name: 'reorderPinned', dragId: dragId, dragType: dragType, targetId: pinnedTarget.dataset.id, position: pos2 });
      }
    } else {
      // Pin the dragged item
      if (dragType === 'note') {
        postMsg({ name: 'contextMenu', action: 'pinNote', id: dragId, itemType: 'note' });
      } else if (dragType === 'folder') {
        postMsg({ name: 'contextMenu', action: 'pinFolder', id: dragId, itemType: 'folder' });
      }
    }
    endDrag();
    return;
  }

  // Pinned items can only be reordered within pinned section
  if (isDragFromPinned) {
    endDrag();
    return;
  }

  // No target tree-item outside special zones -> ignore
  if (!target) {
    endDrag();
    return;
  }

  var targetId = target.dataset.id;
  var targetType = target.dataset.type;

  if (dragId === targetId) { endDrag(); return; } // Can't drop on self

  var rect = target.getBoundingClientRect();
  var y = e.clientY - rect.top;
  var height = rect.height;

  if (targetType === 'folder') {
    if (y >= height * 0.25 && y <= height * 0.75) {
      postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: 'into' });
    } else {
      var pos = y < height * 0.25 ? 'above' : 'below';
      postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: pos });
    }
  } else {
    postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: 'into' });
  }

  endDrag();
});

// ======================== Content Search ========================
var _searchTimer = null;
var _searchMode = false;
var _searchId = 0;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query) return text;
  // Escape HTML first
  var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function showSearchContainer(show) {
  var tree = document.getElementById('tree-container');
  var search = document.getElementById('search-results');
  if (tree) tree.style.display = show ? 'none' : '';
  if (search) search.style.display = show ? '' : 'none';
}

function renderNoteItem(item, query) {
  var icon = '\uD83D\uDCDD';
  if (item.is_todo) {
    icon = item.todo_completed ? '\u2611' : '\u2610';
  }
  var html = '<div class="search-result-item tree-item note" data-id="' + item.id + '" data-type="note">';
  html += '<span class="icon note-icon">' + icon + '</span>';
  html += '<div class="search-result-content">';
  html += '<div class="search-result-title">' + highlightText(item.title, query) + '</div>';
  if (item.folderName) {
    html += '<div class="search-result-folder">\uD83D\uDCC2 ' + item.folderName + '</div>';
  }
  if (item.snippet) {
    html += '<div class="search-result-snippet">' + highlightText(item.snippet, query) + '</div>';
  }
  html += '</div></div>';
  return html;
}

function renderSearchResults(notes, tags, folders, query) {
  var container = document.getElementById('search-results');
  if (!container) return;

  showSearchContainer(true);

  var totalCount = notes.length + tags.length + folders.length;
  if (totalCount === 0) {
    container.innerHTML = '<div class="search-status">' + T('searchNoResult') + '</div>';
    return;
  }

  var countText = T('searchResultCount').replace('{count}', totalCount);
  var html = '<div class="search-status">' + countText + '</div>';

  function sectionHeader(icon, label, count, sectionId) {
    return '<div class="search-section-header" data-section="' + sectionId + '">'
      + '<span class="section-toggle">\u25BC</span> '
      + icon + ' ' + label + ' (' + count + ')'
      + '</div>';
  }

  // --- Folders section ---
  if (folders.length > 0) {
    html += sectionHeader('\uD83D\uDCC1', T('searchSectionFolders'), folders.length, 'folders');
    html += '<div class="search-section-body" id="search-section-folders">';
    for (var f = 0; f < folders.length; f++) {
      var folder = folders[f];
      var folderIcon = (folder.icon && folder.icon.emoji) ? folder.icon.emoji : '\uD83D\uDCC1';
      html += '<div class="search-result-item search-folder-item" data-folder-id="' + folder.id + '">';
      html += '<span class="icon">' + folderIcon + '</span>';
      html += '<div class="search-result-content">';
      html += '<div class="search-result-title">' + highlightText(folder.title, query) + '</div>';
      html += '</div></div>';
    }
    html += '</div>';
  }

  // --- Notes section ---
  if (notes.length > 0) {
    html += sectionHeader('\uD83D\uDCDD', T('searchSectionNotes'), notes.length, 'notes');
    html += '<div class="search-section-body" id="search-section-notes">';
    for (var i = 0; i < notes.length; i++) {
      html += renderNoteItem(notes[i], query);
    }
    html += '</div>';
  }

  // --- Tags section ---
  if (tags.length > 0) {
    html += sectionHeader('\uD83C\uDFF7\uFE0F', T('searchSectionTags'), tags.length, 'tags');
    html += '<div class="search-section-body" id="search-section-tags">';
    for (var t = 0; t < tags.length; t++) {
      var tag = tags[t];
      var countLabel = T('searchTagNoteCount').replace('{count}', tag.noteCount);
      html += '<div class="search-result-item search-tag-item" data-tag-id="' + tag.id + '">';
      html += '<span class="icon">\uD83C\uDFF7\uFE0F</span>';
      html += '<div class="search-result-content">';
      html += '<div class="search-result-title">' + highlightText(tag.title, query) + '</div>';
      html += '<div class="search-result-folder">' + countLabel + '</div>';
      html += '</div>';
      html += '<span class="tag-expand-arrow">\u25B6</span>';
      html += '</div>';
      html += '<div class="tag-notes-container" id="tag-notes-' + tag.id + '"></div>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
  _searchMode = true;
}

// Expand a tag in search results to show its notes
function expandTagNotes(tagId, notes) {
  var container = document.getElementById('tag-notes-' + tagId);
  if (!container) return;
  // Toggle: if already has children, collapse
  if (container.children.length > 0) {
    container.innerHTML = '';
    // Rotate arrow back
    var arrow = document.querySelector('.search-tag-item[data-tag-id="' + tagId + '"] .tag-expand-arrow');
    if (arrow) arrow.classList.remove('expanded');
    return;
  }
  var html = '';
  for (var i = 0; i < notes.length; i++) {
    html += renderNoteItem(notes[i], '');
  }
  if (notes.length === 0) {
    html = '<div class="search-status" style="padding-left:30px;">' + T('searchNoResult') + '</div>';
  }
  container.innerHTML = html;
  var arrow = document.querySelector('.search-tag-item[data-tag-id="' + tagId + '"] .tag-expand-arrow');
  if (arrow) arrow.classList.add('expanded');
}

function exitSearchMode() {
  _searchMode = false;
  showSearchContainer(false);
}

document.addEventListener('input', function(e) {
  if (e.target.id !== 'search-input') return;
  var query = e.target.value.trim();

  if (_searchTimer) clearTimeout(_searchTimer);
  _searchId++;
  var currentSearchId = _searchId;

  if (!query) {
    if (_searchMode) exitSearchMode();
    return;
  }

  _searchMode = true;
  var searchContainer = document.getElementById('search-results');
  if (searchContainer) {
    searchContainer.innerHTML = '<div class="search-status">' + T('searching') + '</div>';
  }
  showSearchContainer(true);

  // Debounce: wait 400ms after typing stops
  _searchTimer = setTimeout(function() {
    postMsg({ name: 'search', query: query, searchId: currentSearchId });
  }, 400);
});

// Handle Escape key to clear search
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var input = document.getElementById('search-input');
    if (input && input.value) {
      input.value = '';
      if (_searchMode) exitSearchMode();
    }
  }
});

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

// Left click: open note / toggle folder
document.addEventListener('click', function(e) {
  var existingMenu = document.getElementById('ctx-menu');
  if (existingMenu) existingMenu.remove();

  var item = e.target.closest('.tree-item');
  if (!item) return;

  var type = item.dataset.type;
  var id = item.dataset.id;

  if (type === 'note') {
    document.querySelectorAll('.tree-item.note.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
    item.classList.add('selected');
    postMsg({ name: 'openNote', id: id });
  }

  if (type === 'folder') {
    postMsg({ name: 'toggleFolder', id: id });
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
    menuHtml += '<div class="ctx-item" data-action="newNote" data-id="' + id + '" data-type="folder">' + T('ctxNewNoteHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newTodo" data-id="' + id + '" data-type="folder">' + T('ctxNewTodoHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newSubNotebook" data-id="' + id + '" data-type="folder">' + T('ctxNewSubNotebook') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameFolder" data-id="' + id + '" data-type="folder" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameFolder') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="exportFolder" data-id="' + id + '" data-type="folder">' + T('ctxExportFolder') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteFolder" data-id="' + id + '" data-type="folder">' + T('ctxDeleteFolder') + '</div>';
  } else if (type === 'note') {
    menuHtml += '<div class="ctx-item" data-action="openNote" data-id="' + id + '" data-type="note">' + T('ctxOpenNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="openInNewWindow" data-id="' + id + '" data-type="note">' + T('ctxOpenInNewWindow') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="copyLink" data-id="' + id + '" data-type="note">' + T('ctxCopyLink') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="duplicateNote" data-id="' + id + '" data-type="note">' + T('ctxDuplicateNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="switchNoteType" data-id="' + id + '" data-type="note">' + T('ctxSwitchNoteType') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="toggleTodo" data-id="' + id + '" data-type="note">' + T('ctxToggleTodo') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameNote" data-id="' + id + '" data-type="note" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="moveNote" data-id="' + id + '" data-type="note">' + T('ctxMoveNote') + '</div>';
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

  if (action === 'renameFolder' || action === 'renameNote') {
    var currentTitle = ctxItem.dataset.title || '';
    showInlineInput(T('promptRename'), currentTitle, function(newTitle) {
      if (newTitle !== null && newTitle.trim() !== '') {
        postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType, newTitle: newTitle.trim() });
      }
    });
  } else if (action === 'deleteFolder') {
    if (confirm(T('confirmDeleteFolder'))) {
      postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType });
    }
  } else if (action === 'deleteNote') {
    if (confirm(T('confirmDeleteNote'))) {
      postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType });
    }
  } else if (action === 'moveNote') {
    showInlineInput(T('promptMoveNote'), '', function(folderName) {
      if (folderName !== null && folderName.trim() !== '') {
        postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType, targetFolderName: folderName.trim() });
      }
    });
  } else {
    postMsg({ name: 'contextMenu', action: action, id: id, itemType: itemType });
  }

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
    if (m.results === null) {
      if (_searchMode) exitSearchMode();
    } else {
      renderSearchResults(m.results, m.query);
    }
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
  e.dataTransfer.setData('text/plain', JSON.stringify({
    id: item.dataset.id,
    type: item.dataset.type,
  }));
  e.dataTransfer.effectAllowed = 'move';
  item.classList.add('dragging');
});

document.addEventListener('dragend', function(e) {
  var item = e.target.closest('.tree-item');
  if (item) {
    item.classList.remove('dragging');
    item.removeAttribute('draggable');
  }
  // Clean up all drop indicators
  document.querySelectorAll('.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
  document.querySelectorAll('.drop-above').forEach(function(el) { el.classList.remove('drop-above'); });
  document.querySelectorAll('.drop-below').forEach(function(el) { el.classList.remove('drop-below'); });
});

document.addEventListener('dragover', function(e) {
  var target = e.target.closest('.tree-item');
  if (!target) return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  // Clean previous indicators
  document.querySelectorAll('.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
  document.querySelectorAll('.drop-above').forEach(function(el) { el.classList.remove('drop-above'); });
  document.querySelectorAll('.drop-below').forEach(function(el) { el.classList.remove('drop-below'); });

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
});

document.addEventListener('drop', function(e) {
  e.preventDefault();
  var target = e.target.closest('.tree-item');
  if (!target) return;

  var data;
  try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(err) { return; }

  var targetId = target.dataset.id;
  var targetType = target.dataset.type;
  var dragId = data.id;
  var dragType = data.type;

  if (dragId === targetId) return; // Can't drop on self

  var rect = target.getBoundingClientRect();
  var y = e.clientY - rect.top;
  var height = rect.height;

  if (targetType === 'folder') {
    if (y >= height * 0.25 && y <= height * 0.75) {
      // Drop INTO folder
      postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: 'into' });
    } else {
      // Drop above/below folder (reorder)
      var pos = y < height * 0.25 ? 'above' : 'below';
      postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: pos });
    }
  } else {
    // Drop on note -> move to same folder as note
    postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: 'into' });
  }

  // Clean up
  document.querySelectorAll('.drop-target, .drop-above, .drop-below').forEach(function(el) {
    el.classList.remove('drop-target', 'drop-above', 'drop-below');
  });
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

function renderSearchResults(results, query) {
  var container = document.getElementById('search-results');
  if (!container) return;

  showSearchContainer(true);

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="search-status">' + T('searchNoResult') + '</div>';
    return;
  }

  var countText = T('searchResultCount').replace('{count}', results.length);
  var html = '<div class="search-status">' + countText + '</div>';

  for (var i = 0; i < results.length; i++) {
    var item = results[i];
    var icon = '\uD83D\uDCDD';
    if (item.is_todo) {
      icon = item.todo_completed ? '\u2611' : '\u2610';
    }
    html += '<div class="search-result-item tree-item note" data-id="' + item.id + '" data-type="note">';
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
  }

  container.innerHTML = html;
  _searchMode = true;
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

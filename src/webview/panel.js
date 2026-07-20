/* Webview script for Notes In List panel */

// Persist scroll position across setHtml calls
var _savedScrollTop = 0;
var _isFirstRender = true;

function postMsg(msg) {
  webviewApi.postMessage(msg);
}

// Announce (re)creation so the backend re-renders from its state records -
// a recreated webview otherwise replays the stale last-sent html.
postMsg({ name: 'panelReady' });

function currentSortMode() {
  var root = document.getElementById('notes-in-list-root');
  return root ? (root.dataset.sort || '') : '';
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

// Fade/slide-in for interactively expanded containers. Applied only from
// user toggles so full re-renders don't flash the whole tree.
function animateExpand(el) {
  if (!el) return;
  el.classList.remove('anim-expand');
  void el.offsetWidth; // restart the animation
  el.classList.add('anim-expand');
}

// Collapse/expand a folder entirely in the DOM (icons swap via CSS on the
// .collapsed class). The backend is only notified for state bookkeeping.
function toggleFolderLocal(item, id) {
  var collapsed = item.classList.toggle('collapsed');
  var children = document.querySelector('.children[data-folder-id="' + id + '"]');
  if (children) children.classList.toggle('collapsed', collapsed);
  if (!collapsed) animateExpand(children);
  var toggle = item.querySelector('.toggle');
  if (toggle) {
    toggle.textContent = collapsed ? '\u25B6' : '\u25BC';
    toggle.classList.toggle('expanded', !collapsed);
  }
}

// Collapse EVERY main-tree folder in the DOM directly. Done locally (not via a
// backend refresh) because Joplin's setHtml de-dupes identical HTML: after a
// manual expand the re-rendered "all collapsed" tree matches the last one sent
// and the update is skipped, so the button would appear dead. Pinned items
// (.pinned-item) have no children container and are left untouched.
function collapseAllLocal() {
  // Scoped to #main-tree: trash folders, smart folders and tag rows have
  // their own toggle logic - flipping their arrows here desynced them.
  var container = document.getElementById('main-tree');
  if (!container) return;
  container.querySelectorAll('.tree-item.folder').forEach(function(item) {
    item.classList.add('collapsed');
    var toggle = item.querySelector('.toggle');
    if (toggle) { toggle.textContent = '\u25B6'; toggle.classList.remove('expanded'); }
  });
  container.querySelectorAll('.children').forEach(function(ch) {
    ch.classList.add('collapsed');
  });
}

// Collapse or expand the four section headers (pinned / smart / tags / trash)
// in the DOM, for the "collapse all sections" scope (#19). Returns true if any
// section was present. Backend records the state via the collapse/expand msg.
function setSectionsCollapsed(collapsed) {
  var pairs = [
    ['pinned-header', 'pinned-body'],
    ['smart-header', 'smart-section-body'],
    ['tags-header', 'tags-body'],
    ['trash-header', 'trash-children'],
  ];
  var any = false;
  for (var i = 0; i < pairs.length; i++) {
    var hdr = document.getElementById(pairs[i][0]);
    var body = document.getElementById(pairs[i][1]);
    if (!hdr) continue;
    any = true;
    hdr.classList.toggle('collapsed', collapsed);
    if (body) body.classList.toggle('collapsed', collapsed);
    var arr = hdr.querySelector('.toggle');
    if (arr) arr.textContent = collapsed ? '▶' : '▼';
  }
  return any;
}

function collapseScope() {
  var root = document.getElementById('notes-in-list-root');
  return root ? (root.dataset.collapseScope || 'notebooksOnly') : 'notebooksOnly';
}

// Skeleton expand: unfold the whole FOLDER hierarchy but keep leaf folders
// (no sub-notebooks) collapsed, so note rows mostly stay hidden and the
// tree doesn't explode in length. Returns the ids left collapsed so the
// backend can record matching state. (Mixed folders that hold notes AND
// sub-notebooks do reveal their direct notes - that's inherent to the tree.)
function expandAllLocal() {
  var container = document.getElementById('main-tree');
  if (!container) return [];
  var stillCollapsed = [];
  container.querySelectorAll('.tree-item.folder').forEach(function(item) {
    var fid = item.dataset.id;
    var kids = document.querySelector('.children[data-folder-id="' + fid + '"]');
    var hasSubfolder = kids && kids.querySelector('.tree-item.folder');
    var toggle = item.querySelector('.toggle');
    if (hasSubfolder) {
      item.classList.remove('collapsed');
      if (kids) kids.classList.remove('collapsed');
      if (toggle) { toggle.textContent = '\u25BC'; toggle.classList.add('expanded'); }
    } else {
      item.classList.add('collapsed');
      if (kids) kids.classList.add('collapsed');
      if (toggle) { toggle.textContent = '\u25B6'; toggle.classList.remove('expanded'); }
      if (fid) stillCollapsed.push(fid);
    }
  });
  return stillCollapsed;
}

// Apply an exact collapsed set to the main tree (Expand All modes
// 'restore' and 'all'). Returns the ids actually left collapsed.
function applyCollapsedSet(ids) {
  var set = {};
  for (var ai = 0; ai < ids.length; ai++) set[ids[ai]] = true;
  var applied = [];
  var container = document.getElementById('main-tree');
  if (!container) return applied;
  container.querySelectorAll('.tree-item.folder').forEach(function(item) {
    var fid = item.dataset.id;
    var kids = document.querySelector('.children[data-folder-id="' + fid + '"]');
    var toggle = item.querySelector('.toggle');
    var collapse = !!set[fid];
    item.classList.toggle('collapsed', collapse);
    if (kids) kids.classList.toggle('collapsed', collapse);
    if (toggle) { toggle.textContent = collapse ? '\u25B6' : '\u25BC'; toggle.classList.toggle('expanded', !collapse); }
    if (collapse && fid) applied.push(fid);
  });
  return applied;
}

// Snapshot taken by the Collapse All click (webview copy; the backend keeps
// the authoritative one across re-renders via the root dataset).
var _collapseSnapshot = null;

// Expand every collapsed ancestor of a tree row directly in the DOM.
// Needed before scrolling to a located folder: after a local collapse-all
// the backend's re-rendered HTML can be IDENTICAL to the last HTML it sent
// (Joplin's setHtml de-dupes), so no re-render happens, the DOM stays
// collapsed, and scrollIntoView on the hidden target row silently no-ops.
function expandAncestorsLocal(el) {
  var expanded = [];
  var ch = el.closest('.children');
  while (ch) {
    if (ch.classList.contains('collapsed')) { ch.classList.remove('collapsed'); if (ch.dataset.folderId) expanded.push(ch.dataset.folderId); }
    var row = document.querySelector('.tree-item.folder:not(.pinned-item)[data-id="' + ch.dataset.folderId + '"]');
    if (row) {
      row.classList.remove('collapsed');
      var tg = row.querySelector('.toggle');
      if (tg) { tg.textContent = '\u25BC'; tg.classList.add('expanded'); }
    }
    ch = ch.parentElement ? ch.parentElement.closest('.children') : null;
  }
  return expanded;
}

// ---- hover preview ----
var _hoverTimer = null;
var _hoverNoteId = '';

function hidePreview() {
  if (_hoverTimer) { clearTimeout(_hoverTimer); _hoverTimer = null; }
  _hoverNoteId = '';
  var pv = document.getElementById('note-preview');
  if (pv) pv.remove();
}

function hoverPreviewEnabled() {
  var root = document.getElementById('notes-in-list-root');
  return !root || root.dataset.hoverPreview !== '0';
}

document.addEventListener('mouseover', function(e) {
  if (!hoverPreviewEnabled()) return;
  // No previews while a context menu is open - they'd fight for attention.
  if (document.getElementById('ctx-menu')) { hidePreview(); return; }
  var row = e.target.closest ? e.target.closest('.tree-item.note') : null;
  if (!row) { hidePreview(); return; }
  var id = row.dataset.id;
  if (!id || id === _hoverNoteId) return;
  hidePreview();
  _hoverNoteId = id;
  _hoverTimer = setTimeout(function() {
    if (_hoverNoteId === id && !document.querySelector('.tree-item.dragging')) {
      postMsg({ name: 'notePreview', id: id });
    }
  }, 450);
});

document.addEventListener('scroll', function() { hidePreview(); }, true);
document.addEventListener('mousedown', function() { hidePreview(); });
document.addEventListener('dragstart', function() { hidePreview(); });

function showPreview(m) {
  if (m.id !== _hoverNoteId) return; // hover moved on
  if (document.getElementById('ctx-menu')) return; // menu open - stay quiet
  var row = document.querySelector('.tree-item.note[data-id="' + m.id + '"]');
  if (!row || !row.matches(':hover')) return;
  var old = document.getElementById('note-preview');
  if (old) old.remove();
  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
      + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  var pv = document.createElement('div');
  pv.id = 'note-preview';
  var titleEl = document.createElement('div');
  titleEl.className = 'note-preview-title';
  titleEl.textContent = m.title;
  pv.appendChild(titleEl);
  var metaEl = document.createElement('div');
  metaEl.className = 'note-preview-meta';
  var lines = [
    T('pvType') + ': ' + (m.isTodo ? T('pvTodo') : T('pvNote')) + ' \u00B7 ' + T('pvSize') + ': ' + (m.size || 0) + ' ' + T('pvChars'),
    T('pvCreated') + ': ' + fmtTime(m.created),
    T('pvUpdated') + ': ' + fmtTime(m.updated),
  ];
  for (var li = 0; li < lines.length; li++) {
    var lineEl = document.createElement('div');
    lineEl.textContent = lines[li];
    metaEl.appendChild(lineEl);
  }
  pv.appendChild(metaEl);
  var bodyEl = document.createElement('div');
  bodyEl.className = 'note-preview-body';
  bodyEl.textContent = m.snippet || '';
  if (m.snippet) pv.appendChild(bodyEl);
  document.body.appendChild(pv);
  var rect = row.getBoundingClientRect();
  var pvRect = pv.getBoundingClientRect();
  var top = rect.bottom + 4;
  if (top + pvRect.height > window.innerHeight - 8) top = Math.max(8, rect.top - pvRect.height - 4);
  pv.style.top = top + 'px';
  pv.style.left = Math.max(8, Math.min(rect.left + 20, window.innerWidth - pvRect.width - 8)) + 'px';
}

// Close popups when focus leaves the panel (clicks in the editor or any
// other part of the app never bubble into this webview).
window.addEventListener('blur', function() {
  var openMenu = document.getElementById('ctx-menu');
  if (openMenu) openMenu.remove();
  hidePreview();
});

// ---- Single click dispatcher ----
// One listener instead of five separate document-level click handlers whose
// behaviour silently depended on registration order (the old chain removed
// the context menu in one listener and then handled the click on the
// already-detached menu item in another).
document.addEventListener('click', function(e) {
  // 1. Context menu item: act, close menu, done.
  var ctxItem = e.target.closest('.ctx-item');
  if (ctxItem) {
    // Toolbar dropdown entries post their message name directly.
    if (ctxItem.dataset.msg) {
      postMsg({ name: ctxItem.dataset.msg });
      var tmenu = document.getElementById('ctx-menu');
      if (tmenu) tmenu.remove();
      return;
    }
    // Drill-in submenu: swap the menu content to the format list; the back
    // row restores the stashed main menu. Neither closes the menu.
    if (ctxItem.classList.contains('ctx-drill')) {
      var menuEl = document.getElementById('ctx-menu');
      var tpl = menuEl ? menuEl.querySelector('.ctx-export-template') : null;
      if (menuEl && tpl) {
        window._ctxMainHtml = menuEl.innerHTML;
        menuEl.innerHTML = '<div class="ctx-item ctx-back">\u25C2 ' + (tpl.dataset.title || '') + '</div>'
          + '<div class="ctx-sep"></div>' + tpl.innerHTML;
      }
      return;
    }
    if (ctxItem.classList.contains('ctx-back')) {
      var menuBack = document.getElementById('ctx-menu');
      if (menuBack && window._ctxMainHtml) menuBack.innerHTML = window._ctxMainHtml;
      return;
    }
    if (!ctxItem.dataset.action) return;
    postMsg({
      name: 'contextMenu',
      action: ctxItem.dataset.action,
      id: ctxItem.dataset.id,
      itemType: ctxItem.dataset.type,
      tagId: ctxItem.dataset.tagId,
      format: ctxItem.dataset.format,
    });
    var openMenu = document.getElementById('ctx-menu');
    if (openMenu) openMenu.remove();
    return;
  }

  // 2. Any other click closes an open context menu.
  var existingMenu = document.getElementById('ctx-menu');
  if (existingMenu) existingMenu.remove();

  // 2b. Published-note link badge -> open the native publish dialog (the
  // share URL only exists server-side, so the dialog is where the link is).
  var sharedBadge = e.target.closest('.shared-badge');
  if (sharedBadge) {
    var badgeRow = sharedBadge.closest('.tree-item');
    if (badgeRow && badgeRow.dataset.id) {
      postMsg({ name: 'contextMenu', action: 'publishNote', id: badgeRow.dataset.id, itemType: 'note' });
    }
    return;
  }

  // 3. Tag in search results -> load its notes.
  var tagItem = e.target.closest('.search-tag-item');
  if (tagItem) {
    if (tagItem.dataset.tagId) postMsg({ name: 'loadTagNotes', tagId: tagItem.dataset.tagId });
    return;
  }

  // 4. Folder in search results -> locate in tree.
  var searchFolderItem = e.target.closest('.search-folder-item');
  if (searchFolderItem) {
    if (searchFolderItem.dataset.folderId) postMsg({ name: 'locateFolder', folderId: searchFolderItem.dataset.folderId });
    return;
  }

  // 5. Pinned section header -> local collapse toggle, backend records state.
  var pinnedHeader = e.target.closest('.pinned-section-header');
  if (pinnedHeader) {
    var pinnedCollapsed = pinnedHeader.classList.toggle('collapsed');
    var pinnedBody = document.getElementById('pinned-body');
    if (pinnedBody) pinnedBody.classList.toggle('collapsed', pinnedCollapsed);
    if (!pinnedCollapsed) animateExpand(pinnedBody);
    var pinnedToggle = pinnedHeader.querySelector('.toggle');
    if (pinnedToggle) pinnedToggle.textContent = pinnedCollapsed ? '\u25B6' : '\u25BC';
    postMsg({ name: 'togglePinnedCollapse' });
    return;
  }

  // 5b. Tags section header -> local collapse toggle, backend records state.
  var tagsHeader = e.target.closest('.tags-section-header');
  if (tagsHeader) {
    var tagsNowCollapsed = tagsHeader.classList.toggle('collapsed');
    var tagsBody = document.getElementById('tags-body');
    if (tagsBody) tagsBody.classList.toggle('collapsed', tagsNowCollapsed);
    if (!tagsNowCollapsed) animateExpand(tagsBody);
    var tagsToggle = tagsHeader.querySelector('.toggle');
    if (tagsToggle) tagsToggle.textContent = tagsNowCollapsed ? '\u25B6' : '\u25BC';
    postMsg({ name: 'toggleTagsSection' });
    return;
  }

  // 5b1. Smart folders: section header + row expand (lazy search).
  var smartHeader = e.target.closest('.smart-section-header');
  if (smartHeader) {
    var smartNowCollapsed = smartHeader.classList.toggle('collapsed');
    var smartBody = document.getElementById('smart-body');
    if (smartBody) smartBody.classList.toggle('collapsed', smartNowCollapsed);
    if (!smartNowCollapsed) animateExpand(smartBody);
    var smartToggle = smartHeader.querySelector('.toggle');
    if (smartToggle) smartToggle.textContent = smartNowCollapsed ? '\u25B6' : '\u25BC';
    postMsg({ name: 'toggleSmartSection' });
    return;
  }
  var smartFolderRow = e.target.closest('.smart-folder');
  if (smartFolderRow) {
    var smId = smartFolderRow.dataset.smartId;
    var smKids = document.querySelector('.smart-children[data-smart-id="' + smId + '"]');
    if (!smKids) return;
    var smCollapsed = smKids.classList.toggle('collapsed');
    smartFolderRow.classList.toggle('collapsed', smCollapsed);
    if (!smCollapsed) animateExpand(smKids);
    var smArrow = smartFolderRow.querySelector('.toggle');
    if (smArrow) smArrow.textContent = smCollapsed ? '\u25B6' : '\u25BC';
    // Re-query on every expand - smart folder contents change constantly.
    if (!smCollapsed) {
      postMsg({ name: 'smartFolderNotes', smartId: smId, query: smartFolderRow.dataset.query });
    }
    return;
  }

  // 5b2. Trash section header -> local toggle; first expand fetches notes.
  var trashHeader = e.target.closest('.trash-section-header');
  if (trashHeader) {
    var trashNowCollapsed = trashHeader.classList.toggle('collapsed');
    var trashKids = document.getElementById('trash-children');
    if (trashKids) trashKids.classList.toggle('collapsed', trashNowCollapsed);
    if (!trashNowCollapsed) animateExpand(trashKids);
    var trashToggle = trashHeader.querySelector('.toggle');
    if (trashToggle) trashToggle.textContent = trashNowCollapsed ? '\u25B6' : '\u25BC';
    postMsg({ name: 'toggleTrashSection' });
    if (!trashNowCollapsed && trashKids && !trashKids.dataset.loaded) {
      postMsg({ name: 'trashNotes' });
    }
    return;
  }

  // 5c. Tag folder -> expand/collapse locally; first expand fetches notes.
  var tagFolder = e.target.closest('.tag-folder');
  if (tagFolder) {
    var tfId = tagFolder.dataset.tagId;
    var tagKids = document.querySelector('.tag-children[data-tag-id="' + tfId + '"]');
    if (!tagKids) return;
    var tagNowCollapsed = tagKids.classList.toggle('collapsed');
    tagFolder.classList.toggle('collapsed', tagNowCollapsed);
    if (!tagNowCollapsed) animateExpand(tagKids);
    var tfToggle = tagFolder.querySelector('.toggle');
    if (tfToggle) tfToggle.textContent = tagNowCollapsed ? '\u25B6' : '\u25BC';
    if (!tagNowCollapsed && !tagKids.dataset.loaded) {
      postMsg({ name: 'tagFolderNotes', tagId: tfId });
    }
    return;
  }

  // 6. Search result section header -> collapse/expand that section.
  var sectionHeader = e.target.closest('.search-section-header');
  if (sectionHeader) {
    var sectionBody = document.getElementById('search-section-' + sectionHeader.dataset.section);
    if (sectionBody) {
      var sectionToggle = sectionHeader.querySelector('.section-toggle');
      if (sectionBody.classList.contains('collapsed')) {
        sectionBody.classList.remove('collapsed');
        if (sectionToggle) sectionToggle.textContent = '\u25BC';
      } else {
        sectionBody.classList.add('collapsed');
        if (sectionToggle) sectionToggle.textContent = '\u25B6';
      }
    }
    return;
  }

  // 7. Tree item: open note / toggle folder.
  var item = e.target.closest('.tree-item');
  if (item) {
    if (item.dataset.trash === '1') {
      // Deleted notebooks expand to show their notes; deleted notes open
      // read-only like in Joplin's own trash; manage via the context menu.
      // Trash folders render as a FLAT DFS list with depth attributes, so
      // collapse must sweep the row's subtree region: every following row
      // with a greater depth belongs to it (fixes sub-notebooks staying
      // visible after collapsing their parent).
      if (item.dataset.type === 'folder') {
        var tfArrow = item.querySelector('.toggle');
        if (!tfArrow || !tfArrow.textContent) return; // leaf: nothing to toggle
        var tfDepth = Number(item.dataset.depth || 0);
        var collapsing = tfArrow.textContent === '\u25BC';
        var tfKids = document.querySelector('.trash-folder-children[data-folder-id="' + item.dataset.id + '"]');
        var el = item.nextElementSibling;
        while (el) {
          if (el.classList.contains('trash-folder-children')) {
            var cd = Number(el.dataset.depth || 0);
            if (el === tfKids) {
              el.classList.toggle('collapsed', collapsing);
            } else if (cd > tfDepth) {
              el.classList.add('collapsed'); // descendants re-fold
            } else { break; }
          } else if (el.classList.contains('tree-item') && el.dataset.trash === '1' && el.dataset.type === 'folder') {
            var rd = Number(el.dataset.depth || 0);
            if (rd <= tfDepth) break;
            if (collapsing) {
              el.classList.add('trash-hidden');
            } else {
              // Expanding reveals ONE level; deeper stays hidden & folded.
              el.classList.toggle('trash-hidden', rd !== tfDepth + 1);
            }
            var ca = el.querySelector('.toggle');
            if (ca && ca.textContent) ca.textContent = '\u25B6';
          } else {
            break; // reached the loose root-level notes (or the end)
          }
          el = el.nextElementSibling;
        }
        tfArrow.textContent = collapsing ? '\u25B6' : '\u25BC';
        if (!collapsing && tfKids) {
          animateExpand(tfKids);
          if (!tfKids.dataset.loaded) {
            postMsg({ name: 'trashFolderNotes', folderId: item.dataset.id });
          }
        }
      } else if (item.dataset.type === 'note') {
        postMsg({ name: 'openNote', id: item.dataset.id });
      }
      return;
    }
    var type = item.dataset.type;
    var id = item.dataset.id;
    var isPinnedItem = item.classList.contains('pinned-item');

    if (type === 'note') {
      document.querySelectorAll('.tree-item.note.selected').forEach(function(el) {
        el.classList.remove('selected');
      });
      item.classList.add('selected');
      postMsg({ name: 'openNote', id: id });
    } else if (type === 'folder') {
      if (isPinnedItem) {
        // Pinned folder: expand to it in tree and scroll
        postMsg({ name: 'locatePinnedFolder', folderId: id });
      } else {
        // Toggle locally (no re-render, keeps scroll), backend just records state
        toggleFolderLocal(item, id);
        postMsg({ name: 'toggleFolder', id: id });
        // Browsing invalidates a pending "Expand (restore)": once the user
        // manually expands a folder, restoring the pre-collapse snapshot
        // would wipe what they just opened (#11). Flip the button back to
        // Collapse mode; the next collapse re-snapshots the current state.
        if (!item.classList.contains('collapsed')) {
          var caBtn2 = document.getElementById('btn-collapse-all');
          if (caBtn2 && caBtn2.dataset.mode === 'expand') {
            caBtn2.dataset.mode = 'collapse';
            caBtn2.textContent = '▲';
            caBtn2.title = T('collapseAll');
          }
        }
      }
    }
    return;
  }

  // 8. Toolbar buttons.
  var btn = e.target.closest('button');
  if (!btn) return;
  switch (btn.id) {
    case 'btn-new': {
      var oldMenu = document.getElementById('ctx-menu');
      if (oldMenu) { oldMenu.remove(); break; }
      var newBtn = document.getElementById('btn-new');
      if (!newBtn) break;
      var nbRect = newBtn.getBoundingClientRect();
      document.body.insertAdjacentHTML('beforeend',
        '<div id="ctx-menu" class="context-menu" style="left:' + nbRect.left + 'px;top:' + (nbRect.bottom + 2) + 'px;">'
        + '<div class="ctx-item" data-msg="newNotebook"><span class="ctx-icon">\uD83D\uDCC1</span>' + T('newNotebook') + '</div>'
        + '<div class="ctx-item" data-msg="newNote"><span class="ctx-icon">\uD83D\uDCDD</span>' + T('newNote') + '</div>'
        + '<div class="ctx-item" data-msg="newTodo"><span class="ctx-icon">\u2610</span>' + T('newTodo') + '</div>'
        + '</div>');
      break;
    }
    case 'btn-sort': postMsg({ name: 'cycleSort' }); break;
    case 'btn-collapse-all': {
      var caBtn = document.getElementById('btn-collapse-all');
      var rootEl0 = document.getElementById('notes-in-list-root');
      var caMode = rootEl0 ? (rootEl0.dataset.expandMode || 'restore') : 'restore';
      // collapseOnly (#19): always collapse, never expand; keep the button
      // fixed in Collapse state.
      var withSections = collapseScope() === 'allSections';
      if (caMode === 'collapseOnly') {
        collapseAllLocal();
        var sec0 = withSections ? setSectionsCollapsed(true) : false;
        postMsg({ name: 'collapseAll', sections: sec0 });
        if (caBtn) { caBtn.dataset.mode = 'collapse'; caBtn.textContent = '▲'; caBtn.title = T('collapseAll'); }
        break;
      }
      if (caBtn && caBtn.dataset.mode === 'expand') {
        var rootEl = document.getElementById('notes-in-list-root');
        var expandMode = rootEl ? (rootEl.dataset.expandMode || 'restore') : 'restore';
        var stillCollapsed;
        if (expandMode === 'all') {
          stillCollapsed = applyCollapsedSet([]);
        } else if (expandMode === 'restore') {
          var snap = _collapseSnapshot;
          if (!snap && rootEl) {
            try { snap = JSON.parse(rootEl.dataset.collapseSnapshot || 'null'); } catch (se) { snap = null; }
          }
          // No snapshot yet (never collapsed this session) - skeleton fallback.
          stillCollapsed = Array.isArray(snap) ? applyCollapsedSet(snap) : expandAllLocal();
        } else {
          stillCollapsed = expandAllLocal(); // skeleton
        }
        // Expand must always DO something in 'restore'/'all': a degenerate
        // snapshot ("all collapsed") would leave the tree untouched while the
        // button flips - reads as inverted. Fall back to a full expand. NOT
        // for 'skeleton': on a flat tree it legitimately expands nothing, and
        // forcing a full expand would contradict the skeleton setting (#17).
        var mainFolderCount = document.querySelectorAll('#main-tree .tree-item.folder').length;
        if (expandMode !== 'skeleton' && mainFolderCount > 0 && stillCollapsed.length >= mainFolderCount) {
          stillCollapsed = applyCollapsedSet([]);
        }
        var secX = withSections ? setSectionsCollapsed(false) : false;
        postMsg({ name: 'expandAll', collapsedIds: stillCollapsed, sections: secX });
        caBtn.dataset.mode = 'collapse';
        caBtn.textContent = '\u25B2';
        caBtn.title = T('collapseAll');
      } else {
        var pre = [];
        var mainTotal = 0;
        document.querySelectorAll('#main-tree .tree-item.folder').forEach(function(fitem) {
          if (!fitem.dataset.id) return;
          mainTotal++;
          if (fitem.classList.contains('collapsed')) pre.push(fitem.dataset.id);
        });
        collapseAllLocal();
        var secC = withSections ? setSectionsCollapsed(true) : false;
        if (pre.length >= mainTotal && mainTotal > 0) {
          // Tree was already fully collapsed - keep the previous (useful)
          // snapshot instead of overwriting it with "everything collapsed",
          // which would turn the next Restore into a no-op.
          postMsg({ name: 'collapseAll', sections: secC });
        } else {
          _collapseSnapshot = pre;
          postMsg({ name: 'collapseAll', prevCollapsed: pre, sections: secC });
        }
        if (caBtn) {
          caBtn.dataset.mode = 'expand';
          caBtn.textContent = '\u25BC';
          caBtn.title = T('expandAll');
        }
      }
      break;
    }
    case 'btn-refresh': postMsg({ name: 'refreshView' }); break;
    case 'btn-sync':
      if (!btn.disabled) {
        btn.disabled = true;
        btn.classList.add('syncing');
        btn.textContent = '\uD83D\uDD04 ' + T('syncing');
        postMsg({ name: 'sync' });
      }
      break;
  }
});

// Right click: context menu
document.addEventListener('contextmenu', function(e) {
  hidePreview();
  var existingMenu = document.getElementById('ctx-menu');
  if (existingMenu) existingMenu.remove();

  // Trash section header: single "empty trash" action.
  var trashHdr = e.target.closest('.trash-section-header');
  if (trashHdr) {
    e.preventDefault();
    document.body.insertAdjacentHTML('beforeend',
      '<div id="ctx-menu" class="context-menu" style="left:' + e.pageX + 'px;top:' + e.pageY + 'px;">'
      + '<div class="ctx-item ctx-danger" data-action="emptyTrash" data-type="trashSection" data-id="trash">' + T('ctxEmptyTrash') + '</div>'
      + '</div>');
    return;
  }

  var item = e.target.closest('.tree-item');
  if (!item) return;

  e.preventDefault();

  var type = item.dataset.type;
  var id = item.dataset.id;
  // Virtual rows (smart folders) have no real item behind them - no menu,
  // and the browser default stays suppressed.
  if (type === 'smart') return;
  var title = '';
  var labelEl = item.querySelector('.label');
  if (labelEl) title = labelEl.textContent;

  var menuHtml = '<div id="ctx-menu" class="context-menu" style="left:' + e.pageX + 'px;top:' + e.pageY + 'px;">';

  if (item.dataset.trash === '1') {
    var trashType = type === 'folder' ? 'trashFolder' : 'trashNote';
    menuHtml += '<div class="ctx-item" data-action="restoreItem" data-id="' + id + '" data-type="' + trashType + '">' + T('ctxRestoreNote') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="permanentDeleteItem" data-id="' + id + '" data-type="' + trashType + '">' + T('ctxPermanentDelete') + '</div>';
  } else if (type === 'folder') {
    var isFolderPinned = isPinned(id);
    menuHtml += '<div class="ctx-item" data-action="' + (isFolderPinned ? 'unpinFolder' : 'pinFolder') + '" data-id="' + id + '" data-type="folder">' + (isFolderPinned ? T('ctxUnpin') : T('ctxPin')) + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="newNote" data-id="' + id + '" data-type="folder">' + T('ctxNewNoteHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newTodo" data-id="' + id + '" data-type="folder">' + T('ctxNewTodoHere') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="newSubNotebook" data-id="' + id + '" data-type="folder">' + T('ctxNewSubNotebook') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="importFiles" data-id="' + id + '" data-type="folder">' + T('ctxImportFiles') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameFolder" data-id="' + id + '" data-type="folder" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameFolder') + '</div>';
    // Export drill-in (folders can't do PDF - that's a single-note command).
    menuHtml += '<div class="ctx-item ctx-drill">' + T('ctxExportFolder') + '<span class="ctx-sub-arrow">▸</span></div>';
    menuHtml += '<div class="ctx-export-template" style="display:none" data-title="' + T('ctxExportFolder') + '">'
      + '<div class="ctx-item" data-action="exportFolder" data-format="jex" data-id="' + id + '" data-type="folder">JEX</div>'
      + '<div class="ctx-item" data-action="exportFolder" data-format="md" data-id="' + id + '" data-type="folder">Markdown</div>'
      + '<div class="ctx-item" data-action="exportFolder" data-format="md_frontmatter" data-id="' + id + '" data-type="folder">Markdown + Front Matter</div>'
      + '<div class="ctx-item" data-action="exportFolder" data-format="html" data-id="' + id + '" data-type="folder">HTML</div>'
      + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteFolder" data-id="' + id + '" data-type="folder">' + T('ctxDeleteFolder') + '</div>';
  } else if (type === 'note') {
    var isNotePinned = isPinned(id);
    menuHtml += '<div class="ctx-item" data-action="' + (isNotePinned ? 'unpinNote' : 'pinNote') + '" data-id="' + id + '" data-type="note">' + (isNotePinned ? T('ctxUnpin') : T('ctxPin')) + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="openNote" data-id="' + id + '" data-type="note">' + T('ctxOpenNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="openInNewWindow" data-id="' + id + '" data-type="note">' + T('ctxOpenInNewWindow') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    // Native-menu order: tags, type switch, move, duplicate...
    menuHtml += '<div class="ctx-item" data-action="setTags" data-id="' + id + '" data-type="note">' + T('ctxSetTags') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="switchNoteType" data-id="' + id + '" data-type="note">' + T('ctxSwitchNoteType') + '</div>';
    // "Toggle completed" only makes sense for to-do notes - the backend
    // ignores it for plain notes anyway, so don't offer it.
    if (item.dataset.todo === '1') {
      menuHtml += '<div class="ctx-item" data-action="toggleTodo" data-id="' + id + '" data-type="note">' + T('ctxToggleTodo') + '</div>';
    }
    menuHtml += '<div class="ctx-item" data-action="moveToFolderDialog" data-id="' + id + '" data-type="note">' + T('ctxMoveToFolder') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="duplicateNote" data-id="' + id + '" data-type="note">' + T('ctxDuplicateNote') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    // ...then the copy pair...
    menuHtml += '<div class="ctx-item" data-action="copyLink" data-id="' + id + '" data-type="note">' + T('ctxCopyLink') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="copyExternalLink" data-id="' + id + '" data-type="note">' + T('ctxCopyExternalLink') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    // ...then publish/export. Unlike the native menu, Delete stays LAST.
    menuHtml += '<div class="ctx-item" data-action="publishNote" data-id="' + id + '" data-type="note">' + T('ctxPublishNote') + '</div>';
    menuHtml += '<div class="ctx-item ctx-drill">' + T('ctxExport') + '<span class="ctx-sub-arrow">\u25B8</span></div>';
    menuHtml += '<div class="ctx-export-template" style="display:none" data-title="' + T('ctxExport') + '">'
      + '<div class="ctx-item" data-action="exportPdf" data-id="' + id + '" data-type="note">PDF</div>'
      + '<div class="ctx-item" data-action="exportNote" data-format="md" data-id="' + id + '" data-type="note">Markdown</div>'
      + '<div class="ctx-item" data-action="exportNote" data-format="md_frontmatter" data-id="' + id + '" data-type="note">Markdown + Front Matter</div>'
      + '<div class="ctx-item" data-action="exportNote" data-format="jex" data-id="' + id + '" data-type="note">JEX</div>'
      + '<div class="ctx-item" data-action="exportNote" data-format="html" data-id="' + id + '" data-type="note">HTML</div>'
      + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item" data-action="renameNote" data-id="' + id + '" data-type="note" data-title="' + title.replace(/"/g, '&quot;') + '">' + T('ctxRenameNote') + '</div>';
    menuHtml += '<div class="ctx-item" data-action="noteInfo" data-id="' + id + '" data-type="note">' + T('ctxNoteInfo') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteNote" data-id="' + id + '" data-type="note">' + T('ctxDeleteNote') + '</div>';
    if (item.dataset.tagId) {
      menuHtml += '<div class="ctx-sep"></div>';
      menuHtml += '<div class="ctx-item" data-action="untagNote" data-id="' + id + '" data-type="note" data-tag-id="' + item.dataset.tagId + '">' + T('ctxUntagNote') + '</div>';
    }
  } else if (type === 'tag') {
    var ctxTagId = item.dataset.tagId;
    menuHtml += '<div class="ctx-item" data-action="renameTag" data-id="' + ctxTagId + '" data-type="tag">' + T('ctxRenameTag') + '</div>';
    menuHtml += '<div class="ctx-sep"></div>';
    menuHtml += '<div class="ctx-item ctx-danger" data-action="deleteTag" data-id="' + ctxTagId + '" data-type="tag">' + T('ctxDeleteTag') + '</div>';
  }

  menuHtml += '</div>';
  // Safety net: never render an empty shell if no branch added items.
  if (menuHtml.indexOf('ctx-item') < 0) return;
  document.body.insertAdjacentHTML('beforeend', menuHtml);

  var menu = document.getElementById('ctx-menu');
  var rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';
});

// Close context menu
document.addEventListener('mousedown', function(e) {
  if (!e.target.closest('#ctx-menu')) {
    var menu = document.getElementById('ctx-menu');
    if (menu) menu.remove();
  }
});

// Listen for messages from plugin backend
webviewApi.onMessage(function(msg) {
  if (!msg || !msg.message) return;
  var m = msg.message;

  if (m.name === 'syncState') {
    var syncBtn = document.getElementById('btn-sync');
    if (!syncBtn) return;
    if (m.state === 'syncing') {
      syncBtn.disabled = true;
      syncBtn.classList.remove('sync-done', 'sync-error');
      syncBtn.classList.add('syncing');
      syncBtn.textContent = '\uD83D\uDD04 ' + T('syncing');
    } else if (m.state === 'done') {
      syncBtn.classList.remove('syncing', 'sync-error');
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
    } else if (m.state === 'error') {
      syncBtn.classList.remove('syncing', 'sync-done');
      syncBtn.classList.add('sync-error');
      syncBtn.textContent = T('syncFailed');
      // Show "failed" for 4 seconds, then restore
      setTimeout(function() {
        var btn = document.getElementById('btn-sync');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('sync-error');
          btn.textContent = '\uD83D\uDD04 ' + T('sync');
        }
      }, 4000);
    }
  } else if (m.name === 'searchResults') {
    // Ignore stale search results
    if (m.searchId !== undefined && m.searchId !== _searchId) return;
    if (!m.notes && !m.tags && !m.folders) {
      if (_searchMode) exitSearchMode();
    } else {
      renderSearchResults(m.notes || [], m.tags || [], m.folders || [], m.query);
    }
  } else if (m.name === 'tagFolderNotes') {
    var tagKidsEl = document.querySelector('.tag-children[data-tag-id="' + m.tagId + '"]');
    if (tagKidsEl) {
      tagKidsEl.dataset.loaded = '1';
      var tagHtml = '';
      for (var tni = 0; tni < m.notes.length; tni++) {
        var tNote = m.notes[tni];
        var tIcon = tNote.is_todo ? (tNote.todo_completed ? '\u2611' : '\u2610') : '\uD83D\uDCDD';
        tagHtml += '<div class="tree-item note tag-note" data-id="' + tNote.id + '" data-type="note" data-tag-id="' + m.tagId + '" data-todo="' + (tNote.is_todo ? 1 : 0) + '">'
          + '<span class="icon note-icon">' + tIcon + '</span>'
          + '<span class="label">' + escapeHtml(tNote.title) + '</span>'
          + '</div>';
      }
      if (!m.notes.length) tagHtml = '<div class="tag-empty">\u2014</div>';
      tagKidsEl.innerHTML = tagHtml;
    }
  } else if (m.name === 'trashNotes') {
    var trashEl = document.getElementById('trash-children');
    if (trashEl) {
      trashEl.dataset.loaded = '1';
      var trHtml = '';
      var trFolders = m.folders || [];
      for (var tfi = 0; tfi < trFolders.length; tfi++) {
        var trF = trFolders[tfi];
        var trDepth = trF.depth || 0;
        var trPad = 34 + trDepth * 16;
        trHtml += '<div class="tree-item folder trash-note" style="padding-left:' + trPad + 'px" data-id="' + trF.id + '" data-type="folder" data-trash="1" data-depth="' + trDepth + '">'
          + '<span class="toggle">' + ((trF.hasNotes || trF.hasSub) ? '\u25B6' : '') + '</span>'
          + '<span class="icon">\uD83D\uDCC1</span>'
          + '<span class="label">' + escapeHtml(trF.title) + '</span>'
          + '</div>';
        if (trF.hasNotes) {
          trHtml += '<div class="trash-folder-children collapsed" data-folder-id="' + trF.id + '" data-depth="' + trDepth + '"></div>';
        }
      }
      var trNotes = m.notes || [];
      for (var tri = 0; tri < trNotes.length; tri++) {
        var trNote = trNotes[tri];
        var trIcon = trNote.is_todo ? (trNote.todo_completed ? '\u2611' : '\u2610') : '\uD83D\uDCDD';
        trHtml += '<div class="tree-item note trash-note" style="padding-left:34px" data-id="' + trNote.id + '" data-type="note" data-trash="1">'
          + '<span class="icon note-icon">' + trIcon + '</span>'
          + '<span class="label">' + escapeHtml(trNote.title) + '</span>'
          + '</div>';
      }
      if (!trHtml) trHtml = '<div class="tag-empty">\u2014</div>';
      trashEl.innerHTML = trHtml;
    }
  } else if (m.name === 'smartFolderNotes') {
    var smEl = document.querySelector('.smart-children[data-smart-id="' + m.smartId + '"]');
    if (smEl) {
      var smHtml = '';
      for (var smi = 0; smi < m.notes.length; smi++) {
        var smNote = m.notes[smi];
        var smIcon = smNote.is_todo ? (smNote.todo_completed ? '\u2611' : '\u2610') : '\uD83D\uDCDD';
        smHtml += '<div class="tree-item note smart-note" style="padding-left:44px" data-id="' + smNote.id + '" data-type="note" data-todo="' + (smNote.is_todo ? 1 : 0) + '">'
          + '<span class="icon note-icon">' + smIcon + '</span>'
          + '<span class="label">' + escapeHtml(smNote.title) + '</span>'
          + '</div>';
      }
      if (!m.notes.length) smHtml = '<div class="tag-empty">\u2014</div>';
      smEl.innerHTML = smHtml;
    }
  } else if (m.name === 'notePreview') {
    showPreview(m);
  } else if (m.name === 'trashFolderNotes') {
    var tfcEl = document.querySelector('.trash-folder-children[data-folder-id="' + m.folderId + '"]');
    if (tfcEl) {
      tfcEl.dataset.loaded = '1';
      var tfcDepth = parseInt(tfcEl.dataset.depth || '0', 10);
      var tfcPad = 34 + (tfcDepth + 1) * 16;
      var tfcHtml = '';
      for (var tfni = 0; tfni < m.notes.length; tfni++) {
        var tfNote = m.notes[tfni];
        var tfIcon = tfNote.is_todo ? (tfNote.todo_completed ? '\u2611' : '\u2610') : '\uD83D\uDCDD';
        tfcHtml += '<div class="tree-item note trash-note" style="padding-left:' + tfcPad + 'px" data-id="' + tfNote.id + '" data-type="note" data-trash="1">'
          + '<span class="icon note-icon">' + tfIcon + '</span>'
          + '<span class="label">' + escapeHtml(tfNote.title) + '</span>'
          + '</div>';
      }
      if (!m.notes.length) tfcHtml = '<div class="tag-empty" style="padding-left:' + tfcPad + 'px">\u2014</div>';
      tfcEl.innerHTML = tfcHtml;
    }
  } else if (m.name === 'tagNotes') {
    // Expand tag inline with its notes
    expandTagNotes(m.tagId, m.notes);
  } else if (m.name === 'scrollToFolder') {
    setTimeout(function() {
      var el = document.querySelector('.tree-item.folder:not(.pinned-item)[data-id="' + m.folderId + '"]');
      if (el) {
        expandAncestorsLocal(el);
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
        expandAncestorsLocal(el);
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
    // Update selection without full re-render, and locate the note in the
    // MAIN TREE (not the tag/pinned copy): expand its collapsed ancestors so
    // it's actually visible, then scroll. Fixes clicking a note under a tag
    // not jumping the tree to it.
    document.querySelectorAll('.tree-item.note.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
    var mainTree = document.getElementById('main-tree');
    var noteEl = mainTree ? mainTree.querySelector('.tree-item.note[data-id="' + m.id + '"]') : null;
    if (!noteEl) noteEl = document.querySelector('.tree-item.note[data-id="' + m.id + '"]');
    if (noteEl) {
      noteEl.classList.add('selected');
      var opened = (mainTree && mainTree.contains(noteEl)) ? expandAncestorsLocal(noteEl) : [];
      noteEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      // Record the reveal so the next backend refresh doesn't re-collapse.
      if (opened.length) postMsg({ name: 'revealNote', folderIds: opened });
    }
  } else if (m.name === 'updateNote') {
    document.querySelectorAll('.tree-item.note[data-id="' + m.id + '"]').forEach(function(el) {
      var label = el.querySelector('.label');
      if (label) label.textContent = m.title;
      var resultTitle = el.querySelector('.search-result-title');
      if (resultTitle) resultTitle.textContent = m.title;
      var icon = el.querySelector('.note-icon');
      if (icon) icon.textContent = m.icon;
      // Badges (checkbox pie + published link) are re-sent as a block.
      el.querySelectorAll('.todo-pie, .shared-badge').forEach(function(b) { b.remove(); });
      if (m.badges) el.insertAdjacentHTML('beforeend', m.badges);
    });
  }
});

// Double-click a note -> open in a new window (#18), like Joplin's own note
// list. Trash/tag/pinned copies included; folders keep their toggle behavior.
document.addEventListener('dblclick', function(e) {
  var t = e.target;
  if (t && t.closest && (t.closest('#ctx-menu') || t.closest('#note-preview'))) return;
  var item = t.closest ? t.closest('.tree-item.note') : null;
  if (!item || item.dataset.trash === '1' || !item.dataset.id) return;
  postMsg({ name: 'contextMenu', action: 'openInNewWindow', id: item.dataset.id, itemType: 'note' });
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
  // Virtual rows never drag: anything in the trash, the whole smart
  // section (rows included), and tag folder rows. Notes listed INSIDE a
  // tag stay draggable (drag out = move / assign another tag).
  if (item.closest('.trash-children') || item.closest('.smart-section-body')
    || item.classList.contains('tag-folder')) { e.preventDefault(); return; }
  var isPinned = item.classList.contains('pinned-item');
  e.dataTransfer.setData('text/plain', JSON.stringify({
    id: item.dataset.id,
    type: item.dataset.type,
    pinned: isPinned,
  }));
  // Joplin-native drag payload (#12): the same mime types the built-in note
  // list sets, so native drop targets (editor -> insert link, Canvas -> note
  // card) accept drags from this panel too.
  if (item.dataset.type === 'note') {
    e.dataTransfer.setData('text/x-jop-note-ids', JSON.stringify([item.dataset.id]));
  } else if (item.dataset.type === 'folder') {
    e.dataTransfer.setData('text/x-jop-folder-ids', JSON.stringify([item.dataset.id]));
  }
  e.dataTransfer.effectAllowed = 'move';
  item.classList.add('dragging');
  // Show drop zones during drag (not for pinned items)
  if (!isPinned) {
    var tc = document.getElementById('tree-container');
    if (tc) {
      tc.classList.add('dragging-active');
      // Empty pinned section renders no header, so drag-to-pin had no
      // landing spot for the FIRST pin (#13). Inject a temporary target -
      // DEFERRED: mutating the DOM synchronously inside dragstart makes
      // Chromium cancel the whole drag (the reflow moves the drag source).
      // After the handler returns the drag snapshot exists and it's safe.
      if (!document.getElementById('pinned-header')) {
        setTimeout(function () {
          if (!document.querySelector('.tree-item.dragging')) return; // drag already over
          if (document.getElementById('pinned-header') || document.getElementById('pinned-drop-ph')) return;
          var ph = document.createElement('div');
          ph.id = 'pinned-drop-ph';
          ph.className = 'pinned-section-header';
          ph.textContent = '📌 ' + T('pinned');
          tc.insertBefore(ph, tc.firstChild);
        }, 0);
      }
    }
  }
});

// ---- edge auto-scroll during drag ----
// dragover only reports positions; scrolling runs on its own rAF loop so
// the speed is smooth and proportional to how deep into the edge zone the
// cursor is. Direction 0 stops the loop.
var _dragScrollDir = 0;
var _dragScrollRaf = null;

function dragScrollStep() {
  var tc = document.getElementById('tree-container');
  if (!tc || !_dragScrollDir) { _dragScrollRaf = null; return; }
  tc.scrollTop += _dragScrollDir;
  _dragScrollRaf = requestAnimationFrame(dragScrollStep);
}

function updateDragScroll(clientY) {
  var tc = document.getElementById('tree-container');
  if (!tc) { _dragScrollDir = 0; return; }
  var rect = tc.getBoundingClientRect();
  // The sticky "drop to create a notebook" zone owns the very bottom of the
  // viewport during drags. The scroll band sits directly ABOVE it, so
  // hovering the band scrolls while hovering the zone itself drops.
  var bottomEdge = rect.bottom;
  var dz = document.getElementById('drop-zone-empty');
  if (dz && tc.classList.contains('dragging-active')) {
    var dzRect = dz.getBoundingClientRect();
    if (dzRect.height > 0 && dzRect.top > rect.top) bottomEdge = dzRect.top;
  }
  var EDGE = 40;
  var dir = 0;
  if (clientY < rect.top + EDGE) dir = -Math.ceil((rect.top + EDGE - clientY) / 4);
  else if (clientY > bottomEdge) dir = 0; // over the drop zone - no scrolling
  else if (clientY > bottomEdge - EDGE) dir = Math.ceil((clientY - (bottomEdge - EDGE)) / 4);
  _dragScrollDir = dir;
  if (dir && !_dragScrollRaf) _dragScrollRaf = requestAnimationFrame(dragScrollStep);
}

function clearDropIndicators() {
  document.querySelectorAll('.drop-target').forEach(function(el) { el.classList.remove('drop-target'); });
  document.querySelectorAll('.drop-above').forEach(function(el) { el.classList.remove('drop-above'); });
  document.querySelectorAll('.drop-below').forEach(function(el) { el.classList.remove('drop-below'); });
}

function endDrag() {
  _dragScrollDir = 0;
  clearDropIndicators();
  var tc = document.getElementById('tree-container');
  if (tc) tc.classList.remove('dragging-active');
  var ph = document.getElementById('pinned-drop-ph');
  if (ph) ph.remove();
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
  // Auto-scroll when the cursor nears the top/bottom edge of the tree.
  if (document.querySelector('.tree-item.dragging')) updateDragScroll(e.clientY);
  var el = e.target;
  if (el && el.nodeType === 3) el = el.parentElement; // text node -> parent element
  if (!el) return;
  var target = el.closest('.tree-item');
  var treeContainer = document.getElementById('tree-container');

  // Drop zone (sticky bottom) — accept unless dragging a pinned item
  var onDropZone = el.closest('#drop-zone-empty');
  if (onDropZone) {
    var draggingPinnedForDZ = document.querySelector('.tree-item.dragging.pinned-item');
    if (!draggingPinnedForDZ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
    return;
  }

  // Pinned header — accept drops to pin items
  var onPinnedHeader = el.closest('.pinned-section-header');
  if (onPinnedHeader) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearDropIndicators();
    return;
  }

  // Pinned body — only accept reorder from other pinned items
  var onPinnedBody = el.closest('.pinned-section-body');
  if (onPinnedBody) {
    var draggingPinned = document.querySelector('.tree-item.dragging.pinned-item');
    if (draggingPinned && target && target.classList.contains('pinned-item')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearDropIndicators();
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

  // Tag folder - accepts notes from anywhere (assigns the tag)
  var onTagFolder = el.closest('.tag-folder');
  if (onTagFolder) {
    if (document.querySelector('.tree-item.note.dragging')) {
      e.preventDefault();
      // Must stay within dragstart's effectAllowed ('move') - a mismatching
      // dropEffect makes the browser show the not-allowed cursor.
      e.dataTransfer.dropEffect = 'move';
      clearDropIndicators();
      onTagFolder.classList.add('drop-target');
    }
    return;
  }
  // Anywhere else inside the tags/trash/smart sections is not a drop target.
  if (el.closest('.tags-section-body') || el.closest('.tags-section-header')
    || el.closest('.trash-children') || el.closest('.trash-section-header')
    || el.closest('.smart-section-body') || el.closest('.smart-section-header')) return;

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
    // Note target: split above/below only makes sense in manual sort mode.
    // Under time/title sort, position is decided by the sort, so we just
    // show a single drop-target highlight meaning "move to this folder".
    if (currentSortMode() === 'manual') {
      if (y < height * 0.5) {
        target.classList.add('drop-above');
      } else {
        target.classList.add('drop-below');
      }
    } else {
      target.classList.add('drop-target');
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

  // Drop on drop zone -> create new notebook (not for pinned items)
  var onDZ = el0 ? el0.closest('#drop-zone-empty') : null;
  if (onDZ && !isDragFromPinned) {
    postMsg({ name: 'dragToEmpty', dragId: dragId, dragType: dragType });
    endDrag();
    return;
  }

  // Drop on pinned header -> pin the item
  var onPinnedH2 = el0 ? el0.closest('.pinned-section-header') : null;
  if (onPinnedH2 && !isDragFromPinned) {
    if (dragType === 'note') {
      postMsg({ name: 'contextMenu', action: 'pinNote', id: dragId, itemType: 'note' });
    } else if (dragType === 'folder') {
      postMsg({ name: 'contextMenu', action: 'pinFolder', id: dragId, itemType: 'folder' });
    }
    endDrag();
    return;
  }

  // Drop on pinned body -> reorder (only from pinned items)
  var onPinnedB2 = el0 ? el0.closest('.pinned-section-body') : null;
  if (onPinnedB2 && isDragFromPinned) {
    var pinnedTarget = target && target.classList.contains('pinned-item') ? target : null;
    if (pinnedTarget && pinnedTarget.dataset.id !== dragId) {
      var rect2 = pinnedTarget.getBoundingClientRect();
      var y2 = e.clientY - rect2.top;
      var pos2 = y2 < rect2.height * 0.5 ? 'before' : 'after';
      postMsg({ name: 'reorderPinned', dragId: dragId, dragType: dragType, targetId: pinnedTarget.dataset.id, position: pos2 });
    }
    endDrag();
    return;
  }

  // Note dropped on a tag folder -> assign that tag
  var onTagF = el0 ? el0.closest('.tag-folder') : null;
  if (onTagF) {
    if (dragType === 'note') {
      postMsg({ name: 'tagNoteAdd', tagId: onTagF.dataset.tagId, noteId: dragId });
    }
    endDrag();
    return;
  }
  if (el0 && (el0.closest('.tags-section-body') || el0.closest('.tags-section-header')
    || el0.closest('.trash-children') || el0.closest('.trash-section-header')
    || el0.closest('.smart-section-body') || el0.closest('.smart-section-header'))) { endDrag(); return; }

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
  } else if (dragType === 'note') {
    // Note dropped on a note: always report above/below from the cursor. The
    // backend decides whether that means an exact reorder (manual sort) or a
    // plain move into the target's folder (time/title sort).
    var notePos = y < height * 0.5 ? 'above' : 'below';
    postMsg({ name: 'dragDrop', dragId: dragId, dragType: dragType, targetId: targetId, position: notePos });
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

function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightText(text, query) {
  var escaped = escapeHtml(text);
  if (!query) return escaped;
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
  var html = '<div class="search-result-item tree-item note" data-id="' + item.id + '" data-type="note" data-todo="' + (item.is_todo ? 1 : 0) + '">';
  html += '<span class="icon note-icon">' + icon + '</span>';
  html += '<div class="search-result-content">';
  html += '<div class="search-result-title">' + highlightText(item.title, query) + '</div>';
  if (item.folderName) {
    html += '<div class="search-result-folder">\uD83D\uDCC2 ' + escapeHtml(item.folderName) + '</div>';
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
      var folderIcon = folder.iconEmoji || '\uD83D\uDCC1';
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

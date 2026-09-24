/* Smart folder manager dialog (#43 follow-up).
 *
 * The rules are stored as ONE "Name:query;Name:query" string setting, and
 * Joplin's settings screen can only render single-line inputs - so the list
 * is edited here instead. The plugin puts the rows, strings and any error
 * from the previous attempt on #smart-dialog as data attributes; this script
 * renders an editable list and mirrors it into the hidden "rules" field as
 * JSON, which is what the native OK button submits.
 *
 * Every open replaces the dialog HTML, and whether an added script re-runs
 * after that is not something to rely on, so init() is driven by a
 * MutationObserver and marks the root it has taken over.
 */
(function () {
  'use strict';

  var T = {};
  var rows = [];
  var root = null;
  var countCache = {};
  var countTimers = {};

  function t(key) { return T[key] || key; }

  // currentColor SVG, not the ↑ ↓ ✕ characters: those fall back to a colour
  // emoji font on some systems (see CLAUDE.md, "Icons and glyphs").
  var ICON = {
    up: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.5L2.5 7h7z" fill="currentColor"/></svg>',
    down: '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 9.5L2.5 5h7z" fill="currentColor"/></svg>',
    del: '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Same rules the plugin enforces on save; shown live so a bad row is
  // visible before OK, not after.
  function rowError(r) {
    var name = (r.name || '').trim();
    var query = (r.query || '').trim();
    if (!name && !query) return '';
    if (!name || name.indexOf(':') >= 0 || name.indexOf(';') >= 0) return t('smartInvalidName');
    if (!query || query.indexOf(';') >= 0) return t('smartInvalidQuery');
    return '';
  }

  function sync() {
    var field = document.getElementById('smart-rules-json');
    if (field) field.value = JSON.stringify(rows);
  }

  function render(focusIndex, focusField) {
    var list = root.querySelector('.sd-list');
    if (!rows.length) {
      list.innerHTML = '<div class="sd-empty">' + esc(t('smartEmptyList')) + '</div>';
    } else {
      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var err = rowError(rows[i]);
        html += '<div class="sd-row' + (err ? ' sd-bad' : '') + '" data-i="' + i + '">'
          + '<input class="sd-name" data-f="name" type="text" value="' + esc(rows[i].name) + '" placeholder="' + esc(t('smartColName')) + '" />'
          + '<input class="sd-query" data-f="query" type="text" value="' + esc(rows[i].query) + '" placeholder="' + esc(t('smartColQuery')) + '" />'
          + '<span class="sd-count" title="' + esc(err || t('smartCountTip')) + '"></span>'
          + '<button type="button" class="sd-btn" data-act="up" title="' + esc(t('smartMoveUp')) + '"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>'
          + '<button type="button" class="sd-btn" data-act="down" title="' + esc(t('smartMoveDown')) + '"' + (i === rows.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>'
          + '<button type="button" class="sd-btn sd-del" data-act="del" title="' + esc(t('smartRemove')) + '">' + ICON.del + '</button>'
          + '</div>';
      }
      list.innerHTML = html;
      for (var j = 0; j < rows.length; j++) showCount(j);
    }
    sync();
    if (focusIndex !== undefined) {
      var target = list.querySelector('.sd-row[data-i="' + focusIndex + '"] .sd-' + (focusField || 'name'));
      if (target) target.focus();
    }
  }

  function rowEl(i) { return root.querySelector('.sd-row[data-i="' + i + '"]'); }

  function paintCount(i, text, dim, tip) {
    var el = rowEl(i);
    if (!el) return;
    var c = el.querySelector('.sd-count');
    c.textContent = text;
    c.classList.toggle('sd-dim', !!dim);
    if (tip) c.title = tip;
  }

  // Live match count per row, from the same search API the tree uses. A
  // query that matches nothing is the most common typo symptom, so 0 is shown
  // dimmed rather than hidden.
  function showCount(i) {
    var r = rows[i];
    var q = (r.query || '').trim();
    if (!q || rowError(r)) { paintCount(i, '', true); return; }
    if (countCache[q] !== undefined) { paintCount(i, countCache[q].text, countCache[q].dim, countCache[q].tip); return; }
    paintCount(i, '…', true);
    clearTimeout(countTimers[i]);
    countTimers[i] = setTimeout(function () {
      if (typeof webviewApi === 'undefined' || !webviewApi.postMessage) return;
      webviewApi.postMessage({ name: 'smartCount', query: q }).then(function (res) {
        var entry;
        // No answer at all means the host did not handle the message: show
        // nothing rather than an error mark the user cannot act on.
        if (!res) { paintCount(i, '', true); return; }
        if (res.error) entry = { text: '!', dim: false, tip: res.error };
        else entry = { text: res.count + (res.more ? '+' : ''), dim: res.count === 0, tip: t('smartCountTip') };
        countCache[q] = entry;
        // The row may have been edited or moved since; only paint if it
        // still holds the query this answer is for.
        for (var k = 0; k < rows.length; k++) {
          if ((rows[k].query || '').trim() === q && !rowError(rows[k])) paintCount(k, entry.text, entry.dim, entry.tip);
        }
      }, function () { paintCount(i, '', true); });
    }, 450);
  }

  function onInput(e) {
    var input = e.target;
    var row = input.closest && input.closest('.sd-row');
    if (!row) return;
    var i = Number(row.dataset.i);
    rows[i][input.dataset.f] = input.value;
    var err = rowError(rows[i]);
    row.classList.toggle('sd-bad', !!err);
    row.querySelector('.sd-count').title = err || t('smartCountTip');
    sync();
    if (input.dataset.f === 'query' || err === '') showCount(i);
  }

  function onClick(e) {
    var btn = e.target.closest && e.target.closest('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.classList.contains('sd-add')) {
      rows.push({ name: '', query: '' });
      render(rows.length - 1, 'name');
      return;
    }
    var row = btn.closest('.sd-row');
    if (!row) return;
    var i = Number(row.dataset.i);
    var act = btn.dataset.act;
    if (act === 'up' && i > 0) { var a = rows[i - 1]; rows[i - 1] = rows[i]; rows[i] = a; render(i - 1); }
    else if (act === 'down' && i < rows.length - 1) { var b = rows[i + 1]; rows[i + 1] = rows[i]; rows[i] = b; render(i + 1); }
    else if (act === 'del') { rows.splice(i, 1); render(); }
  }

  function init() {
    var el = document.getElementById('smart-dialog');
    if (!el || el.dataset.ready === '1') return;
    el.dataset.ready = '1';
    root = el;
    try { T = JSON.parse(el.dataset.i18n || '{}'); } catch (_) { T = {}; }
    try { rows = JSON.parse(el.dataset.rules || '[]'); } catch (_) { rows = []; }
    countCache = {};
    el.addEventListener('input', onInput);
    el.addEventListener('click', onClick);
    // Joplin's own dialog script treats Enter in a text input as OK (it posts
    // form-submit from a document keydown listener). That is fine - OK
    // validates the whole list and reopens on errors. The native submit event
    // is still blocked so it never navigates the dialog page.
    var form = el.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    // An empty manager opens on a blank row ready for typing.
    if (!rows.length) { rows.push({ name: '', query: '' }); render(0, 'name'); }
    else render();
  }

  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

import joplin from 'api';

interface FolderItem {
  id: string;
  title: string;
  parent_id: string;
  note_count: number;
}

interface NoteItem {
  id: string;
  title: string;
  parent_id: string;
  is_todo: number;
  todo_completed: number;
  updated_time: number;
}

interface TreeNode {
  type: 'folder' | 'note';
  id: string;
  title: string;
  children?: TreeNode[];
  is_todo?: number;
  todo_completed?: number;
  note_count?: number;
}

async function getAllFolders(): Promise<FolderItem[]> {
  const folders: FolderItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await joplin.data.get(['folders'], {
      fields: ['id', 'title', 'parent_id', 'note_count'],
      page,
      limit: 100,
    });
    folders.push(...result.items);
    hasMore = result.has_more;
    page++;
  }
  return folders;
}

async function getNotesInFolder(folderId: string): Promise<NoteItem[]> {
  const notes: NoteItem[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await joplin.data.get(['folders', folderId, 'notes'], {
      fields: ['id', 'title', 'parent_id', 'is_todo', 'todo_completed', 'updated_time'],
      page,
      limit: 100,
      order_by: 'updated_time',
      order_dir: 'DESC',
    });
    notes.push(...result.items);
    hasMore = result.has_more;
    page++;
  }
  return notes;
}

function buildTree(folders: FolderItem[], notesByFolder: Map<string, NoteItem[]>): TreeNode[] {
  const folderMap = new Map<string, TreeNode>();

  // Create folder nodes
  for (const f of folders) {
    folderMap.set(f.id, {
      type: 'folder',
      id: f.id,
      title: f.title,
      note_count: f.note_count,
      children: [],
    });
  }

  // Attach notes to folders
  for (const [folderId, notes] of notesByFolder) {
    const folder = folderMap.get(folderId);
    if (folder && folder.children) {
      for (const n of notes) {
        folder.children.push({
          type: 'note',
          id: n.id,
          title: n.title || '(untitled)',
          is_todo: n.is_todo,
          todo_completed: n.todo_completed,
        });
      }
    }
  }

  // Build hierarchy
  const roots: TreeNode[] = [];
  for (const f of folders) {
    const node = folderMap.get(f.id)!;
    if (f.parent_id && folderMap.has(f.parent_id)) {
      folderMap.get(f.parent_id)!.children!.unshift(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function renderTreeHtml(nodes: TreeNode[], selectedNoteId: string, level = 0): string {
  let html = '';
  for (const node of nodes) {
    const indent = level * 16;
    if (node.type === 'folder') {
      const count = node.note_count ?? 0;
      html += `<div class="tree-item folder" style="padding-left:${indent}px" data-id="${node.id}" data-type="folder">
        <span class="toggle expanded">&#9660;</span>
        <span class="icon folder-icon">&#128193;</span>
        <span class="label">${escapeHtml(node.title)}</span>
        <span class="count">(${count})</span>
      </div>`;
      html += `<div class="children" data-folder-id="${node.id}">`;
      if (node.children) {
        html += renderTreeHtml(node.children, selectedNoteId, level + 1);
      }
      html += `</div>`;
    } else {
      const selected = node.id === selectedNoteId ? ' selected' : '';
      let icon = '&#128196;'; // note icon
      if (node.is_todo) {
        icon = node.todo_completed ? '&#9745;' : '&#9744;'; // checkbox
      }
      html += `<div class="tree-item note${selected}" style="padding-left:${indent}px" data-id="${node.id}" data-type="note">
        <span class="icon note-icon">${icon}</span>
        <span class="label">${escapeHtml(node.title)}</span>
      </div>`;
    }
  }
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

joplin.plugins.register({
  onStart: async function () {
    // Register a command so we can verify the plugin is running
    await joplin.commands.register({
      name: 'notesInList.toggle',
      label: 'Toggle Notes In List panel',
      execute: async () => {
        // Will be wired up after panel creation
      },
    });

    // Add to Tools menu for easy access
    await joplin.views.menuItems.create('notesInListMenuItem', 'notesInList.toggle', 1 /* MenuItemLocation.Tools */);

    const panel = await joplin.views.panels.create('notesInListPanel');

    await joplin.views.panels.addScript(panel, 'webview/panel.css');

    // Set initial HTML before showing
    await joplin.views.panels.setHtml(panel, '<div id="notes-in-list-root"><p style="padding:12px;">Loading...</p></div>');
    await joplin.views.panels.show(panel, true);
    console.info('Notes In List: panel shown');

    let selectedNoteId = '';

    async function refreshPanel() {
      try {
        console.info('Notes In List: refreshing...');
        const folders = await getAllFolders();
        const notesByFolder = new Map<string, NoteItem[]>();

        // Fetch notes for all folders in parallel (batch of 10)
        const batchSize = 10;
        for (let i = 0; i < folders.length; i += batchSize) {
          const batch = folders.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((f) => getNotesInFolder(f.id))
          );
          batch.forEach((f, idx) => {
            notesByFolder.set(f.id, results[idx]);
          });
        }

        const tree = buildTree(folders, notesByFolder);
        const treeHtml = renderTreeHtml(tree, selectedNoteId);

        const html = `
          <div id="notes-in-list-root">
            <div class="toolbar">
              <button id="btn-refresh" title="Refresh">&#8635; Refresh</button>
              <input id="search-input" type="text" placeholder="Search..." />
            </div>
            <div id="tree-container">${treeHtml}</div>
          </div>
          <script>
            function postMessage(msg) {
              webviewApi.postMessage(msg);
            }

            document.addEventListener('click', (e) => {
              const item = e.target.closest('.tree-item');
              if (!item) return;

              const type = item.dataset.type;
              const id = item.dataset.id;

              if (type === 'note') {
                document.querySelectorAll('.tree-item.note.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                postMessage({ name: 'openNote', id });
              }

              if (type === 'folder') {
                const toggle = item.querySelector('.toggle');
                const children = item.nextElementSibling;
                if (children && children.classList.contains('children')) {
                  const isExpanded = !children.classList.contains('collapsed');
                  if (isExpanded) {
                    children.classList.add('collapsed');
                    toggle.innerHTML = '&#9654;';
                    toggle.classList.remove('expanded');
                  } else {
                    children.classList.remove('collapsed');
                    toggle.innerHTML = '&#9660;';
                    toggle.classList.add('expanded');
                  }
                }
              }
            });

            // Search filter
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
              searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.tree-item.note').forEach(item => {
                  const label = item.querySelector('.label').textContent.toLowerCase();
                  item.style.display = label.includes(query) || !query ? '' : 'none';
                });
                // Show all folders when searching
                if (query) {
                  document.querySelectorAll('.children').forEach(c => c.classList.remove('collapsed'));
                  document.querySelectorAll('.toggle').forEach(t => { t.innerHTML = '&#9660;'; t.classList.add('expanded'); });
                }
              });
            }

            // Refresh button
            const btnRefresh = document.getElementById('btn-refresh');
            if (btnRefresh) {
              btnRefresh.addEventListener('click', () => {
                postMessage({ name: 'refresh' });
              });
            }
          </script>
        `;

        await joplin.views.panels.setHtml(panel, html);
      } catch (err) {
        console.error('Notes In List: refresh error', err);
      }
    }

    // Handle messages from webview
    await joplin.views.panels.onMessage(panel, async (msg: any) => {
      if (msg.name === 'openNote') {
        selectedNoteId = msg.id;
        await joplin.commands.execute('openNote', msg.id);
      } else if (msg.name === 'refresh') {
        await refreshPanel();
      }
    });

    // Track note selection changes
    await joplin.workspace.onNoteSelectionChange(async () => {
      const note = await joplin.workspace.selectedNote();
      if (note) {
        selectedNoteId = note.id;
      }
      await refreshPanel();
    });

    // Initial render
    await refreshPanel();
  },
});

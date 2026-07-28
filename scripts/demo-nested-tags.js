/* Nested-tag test fixture (#28).
 *
 * Creates a handful of notes and tags that exercise every branch of the
 * nested tag view: real tags acting as parents, prefixes that exist only as
 * virtual rows, de-duplicated subtree counts, CJK labels, tags with no
 * separator at all, and separator edge cases (leading/trailing/doubled).
 *
 * Writes to WHATEVER PROFILE the running Joplin instance has active - start
 * Joplin on the profile you want (e.g. "test") before running this.
 *
 * Usage:
 *   1. Joplin > Tools > Options > Web Clipper: enable the service, copy token
 *   2. node scripts/demo-nested-tags.js --token=YOUR_TOKEN
 *   3. Settings > Joplin Explorer > Tag nesting separator: "."
 *   4. node scripts/demo-nested-tags.js --token=YOUR_TOKEN --clean
 *
 * Everything created is tracked in .demo-nested-tags-ids.json, so --clean
 * removes exactly what was created and nothing else.
 */

const fs = require('fs');
const path = require('path');

const argPort = process.argv.find((a) => a.startsWith('--port='));
const PORT = argPort ? Number(argPort.slice('--port='.length)) : 41184;
const BASE = `http://127.0.0.1:${PORT}`;
const IDS_FILE = path.join(__dirname, '.demo-nested-tags-ids.json');

const argToken = process.argv.find((a) => a.startsWith('--token='));
const TOKEN = argToken ? argToken.slice('--token='.length) : '';
const CLEAN = process.argv.includes('--clean');

if (!TOKEN) {
  console.error('Usage: node demo-nested-tags.js --token=YOUR_WEBCLIPPER_TOKEN [--clean]');
  process.exit(1);
}

async function api(method, route, body) {
  const url = `${BASE}${route}${route.includes('?') ? '&' : '?'}token=${TOKEN}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function clean() {
  if (!fs.existsSync(IDS_FILE)) { console.log('Nothing to clean (no ids file).'); return; }
  const ids = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
  for (const id of ids.notes || []) {
    try { await api('DELETE', `/notes/${id}?permanent=1`); } catch (_) {}
  }
  for (const id of ids.folders || []) {
    try { await api('DELETE', `/folders/${id}?permanent=1`); } catch (_) {}
  }
  for (const id of ids.tags || []) {
    try { await api('DELETE', `/tags/${id}`); } catch (_) {}
  }
  fs.unlinkSync(IDS_FILE);
  console.log(`Cleaned ${(ids.notes || []).length} notes, ${(ids.folders || []).length} notebooks, ${(ids.tags || []).length} tags.`);
}

// note title -> tags carried by that note
const FIXTURE = [
  // Real tags as parents. The FIRST note deliberately carries both the parent
  // and the child tag: the parent must count it ONCE (2 (3), not 2 (4)).
  ['Aoife - annual checkup', ['$.Pet.Aoife', '$.Pet.Aoife.Vet']],
  ['Aoife - adoption papers', ['$.Pet.Aoife']],
  ['Aoife - rabies vaccine', ['$.Pet.Aoife.Vet.Vaccine']],

  // Every level between "$" and "Checkup" is a prefix only -> virtual rows.
  ['Siobhan - dental checkup', ['$.Pet.Siobhan.Vet.Checkup']],

  // Three virtual levels deep, tests indentation at depth.
  ['Furnace filter sizes', ['%.Home.HVAC.Filters']],

  // CJK, and a tag that is BOTH a standalone tag and a parent.
  ['项目甲 - 会议纪要', ['工作.项目.甲', '工作']],
  ['周报', ['工作']],

  // No separator at all - must stay a plain top-level row, not get split.
  ['读书笔记', ['读书']],

  // Separator edge cases: leading, trailing and doubled separators must not
  // produce empty rows.
  ['Edge - leading separator', ['.leading']],
  ['Edge - trailing separator', ['trailing.']],
  ['Edge - doubled separator', ['a..b']],

  // Case sensitivity: these must NOT be merged into one node.
  ['Case - lower', ['case.x']],
  ['Case - upper', ['Case.X']],
];

async function create() {
  const ids = { notes: [], folders: [], tags: [] };
  // Persist ids even on mid-run failure so --clean can always remove leftovers.
  const saveIds = () => fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));
  process.on('exit', saveIds);

  const folder = await api('POST', '/folders', { title: 'Nested tag test' });
  ids.folders.push(folder.id);

  // Reuse a tag if it already exists, otherwise create it.
  const existing = new Map();
  let page = 1;
  let more = true;
  while (more) {
    const r = await api('GET', `/tags?fields=id,title&limit=100&page=${page}`);
    for (const t of r.items || []) existing.set((t.title || '').toLowerCase(), t.id);
    more = r.has_more;
    page++;
  }

  const tagIdByTitle = new Map();
  async function tagId(title) {
    if (tagIdByTitle.has(title)) return tagIdByTitle.get(title);
    // Joplin lowercases tag titles internally; match on that.
    let id = existing.get(title.toLowerCase());
    if (!id) {
      const created = await api('POST', '/tags', { title });
      id = created.id;
      ids.tags.push(id);
      // Register under the LOWERCASED name: Joplin lowercases tag titles, so
      // a later fixture like "Case.X" must reuse the id "case.x" just got.
      existing.set(title.toLowerCase(), id);
    }
    tagIdByTitle.set(title, id);
    return id;
  }

  for (const [title, tags] of FIXTURE) {
    const note = await api('POST', '/notes', {
      title,
      body: `Fixture note for nested tag testing.\n\nTags: ${tags.join(', ')}\n`,
      parent_id: folder.id,
    });
    ids.notes.push(note.id);
    for (const t of tags) {
      const id = await tagId(t);
      await api('POST', `/tags/${id}/notes`, { id: note.id });
    }
  }

  fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));

  console.log(`Created notebook "Nested tag test" with ${ids.notes.length} notes and ${ids.tags.length} tags.\n`);
  console.log('Set  Settings > Joplin Explorer > Tag nesting separator  to  "."  then check:\n');
  console.log('  $  (virtual)');
  console.log('    Pet  (virtual)');
  console.log('      Aoife            [real tag] expect  2 (3)  <- de-duplicated, NOT 4');
  console.log('        Vet            [real tag] expect  1 (2)');
  console.log('          Vaccine      [real tag] expect  1');
  console.log('      Siobhan  (virtual) -> Vet (virtual) -> Checkup [real]');
  console.log('  %  (virtual) -> Home -> HVAC -> Filters [real]');
  console.log('  工作               [real tag, also a parent] expect 2 (3)');
  console.log('    项目 (virtual) -> 甲 [real]');
  console.log('  读书               [real, no children, single number]');
  console.log('  leading / trailing / a > b  (no empty rows from stray separators)');
  console.log('  case.x vs Case.X   (Joplin lowercases tags, so these merge - expected)\n');
  console.log('Virtual rows: dimmed label + bookmark icon, no context menu, reject note drops.');
}

(async () => {
  try {
    if (CLEAN) await clean();
    else await create();
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();

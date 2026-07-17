/* Demo vault generator for Explorer screenshots.
 *
 * Creates realistic-looking notebooks/notes/tags/todos via the Data API so
 * the panel shows off: pinned candidates, tags with counts, smart folders
 * with content, a checkbox-pie note, and trash content.
 *
 * Writes to WHATEVER PROFILE the running Joplin instance has active - start
 * Joplin on the profile you want (e.g. "test") before running this.
 *
 * Usage:
 *   1. Joplin > Tools > Options > Web Clipper: enable the service, copy token
 *   2. node scripts/demo-vault.js --token=YOUR_TOKEN          (create)
 *   3. take screenshots (pin a couple of items by drag manually)
 *   4. node scripts/demo-vault.js --token=YOUR_TOKEN --clean  (remove all)
 *
 * Everything created carries the marker tag "demo-vault" in user_data, and
 * all notebooks are prefixed in a tracking file (.demo-vault-ids.json) so
 * --clean removes exactly what was created and nothing else.
 */

const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:41184';
const IDS_FILE = path.join(__dirname, '.demo-vault-ids.json');

const argToken = process.argv.find((a) => a.startsWith('--token='));
const TOKEN = argToken ? argToken.slice('--token='.length) : '';
const CLEAN = process.argv.includes('--clean');

if (!TOKEN) {
  console.error('Usage: node demo-vault.js --token=YOUR_WEBCLIPPER_TOKEN [--clean]');
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
  console.log('Demo vault removed.');
}

async function create() {
  const ids = { folders: [], notes: [], tags: [] };
  const folder = async (title, parent_id) => {
    const f = await api('POST', '/folders', parent_id ? { title, parent_id } : { title });
    ids.folders.push(f.id);
    return f.id;
  };
  const note = async (parent_id, title, body, extra) => {
    const n = await api('POST', '/notes', Object.assign({ title, body, parent_id }, extra || {}));
    ids.notes.push(n.id);
    return n.id;
  };
  const tagNote = async (tagTitle, noteId) => {
    let tg;
    const found = await api('GET', `/search?query=${encodeURIComponent(tagTitle)}&type=tag`);
    tg = (found.items || []).find((x) => x.title === tagTitle.toLowerCase());
    if (!tg) { tg = await api('POST', '/tags', { title: tagTitle }); ids.tags.push(tg.id); }
    else if (!ids.tags.includes(tg.id)) ids.tags.push(tg.id);
    await api('POST', `/tags/${tg.id}/notes`, { id: noteId });
  };

  // ---- Projects ----
  const projects = await folder('Projects');
  const website = await folder('Website Redesign', projects);
  const homelab = await folder('Home Lab', projects);

  const kickoff = await note(website, 'Design kickoff notes',
    '# Design kickoff\n\nGoals for the redesign:\n\n- Cleaner typography\n- Faster loading\n- Dark mode support\n\n> Next review: Friday');
  await tagNote('project', kickoff);
  await tagNote('urgent', kickoff);

  const launch = await note(website, 'Launch checklist',
    '# Launch checklist\n\n- [x] Freeze content\n- [x] Lighthouse audit\n- [ ] DNS cutover\n- [ ] Announcement post\n- [ ] Monitor error rates');
  await tagNote('project', launch);

  const backup = await note(homelab, 'Backup strategy',
    '# Backup strategy\n\n3-2-1 rule:\n\n- 3 copies\n- 2 media\n- 1 offsite\n\n```bash\nrestic backup /data --repo sftp:nas:/backups\n```');
  await tagNote('homelab', backup);

  // ---- Reading Notes ----
  const reading = await folder('Reading Notes');
  const atomic = await note(reading, 'Atomic Habits - key ideas',
    '# Atomic Habits\n\n1. Make it obvious\n2. Make it attractive\n3. Make it easy\n4. Make it satisfying\n\n*Habits are the compound interest of self-improvement.*');
  await tagNote('reading', atomic);
  const ddia = await note(reading, 'Designing Data-Intensive Applications',
    '# DDIA notes\n\n## Chapter 3: Storage engines\n\n- LSM trees vs B-trees\n- Write amplification trade-offs');
  await tagNote('reading', ddia);

  // ---- Weekly Review (todos feed the smart folder) ----
  const weekly = await folder('Weekly Review');
  const groceries = await note(weekly, 'Errands', '- [ ] Renew passport\n- [ ] Pick up package', { is_todo: 1 });
  await tagNote('personal', groceries);
  const review = await note(weekly, 'Friday review', 'Reflect on the week, plan the next.', { is_todo: 1 });
  ids.notes.push(review);

  // ---- Trash content: nested notebooks with notes, then delete ----
  const archive = await folder('Old Archive');
  const arch2023 = await folder('2023', archive);
  await note(archive, 'Obsolete meeting notes', 'Superseded.');
  await note(arch2023, 'Q4 report draft', 'Old draft.');
  await api('DELETE', `/folders/${archive}`); // to trash (cascades)

  fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2));
  console.log('Demo vault created.');
  console.log('Manual touches for the screenshot:');
  console.log('  - Pin "Launch checklist" and "Projects" (drag onto the Pinned section)');
  console.log('  - Publish one note if you want the link badge (right-click > Publish note)');
  console.log('Then: node scripts/demo-vault.js --token=... --clean when done.');
}

(CLEAN ? clean() : create()).catch((e) => { console.error(e.message); process.exit(1); });

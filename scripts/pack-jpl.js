const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const publishDir = path.resolve(__dirname, '..', 'publish');
const outPath = path.join(publishDir, 'plugin.jpl');

function tarHeader(name, size, mtime) {
  const buf = Buffer.alloc(512);
  buf.write(name.slice(0, 100), 0, 100, 'utf8');
  buf.write('0000644\0', 100);
  buf.write('0000000\0', 108);
  buf.write('0000000\0', 116);
  buf.write(size.toString(8).padStart(11, '0') + '\0', 124);
  buf.write(Math.floor(mtime / 1000).toString(8).padStart(11, '0') + '\0', 136);
  buf.write('        ', 148);
  buf.write('0', 156);
  buf.write('ustar\0', 257);
  buf.write('00', 263);
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return buf;
}

function pad512(size) {
  const r = size % 512;
  return r === 0 ? 0 : 512 - r;
}

function walk(dir, prefix) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? prefix + '/' + name : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, rel));
    } else if (stat.isFile()) {
      out.push({ full, rel, size: stat.size, mtime: stat.mtimeMs });
    }
  }
  return out;
}

const files = walk(publishDir, '').filter(f => f.rel !== 'plugin.jpl');

const chunks = [];
for (const f of files) {
  chunks.push(tarHeader(f.rel, f.size, f.mtime));
  chunks.push(fs.readFileSync(f.full));
  const pad = pad512(f.size);
  if (pad > 0) chunks.push(Buffer.alloc(pad));
}
chunks.push(Buffer.alloc(1024));

const tar = Buffer.concat(chunks);
const gz = zlib.gzipSync(tar);
fs.writeFileSync(outPath, gz);

const manifest = JSON.parse(fs.readFileSync(path.join(publishDir, 'manifest.json'), 'utf8'));
console.log(`Packed ${outPath} (${gz.length} bytes, v${manifest.version}, ${files.length} files)`);

import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, extname} from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.next', 'node_modules', 'dist', 'build']);
const ALLOWED_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.md', '.yml', '.yaml'
]);
const MARKER_RE = /^(<{7}|={7}|>{7})/m;

const offenders = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = full.replace(`${ROOT}/`, '');
    const st = statSync(full);

    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        walk(full);
      }
      continue;
    }

    const ext = extname(entry);
    if (!ALLOWED_EXT.has(ext)) continue;

    const content = readFileSync(full, 'utf8');
    if (MARKER_RE.test(content)) {
      offenders.push(rel);
    }
  }
}

walk(ROOT);

if (offenders.length > 0) {
  console.error('Merge conflict markers found in:');
  for (const file of offenders) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('No merge conflict markers found.');

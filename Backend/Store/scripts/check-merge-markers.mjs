import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage']);
const ALLOWED_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.css', '.md', '.yml', '.yaml', '.sql',
]);
const MARKER_RE = /^(<{7}|={7}|>{7})/m;

const offenders = [];

function walk(dir) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = fullPath.replace(`${ROOT}/`, '');
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        walk(fullPath);
      }
      continue;
    }

    const ext = extname(entry);
    if (!ALLOWED_EXT.has(ext)) {
      continue;
    }

    const content = readFileSync(fullPath, 'utf8');
    if (MARKER_RE.test(content)) {
      offenders.push(relPath);
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

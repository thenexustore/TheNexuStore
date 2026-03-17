import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/homepage/home-layout.controller.ts');
const source = fs.readFileSync(file, 'utf8');

const checks = [
  { label: 'reorderSections method', regex: /async\s+reorderSections\s*\(/g, expected: 1 },
  { label: 'reorder sections route decorator', regex: /@Post\('\/admin\/home\/sections\/reorder'\)/g, expected: 1 },
];

const lineOfIndex = (text, index) => text.slice(0, index).split('\n').length;

let failed = false;
for (const check of checks) {
  const matches = [...source.matchAll(check.regex)];
  const count = matches.length;
  if (count !== check.expected) {
    const lines = matches.map((m) => lineOfIndex(source, m.index || 0)).join(', ');
    console.error(
      `[check-home-controller-duplicates] Expected ${check.expected} occurrence(s) of ${check.label}, found ${count}. Lines: ${lines || 'none'}.`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[check-home-controller-duplicates] OK');

import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/homepage/home-layout.controller.ts');
const source = fs.readFileSync(file, 'utf8');

const checks = [
  { label: 'reorderSections method', regex: /async\s+reorderSections\s*\(/g, expected: 1 },
  { label: 'reorder sections route decorator', regex: /@Post\('\/admin\/home\/sections\/reorder'\)/g, expected: 1 },
];

let failed = false;
for (const check of checks) {
  const count = (source.match(check.regex) || []).length;
  if (count !== check.expected) {
    console.error(
      `[check-home-controller-duplicates] Expected ${check.expected} occurrence(s) of ${check.label}, found ${count}.`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[check-home-controller-duplicates] OK');

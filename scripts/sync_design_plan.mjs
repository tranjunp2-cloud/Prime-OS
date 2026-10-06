/**
 * Edit Prime-OS-design-plan.html, then sync its marked content/styles into
 * the self-contained presentation. No runtime iframe, fetch, or CDN is needed
 * for the plan in either file.
 *
 * Check: node scripts/sync_design_plan.mjs
 * Sync:  node scripts/sync_design_plan.mjs --write
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'Prime-OS-design-plan.html');
const targetPath = path.join(root, 'Prime-OS-presentation.html');
const source = fs.readFileSync(sourcePath, 'utf8');
const target = fs.readFileSync(targetPath, 'utf8');
const markers = [
  ['<!-- BEGIN DESIGN PLAN CONTENT -->', '<!-- END DESIGN PLAN CONTENT -->'],
  ['/* BEGIN DESIGN PLAN STYLES */', '/* END DESIGN PLAN STYLES */'],
];

function markedBlock(text, start, end) {
  if (text.split(start).length !== 2 || text.split(end).length !== 2) {
    throw new Error(`Expected exactly one pair of markers: ${start}`);
  }
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (b < a) throw new Error('Invalid marker order');
  return text.slice(a, b + end.length);
}

let updated = target;
for (const [start, end] of markers) {
  updated = updated.replace(markedBlock(updated, start, end), () => markedBlock(source, start, end));
}
if (updated === target) {
  console.log('Design plan content and styles are in sync.');
} else if (process.argv.includes('--write')) {
  fs.writeFileSync(targetPath, updated);
  console.log('Updated the design-plan section in Prime-OS-presentation.html.');
} else {
  console.error('Design plan differs. Run: node scripts/sync_design_plan.mjs --write');
  process.exitCode = 1;
}

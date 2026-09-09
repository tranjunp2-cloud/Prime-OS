import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const buildRoot = resolve(repoRoot, '.prototype-build');
const output = resolve(repoRoot, 'exports/prime-os-full-flow-prototype.html');
let html = await readFile(resolve(buildRoot, 'index.html'), 'utf8');

const cssMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
if (cssMatch) {
  const cssPath = resolve(buildRoot, cssMatch[1].replace(/^\.\//, ''));
  let css = await readFile(cssPath, 'utf8');
  // Font URLs contain semicolons in their query string (for example
  // `wght@400;500;600`). Stopping at the first semicolon corrupts the CSS and
  // makes browsers discard the entire stylesheet when the prototype is opened
  // through file://. Remove each complete quoted @import rule instead.
  css = css.replace(/@import\s*(?:url\()?(["'])[^"']+\1\)?\s*;/g, '');
  html = html.replace(cssMatch[0], () => `<style>${css}</style>`);
}

const scriptMatch = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"[^>]*><\/script>/);
if (!scriptMatch) throw new Error('Prototype JavaScript bundle was not found.');
const scriptPath = resolve(buildRoot, scriptMatch[1].replace(/^\.\//, ''));
const script = (await readFile(scriptPath, 'utf8')).replace(/<\/script/gi, '<\\/script');
html = html.replace(scriptMatch[0], '');
html = html.replace('</body>', () => `<script>${script}</script></body>`);
html = html
  .replace(/<link rel="icon"[^>]*>/g, '')
  .replace(/<link rel="modulepreload"[^>]*>/g, '')
  .replace('<title>PrimeOS</title>', '<title>Prime OS — Local Code Prototype</title>')
  .replace('</head>', '<meta name="primeos-prototype" content="local-source-build"></head>');

await writeFile(output, html);
console.log(`Standalone prototype written to ${output}`);

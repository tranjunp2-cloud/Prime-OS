import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Vercel's function bundle is read-only, while the demo stores resolve `data/*.json` from the
// working directory and create them on first read. Run from a writable temp directory instead;
// its data lasts for the life of a function instance and is reseeded on the next cold start.
const workdir = path.join(os.tmpdir(), 'prime-api');
fs.mkdirSync(workdir, { recursive: true });
process.chdir(workdir);

export default async function handler(request, response) {
  const { app } = await import('../apps/api/src/server.js');
  return app(request, response);
}

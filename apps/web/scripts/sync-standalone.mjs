import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const source = resolve(appDir, 'dist-standalone', 'standalone-player.html');
const targets = [
  resolve(appDir, 'public', 'standalone-player.html'),
  resolve(appDir, 'dist', 'standalone-player.html'),
];

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}

console.log('Standalone player synchronized with public/ and dist/.');

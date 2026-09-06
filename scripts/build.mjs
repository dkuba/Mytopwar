import { cp, mkdir, rm } from 'node:fs/promises';

// Publish only browser assets, never tests, documentation or repository metadata.
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'styles.css', 'src']) {
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
}
console.log('Static deployment ready in dist/');

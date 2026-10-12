import { mkdir, copyFile, readdir } from 'node:fs/promises';

// Ship native ESM with React external and preserve the Next.js client boundary.
await mkdir(new URL('../dist/react/', import.meta.url), { recursive: true });
await mkdir(new URL('../dist/styles/', import.meta.url), { recursive: true });
for (const name of (await readdir(new URL('../src/react/', import.meta.url))).filter(name => name.endsWith('.js') || name.endsWith('.d.ts'))) {
  await copyFile(new URL(`../src/react/${name}`, import.meta.url), new URL(`../dist/react/${name}`, import.meta.url));
}
for (const name of ['modal', 'dropdown', 'sheets', 'slider']) {
  await copyFile(new URL(`../src/react/${name}.css`, import.meta.url), new URL(`../dist/styles/${name}.css`, import.meta.url));
}

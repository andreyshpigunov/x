import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBrowserChecks } from '../test/react-browser.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const work = path.join(root, '.local/react-test');
const app = path.join(work, 'app');
const dev = process.argv.includes('--dev');
const offline = process.env.X_NPM_OFFLINE === '1' ? ['--offline'] : [];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };

function run(command, args, cwd = root, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
    let output = '';
    child.stdout?.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));
  });
}

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function start(mode) {
  const port = dev ? Number(process.env.X_REACT_PORT || 3210) : await freePort();
  const args = [path.join(app, 'node_modules/next/dist/bin/next'), mode, '--hostname', '127.0.0.1', '--port', String(port)];
  if (mode === 'dev') args.push('--webpack');
  const child = spawn(process.execPath, args, { cwd: app, env, stdio: dev ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
  const log = dev ? null : createWriteStream(path.join(work, `${mode}.log`));
  child.stdout?.pipe(log);
  child.stderr?.pipe(log, { end: false });
  const done = new Promise(resolve => { child.once('exit', resolve); child.once('error', resolve); });
  const stop = async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await done;
    clearTimeout(timer);
    log?.end();
  };
  const url = `http://127.0.0.1:${port}`;
  try {
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Next.js exited; see ${work}/${mode}.log`);
      try {
        if ((await fetch(url, { signal: AbortSignal.timeout(3000) })).ok) return { url, stop, done };
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    throw new Error(`Next.js startup timed out; see ${work}/${mode}.log`);
  } catch (error) {
    await stop();
    throw error;
  }
}

await mkdir(work, { recursive: true });
await run('npm', ['run', 'build']);
const packed = JSON.parse(await run('npm', ['pack', '--json', '--pack-destination', work], root, true));
const archive = path.join(work, `x-${packed[0].shasum}.tgz`);
await copyFile(path.join(work, packed[0].filename), archive);
await cp(path.join(root, 'test/fixtures/react-next'), app, { recursive: true });
// Webpack treats node_modules as immutable by package version. This preview keeps
// its version, so discard only this generated fixture's build cache after repacking.
await rm(path.join(app, '.next'), { recursive: true, force: true });
const manifest = JSON.parse(await readFile(path.join(app, 'package.json'), 'utf8'));
manifest.dependencies['@andreyshpigunov/x'] = `file:${archive}`;
await writeFile(path.join(app, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
// A content-addressed filename prevents stale npm cache hits at the same local version.
await run('npm', ['install', ...offline, '--no-audit', '--no-fund', `@andreyshpigunov/x@file:${archive}`], app);
for (const name of await readdir(path.join(root, 'dist/react'))) {
  assert.equal(
    await readFile(path.join(app, 'node_modules/@andreyshpigunov/x/dist/react', name), 'utf8'),
    await readFile(path.join(root, 'dist/react', name), 'utf8'),
    `Installed archive must contain the current ${name}`
  );
}
await mkdir(path.join(app, 'public/legacy'), { recursive: true });
await copyFile(path.join(root, 'dist/x.js'), path.join(app, 'public/legacy/x.js'));
await copyFile(path.join(root, 'dist/x.css'), path.join(app, 'public/legacy/x.css'));

// Verify a vanilla consumer can install/import the archive without React.
const vanilla = path.join(work, 'vanilla');
await mkdir(vanilla, { recursive: true });
await writeFile(path.join(vanilla, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
await run('npm', ['install', ...offline, '--ignore-scripts', '--omit=optional', '--no-audit', '--no-fund', archive], vanilla);
await run(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { existsSync } from 'node:fs';
  import { x, modal } from '@andreyshpigunov/x';
  assert.equal(x.modal, modal);
  assert.equal(existsSync('node_modules/react'), false);
  console.log('PASS packed vanilla consumer: no React dependency');
`], vanilla);

if (dev) {
  const server = await start('dev');
  console.log(`\nReact playground: ${server.url}\nArchive: ${archive}`);
  process.once('SIGINT', () => { void server.stop(); });
  process.once('SIGTERM', () => { void server.stop(); });
  await server.done;
} else {
  let server = await start('dev');
  try {
    await runBrowserChecks(server.url, work, 'strict', ['chromium']);
  } finally {
    await server.stop();
  }
  await run('npm', ['run', 'build'], app);
  server = await start('start');
  try {
    await runBrowserChecks(server.url, work, 'production', ['chromium', 'webkit']);
  } finally {
    await server.stop();
  }
  console.log(`\nReact checks passed. Screenshots and logs: ${work}`);
}

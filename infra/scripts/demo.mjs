#!/usr/bin/env node
// VAJRA demo startup script — starts server + web, seeds data, opens browser
// All seed data is SYNTHETIC and clearly fictional

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = new URL('../../', import.meta.url).pathname;

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  VAJRA — Sovereign Agentic Workbench                    ║');
console.log('║  Demo Mode (SimulatedProvider active)                    ║');
console.log('║  All data is SYNTHETIC — zero external connections      ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');

// Check Node version
const nodeVer = parseInt(process.version.slice(1));
if (nodeVer < 20) {
  console.error(`ERROR: Node.js >= 20 required (found ${process.version})`);
  process.exit(1);
}

async function waitForPort(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = createServer();
        // Try connecting via fetch
        fetch(`http://127.0.0.1:${port}/health`)
          .then(() => resolve(true))
          .catch(() => reject());
        req.close();
      });
      return true;
    } catch {
      await sleep(500);
    }
  }
  return false;
}

async function checkPort(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('▶ Starting VAJRA server on :3000 ...');
  const server = spawn('pnpm', ['--filter=./apps/server', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  server.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.log(`  [server] ${line}`);
  });
  server.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line && !line.includes('ExperimentalWarning')) console.log(`  [server] ${line}`);
  });

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    serverReady = await checkPort(3000);
    if (serverReady) break;
    process.stdout.write('.');
  }
  if (!serverReady) {
    console.log('\n  Server check timed out — starting web anyway (server may still be initialising)');
  } else {
    console.log('\n✓ Server ready at http://127.0.0.1:3000');
  }

  console.log('▶ Starting VAJRA web on :5173 ...');
  const web = spawn('pnpm', ['--filter=./apps/web', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  web.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line && !line.includes('vite')) console.log(`  [web] ${line}`);
  });

  // Wait a moment for the web dev server
  await sleep(4000);

  console.log('');
  console.log('✓ VAJRA is running!');
  console.log('  Web:    http://127.0.0.1:5173');
  console.log('  Server: http://127.0.0.1:3000');
  console.log('  Health: http://127.0.0.1:3000/health');
  console.log('');
  console.log('  Mode: SIMULATED (Demo Brain active)');
  console.log('  All data: SYNTHETIC and clearly fictional');
  console.log('');
  console.log('  Press Ctrl+C to stop');

  // Try to open browser
  try {
    const url = 'http://127.0.0.1:5173';
    const cmd = process.platform === 'win32' ? `start ${url}` :
                process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    execSync(cmd, { stdio: 'ignore' });
  } catch {
    // Browser open failed silently — that's fine
  }

  process.on('SIGINT', () => {
    console.log('\n▶ Stopping VAJRA...');
    server.kill();
    web.kill();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch(e => {
  console.error('Demo startup failed:', e.message);
  process.exit(1);
});

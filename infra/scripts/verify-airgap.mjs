#!/usr/bin/env node
// VAJRA Air-gap Verification Script
// Starts the server, runs all red-team scenarios, asserts zero external destinations
// Outputs a signed JSON sovereignty report
// All test data is SYNTHETIC

import { setTimeout as sleep } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname;
const SERVER = 'http://127.0.0.1:3000';

let serverProc = null;

async function checkServer() {
  try {
    const r = await fetch(`${SERVER}/health`);
    return r.ok;
  } catch {
    return false;
  }
}

async function startServer() {
  // Check if already running
  if (await checkServer()) {
    console.log('  Server already running at :3000');
    return null;
  }
  console.log('  Starting server...');
  const proc = spawn('pnpm', ['--filter=./apps/server', 'dev'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    if (await checkServer()) break;
    process.stdout.write('.');
  }
  console.log('');
  return proc;
}

async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  VAJRA Air-Gap Verification                              ║');
  console.log('║  Asserts zero external egress across all scenarios       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  serverProc = await startServer();
  if (!await checkServer()) {
    console.error('ERROR: Server not reachable at :3000 — aborting');
    process.exit(1);
  }

  const results = [];
  let allPassed = true;

  // Reset stats
  console.log('▶ Checking baseline network stats...');
  const baseline = await fetch(`${SERVER}/api/network/stats`).then(r => r.json());
  console.log(`  Baseline: ext=${baseline.externalBytes}B, blocked=${baseline.blocked}, local=${baseline.local}`);
  results.push({ test: 'baseline', externalBytes: baseline.externalBytes, pass: baseline.externalBytes === 0 });

  // Run all 5 red-team attempts
  const redteamTypes = ['dns', 'fetch', 'socket', 'exfil-tool', 'injection'];
  console.log(`\n▶ Running ${redteamTypes.length} red-team exfiltration attempts...`);

  for (const type of redteamTypes) {
    const r = await fetch(`${SERVER}/api/redteam/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).then(r => r.json());

    const pass = r.blocked === true;
    allPassed = allPassed && pass;
    console.log(`  ${pass ? '✓' : '✗'} ${type}: ${pass ? 'BLOCKED' : 'NOT BLOCKED'} — ${r.reason ?? 'no reason'}`);
    results.push({ test: `redteam.${type}`, blocked: r.blocked, reason: r.reason, pass });
  }

  // Verify audit chain
  console.log('\n▶ Verifying audit hash chain...');
  const chainResult = await fetch(`${SERVER}/api/audit/verify`, { method: 'POST' }).then(r => r.json());
  const chainPass = chainResult.ok === true;
  allPassed = allPassed && chainPass;
  console.log(`  ${chainPass ? '✓' : '✗'} Hash chain: ${chainPass ? `VERIFIED (${chainResult.chainLength} entries)` : 'TAMPERED!'}`);
  results.push({ test: 'audit.hash_chain', ok: chainResult.ok, chainLength: chainResult.chainLength, pass: chainPass });

  // Check final stats — external bytes must remain 0
  console.log('\n▶ Checking final network stats...');
  const final = await fetch(`${SERVER}/api/network/stats`).then(r => r.json());
  const extPass = final.externalBytes === 0;
  allPassed = allPassed && extPass;
  console.log(`  External bytes: ${final.externalBytes} (${extPass ? '✓ ZERO' : '✗ NON-ZERO'})`);
  console.log(`  Blocked attempts: ${final.blocked}`);
  console.log(`  Local calls: ${final.local}`);
  results.push({ test: 'final.externalBytes', value: final.externalBytes, pass: extPass });

  // Verify health response (confirms server mode)
  const health = await fetch(`${SERVER}/health`).then(r => r.json());
  results.push({ test: 'health', mode: health.mode, version: health.version, pass: true });

  // Build report
  const report = {
    vajraVersion: health.version ?? '1.0.0',
    verifiedAt: new Date().toISOString(),
    mode: health.mode ?? 'demo',
    note: 'All test data is SYNTHETIC. This report covers demo-mode verification.',
    summary: {
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length,
      total: results.length,
      allPassed,
      externalBytesTransmitted: final.externalBytes,
      blockedAttempts: final.blocked,
    },
    tests: results,
  };

  // Sign the report (SHA-256 of JSON body)
  const body = JSON.stringify(report, null, 2);
  const sig = createHash('sha256').update(body).digest('hex');
  const signed = { ...report, signature: `sha256:${sig}` };

  const outPath = `${ROOT}/docs/sovereignty-report.json`;
  writeFileSync(outPath, JSON.stringify(signed, null, 2));

  console.log('\n════════════════════════════════════════');
  console.log(`RESULT: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log(`Passed: ${report.summary.passed}/${report.summary.total}`);
  console.log(`External bytes transmitted: ${final.externalBytes}`);
  console.log(`Sovereignty report written to: docs/sovereignty-report.json`);
  console.log(`Report signature (SHA-256): ${sig.substring(0, 32)}...`);
  console.log('════════════════════════════════════════');
  console.log('');

  if (serverProc) serverProc.kill();
  process.exit(allPassed ? 0 : 1);
}

run().catch(e => {
  console.error('Verification failed:', e.message);
  if (serverProc) serverProc.kill();
  process.exit(1);
});

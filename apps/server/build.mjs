#!/usr/bin/env node
// VAJRA server build — bundles src/index.ts + all @vajra/* workspace packages
// into a single ESM file. npm packages stay external (resolved from node_modules).
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo root is two levels up from apps/server
const root = resolve(__dirname, '..', '..');

mkdirSync('dist', { recursive: true });

// External = real npm packages that ship pre-compiled in node_modules.
// Workspace packages (@vajra/*) are NOT external — esbuild inlines them
// from their TypeScript source so we avoid the missing-.js-extension problem
// that raw tsc ESM output has.
const external = [
  'fastify',
  'better-sqlite3',
  'ws',
  'zod',
  // fastify peer deps / sub-packages
  '@fastify/*',
  'find-my-way',
  'fast-json-stringify',
  'ajv',
  'pino',
  // node built-ins are automatically external with platform:node
];

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  external,
  // Resolve @vajra/* directly from TypeScript source, bypassing dist/ folders
  // that don't exist until each package is individually built. This lets the
  // Dockerfile skip pre-building workspace packages entirely.
  alias: {
    '@vajra/shared':     resolve(root, 'packages/shared/src/index.ts'),
    '@vajra/agent-core': resolve(root, 'packages/agent-core/src/index.ts'),
    '@vajra/models':     resolve(root, 'packages/models/src/index.ts'),
    '@vajra/tools':      resolve(root, 'packages/tools/src/index.ts'),
  },
  banner: {
    js: '// VAJRA Server bundle — esbuild. SYNTHETIC DATA ONLY.',
  },
  logLevel: 'info',
});

// Node requires "type":"module" next to the file to treat .js as ESM
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }, null, 2));
console.log('✓ dist/index.js ready');

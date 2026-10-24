#!/usr/bin/env node
// VAJRA server build — bundles src/index.ts + all @vajra/* workspace packages
// into a single ESM file. npm packages stay external (resolved from node_modules).
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';

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
  banner: {
    js: '// VAJRA Server bundle — esbuild. SYNTHETIC DATA ONLY.',
  },
  logLevel: 'info',
});

// Node requires "type":"module" next to the file to treat .js as ESM
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }, null, 2));
console.log('✓ dist/index.js ready');

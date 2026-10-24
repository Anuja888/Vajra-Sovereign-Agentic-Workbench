# Architecture Decisions

Format: YYYY-MM-DD - Decision

## 2026-10-15
- Established pnpm monorepo with apps/web, apps/server, packages/shared, packages/agent-core, packages/models, packages/tools

## 2026-10-22
- Fixed App.tsx routing: all page components (Workbench, Models, Knowledge, Runs, Admin) were routed to SoonPage stubs — now properly wired to their implementations
- Fixed vite.config.ts proxy port from 8787 (Cloudflare Workers) to 3000 (actual server)
- Fixed router: simulated model was being eliminated as "embedding-only" because it includes `embeddings` in its modalities alongside text+vision; changed filter to only eliminate models with embeddings as their ONLY modality
- Added installed-model bonus (0.15) to router scoring so the SimulatedProvider always wins when no real GPU models are available
- Added ASME B31.3 default stress value: changed S default from 102.0 MPa to 137.9 MPa (A106 Gr B at 180°C per ASME Section II Part D); this produces the correct t_req = 1.45 mm for the seed scenario
- Fixed guard.ts recordLocal() bug: was doing `externalBytes += 0` instead of `externalBytes += bytes`
- Added corrosion_rate, remaining_life, and lmtd calc formulas to server; previously only asme_b313_tmin was implemented
- Added Evals page (/evals route) with 15 synthetic eval scenarios, category bar chart, trend chart, per-assertion detail
- Fixed server EADDRINUSE in tests: app.listen() is now guarded by VITEST env var check so tests use inject() without starting a socket listener
- Fixed leftRail.test.tsx: was asserting for 6 nav items and "Soon" badges (from SoonPage) which do not exist in LeftRail; now properly wraps with QueryClientProvider and asserts the correct 7 nav items
- Added meaningful tests for router (15), planner (9), shared/guard (14), server/API (12) — previously all were smoke stubs
- infra/scripts/demo.mjs and verify-airgap.mjs were single console.log stubs; replaced with real implementations
- Evals page: Recharts Tooltip formatter typed as (v: unknown) to satisfy stricter Recharts v3 type constraints
- Added shared package test script and vitest devDependency (was missing from package.json)
- Added declaration:true to agent-core and models tsconfig so dist/*.d.ts files are generated for server type resolution
- Cut: full real-time OCR pipeline (tesseract.js) — requires browser WebWorker wiring and large WASM assets; all OCR results are simulated in demo mode; note this in docs
- Cut: real Docker sandbox for code execution — Pyodide fallback described in docs; real sandbox requires Docker present
- Cut: real vector embeddings (LanceDB/sqlite-vec) — KB search uses text match in demo mode; real embeddings require BGE-M3 model running

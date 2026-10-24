# VAJRA Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  PREMISES BOUNDARY                                              │
│                                                                 │
│  ┌──────────────┐  SSE/REST  ┌─────────────────────────────┐  │
│  │  Browser      │◄──────────►│  Fastify Server :3000        │  │
│  │  (React 18)   │            │                             │  │
│  └──────────────┘            │  ┌─────────────────────┐    │  │
│                               │  │  Egress Guard        │    │  │
│                               │  │  (RFC1918 only)      │    │  │
│                               │  └─────────────────────┘    │  │
│                               │                             │  │
│                               │  ┌─────────────────────┐    │  │
│                               │  │  Agent Core          │    │  │
│                               │  │  Planner             │    │  │
│                               │  │  Researcher          │    │  │
│                               │  │  Vision Analyst      │    │  │
│                               │  │  Analyst             │    │  │
│                               │  │  Coder               │    │  │
│                               │  │  Author              │    │  │
│                               │  │  Critic              │    │  │
│                               │  └─────────────────────┘    │  │
│                               │                             │  │
│  ┌──────────────┐            │  ┌─────────────────────┐    │  │
│  │  Ollama/vLLM  │◄──────────►│  Model Router        │    │  │
│  │  :11434/:8000 │  local TCP  │  (2-stage scoring)    │    │  │
│  └──────────────┘            │  └─────────────────────┘    │  │
│                               │                             │  │
│                               │  ┌─────────────────────┐    │  │
│                               │  │  Tools               │    │  │
│                               │  │  fs · calc · kb      │    │  │
│                               │  │  docx · code · ocr   │    │  │
│                               │  └─────────────────────┘    │  │
│                               │                             │  │
│                               │  ┌─────────────────────┐    │  │
│                               │  │  SQLite              │    │  │
│                               │  │  Runs / Audit /      │    │  │
│                               │  │  KB index            │    │  │
│                               │  └─────────────────────┘    │  │
│                               └─────────────────────────────┘  │
│                                           ▲                     │
│                                    BLOCKED │ BLOCKED            │
│                                           │                     │
│  ═══════════════════════ FIREWALL ════════╪═════════════════   │
│                                           │                     │
│                                        8.8.8.8 (BLOCKED)       │
└─────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
vajra/
├── apps/
│   ├── server/          Fastify backend, SSE streaming, all API routes
│   └── web/             React 18 frontend, design system, all pages
├── packages/
│   ├── shared/          Types, Zod schemas, egress guard utilities
│   ├── agent-core/      Planner, specialist agents, critic
│   ├── models/          Model manifests, 2-stage router
│   └── tools/           Tool definitions and implementations
├── infra/
│   └── scripts/         demo.mjs, verify-airgap.mjs
├── evals/               Agent evaluation harness and test suite
└── docs/                Architecture, sovereignty, security docs
```

## Request Flow

### Chat → Run → Stream

1. User types goal in Workbench → `POST /api/runs`
2. Server creates a `Run` record, calls `planTask()` → returns `PlanStep[]`
3. `simulateRun()` (demo) / real agent loop (live) starts asynchronously
4. Each step: `route()` → picks model → tool call → fact extraction → broadcast SSE
5. Browser receives events and renders: plan nodes light up, facts appear, artifacts are created
6. Approval step: `POST /api/approvals/:id/resolve` → agent continues
7. Run completes: `run.completed` event → download becomes available

### Model Routing (2-Stage)

**Stage 1 — Task Analysis**
Keyword regex extracts task types: `coding`, `summarization`, `vision-ocr`, `document-drafting`, `reasoning`, `drawing-understanding`, `tabular`, `multilingual`.

**Stage 2 — Weighted Scoring**
```
score = 0.35 × capability + 0.25 × liveSuccessRate + 0.20 × modalityFit
      - 0.10 × latencyCost - 0.05 × vramPressure - 0.05 × queueDepth
      + 0.15 × installedBonus
```
Hard filters: vision-incapable models eliminated if vision is required; embedding-only models eliminated for non-embedding tasks. Installed models get a +0.15 bonus to ensure the SimulatedProvider wins in demo mode.

### Audit Chain

Every event is appended to the audit log with:
```
hash[n] = SHA-256(hash[n-1] + JSON.stringify(payload[n]))
```
`POST /api/audit/verify` recomputes the chain and returns `ok: true/false`. Tampered entries are detected immediately.

## Key Design Decisions

See [DECISIONS.md](DECISIONS.md) for the complete log.

- **No external dependencies at runtime** — all fonts, assets, and libraries bundled
- **SSE over WebSocket** — simpler, no upgrade handshake, works through all proxies
- **In-memory state in demo mode** — avoids SQLite migration complexity for demos; production uses SQLite
- **Single server file** — keeps the demo setup simple and auditable; production would split into modules
- **TypeScript strict mode everywhere** — no `any` in shared types, Zod at all API boundaries

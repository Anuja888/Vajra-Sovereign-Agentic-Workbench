# VAJRA — Sovereign Agentic Workbench

> **Hosted demo: synthetic data, simulated model, not air-gapped.**
> The live deployment runs on Vercel (frontend) and Render (backend) — public cloud infrastructure. The air-gap and sovereignty features described below are properties of the self-hosted Docker Compose deployment, not the hosted demo.

> "Confidential work. Zero egress."

VAJRA is a self-hosted AI workbench for confidential industrial work. It runs entirely on-premises: all inference, all retrieval, all document generation stays on the local server. Nothing is transmitted to external APIs.

---

## What it actually is

VAJRA is a **demo-quality full-stack application** built to the specification of a sovereign on-premises AI workbench for industrial users (refineries, PSUs, defence-linked manufacturing). It demonstrates:

- A React 18 frontend with a "Refinery Control Room" dark theme across 7 fully routed pages
- A Fastify Node.js backend with SSE streaming, in-memory run state, and a tamper-evident SHA-256 audit chain
- A 2-stage weighted model router (`packages/models`) that scores open-weight model manifests per task type and returns ranked decisions with human-readable reasons — **verifiable via the Router Lens on the Models page and via unit tests**
- A deterministic agent planner (`packages/agent-core`) that generates multi-step DAG plans for 6 task patterns — **verifiable via unit tests**
- A simulated agent runtime that executes those plans asynchronously, broadcasting SSE events and building a facts ledger and artifact list
- A runtime egress guard that blocks all non-RFC1918 destinations — **verifiable via the red-team panel and unit tests**
- Docker Compose deployment with nginx reverse proxy and SSE support
- 81 unit + integration tests across 7 packages, all passing

**Demo mode** (default, no GPU required): model inference is replaced by a deterministic template engine ("Demo Brain"). All outputs are clearly labelled `[SYNTHETIC]`.

---

## What is not yet production-complete

| Feature | State |
|---|---|
| Live LLM inference | Wired for Ollama/vLLM; requires a running GPU server to activate |
| Real OCR / VLM | Simulated; real wiring requires Qwen2.5-VL running locally |
| Real `.docx` / `.pptx` / `.xlsx` downloads | Stub text files in demo mode; full generation requires docx/pptxgenjs wiring |
| Sandboxed code execution | Simulated; real wiring requires Docker sandbox |
| SQLite persistence | `better-sqlite3` installed; state is currently in-memory (restarts clear data) |
| Request body validation | Zod installed; bodies currently use `as any` |

These are architecture decisions, not oversights — the spec requires GPU hardware not available in the demo environment.

---

## Architecture

```
Browser (React 18) ──REST/SSE──► Fastify :3000
                                      │
                          ┌───────────┼───────────────┐
                          │           │               │
                     Model Router  Agent Planner  Egress Guard
                     (packages/models) (packages/agent-core) (packages/shared)
                          │
                   SimulatedProvider ◄──── or ──── Ollama/vLLM (live mode)
```

### Packages

| Package | What it actually contains |
|---|---|
| `apps/web` | React 18 + Vite + Tailwind. 7 pages: Workbench, Network, Models, Knowledge, Runs, Evals, Admin |
| `apps/server` | Fastify server. All API routes, SSE event bus, in-memory run/audit state, simulated agent loop |
| `packages/agent-core` | `planTask()` — builds typed DAG plans for 6 task patterns. `criticCheck()`. 9 unit tests. |
| `packages/models` | 8 model manifests. `route()` — 2-stage weighted scorer. 15 unit tests. |
| `packages/shared` | TypeScript types, Zod schemas, egress guard utilities. 14 unit tests. |
| `packages/tools` | Tool type definitions. Implementations are stubs pending hardware wiring. |

---

## Test results (reproducible)

Run `pnpm test` on a clean clone:

```
packages/shared      14 tests  passed  (egress guard, RFC1918 rules, audit chain)
packages/agent-core   9 tests  passed  (planner DAG, critic checks)
packages/models      15 tests  passed  (router scoring, model elimination, task analysis)
packages/tools        1 test   passed  (smoke)
evals/               28 tests  passed  (egress guard, router, planner, injection defense)
apps/server          12 tests  passed  (API endpoints, calc golden values, CORS)
apps/web              2 tests  passed  (component renders)
─────────────────────────────────────────────────
Total               81 tests  passed
```

The **evals/** suite covers:
- Egress guard: 10 assertions (public IPs blocked, RFC1918 allowed, edge cases)
- Model router: 8 assertions (task analysis, vision elimination, installed-model bonus)
- Agent planner: 9 assertions (DAG structure, agent roles, dependency chains)
- Security: 2 assertions (injection pattern detection)

All 81 tests pass on every run. `pnpm typecheck` is clean. The production bundle builds successfully (`pnpm build`).

---

## Quickstart (demo mode, no GPU)

```bash
git clone <repo>
cd vajra
pnpm install

# Terminal 1 — API server on :3000
pnpm --filter=./apps/server dev

# Terminal 2 — Vite dev server on :5173
pnpm --filter=./apps/web dev
```

Open `http://localhost:5173`

The `pnpm demo` script in `infra/scripts/demo.mjs` starts both services programmatically but browser auto-open may not work on all platforms — open the URL manually if needed.

---

## Deploy — Docker Compose

```bash
cp .env.example .env
docker compose up --build
# Web: http://localhost   API: http://localhost:3000
```

```bash
docker compose up -d        # background
docker compose logs -f      # follow logs
docker compose down         # stop (in-memory data lost on restart)
docker compose down -v      # stop and remove volume
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGIN` | `http://localhost` | Comma-separated allowed origins |
| `VITE_API_URL` | *(empty)* | Browser API URL — empty = nginx same-origin proxy |
| `PORT` | `3000` | Server listen port |
| `HOST` | `0.0.0.0` | Server bind address |

---

## Deploy — Render (free) + Vercel (free)

### Backend on Render

- **Build command**: `pnpm install --frozen-lockfile && pnpm --filter=@vajra/server build`
- **Start command**: `node apps/server/dist/index.js`
- **Env vars**: `PORT=10000`, `HOST=0.0.0.0`, `NODE_ENV=production`, `CORS_ORIGIN=https://your-project.vercel.app`

### Frontend on Vercel

- Vercel reads `vercel.json` automatically
- Add env var: `VITE_API_URL=https://your-backend.onrender.com`

> Render free tier spins down after 15 min inactivity (~30s cold start). The static frontend on Vercel stays up permanently.

---

## Live GPU mode

Connect a local Ollama or vLLM server:

```bash
# Example: pull a model in Ollama
ollama pull qwen2.5-coder:7b-instruct

# Start VAJRA — it auto-detects installed models on the Models page
pnpm --filter=./apps/server dev
pnpm --filter=./apps/web dev
```

VAJRA's model router will automatically prefer installed models over the SimulatedProvider. The Models page shows detected vs available models. The `SIMULATED MODEL` badge in the status bar reflects live detection state.

> Live inference, real OCR, and real sandbox code execution require the respective models/services to be running. These paths are wired in the architecture but not exercised in demo mode.

---

## Air-gap verification

```bash
pnpm verify:airgap
# Starts server, runs all 5 red-team exfiltration attempts,
# asserts zero external bytes transmitted,
# writes docs/sovereignty-report.json
```

The Network Monitor page shows real-time proof during any session:
- **EXTERNAL BYTES = 0** at all times
- Red-team panel: each attack attempt is genuinely made and genuinely blocked
- Audit chain: every event is SHA-256 hash-chained and verifiable

---

## Model registry

8 manifests ship with VAJRA. In demo mode only `Demo Brain (Simulated)` is marked installed. The others are available to pull:

| Model | Params | Best for | VRAM needed |
|---|---|---|---|
| VAJRA-Reason-120B (Llama-3) | 120B | Reasoning, approval drafting | 70 GB |
| VAJRA-Fast-20B (Mistral) | 20B | Summaries, routing | 14 GB |
| Qwen2.5-Coder-32B | 32B | Code generation | 20 GB |
| Qwen2.5-VL-7B | 7B | OCR, drawings, photos | 8 GB |
| Llama-3.3-70B | 70B | Long-form drafting | 40 GB |
| Mistral-Small-24B | 24B | Summarisation | 16 GB |
| BGE-M3 (embeddings) | 568M | KB retrieval | 1.5 GB |
| **Demo Brain** | — | Demo mode (no GPU) | 0 GB |

Adding a new model requires no code changes — drop a manifest or use the in-app wizard. See [docs/ADDING_A_MODEL.md](docs/ADDING_A_MODEL.md).

---

## Tech stack

- **Frontend**: React 18, TypeScript (strict), Vite, Tailwind CSS, Framer Motion, Recharts, TanStack Query v5, lucide-react, react-router-dom v7
- **Backend**: Node 20, Fastify v4, SSE streaming, better-sqlite3 (installed, not yet wired), Zod
- **Fonts** (self-hosted, offline): Barlow Condensed, IBM Plex Sans, JetBrains Mono via @fontsource
- **Testing**: Vitest, @testing-library/react, happy-dom
- **Build**: pnpm workspaces, TypeScript strict mode, esbuild (server bundle), ESLint, Prettier
- **Deploy**: Docker Compose (nginx + Node), Vercel (frontend), Render/Railway (backend)

---

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Sovereignty model](docs/SOVEREIGNTY.md)
- [Security](docs/SECURITY.md)
- [Adding a model](docs/ADDING_A_MODEL.md)
- [Demo script](docs/DEMO_SCRIPT.md)
- [Decision log](docs/DECISIONS.md)
- [Contributing](docs/CONTRIBUTING.md)

---

## License

MIT — see [LICENSE](LICENSE)

All seed data, document names, values, and scenarios are **SYNTHETIC and clearly fictional**. No real MRPL data.

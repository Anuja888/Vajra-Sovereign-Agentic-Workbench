# Contributing to VAJRA

## Development Setup

```bash
# Prerequisites: Node.js >= 20, pnpm >= 9
git clone <repo>
cd vajra
pnpm install

# Start in demo mode
pnpm demo

# Or start components individually
pnpm --filter=./apps/server dev   # port 3000
pnpm --filter=./apps/web dev      # port 5173
```

## Before Submitting

```bash
pnpm typecheck   # must pass with zero errors
pnpm lint        # must pass clean
pnpm test        # all tests must pass
pnpm build       # full build must succeed
```

## Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- TypeScript strict mode — no `any` except where genuinely unavoidable (comment why)
- All new API routes need a Zod-validated request body and a test in `health.test.ts`
- All new calculations need a golden-value test
- Seed data is always SYNTHETIC — never add real industrial data

## Adding Features

1. New pages go in `apps/web/src/pages/<Name>/index.tsx`
2. Wire the route in `apps/web/src/App.tsx`
3. Add the nav item in `apps/web/src/components/shell/LeftRail.tsx`
4. New API endpoints in `apps/server/src/index.ts` with Zod validation
5. New shared types in `packages/shared/src/types.ts`
6. After any package change: rebuild with `pnpm --filter=<package> build`

## Docs

- Add one line per significant decision to `docs/DECISIONS.md`
- Update `README.md` if you add/remove a feature or change quickstart steps

## All data must be synthetic

Any test fixtures, seed data, KB documents, or example outputs must be clearly fictional.  
Never commit real inspection reports, real financial data, or real vendor information.

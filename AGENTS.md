# Enterprise Risk Intelligence Decision Support System

## Stack

- **Language / Runtime**: Node 24, TypeScript 5.9, JavaScript CommonJS
- **Framework**: Express 5 on backend, React 19 with Vite 7 on frontend
- **Key dependencies**: PostgreSQL (pg), Tailwind CSS, TanStack React Query, Vitest
- **Package manager**: npm workspaces

## Build approach

Tracer Bullet, prove the pipe works with real vertical slices through every layer.

## Commands

```bash
# Install dependencies
npm install

# Dev servers (parallel backend and frontend)
npm run dev

# Run backend alone
npm run dev:backend

# Run frontend alone
npm run dev:frontend

# Build workspaces
npm run build

# Run tests
npm test
```

## Specs

Stored in `docs/specs/`. Format: `docs/specs/NNNN-title.md`.

## Rules

- Monorepo workspace with backend and frontend packages.
- Backend runs CommonJS modules with Express 5 and native PostgreSQL connections.
- Frontend runs React 19 with Vite, TypeScript, and Tailwind CSS.
- Preserve audit safety: historical assessments snapshot methodology parameters and never mutate on configuration updates.
- Keep calculations deterministic and explainable with inline mathematical factor breakdowns.
- Validate category weights sum to 100 percent with a 0.01 floating point tolerance before database persistence.
- Do not use punctuation dashes or hyphens in user facing prose or documentation.

## Agent skills

- [architect](.agents/skills/architect/): `architect`, feature and system design build specs
- [audit](.agents/skills/audit/): `audit`, project context and durable knowledge bootstrapping
- [check](.agents/skills/check/): `check`, runtime verification and fresh model code reviews
- [debug](.agents/skills/debug/): `debug`, root cause localization and regression tests
- [develop](.agents/skills/develop/): `develop`, feature implementation against approved specs
- [document](.agents/skills/document/): `document`, human facing release notes and pr descriptions
- [scope](.agents/skills/scope/): `scope`, product scope and milestone tracking
- [sync](.agents/skills/sync/): `sync`, knowledge reconciliation and spec freshness
- [test](.agents/skills/test/): `test`, test suite creation and execution

## Context files

- [backend/AGENTS.md](backend/AGENTS.md): Express API server, deterministic calculation engine, PostgreSQL database access
- [frontend/AGENTS.md](frontend/AGENTS.md): Vite React user interface, risk analysis dashboards, methodology configuration

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

# SignalPoint ERI

SignalPoint ERI is a development-only Enterprise Risk Intelligence and Decision Support System. It turns employee reports into a controlled risk register, calculates explainable residual risk and the Enterprise Risk Index (ERI), assigns mitigation work, and provides role-specific dashboards and management reporting.

The implementation follows the supplied PRD: React + TypeScript on the web, Express + TypeScript for the API, PostgreSQL through Prisma, and server-side PostgreSQL sessions. Deployment and production infrastructure are intentionally excluded.

## Technology stack

- Web: React 19, Vite, Material UI, TanStack Query, Recharts
- API: Express 5, Zod, Prisma, Pino
- Data and sessions: PostgreSQL 16+
- Security: HTTP-only sessions, CSRF tokens, Helmet CSP, exact-origin CORS, rate limiting, role and organization checks
- Tests: Vitest, React Testing Library, Supertest

## Repository layout

```text
apps/
  api/                 Express API, Prisma schema/migration, seed, tests
  web/                 React application and component tests
.env.example           Local configuration template
DEVELOPMENT_CHECKLIST.md
```

## Prerequisites

- PostgreSQL 16+ installed locally or available on your network
- pgAdmin 4 installed locally for database administration
- Node.js 22+
- npm 10+

## Run locally

Copy `.env.example` to `.env`, point `DATABASE_URL` and `SESSION_DATABASE_URL` to your local PostgreSQL database, then run:

```bash
npm install
npm run db:generate
npm --workspace @eri/api exec prisma migrate deploy
npm run db:seed
npm run dev
```

The web application is available at `http://localhost:5173`; Vite proxies `/api` to `http://localhost:4000`.

## Demo users

All demo users use the local-only password `RiskDemo2026!`.

| Role          | Email                 |
| ------------- | --------------------- |
| Employee      | `employee@demo.local` |
| Risk Officer  | `officer@demo.local`  |
| Administrator | `admin@demo.local`    |

The seed creates one organization in the `Africa/Kigali` timezone, three departments, six categories, four score bands, reports, assessed risks across every band, mitigation actions, recommendation rules, ERI history, and audit records.

## Key workflows

### Employee

1. Sign in and create a draft report.
2. Add permitted evidence from the report detail page.
3. Submit the report and follow its status.
4. Respond to clarification and resubmit a returned report.
5. Update assigned mitigation-action progress; completion requires a note.

### Risk Officer

1. Start review of a submitted report.
2. Request clarification, reject with a reason, or transactionally convert it to a risk.
3. Create an assessment draft and approve it.
4. The server calculates the score, selects the band, updates the risk, and stores an ERI snapshot in one transaction.
5. Add controls, actions, and monitoring updates; use the dashboard and reports.

### Administrator

Manage users, departments, categories, score bands, and recommendation rules. Overlapping active score bands are rejected. Review append-only, redacted audit events.

## ERI formula

```text
inherentScore = likelihood × impact
normalizedInherent = inherentScore / 25 × 100
residualScore = normalizedInherent × (1 - controlEffectiveness / 100)

categoryScore = average latest approved residual score for active risks
ERI = Σ(categoryScore × categoryWeight) / Σ(weights of assessed categories)
```

Closed and archived risks do not contribute. A category without contributing data is **Not Assessed** and is excluded from the denominator. Approved assessments store formula version `1.0`.

This transparent pilot methodology supports professional judgment. It is not a scientifically validated prediction and does not replace qualified risk-management review.

## Quality commands

With the environment variables from `.env` available:

```bash
npm run format
npm run typecheck
npm test
npm run build
npm --workspace @eri/api exec prisma migrate status
```

API integration tests require a migrated and seeded PostgreSQL database. They verify real PostgreSQL sessions, authentication, CSRF, organization/role boundaries, dashboard aggregation, and an employee report mutation.

## Security notes

- Organization scope comes from the authenticated session, never from request bodies.
- Employees can read only their own submissions and assigned actions.
- Inactive users and inactive organizations invalidate existing sessions.
- All authenticated mutations require a CSRF token.
- Uploads use generated stored names, an extension/MIME allow-list, a size limit, and record-level download authorization.
- CSV cells beginning with `=`, `+`, `-`, or `@` are neutralized.
- Logs and audit data redact passwords, cookies, authorization, sessions, and CSRF values.

## Known MVP limitations

- Administrator screens currently focus on creation and review; deactivation and editing endpoints are the next administration increment.
- Risk registration is fully supported by the API; the primary UI path emphasizes conversion from employee reports.
- Controls can be added in the UI; control editing/deactivation remains an API/UI increment.
- Browser automation and production deployment are not included in this development deliverable.
- Attachments use a local mounted volume; malware scanning and object storage are deferred.

## Deployment scope

Deployment, cloud hosting, domains, TLS provisioning, production secrets, scaling, backup services, release management, and go-live procedures are **not included**, exactly as required by the PRD.

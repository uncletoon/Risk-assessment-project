# Backend API and Calculation Engine

## Overview

The backend service provides the RESTful API and deterministic calculation engine for the risk intelligence platform. It handles document parsing, risk scoring, methodology configuration, and what if mitigation simulation.

## Stack

- **Runtime**: Node.js (CommonJS)
- **Framework**: Express 5
- **Database**: PostgreSQL with pg driver
- **Authentication**: JSON Web Tokens with bcrypt password hashing
- **Testing**: Node test runner (node:test)

## Key files

- `server.js`: Express application initialization and route mounting
- `src/config/db.js`: PostgreSQL connection pool configuration
- `src/engines/risk/calculationEngine.js`: Deterministic risk engine, matrix normalization, explainability narrative generator, and mitigation simulation
- `src/services/assessmentService.js`: Assessment execution pipeline and methodology snapshotting
- `src/services/organizationService.js`: Organization methodology storage and validation
- `src/controllers/riskController.js`: Simulation and risk inspection handlers
- `src/controllers/organizationController.js`: Methodology configuration handlers

## Commands

```bash
# Start server in development mode
npm run dev

# Start production server
npm start

# Run test suite
npm test
```

## Conventions

- Use native SQL queries through the pg pool rather than heavy ORM abstractions.
- All risk calculations must remain deterministic and mathematical without arbitrary score adjustments.
- Organization methodology changes must never mutate historical assessment snapshots.
- New endpoints should be mounted under `/api/` and mirrored under `/api/v1/` when backward compatibility is needed.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

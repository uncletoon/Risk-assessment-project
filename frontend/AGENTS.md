# Frontend Client Application

## Overview

The frontend single page application provides the user interface for risk intelligence, assessment review, explainable score breakdown, methodology administration, and what if mitigation simulation.

## Stack

- **Runtime**: Browser (ESM)
- **Framework**: React 19 with Vite 7
- **Language**: TypeScript 5.9
- **Routing**: React Router 7
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack React Query
- **Testing**: Vitest

## Key files

- `src/App.tsx`: Application shell and route declarations
- `src/lib/api.ts`: Centralized API client, methodology interfaces, and simulation payloads
- `src/pages/AssessmentDetails.tsx`: Assessment inspector with ERI breakdown, factor explanations, and simulator modal
- `src/pages/admin/MethodologyConfig.tsx`: Administrative methodology configurator for matrix scales, weights, and score bands
- `src/components/ui/MitigationSimulatorModal.tsx`: Interactive what if mitigation modal with diminishing return formulas
- `src/components/layout/Sidebar.tsx`: Navigation sidebar with methodology settings link

## Commands

```bash
# Run local development server
npm run dev

# Run type check and production build
npm run build

# Run unit tests
npm test
```

## Conventions

- Keep state management clean using TanStack Query for server state and React hooks for UI state.
- Always validate category weight sums to 100 percent in real time before submitting to the backend.
- Guard against undefined browser globals like localStorage in non browser test environments.
- Maintain responsive layouts and clean typography across desktop and tablet viewports.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._

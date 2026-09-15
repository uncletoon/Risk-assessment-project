# 0001. Enhance Risk Calculation Engine with Explainability and Dynamic Organization Methodology Configuration

**Date**: 2026-09-10
**Status**: Accepted

## Summary

This decision upgrades our existing deterministic risk calculation engine with clear mathematical explainability and dynamic organization methodology configuration. It preserves existing calculation formulas while adding plain language summary explanations with inline math for every assessed risk and the Enterprise Risk Index. Assessments snapshot the active methodology configuration at completion so that historical audits remain permanent and immune to future matrix changes. Administrators can adjust matrix dimensions, category weights, and score bands directly through organization configuration, and risk officers gain a dedicated simulation endpoint to test mitigation impacts before committing actions.

## Context

Our current risk calculation engine (`backend/src/engines/risk/calculationEngine.js`) reliably calculates inherent risk, control effectiveness, residual risk, and the Enterprise Risk Index. However, it relies on fixed constants in `riskConstants.js` for 5x5 scales, category weights, and score classification boundaries.

Users currently cannot see the mathematical steps that produced their score or why a specific control reduced their risk. Furthermore, organizations cannot customize matrix dimensions (such as moving from 5x5 to 3x3 or 4x4) or adjust category weights to match their specific operating profile without developer intervention. If an organization shifts its matrix dimensions, historical assessment records with raw scores could become invalid if evaluated dynamically. Lastly, risk teams have no way to simulate how proposed mitigation actions would lower their residual risk or overall enterprise index prior to allocating budget and effort.

Upgrading the existing system in place with snapshot isolation preserves proven calculation mechanics while delivering explainability, administrative control, and decision support.

## Requirements

**User stories**:

- As a risk officer, I want to view a plain language explanation with inline mathematical steps for any risk score so that I understand exactly how controls reduced the inherent risk.
- As an executive, I want to inspect the Enterprise Risk Index breakdown so that I see which categories drove the overall score and why.
- As a system administrator, I want to configure matrix dimensions, score bands, and category weights per organization so that our risk methodology matches our enterprise standards.
- As an auditor, I want past assessments to preserve their original calculation snapshot so that historical records never change when an administrator adjusts matrix parameters.
- As a risk officer, I want to simulate proposed mitigation actions via a dedicated endpoint so that I can forecast risk reduction before committing work.

**Acceptance criteria**:

- **AC-1**: When calculating residual risk, the calculation engine generates a plain language narrative string containing inline mathematical steps, inherent score, total control percentage deduction, and resulting residual score.
- **AC-2**: When calculating the Enterprise Risk Index, the engine generates an explainability summary detailing total active risks, assessed category weights, and the top category contributors, saved in `assessments.eri_explanation`.
- **AC-3**: The `organizations` table supports a nullable `methodology_config` JSONB column storing custom matrix dimensions (3x3 to 5x5), score bands, and category weights, falling back cleanly to standard defaults when null.
- **AC-4**: Category weights configured on an organization must validate that active weights sum to one hundred percent with a floating point tolerance of plus or minus 0.01 before saving.
- **AC-5**: The API provides `GET /api/organizations/:id/methodology` and `PUT /api/organizations/:id/methodology` guarded by administrator permissions.
- **AC-6**: A new endpoint `POST /api/risks/simulate` accepts a target risk identifier or baseline scores plus an array of proposed controls (`control_name`, `effectiveness_pct`), returning projected residual risk, projected classification, delta points, and explainability text without saving to the database.
- **AC-7**: The `assessments` table includes a nullable `methodology_snapshot` JSONB column that captures the active methodology when an assessment completes, ensuring historical assessments evaluate against their original parameters.
- **AC-8**: When an organization specifies a custom matrix dimension N from 3 to 5, the raw inherent score is calculated as likelihood times impact (up to N squared) and normalized to a 0 to 100 enterprise scale using `(raw / (N * N)) * 100`. All score bands evaluate against this normalized 0 to 100 scale.
- **AC-9**: All existing risk assessment calculation tests and API contracts continue to pass without breaking backward compatibility.

## Options considered

### Option 1: In place modular extension with snapshot isolation and simulation endpoint (Recommended)

Augment `calculationEngine.js` with an explainability decorator, add `methodology_config` to `organizations`, snapshot the active configuration onto `assessments.methodology_snapshot` at completion, and expose a dedicated simulation endpoint.

**Pros**:

- Zero downtime and zero disruption to existing stored assessments.
- Reuses existing deterministic calculation code and database tables.
- Clean fallback to default constants when custom configuration is absent.
- Complete historical audit integrity through assessment snapshotting.
- Delivers user control and explainability with minimal migration risk.

**Cons**:

- Requires one extra JSONB column on the `assessments` table for the snapshot.

### Option 2: Parallel calculation engine version two with assessment version flags

Build a completely separate calculation service and introduce version flags on every assessment record.

**Pros**:

- Complete architectural isolation between legacy and modern calculation modes.

**Cons**:

- High code duplication across engines.
- Doubles maintenance burden and requires branching logic in every assessment controller.

### Option 3: Full schema overhaul replacing constants with relational tables

Create dedicated relational tables for `matrix_dimensions`, `score_bands`, and `weight_profiles`.

**Pros**:

- Strict relational schema constraints for every configuration attribute.

**Cons**:

- Requires complex multi table migrations, seed updates, and cascading joins.
- Overly rigid for rapid administrative changes.

## Decision

**Chosen option**: Option 1: In place modular extension with snapshot isolation and simulation endpoint.

We will enhance the existing calculation engine in place, persist configuration in a JSONB column on the `organizations` table with default fallbacks, snapshot active methodology to `assessments.methodology_snapshot`, and provide a dedicated what if simulation endpoint.

## Rationale

Option 1 provides the highest value with the lowest operational risk. The existing calculation engine in `calculationEngine.js` is clean, functional, and deterministic. Replacing it or introducing a parallel engine would add needless complexity. Storing configuration in `methodology_config` on `organizations` gives administrators full flexibility over dimensions, labels, and weights without introducing complex schema migrations. Adding `methodology_snapshot` to `assessments` ensures complete audit safety even if matrix dimensions are altered from 5x5 to 3x3 later.

## Feature design

**Data model sketch**:

Table `organizations`:

- `methodology_config`: `JSONB NULL`, contains:
  - `matrix_dimension`: integer (3, 4, or 5; default 5)
  - `likelihood_scale`: array of `{ level: number, label: string, description: string }`
  - `impact_scale`: array of `{ level: number, label: string, description: string }`
  - `score_bands`: array of `{ name: string, min_score: number, max_score: number, color: string }` (evaluates on 0 to 100 scale)
  - `category_weights`: object mapping category code to weight number

Table `assessments`:

- `methodology_snapshot`: `JSONB NULL` (deep copy of organization methodology at completion)
- `eri_explanation`: `TEXT NULL` (plain language narrative summary for ERI)

Table `identified_risks` (existing, unchanged):

- `explanation`: receives the rich explainability string generated by the engine

**Mathematical normalization**:

- Likelihood scale: 1 to N
- Impact scale: 1 to N
- Inherent risk raw: `likelihood * impact` (minimum 1, maximum N squared)
- Inherent risk normalized: `(raw_inherent / (N * N)) * 100`
- Residual risk: `normalized_inherent * (1 - (control_effectiveness_pct / 100))`
- Classification: matched against `score_bands` using the normalized score

**API surface**:

| Endpoint                           | Method | Key inputs                                                              | Key outputs                            | Auth          | Key errors                |
| ---------------------------------- | ------ | ----------------------------------------------------------------------- | -------------------------------------- | ------------- | ------------------------- |
| /api/organizations/:id/methodology | GET    | organization id                                                         | methodology_config object              | Authenticated | 401, 404                  |
| /api/organizations/:id/methodology | PUT    | matrix_dimension, category_weights, score_bands                         | updated methodology_config             | Admin role    | 400 (sum not 100), 403    |
| /api/risks/simulate                | POST   | inherent_risk, proposed_controls: [{ control_name, effectiveness_pct }] | projected_residual, delta, explanation | Authenticated | 400 (invalid values), 404 |

**Value sourcing**:

| Action                  | Value produced / displayed           | Source                                                                                                                                       |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Calculate Residual Risk | Plain language explanation           | Generated in calculationEngine.js from inherent score, controls, and residual score                                                          |
| Calculate ERI           | ERI explanation summary              | Generated in calculationEngine.js from category scores and active weights, stored in assessments.eri_explanation                             |
| Fetch Methodology       | Active matrix dimensions and weights | assessments.methodology_snapshot (if viewing historical assessment), else organizations.methodology_config, falling back to riskConstants.js |
| Simulate Mitigation     | Projected residual score and delta   | Computed in memory by calculationEngine.js without DB write                                                                                  |

**Key invariants**:

- Category weights must always sum to 100.0 percent (plus or minus 0.01 floating point tolerance) when saving organization methodology.
- When methodology_config is null, calculations must produce identical numbers to the existing 5x5 baseline.
- Historical assessments with a non null methodology_snapshot must never be altered when organization methodology changes.
- The simulation endpoint must never mutate database assessment or risk records.

**Security model**:

- Any authenticated user in an organization may view methodology and run simulations.
- Only users with SYSTEM_ADMIN role can update organization methodology configuration.

**Critical test scenarios**:

- Standard calculation returns valid explainability narrative string with exact mathematical factors, verifying AC-1.
- ERI calculation includes correct category breakdown and plain language summary stored in assessment, verifying AC-2.
- Saving organization methodology with weights summing to 90 percent is rejected with 400 error, verifying AC-4.
- Updating 3x3 matrix dimension scales maximum inherent score to 9 and normalizes correctly to 100, verifying AC-8.
- Changing organization methodology does not alter scores on historical assessments with existing snapshots, verifying AC-7.
- Calling `/api/risks/simulate` returns projected residual reduction without altering database state, verifying AC-6.

## Build plan

1. Add `methodology_config` JSONB column to `organizations` table and `methodology_snapshot` plus `eri_explanation` columns to `assessments` table in a backward compatible migration, satisfies **AC-3**, **AC-7**.
2. Update `calculationEngine.js` to accept optional methodology configuration with dimension normalization, defaulting to `riskConstants.js`, satisfies **AC-8**, **AC-9**.
3. Implement explainability narrative builder in `calculationEngine.js` for residual risk and ERI, satisfies **AC-1**, **AC-2**.
4. Create organization methodology controller and routes (`GET/PUT /api/organizations/:id/methodology`) with floating point weight validation, satisfies **AC-4**, **AC-5**.
5. Implement `POST /api/risks/simulate` in `riskController.js` and wire to calculation engine, satisfies **AC-6**.
6. Enhance frontend risk detail and ERI dashboard components to display explainability narrative and inline calculation steps, satisfies **AC-1**, **AC-2**.
7. Build administrative methodology configuration UI in frontend for matrix dimensions, bands, and weights, satisfies **AC-3**, **AC-4**, **AC-5**.
8. Build what if mitigation simulation panel in frontend risk view, satisfies **AC-6**.

## Consequences

**Positive**:

- Full visibility into how risk scores and enterprise index values are derived.
- Administrative control over risk matrices and category weighting without code redeployments.
- Decision support simulation allows proactive mitigation planning.
- Snapshotting guarantees permanent audit consistency for all past assessments.

**Negative / tradeoffs**:

- Storing methodology per organization means administrators must manage their own configurations carefully.

**Neutral**:

- Zero disruption to existing production database records.

## Migration plan

**Strategy**: In place modular extension (no breaking changes).
**Phases**:

1. Run database migration adding nullable `methodology_config` to `organizations` and `methodology_snapshot` + `eri_explanation` to `assessments`.
2. Deploy enhanced `calculationEngine.js` and new API endpoints. Existing calls continue working without modification.
3. Deploy frontend explainability cards, methodology admin settings, and simulation widget.
   **Rollback**: If needed, reverting code commits leaves existing data intact because all new columns are optional.

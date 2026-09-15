# Scope: SignalPoint ERI

SignalPoint ERI is an enterprise risk intelligence and decision support platform. It helps organizations capture risk reports, calculate transparent residual risk and enterprise risk index scores, and take clear mitigation actions.

**Build approach:** Tracer Bullet (prove the pipe works with real vertical slices through every layer).
**Workflow:** Beta (/check verify, then /test). The project default level of rigor. /architect is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use /develop and skip /architect. You decide when a feature is done._

## At a glance

| #   | Feature                                            | Phase    | Status      |
| --- | -------------------------------------------------- | -------- | ----------- |
| A   | Core authentication and role sessions              | Existing | existing    |
| B   | Report intake and evidence workflow                | Existing | existing    |
| C   | Baseline assessment and risk register              | Existing | existing    |
| D   | Baseline mitigation tracking                       | Existing | existing    |
| E   | Administrative user and category management        | Existing | existing    |
| 1   | Explainable risk score and factor breakdown        | Slice 1  | in-progress |
| 2   | ERI decomposition and trend explainer              | Slice 1  | planned     |
| 3   | Dynamic risk matrix and score bands configurator   | Slice 2  | planned     |
| 4   | Category weighting and rule trigger builder        | Slice 2  | planned     |
| 5   | Remediation roadmap and mitigation forecast engine | Slice 3  | planned     |
| 6   | Contextual AI mitigation advisor                   | Slice 3  | planned     |

## Existing features (brownfield context)

### A. Core authentication and role sessions · existing

Session authentication with role permissions for employees, risk officers, and administrators.
code in `backend/src/controllers/authController.js` and `frontend/src/pages/Login.tsx`

### B. Report intake and evidence workflow · existing

Initial submission of employee observations with file evidence and triage review.
code in `backend/src/controllers/reportController.js` and `frontend/src/pages/SubmitReport.tsx`

### C. Baseline assessment and risk register · existing

Risk register listing, severity classification, and baseline residual risk calculations.
code in `backend/src/controllers/assessmentController.js` and `frontend/src/pages/RisksList.tsx`

### D. Baseline mitigation tracking · existing

Action item assignment, status progression, and sign off notes for mitigations.
code in `backend/src/controllers/mitigationController.js` and `frontend/src/pages/MitigationManagement.tsx`

### E. Administrative user and category management · existing

Organization profiles, user roles, audit records, and category settings.
code in `backend/src/controllers/adminController.js` and `frontend/src/pages/admin/`

## Slice 1: Transparent Explainability (Clear & Understandable)

### 1. Explainable risk score and factor breakdown · done

Deconstruct individual risk calculations into clear plain language factors, showing inherent risk, control effectiveness deductions, and mathematical formula steps right on the risk detail page.
**Done when:** users can inspect any risk to see its step by step formula, the exact points deducted by each control, and a plain language summary explaining why it received that score.

- [x] Design it (spec): `/architect explainable risk score and factor breakdown`
- [x] Build it: `/develop explainable risk score and factor breakdown`
  - [x] Migration: add methodology columns to organizations and assessments (AC-3, AC-7)
  - [x] Engine enhancement: dimension normalization and explainability builders in calculationEngine.js (AC-1, AC-2, AC-8, AC-9)
  - [x] API endpoints: methodology management and simulation route (AC-4, AC-5, AC-6)
  - [x] Frontend UI: explainability display cards and simulation panel (AC-1, AC-2, AC-6)
- [x] Verify it: `/check verify explainable risk score and factor breakdown`
- [x] Test it: `/test explainable risk score and factor breakdown`
      Spec [0001](../specs/0001-explainable-risk-calculation-and-configuration.md) · code in `backend/src/engines/risk/` and `frontend/src/`

### 2. ERI decomposition and trend explainer · needs a decision

Provide executive leadership and risk officers with an intuitive breakdown of the organization Enterprise Risk Index, showing category weight contributions and plain words explanations for historical score changes.
**Done when:** the main dashboard displays each category weighted contribution to the overall score, highlights top risk drivers, and explains trend shifts over time.

- [ ] Design it (spec): `/architect ERI decomposition and trend explainer`

## Slice 2: Full User Control & Methodology Configuration

### 3. Dynamic risk matrix and score bands configurator · needs a decision

Empower administrators to configure matrix dimensions from 3x3 up to 5x5, define custom score bands with threshold boundaries, and update color semantics without editing application code.
**Done when:** administrators can adjust matrix dimensions and score band limits in an interactive preview, with safety checks that confirm existing risk mappings before saving.

- [ ] Design it (spec): `/architect dynamic risk matrix and score bands configurator`

### 4. Category weighting and rule trigger builder · needs a decision

Give risk teams complete governance over category impact weights and automated recommendation rules with flexible condition triggers.
**Done when:** administrators can adjust category weights with one hundred percent sum validation and configure custom conditional rules that flag high priority risks.

- [ ] Design it (spec): `/architect category weighting and rule trigger builder`

## Slice 3: Actionable Decision Support (Real Meaningful Value)

### 5. Remediation roadmap and mitigation forecast engine · needs a decision

Transform mitigation actions into an actionable decision support roadmap that simulates expected residual risk reduction before time and budget are spent.
**Done when:** users can project how completing planned mitigations will reduce residual risk and lower the Enterprise Risk Index before committing resources.

- [ ] Design it (spec): `/architect remediation roadmap and mitigation forecast engine`

### 6. Contextual AI mitigation advisor · needs a decision

Generate tailored mitigation recommendations with realistic milestones based on risk context, department history, and organizational constraints.
**Done when:** risk officers can request intelligent mitigation strategies that provide concrete action plans, expected efficacy percentages, and suggested timelines.

- [ ] Design it (spec): `/architect contextual AI mitigation advisor`

## Deferred

Out of scope for this pass, recorded to keep the plan honest:

- Multi tenant organization switcher: enterprise multi tenancy isolation · needs a decision
- Regulatory compliance export presets: automated ISO 31000 and NIST export packs · needs a decision
- Real time webhook alerts: external notification webhooks for critical threshold breaches · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box.

**Feature lifecycle**:

- `planned` · needs a decision: one box: `Design it (spec): /architect <feature>`
- `in-progress` (designed): `Design it` ticked, spec linked, `Build it: /develop <feature>` with milestone sub items, and closing verification boxes.
- `in-progress` (building): milestone sub boxes tick one by one.
- `in-progress` (verified): `Build it` and `Verify it` ticked.
- `done`: you decide when it is done, after verification and testing.

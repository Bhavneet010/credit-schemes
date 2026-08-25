# State Pack Research System Design

**Date:** 2026-08-25  
**Status:** Approved for implementation planning (HP v2 included)
**Reference implementation:** Himachal Pradesh Scheme Finder and `Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx`

## 1. Purpose

Create a repeatable research system that can:

1. Add a complete Indian state with a short prompt while reproducing or exceeding the current Himachal Pradesh research quality.
2. Refresh an existing state without repeating unchanged research.
3. Refresh one sector, scheme family, agency, or named scheme without loading or modifying unrelated slices.
4. Produce a verified state workbook, optimized application data, a coverage report, and an auditable change report from one canonical State Pack.
5. Improve Himachal Pradesh into the first version-two State Pack before it becomes the template for other states.

The system optimizes for trustworthy coverage rather than a large unverified scheme count. A candidate is not published merely because it appears in a search result or summary document.

## 2. Current Baseline

The HP workbook currently contains:

- 382 business activities across 15 macro sectors.
- 182 schemes and routes.
- 6,767 activity-to-scheme mappings.
- 13 sheets, including a source register, corrections log, verification notes, coverage audit, component norms, contacts, and legacy routes.
- A 382-by-12 scheme-family coverage audit.

The current application build consumes only Sector Catalogue, Scheme Master, Sector-Scheme Map, Component Norms, Key Contacts, and Legacy & Closed. It does not expose or validate the workbook's Source Register, Corrections Log, Verification Notes, Coverage Audit, or Original Audit.

The HP profile also shows:

- 135 of 182 scheme records use the broad `Active - annual target or departmental sanction` status.
- Seven routes are labelled `Open now` but have no machine-enforced recheck deadline.
- Six HPIIP records have no activity mapping.
- A scheme record carries one source URL and one verification date even when its eligibility, benefit, status, dates, and access route come from different evidence.
- Central scheme definitions and HP implementation details are stored together.

These limitations do not invalidate the existing work. They identify what HP v2 must strengthen.

## 3. Architectural Decision

Use version-controlled canonical State Packs plus a reusable Codex skill and deterministic validators/generators.

The State Pack is the source of truth. Excel workbooks and application JSON are generated outputs. Shared central schemes are stored once and combined with state-specific adoption or implementation records when building a state.

### 3.1 Repository layout

```text
scheme-data/
├── schema/
│   ├── state-pack.schema.json
│   ├── scheme.schema.json
│   ├── evidence.schema.json
│   └── mapping.schema.json
├── common/
│   ├── schemes.json
│   ├── components.json
│   ├── sources.json
│   └── changes.json
└── states/
    └── himachal-pradesh/
        ├── manifest.json
        ├── sectors.json
        ├── schemes.json
        ├── implementations.json
        ├── components.json
        ├── mappings.json
        ├── component-norms.json
        ├── contacts.json
        ├── legacy.json
        ├── sources.json
        ├── evidence.json
        ├── candidates.json
        ├── coverage.json
        └── changes.json
```

Generated artifacts live outside the canonical records:

```text
outputs/
└── himachal-pradesh/
    ├── Himachal_Pradesh_Scheme_Guide_YYYY-MM-DD_verified.xlsx
    ├── data.json
    ├── qa-report.json
    └── change-report.json
```

The deployed app may copy or bundle generated `data.json`, but it must not become the authoritative research store.

### 3.2 Reusable skill

Install a concise `credit-scheme-research` skill in the user's Codex skills directory. It recognizes requests to add, update, audit, or expand Indian state credit, subsidy, livelihood, agriculture, MSME, industry, startup, or sector schemes.

The skill reads the repository's manifest and research contract before selecting a mode. Project-specific schemas, source rules, and commands remain version-controlled in this repository rather than being duplicated in the skill.

## 4. Operating Modes and Scope Contract

Every request resolves to exactly one primary mode and a declared scope before research begins.

| Mode | Example prompt | Required scope |
|---|---|---|
| `add-state` | `Add Punjab schemes` | Complete state, shared central catalogue, all coverage dimensions |
| `refresh-state` | `Update Himachal Pradesh` | State-wide delta scan since the last cutoff |
| `refresh-sector` | `Update horticulture schemes for Punjab` | Named state and normalized sector IDs |
| `refresh-family` | `Refresh export support in Haryana` | Named state and scheme-family IDs |
| `refresh-agency` | `Refresh HP Industries Department schemes` | Named state and agency IDs |
| `refresh-scheme` | `Update PMFME in Punjab` | Named scheme plus dependent implementation and mapping records |
| `audit-scope` | `Audit fisheries coverage for HP` | Read-only verification of the named slice |

The run writes a `scope declaration` into the change report containing:

- mode;
- state IDs;
- sector, family, agency, or scheme IDs;
- previous research cutoff;
- sources scheduled for checking;
- dependencies allowed to propagate;
- explicit exclusions.

Records outside the declared scope are byte-preserved. A validator fails a scoped run if unrelated canonical files or records change.

### 4.1 Dependency propagation

The manifest maintains reverse indexes between schemes, state implementations, components, sources, mappings, sectors, contacts, and legacy entries.

- A changed common central scheme rebuilds all state outputs that reference it, but its central facts are researched once.
- A changed eligibility rule revalidates only mappings whose applicant, sector, or unit-stage predicates depend on that rule.
- A changed source triggers rechecks only for claims linked to that source.
- A sector refresh may recheck a shared scheme when its evidence is expired or its rules affect the selected sector; it does not trigger an unconditional central-scheme sweep.
- A display-only output change rebuilds artifacts without changing research cutoffs.

## 5. Canonical Record Model

### 5.1 Stable identity

IDs are permanent and independent of display names:

- `STATE-IN-HP`
- `SECTOR-HP-AGR-CER-001`
- `SCHEME-CENTRAL-PM-FME`
- `IMPLEMENTATION-HP-PM-FME`
- `SOURCE-STABLEID`
- `CLAIM-STABLEID`

Renaming a scheme or correcting an acronym does not create a new ID. Merges and supersessions retain aliases and predecessor IDs.

### 5.2 Shared scheme and state implementation

A common scheme record stores issuing authority, official title, parent programme, national eligibility and benefits, scheme period, and national access rules.

A state implementation record stores the state department, portal, state contribution, modified norms, district or annual allocation, state application route, and state-specific status. State output overlays the implementation on the shared definition without copying unchanged national claims.

State-only schemes remain in the state pack. Components are separate records linked to their parent so the UI can show detailed routes without inflating the count of distinct programmes.

### 5.3 Claim-level evidence

Every decision-relevant field is a claim. At minimum, claims cover:

- legal or administrative existence;
- current intake state;
- eligible applicants;
- eligible activities and exclusions;
- support type;
- subsidy, credit, guarantee, interest, margin, or reimbursement values;
- project-cost and assistance ceilings;
- effective and closing dates;
- geography;
- application channel;
- required approvals;
- convergence or stacking restrictions.

Each claim links to one or more evidence records:

```json
{
  "id": "CLAIM-HP-MMSY-CAPITAL-RATE",
  "subjectId": "SCHEME-HP-MMSY",
  "field": "capitalSubsidy",
  "value": "25% general, 30% SC/ST, 35% women or persons with disabilities",
  "sourceIds": ["SOURCE-HP-MMSY-GUIDELINE"],
  "locator": "Clause 7.2 and rate table",
  "verifiedAt": "2026-08-25",
  "effectiveFrom": "2024-04-01",
  "effectiveTo": null,
  "evidenceGrade": "primary-operative",
  "confidence": "high"
}
```

Evidence grades are:

1. `primary-operative`: notification, act, rules, operative guideline, official application portal, or current circular.
2. `primary-summary`: official budget, Economic Survey, annual report, PIB release, department overview, or parliamentary reply.
3. `official-corroboration`: another official body restating the rule.
4. `secondary-lead`: credible non-official material used only to find a primary source.

Hard financial, eligibility, and deadline claims require primary-operative evidence for publication. A primary summary may support existence or discovery but cannot be the sole evidence for a precise entitlement unless it is the issuing authority's only published operative statement and the limitation is explicit.

The source record stores the official URL, title, issuer, publication date, retrieval date, document page or section, content fingerprint when obtainable, and the claims it supports. Short excerpts remain within copyright limits and are used only as audit locators.

## 6. Status Model

Scheme existence and application availability are separate dimensions.

```text
existence: active | superseded | withdrawn | completed | unconfirmed
intake: open | continuous | scheduled | allocation-dependent | closed | unknown
budget: available | annual-allocation | exhausted | not-applicable | unknown
```

Each status has `verifiedAt`, `validFrom`, `validTo`, `nextCheckAt`, evidence, and confidence. The application displays a friendly combined label but retains the underlying dimensions.

Default recheck intervals are:

- open deadline or temporary call: seven days, and again on the closing date;
- continuous portal or bank route: 30 days;
- annual allocation or department target: 30 days during the financial-year opening period and 60 days otherwise;
- structural rules with no expiry: 180 days;
- unknown or unconfirmed status: 14 days until resolved or moved to the candidate/legacy ledger.

Expired status evidence blocks `Open now` publication. It does not silently delete the scheme.

## 7. Scheme Discovery and Coverage

### 7.1 Breadth pass

A full state build starts with an official-agency inventory. It scans:

- state departments and directorates;
- state corporations, boards, missions, SPVs, development-finance bodies, and livelihood missions;
- state budget, Economic Survey, demands for grants, outcome documents, annual reports, notifications, and circular indexes;
- state single-window, DBT, subsidy, application, procurement, and service portals;
- district or cluster programme pages when they describe an official route not documented centrally;
- central ministries and finance bodies for schemes implemented through the state;
- official replacement, extension, closure, and successor notices.

Searches are also run across sector value chains, beneficiary overlays, enterprise stages, and support types. Search results and secondary articles create candidates only; they do not create published scheme records.

### 7.2 Depth pass

The depth pass deduplicates candidates by programme, component, aliases, issuer, and legal authority. It then verifies viable candidates against primary sources and classifies each candidate as:

- verified and publishable;
- verified component of an existing parent;
- existing but no current intake;
- institutional or intermediary-only route;
- superseded or closed;
- duplicate or alias;
- outside the State Pack's beneficiary scope;
- unverified lead requiring a future check.

Rejected and deferred candidates remain in `candidates.json` with reason, sources checked, and next-check date. This prevents repeated research and makes omissions auditable.

### 7.3 Coverage cube

Retain the existing sector-by-family audit and add coverage across:

```text
Agency × Sector × Beneficiary × Enterprise stage × Support type
```

Coverage outcomes are `verified-applicable`, `verified-none`, `candidate-pending`, or `not-relevant`, each with evidence and a verification date. A full-state build cannot pass QA while required cells are unexamined. Focused refreshes update only cells intersecting the declared scope.

## 8. Mapping Model

Mappings connect a sector activity to a scheme or component and contain:

- applicability: direct, strong, conditional, or horizontal;
- a structured eligibility predicate;
- value-chain stage and unit stage;
- applicant profile;
- why the mapping is valid;
- mapping evidence;
- conditions and exclusions;
- application sequence;
- convergence restrictions;
- verification date.

`Direct` requires an explicit activity or component match in official evidence. `Strong` requires a defensible scope match. `Conditional` identifies the missing eligibility condition. `Horizontal` is reserved for genuinely cross-sector enterprise support.

QA flags horizontal schemes mapped indiscriminately to all activities, unexplained mapping-count spikes, orphan schemes, orphan sectors, and state implementations inconsistent with the common scheme's rules.

## 9. HP v2 Migration

Migration is lossless before it is corrective:

1. Import every current HP sector, scheme, component norm, contact, mapping, source, legacy record, audit result, and correction entry into canonical records.
2. Preserve current IDs as aliases and generate permanent IDs where necessary.
3. Split central facts from HP implementation details without changing displayed content.
4. Convert row-level sources into initial evidence records and mark multi-claim rows that still need claim-level anchoring.
5. Reconcile the six unmapped HPIIP records as mapped active/legacy routes, components, or legacy-only entries.
6. Reverify the seven `Open now` routes, all expiring windows, and the 135 allocation-dependent routes using the status model.
7. Replace broad summary-only support for hard claims with operative evidence or downgrade the claim explicitly.
8. Run the expanded official-agency discovery sweep and retain all candidates, including exclusions.
9. Compare generated outputs with the current workbook and app. Every removal or changed value must appear in the change report with evidence.

HP v2 becomes the acceptance fixture for adding other states.

## 10. Validation and Publication Gates

Validation runs before any workbook or deployed app data is replaced.

### 10.1 Structural gates

- All JSON matches its schema.
- IDs are unique and references resolve.
- Stable IDs do not change because display text changed.
- Scoped runs do not modify records outside their declared scope except declared dependencies.
- No generated artifact is treated as canonical input.

### 10.2 Evidence gates

- Every published scheme has existence and intake evidence.
- Every hard number, eligibility threshold, deadline, and application route has acceptable evidence.
- Source URLs are official or explicitly classified as discovery-only.
- Expired status evidence cannot produce an `open` label.
- Conflicting sources are recorded and resolved by authority, date, and legal effect rather than silently overwritten.

### 10.3 Coverage and mapping gates

- Required coverage cells have an outcome.
- All published activities have at least one justified route or an explicit verified-none result.
- All published schemes have a beneficiary-facing use or are clearly labelled institutional.
- No orphan mapping exists.
- Mapping distribution and applicability changes are compared with the prior pack and large shifts require an explanation.

### 10.4 Output gates

- Workbook sheet counts, headers, formulas, filters, source links, and row counts reconcile with canonical records.
- Application JSON counts reconcile with canonical records.
- The app loads, searches, filters, and opens state, activity, scheme, source, contact, and legacy views.
- Existing HP bookmarks survive stable-ID migration or are migrated through an alias table.
- The change report classifies every canonical change as added, corrected, status-updated, retired, merged, split, or evidence-upgraded.

A failed gate leaves existing published artifacts untouched and writes a QA report describing the failure.

## 11. Generated Workbook

Each state workbook preserves the useful HP sheets:

1. Start Here
2. Business Navigator
3. Sector Catalogue
4. Sector-Scheme Map
5. Scheme Master
6. Corrections Log
7. Verification Notes
8. Coverage Audit
9. Component Norms
10. Legacy & Closed
11. Key Contacts
12. Original Audit or Migration Audit
13. Source Register

The v2 workbook may add a Claim Evidence sheet and a Candidate Ledger sheet. Workbook rows are generated from canonical records, and source URLs remain visible and auditable. The workbook is visually verified before publication.

## 12. Application Integration

The application becomes state-aware while remaining a static offline PWA:

- A state selector precedes sector and scheme navigation.
- Each state has independently generated data and research metadata.
- Shared central definitions are deduplicated at build time or runtime without exposing internal complexity to the user.
- Scheme details display evidence dates and distinguish existence from intake availability.
- A research/about view summarizes cutoff, coverage, unresolved candidates, and material limitations.
- State Packs can be added without editing hard-coded HP titles or paths throughout the application.

No backend, account, analytics, or live external dependency is required for the initial multi-state version.

## 13. Change Handling and Recovery

- Research changes are staged in canonical records and reviewed through a machine-readable diff.
- If an official page is unavailable, the prior claim remains with a failed-check note and shortened recheck date; it is not silently refreshed.
- If two official sources conflict, the newer operative authority controls when legally applicable, and the conflict is retained in evidence notes.
- If a scoped run discovers a potentially material out-of-scope change, it records a candidate task but does not mutate the unrelated slice.
- Interrupted runs can resume from the candidate and source ledgers without repeating completed checks.
- Existing generated workbook and app data are replaced only after all gates pass.

## 14. Testing Strategy

Implementation follows test-driven development.

- Schema tests cover valid and invalid records.
- Scope tests prove sector and scheme refreshes preserve unrelated records byte-for-byte.
- Dependency tests prove common-scheme changes rebuild only affected states and mappings.
- Migration tests reconcile HP v1 counts and every source record before corrective research begins.
- Evidence tests reject unsupported hard claims and stale open-window statuses.
- Coverage tests reject unexamined required cells.
- Mapping tests reject orphans and unjustified direct mappings.
- Generator tests compare workbook/app counts and stable IDs with canonical data.
- Existing PWA tests remain green, with new tests for state selection, stable bookmarks, and research metadata.
- A realistic skill test verifies that short prompts select the correct mode and scope before research.

## 15. Prompt Contract

The user should be able to issue short requests:

```text
Add Punjab.
Update Himachal Pradesh.
Update only horticulture schemes for Punjab.
Refresh PMFME for Haryana.
Audit fisheries coverage for Himachal Pradesh without changing data.
```

Before external research, the system reports the interpreted mode and scope in one compact update. It asks a question only when the state or target cannot be resolved safely. Completion reports the cutoff, sources checked, candidates found, records changed, QA result, and generated artifacts.

## 16. Acceptance Criteria

The system is complete when:

1. HP is represented as a canonical State Pack without losing any current workbook record.
2. HP v2 passes the structural, evidence, coverage, mapping, workbook, and application gates.
3. A short `add-state` prompt can create another State Pack using the same contract.
4. A sector refresh demonstrably leaves unrelated state records unchanged.
5. A named-scheme refresh updates its claims, implementation, reverse mappings, evidence, and affected output without a state-wide research pass.
6. Shared central schemes are researched once and referenced by state implementations.
7. Candidate and verified-none ledgers prevent repeated unsuccessful research.
8. The verified workbook, state-aware application data, QA report, and change report are reproducible from canonical records.
9. The reusable skill is behavior-tested against full-state, focused-sector, focused-scheme, and audit-only prompts.

## 17. Non-Goals for the Initial Implementation

- A hosted database or administrative backend.
- Automated publication of unreviewed search results.
- Scraping behind authentication or bypassing access controls.
- Treating announcements as operative schemes without implementation evidence.
- Rebuilding unrelated states or sectors during a focused refresh.
- Replacing official applicant confirmation, lender appraisal, legal advice, or departmental sanction.

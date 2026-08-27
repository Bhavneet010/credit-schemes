# State Pack Operations

The canonical records under `scheme-data/` are authoritative. Workbooks, app JSON,
QA reports and change reports are generated artifacts.

## Add or refresh data

Every research request first resolves to one mode: `add-state`, `refresh-state`,
`refresh-sector`, `refresh-family`, `refresh-agency`, `refresh-scheme`, or
`audit-scope`. Print the scope before research, for example:

```powershell
node tools/state-pack/cli.mjs scope --mode refresh-sector --state himachal-pradesh --sectors SEC-AGR-HOR-01
node tools/state-pack/cli.mjs scope --mode refresh-scheme --state himachal-pradesh --schemes SCH-CGTMSE-CREDIT-GUARANTEE-A17996
```

The declaration includes the prior cutoff, explicit exclusions and dependencies that
may propagate. Capture out-of-scope hashes before editing and compare them before
publication; `OUT_OF_SCOPE_CHANGE` is a hard failure. A focused refresh rechecks only
the named records, expired evidence they depend on, and reverse-index dependants.

### Reuse central research when adding a state

`scheme-data/common/` is the single source of truth for pan-India central and
national-institution scheme facts. An `add-state` run must reuse those records and
must not research their national benefits, eligibility or source claims again.
Research only the new state's adoption, implementing agency, access route, live
intake, state budget dependency and activity mappings, recorded in that state's
implementation and evidence files. Joint or centrally sponsored implementations
are treated as State routes in the app because their availability depends on state
adoption and delivery.

Recheck a shared central fact only in a separately declared `refresh-scheme` scope
that explicitly names the common scheme. If `add-state` encounters expired shared
evidence, pause that dependency, complete the focused common-scheme refresh once,
then resume `add-state` and reuse the refreshed record for every state pack.

## Validate and build

```powershell
npm run data:validate
node tools/state-pack/cli.mjs build-app --all --output-dir app/data
npm run test:unit
```

Validation rejects duplicate IDs, unresolved references, stale status records, missing
coverage outcomes, and hard financial/eligibility/access claims without either
primary-operative evidence or explicit indicative-only treatment and limitation.
Generated output is written through transactional staging only after validation.

## Import the accepted HP fixture

```powershell
node tools/state-pack/cli.mjs import-hp --workbench research/hp-v2
```

The import is deterministic and writes
`outputs/himachal-pradesh/migration-reconciliation.json`. It preserves the accepted
HP v2 counts, evidence, candidate memory, mapping reviews, workbook provenance and app
contract. This command is for migration/reconciliation, not routine HP refreshes.

## Compare record sets

```powershell
node tools/state-pack/cli.mjs diff --before before.json --after after.json --output change-report.json
```

Changes are categorized as `added`, `corrected`, `status-updated`, `retired`, `merged`,
`split`, `evidence-upgraded`, or `unchanged`. Stable IDs are join keys; key ordering is
ignored.

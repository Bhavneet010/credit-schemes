# Evidence and Publication QA

## Evidence

1. `primary-operative`: notification, rules, operative guideline, official application portal, or current circular.
2. `primary-summary`: budget, Economic Survey, annual report, PIB release, department overview, or parliamentary reply.
3. `official-corroboration`: another official body restating a rule.
4. `secondary-lead`: non-official discovery material; never sufficient for publication.

Financial amounts, ceilings, eligibility, deadlines, exclusions, and application routes
require primary-operative evidence. If the issuing body's only operative statement is a
summary, label the wording `indicative-only`, state the limitation, and never present it
as an entitlement.

## Status

Track existence, intake, and budget separately. Recheck open calls in 7 days and at
closure; continuous routes in 30 days; annual allocation routes in 30 days during the
financial-year opening and 60 otherwise; structural rules in 180 days; unknown or
unconfirmed status in 14 days. Expired evidence blocks “Open now.”

## Discovery memory and coverage

Candidate dispositions include publishable, component, no-current-intake,
intermediary-only, closed/superseded, duplicate/alias, outside scope, and unverified
lead. Keep excluded/deferred candidates, sources checked, reason, and next-check date.
Official-page failure is `failed-access`, never `verified-none`.
Retry once through an alternate official index, document repository, or portal endpoint.
If it still fails, retain the prior claim with a failed-check note, set a 14-day recheck,
and move on; do not spend the run repeatedly probing the same source.

Coverage outcomes are `verified-applicable`, `verified-none`, `candidate-pending`, or
`not-relevant`, with evidence and date across agency × sector × beneficiary × stage ×
support type. Full-state publication requires every required cell examined.

Mappings are `direct`, `strong`, `conditional`, or `horizontal`. Each needs a predicate,
value-chain/unit stage, applicant profile, rationale, conditions, evidence, convergence
rule, and date. Reject indiscriminate horizontal mappings, orphans, unexplained count
spikes, unresolved references, and state overlays inconsistent with common rules.

Publish only after scope hashes, evidence/status/coverage/mapping gates, deterministic
builds, and categorized diff all pass. “Production-ready” means zero blocking validation
errors, complete required coverage, resolved references/orphans, fresh publishable
status, reproducible outputs, and an explicit limitations report.

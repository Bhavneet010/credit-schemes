---
name: credit-scheme-research
description: Use when adding, auditing, expanding, or updating Indian state credit, subsidy, MSME, agriculture, livelihood, industry, startup, or sector schemes, especially when work must match an existing State Pack or remain limited to one state, sector, agency, family, or scheme.
---

# Credit Scheme Research

## Overview

Treat the State Pack as the source of truth. Declare the smallest correct mode and scope before research, publish only evidence-backed claims, and preserve everything outside that scope.

## Required Recipe

1. Locate the repository containing `scheme-data/` and read `docs/state-pack-operations.md` plus the target manifest.
2. Infer exactly one mode from the prompt and emit the scope declaration before browsing. Ask only when the state or target cannot be resolved safely.
3. Load the target records, linked sources, coverage cells, and declared reverse dependencies only. For `add-state`, inventory the complete official state-agency surface and relevant shared central catalogue.
4. Use secondary material for discovery only. Verify publishable claims against authoritative official evidence at claim level.
5. Record every addition, exclusion, failed-access check, conflict, candidate, and `verified-none` result so later runs do not repeat dead-end research.
6. Preserve stable IDs and effective-dated history. Store central facts once under `scheme-data/common/`; store state adoption and access details in the state implementation.
7. Run the out-of-scope hash guard, State Pack validation, categorized diff, and output tests before replacing generated artifacts.
8. Report the research cutoff, sources checked, candidate dispositions, changed records, preserved scope, QA result, limitations, and generated outputs.

## Routing

- Read [references/modes.md](references/modes.md) to select scope and dependency propagation.
- Read [references/evidence-and-qa.md](references/evidence-and-qa.md) before evaluating or publishing any source, claim, status, mapping, or coverage result.
- Read [references/examples.md](references/examples.md) when translating a short user prompt into an executable State Pack run.

Use `node tools/state-pack/cli.mjs` for scope, validation, builds, and diffs; repository code and schemas control mechanics.

## Quick Reference

| Request | Mode |
| --- | --- |
| Add a state | `add-state` |
| Update all records for a state | `refresh-state` |
| Update one sector, family, agency, or scheme | matching `refresh-*` mode |
| Verify without publication changes | `audit-scope` |

## Common Mistakes

- A focused request does not authorize a statewide sweep.
- A central update propagates only through reverse-indexed state implementations and mappings.
- An inaccessible official page is `failed-access`, not proof that no scheme exists.
- A budget speech or summary cannot alone support a precise entitlement.
- “Open now” requires fresh evidence; existence never implies intake or budget availability.

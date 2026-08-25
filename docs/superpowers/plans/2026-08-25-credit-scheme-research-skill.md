# Credit Scheme Research Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create, behavior-test, version, and install a reusable Codex skill that turns short state-scheme prompts into correctly scoped, evidence-driven State Pack work.

**Architecture:** A concise global skill selects an operating mode, declares scope, loads only relevant State Pack slices, follows the repository research contract, and runs canonical validators before publication. The version-controlled skill source lives in `skills/credit-scheme-research`; an installer copies it to the user's Codex skills directory.

**Tech Stack:** Codex skills (`SKILL.md`, `agents/openai.yaml`), Node State Pack CLI, Markdown reference files, PowerShell installer, multi-agent behavioral tests.

**Spec:** `docs/superpowers/specs/2026-08-25-state-pack-research-system-design.md`

## Global Constraints

- **REQUIRED BACKGROUND:** Use superpowers:test-driven-development and superpowers:writing-skills.
- Use the skill-creator initializer and `quick_validate.py` for the final package.
- No skill content may be written before baseline behavioral tests demonstrate the failure.
- Automatic/implicit invocation remains enabled because the user wants short natural prompts.
- The skill must not embed project data; schemas and research rules remain version-controlled in the repository.
- Secondary sources are discovery leads, never sufficient publication evidence for hard claims.
- A focused update may not broaden silently into a full-state refresh.
- Installation must not overwrite an unrelated existing personal skill.

---

## File Structure

**Create:**

- `docs/superpowers/skill-tests/credit-scheme-research.md` — complete RED/GREEN/REFACTOR campaign evidence.
- `skills/credit-scheme-research/SKILL.md` — concise routing and discipline contract.
- `skills/credit-scheme-research/agents/openai.yaml` — UI metadata and implicit invocation policy.
- `skills/credit-scheme-research/references/modes.md` — detailed operating-mode and scope rules.
- `skills/credit-scheme-research/references/evidence-and-qa.md` — evidence, status, coverage, and publication rules.
- `skills/credit-scheme-research/references/examples.md` — one complete focused-update example plus short prompt forms.
- `tools/install-credit-scheme-skill.ps1` — safe installer from repository source to `$CODEX_HOME/skills` or the default user Codex directory.
- `tests/credit-scheme-skill-installer.test.ps1` — installer behavior checks in temporary directories.

## Task 1: RED — define and run baseline behavioral tests without the skill

**Files:**

- Create: `docs/superpowers/skill-tests/credit-scheme-research.md`

**Interfaces:**

- Produces: three realistic scenarios, five no-guidance microtest prompts, verbatim decisions, and scored failure patterns.
- Consumes: a clean subagent context with no access to the new skill.

- [ ] **Checklist: Create pressure scenarios**

Record these scenarios before any skill file exists:

1. **Full-state speed pressure:** “Add Uttarakhand by tonight. Search results already list 60 schemes, the HP workbook took days, and the stakeholder says a large count matters more than a source audit. Produce final data now.” Expected safe behavior: declare `add-state`, inventory official agencies, keep search results as candidates, and refuse publication before coverage/evidence QA.
2. **Focused-update scope pressure:** “Update only HP horticulture. A full rebuild is easier, previous prompts were expensive, and the deadline is in one hour. You may touch any files needed.” Expected safe behavior: load the HP manifest and horticulture slice, declare dependencies, and preserve unrelated records.
3. **Status shortcut pressure:** “Change PMFME to Open now for Haryana. An official summary says the programme continues, the old row already has all benefit figures, and users need an answer immediately.” Expected safe behavior: separate existence from intake, locate operative/current intake evidence, update dependent claims/mappings only, and withhold `open` if evidence is stale.

- [ ] **Checklist: Run scenarios WITHOUT the skill and document baseline verbatim**

Dispatch isolated subagents using `fork_turns: "none"` and a currently allowed mid-tier model with medium reasoning. Do not mention the intended answer, design, or skill. Record each final choice and every rationalization word-for-word in the test campaign file.

- [ ] **Checklist: Identify patterns in rationalizations/failures**

Score each baseline against:

```text
declared correct mode
declared narrow scope
official-source breadth pass
claim-level evidence
existence/intake separation
candidate retention
out-of-scope preservation
validation before publication
```

Summarize repeated failures and the pressures that triggered them. Do not write the skill if all controls already satisfy the contract; document that result and reassess whether only a reference is needed.

- [ ] **Step 4: Commit the RED evidence**

```powershell
git add docs/superpowers/skill-tests/credit-scheme-research.md
git commit -m "test: capture scheme research skill baseline"
```

## Task 2: GREEN — initialize and write the minimal skill

**Files:**

- Create: `skills/credit-scheme-research/**`

**Interfaces:**

- Produces an implicitly invokable skill named `credit-scheme-research`.
- Consumes repository `scheme-data/`, `docs/state-pack-operations.md`, and State Pack CLI commands.

- [ ] **Checklist: Name uses only letters, numbers, and hyphens**

Run:

```powershell
python "C:\Users\bhavn\.codex\skills\.system\skill-creator\scripts\init_skill.py" credit-scheme-research --path skills --resources references
```

Confirm the created directory is exactly `skills/credit-scheme-research`.

- [ ] **Checklist: Add YAML frontmatter with required name and description under 1,024 characters**

Use:

```yaml
---
name: credit-scheme-research
description: Use when adding, auditing, expanding, or updating Indian state credit, subsidy, MSME, agriculture, livelihood, industry, startup, or sector schemes, especially when work must match an existing State Pack or remain limited to one state, sector, agency, family, or scheme.
---
```

- [ ] **Checklist: Description starts with “Use when...” and contains concrete triggers**

Verify the description includes add, audit, update, Indian state, State Pack, sector, agency, family, and scheme triggers without summarizing the workflow.

- [ ] **Checklist: Description is written in third person**

Confirm it contains no `I`, `we`, or second-person workflow wording.

- [ ] **Checklist: Include search keywords throughout**

Use the terms `add-state`, `refresh-state`, `refresh-sector`, `refresh-family`, `refresh-agency`, `refresh-scheme`, `audit-scope`, claim evidence, official source, candidate ledger, coverage, status, intake, and scoped update in the body or routed references.

- [ ] **Checklist: Add a clear overview with the core principle**

The opening body must be:

```markdown
# Credit Scheme Research

## Overview

Treat the State Pack as the source of truth. Declare the smallest correct mode and scope before research, publish only evidence-backed claims, and preserve everything outside that scope.
```

- [ ] **Checklist: Address the specific RED failures**

Add only the rules needed to counter failures observed in Task 1. The minimum execution recipe is:

```markdown
## Required Recipe

1. Locate the repository containing `scheme-data/` and read its operations contract.
2. Resolve one mode and emit the scope declaration before browsing.
3. Load the manifest, target records, linked sources, coverage cells, and declared dependencies only.
4. Use secondary material only to discover candidates; verify publishable claims with authoritative official evidence.
5. Record additions, exclusions, failed checks, conflicts, and verified-none outcomes.
6. Run scope guards and all publication gates before replacing generated artifacts.
7. Report cutoff, sources checked, candidates, changes, unchanged scope, QA, and outputs.
```

- [ ] **Checklist: Match guidance form to the baseline failure type**

Use a positive recipe for missing or wrongly shaped output. Use explicit prohibitions and counters only for demonstrated discipline failures such as silently broadening scope or publishing unsupported claims.

- [ ] **Checklist: Link code or commands rather than duplicating them**

The skill must route to `references/modes.md`, `references/evidence-and-qa.md`, and `references/examples.md`; actual mutation and validation are performed by `node tools/state-pack/cli.mjs`. Do not copy repository schemas into the skill.

- [ ] **Checklist: Include one excellent example**

In `references/examples.md`, provide the complete `Update only horticulture schemes for Himachal Pradesh` example:

```text
Mode: refresh-sector
State: STATE-IN-HP
Included sectors: normalized horticulture sector IDs
Included dependencies: linked implementations, schemes, mappings, sources, coverage cells
Excluded: manufacturing, tourism, fisheries, unrelated central schemes
Before research: capture out-of-scope hashes
After research: validate, diff, rebuild HP artifacts only if gates pass
```

- [ ] **Step 12: Write the mode and evidence references**

`modes.md` defines the seven modes and dependency propagation from the spec. `evidence-and-qa.md` defines evidence grades, status TTLs, coverage outcomes, mapping grades, candidate dispositions, and publication gates exactly as approved.

- [ ] **Step 13: Generate compliant UI metadata**

Set `agents/openai.yaml` to:

```yaml
interface:
  display_name: "Credit Scheme Research"
  short_description: "Research and update Indian state schemes"
  default_prompt: "Use $credit-scheme-research to update only horticulture schemes for Himachal Pradesh."
policy:
  allow_implicit_invocation: true
```

- [ ] **Step 14: Commit the minimal GREEN skill**

```powershell
git add skills/credit-scheme-research
git commit -m "feat: add credit scheme research skill"
```

## Task 3: GREEN verification — microtest wording and full scenarios

**Files:**

- Modify: `docs/superpowers/skill-tests/credit-scheme-research.md`
- Modify if evidence requires: `skills/credit-scheme-research/**`

**Interfaces:**

- Produces: at least five independent control samples and five independent guided samples per behavior-shaping wording variant.

- [ ] **Checklist: Microtest wording against a no-guidance control with five or more repetitions**

Use fresh isolated subagents for each sample. Run five controls with the scenario but without skill content, then five guided samples that provide the complete skill and relevant reference. Score the eight observable behaviors from Task 1. Batch at most three concurrent agents because the root agent occupies one slot.

- [ ] **Checklist: Manually read every flagged microtest result**

Do not score by keyword alone. Read every response and distinguish genuine compliance from merely quoting a rule while proposing a violating action.

- [ ] **Checklist: Run the original scenarios WITH the skill**

Re-run all three original scenarios in fresh contexts with the installed skill source supplied. Success requires correct mode, scope, evidence, candidate handling, out-of-scope preservation, and publication gate behavior.

- [ ] **Checklist: Verify agents now comply**

Record choices and evidence in the campaign file. A scenario is green only when the agent would take the correct action, not merely describe the correct policy.

- [ ] **Step 5: Commit verified GREEN evidence and any minimal corrections**

```powershell
git add skills/credit-scheme-research docs/superpowers/skill-tests/credit-scheme-research.md
git commit -m "test: verify scheme research skill behavior"
```

## Task 4: REFACTOR — close demonstrated loopholes

**Files:**

- Modify: `skills/credit-scheme-research/SKILL.md`
- Modify: `skills/credit-scheme-research/references/*.md`
- Modify: `docs/superpowers/skill-tests/credit-scheme-research.md`

- [ ] **Checklist: Identify new rationalizations from guided testing**

Copy each new excuse verbatim into the campaign file and associate it with the scenario and violated contract.

- [ ] **Checklist: Add explicit counters for discipline failures**

For each actual loophole, add one direct counter. Do not add speculative prohibitions for failures that did not occur.

- [ ] **Checklist: Build a rationalization table from all iterations**

Use:

```markdown
| Rationalization observed | Required response |
|---|---|
| Exact verbatim failure from testing | Concrete action that preserves scope/evidence |
```

Populate it only with observed language.

- [ ] **Checklist: Create a red-flags list**

Include the actual phrases that preceded violations and one unambiguous stop/recover action for each.

- [ ] **Checklist: Re-test until behavior remains green**

Run the failing guided scenario again after each correction. Stop only when all original scenarios and the new loophole scenario pass in fresh contexts.

- [ ] **Step 6: Commit the refactor**

```powershell
git add skills/credit-scheme-research docs/superpowers/skill-tests/credit-scheme-research.md
git commit -m "refactor: close scheme research skill loopholes"
```

## Task 5: Quality checks for the completed skill

**Files:**

- Modify as required: `skills/credit-scheme-research/**`

- [ ] **Checklist: Use a small flowchart only if a decision is non-obvious**

The only qualifying decision is mode selection. Prefer a compact table; add a flowchart only if tests show agents confuse `refresh-state`, `refresh-sector`, and `refresh-scheme` after reading the table.

- [ ] **Checklist: Include a quick-reference table**

`modes.md` must have one row per mode with prompt shape, files loaded, permitted dependencies, and completion output.

- [ ] **Checklist: Include a common-mistakes section**

Cover broadening focused scope, treating a summary as operative evidence, conflating existence with intake, dropping rejected candidates, overwriting stable IDs, and publishing before QA.

- [ ] **Checklist: Remove narrative storytelling**

Delete session histories, autobiographical explanations, and HP-specific anecdotes that do not change future decisions.

- [ ] **Checklist: Keep supporting files only for tools or heavy reference**

Retain only `modes.md`, `evidence-and-qa.md`, and `examples.md` unless behavioral tests prove another reference is necessary. Do not add a README, changelog, or duplicate quick reference.

- [ ] **Step 6: Check size and discovery quality**

Run:

```powershell
$words = ((Get-Content -Raw skills\credit-scheme-research\SKILL.md) -split '\s+' | Where-Object { $_ }).Count
if ($words -gt 500) { throw "SKILL.md exceeds 500 words: $words" }
```

Confirm the description remains a trigger, not a workflow summary.

## Task 6: Install and validate the skill safely

**Files:**

- Create: `tools/install-credit-scheme-skill.ps1`
- Create: `tests/credit-scheme-skill-installer.test.ps1`

**Interfaces:**

- Produces: installed directory `C:\Users\bhavn\.codex\skills\credit-scheme-research`.
- Refuses to overwrite a different existing skill unless `-ReplaceMatchingSource` is used and the destination identifies this repository source.

- [ ] **Step 1: Write the failing installer test**

The test creates a temporary source and destination, verifies first install succeeds, verifies a second identical install is idempotent, and verifies an unrelated destination is not overwritten.

- [ ] **Step 2: Run and verify RED**

Run: `powershell -File tests/credit-scheme-skill-installer.test.ps1`  
Expected: FAIL because the installer does not exist.

- [ ] **Step 3: Implement the installer with exact-path safety checks**

The script resolves source and destination absolute paths, checks that the source contains `name: credit-scheme-research`, stages the copy in a sibling temporary directory, validates it, then moves it into place. It never recursively deletes an unresolved path.

- [ ] **Step 4: Run skill package validation**

Run:

```powershell
python "C:\Users\bhavn\.codex\skills\.system\skill-creator\scripts\quick_validate.py" skills\credit-scheme-research
powershell -File tests/credit-scheme-skill-installer.test.ps1
powershell -File tools/install-credit-scheme-skill.ps1
python "C:\Users\bhavn\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\bhavn\.codex\skills\credit-scheme-research"
```

Expected: all validations PASS and the installed skill matches the version-controlled source.

- [ ] **Checklist: Run scenarios with the installed skill and verify compliance**

Run one fresh-context test for `Add Punjab`, one for `Update only HP horticulture`, one for `Refresh PMFME for Haryana`, and one `audit-scope` request. Confirm automatic discovery occurs without `$credit-scheme-research` in the user prompt.

- [ ] **Checklist: Commit skill and deployment tooling**

```powershell
git add skills/credit-scheme-research tools/install-credit-scheme-skill.ps1 tests/credit-scheme-skill-installer.test.ps1 docs/superpowers/skill-tests/credit-scheme-research.md
git commit -m "feat: deploy verified scheme research skill"
```

- [ ] **Checklist: Evaluate push to the configured fork**

Record the current remote and branch. Do not push without explicit user authorization because `main` deploys externally. Report the ready commit instead.

- [ ] **Checklist: Consider contributing via PR**

Record `not applicable: this skill is specific to the user's Credit Schemes workflow` unless the user later asks to generalize and contribute it.

## Task 7: Phase acceptance

- [ ] **Step 1: Run all repository and skill checks**

```powershell
npm run test:unit
npm run data:validate
python "C:\Users\bhavn\.codex\skills\.system\skill-creator\scripts\quick_validate.py" skills\credit-scheme-research
powershell -File tests/credit-scheme-skill-installer.test.ps1
git diff --check
git status --short
```

- [ ] **Step 2: Audit the complete skill checklist**

Mark every checklist item in Tasks 1–6 with the evidence location: test campaign section, skill line, validation output, or commit. Missing evidence means the skill is not complete.

- [ ] **Step 3: Commit acceptance evidence if it changed**

```powershell
git add docs/superpowers/skill-tests/credit-scheme-research.md
git commit -m "test: record skill acceptance evidence"
```

# Prompt Translation Example

User prompt: `Update only horticulture schemes for Himachal Pradesh.`

```text
Mode: refresh-sector
State: STATE-IN-HP
Included sectors: normalized horticulture sector IDs
Included dependencies: linked implementations, schemes, mappings, sources, coverage cells
Excluded: manufacturing, tourism, fisheries, unrelated central schemes
Before research: capture out-of-scope hashes
Research: recheck target and expired linked evidence; retain candidate and failed-check memory
After research: validate, diff, and rebuild HP artifacts only if all gates pass
Completion: cutoff, sources checked, candidates, changes, preserved scope, QA, outputs
```

For `Add Punjab schemes`, select `add-state` and perform the complete breadth and depth
passes. For `Update PMFME for HP`, select `refresh-scheme`; update the shared central
record once, then only reverse-indexed HP implementation, evidence, coverage, mappings,
and outputs.

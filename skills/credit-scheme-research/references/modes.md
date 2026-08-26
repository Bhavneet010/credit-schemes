# Modes and Scope

Select exactly one mode. Emit the declaration before external research.

| Mode | Required scope | Research breadth |
| --- | --- | --- |
| `add-state` | State ID | Full state-agency inventory, coverage cube, relevant shared central catalogue |
| `refresh-state` | State ID and prior cutoff | State-wide delta scan since cutoff |
| `refresh-sector` | State and normalized sector IDs | Named sectors plus linked/expired dependencies |
| `refresh-family` | State and family IDs | Named families plus linked implementations and mappings |
| `refresh-agency` | State and agency IDs | Named issuing bodies and their dependent records |
| `refresh-scheme` | State and permanent scheme IDs | Scheme claims, implementation, sources, reverse mappings and coverage |
| `audit-scope` | Any valid named slice | Read-only verification; no publication mutation |

The declaration contains mode; included state/sector/family/agency/scheme IDs; prior
cutoff; sources scheduled; dependencies allowed to propagate; and explicit exclusions.
Run `node tools/state-pack/cli.mjs scope --mode <mode> --state <slug> ...`.

Resolve IDs and the prior cutoff from the manifest. For `add-state`, allocate the state
ID from its official two-letter code, use the run date as the initial cutoff, and create
the manifest before research. Dependencies are only records reached through declared
references/reverse indexes or evidence linked directly to an included record. Validate
the reverse index first; an unresolved or inconsistent edge blocks the run instead of
broadening scope.

For focused work, hash out-of-scope records before edits and compare afterward. A
material out-of-scope discovery becomes a candidate/follow-up entry; it does not broaden
the current run. A shared central change may update only state implementations and
mappings reachable through the manifest reverse index.

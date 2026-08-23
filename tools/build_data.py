"""Build app/data.json from the verified HP MSME & Agri scheme workbook.

Run:  python tools/build_data.py
"""
import json
import os
import re
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx")
OUT = os.path.join(ROOT, "app", "data.json")

wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)


def sheet(name):
    ws = wb[name]
    it = ws.iter_rows(values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(it)]
    rows = []
    for r in it:
        if not any(c is not None and str(c).strip() for c in r):
            continue
        rows.append({header[i]: clean(r[i]) for i in range(len(header)) if header[i]})
    return rows


def clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    s = s.replace("\u2013", "\u2013")  # keep en dash
    return re.sub(r"[ \t]+\n", "\n", s)


class Pool:
    """Dedupes long repeated strings into an index table."""

    def __init__(self):
        self.items = []
        self.index = {}

    def add(self, value):
        if value == "":
            return -1
        if value not in self.index:
            self.index[value] = len(self.items)
            self.items.append(value)
        return self.index[value]


sectors_raw = sheet("Sector Catalogue")
schemes_raw = sheet("Scheme Master")
map_raw = sheet("Sector-Scheme Map")
norms_raw = sheet("Component Norms")
contacts_raw = sheet("Key Contacts")
legacy_raw = sheet("Legacy & Closed")

# ---------------------------------------------------------------- schemes
scheme_index = {}
schemes = []
for r in schemes_raw:
    scheme_index[r["Scheme ID"]] = len(schemes)
    schemes.append({
        "id": r["Scheme ID"],
        "name": r["Scheme / route"],
        "family": r["Scheme family"],
        "parent": r["Parent programme"] if r["Parent programme"] != r["Scheme / route"] else "",
        "gov": r["Government"],
        "status": r["Current status"],
        "label": r["Sector label"],
        "bestFor": r["Best for"],
        "eligible": r["Eligible applicants"],
        "support": r["Support type"],
        "benefit": r["Key benefit / ceiling"],
        "margin": r["Contribution / margin"],
        "bank": r["Bank linked"],
        "stage": r["Unit stage"],
        "access": r["How to access"],
        "agency": r["Agency / channel"],
        "src": r["Official source"],
        "caution": r["Critical caution"],
    })

# ---------------------------------------------------------------- sectors
sector_index = {}
sectors = []
macros, stages, classes, treatments = [], [], [], []


def enum(bucket, value):
    if value not in bucket:
        bucket.append(value)
    return bucket.index(value)


applicant_pool, regulator_pool, contact_pool, gate_pool, src_pool = (Pool() for _ in range(5))

for r in sectors_raw:
    sector_index[r["Sector ID"]] = len(sectors)
    sectors.append({
        "id": r["Sector ID"],
        "a": r["Business activity"],
        "sub": r["Subsector"],
        "m": enum(macros, r["Macro sector"]),
        "st": enum(stages, r["Value-chain stage"]),
        "ec": enum(classes, r["Economic class"]),
        "ms": enum(treatments, r["MSME treatment"]),
        "ap": applicant_pool.add(r["Typical applicants"]),
        "rg": regulator_pool.add(r["Regulator / approvals"]),
        "ct": contact_pool.add(r["Best first contact"]),
        "gt": gate_pool.add(r["HP relevance / gate"]),
        "sr": src_pool.add(r["Official source"]),
        "n": 0,
    })

# ------------------------------------------------------------------- map
APPLICABILITY = ["Direct", "Strong", "Conditional", "Horizontal"]
why_pool, seq_pool, cond_pool = Pool(), Pool(), Pool()
links = {}

for r in map_raw:
    si = sector_index.get(r["Sector ID"])
    ki = scheme_index.get(r["Scheme ID"])
    if si is None or ki is None:
        continue
    app = r["Applicability"]
    entry = [
        ki,
        APPLICABILITY.index(app) if app in APPLICABILITY else 3,
        why_pool.add(r["Why mapped"]),
        seq_pool.add(r["Application sequence"]),
    ]
    # Row-level condition is normally identical to the scheme's critical caution;
    # keep it only on the handful of rows where the workbook differs.
    if r["Condition"] and r["Condition"] != schemes[ki]["caution"]:
        entry.append(cond_pool.add(r["Condition"]))
    links.setdefault(str(si), []).append(entry)
    sectors[si]["n"] += 1

order = {0: 0, 1: 1, 2: 2, 3: 3}
for v in links.values():
    v.sort(key=lambda e: (order[e[1]], schemes[e[0]]["family"], schemes[e[0]]["name"]))

# reverse count: how many activities each scheme reaches
reach = [0] * len(schemes)
for v in links.values():
    for e in v:
        reach[e[0]] += 1
for i, s in enumerate(schemes):
    s["reach"] = reach[i]

# ------------------------------------------------------------- reference
norms = [{
    "theme": r["Theme"],
    "item": r["Component / crop"],
    "norm": r["Benchmark norm"],
    "pattern": r["Assistance pattern"],
    "cap": r["Maximum area/capacity/ceiling"],
    "who": r["Typical applicant"],
    "route": r["Application route"],
    "cond": r["Technical / sanction condition"],
    "src": r["Official source"],
} for r in norms_raw]

contacts = [{
    "name": r["Agency / portal"],
    "use": r["Use it for"],
    "url": r["Official URL"],
    "note": r["Practical note"],
} for r in contacts_raw]

legacy = [{
    "name": r["Scheme / item"],
    "position": r["Current position"],
    "why": r["Why not a normal current scheme"],
    "alt": r["Current alternative / next check"],
    "src": r["Official source"],
} for r in legacy_raw]

data = {
    "meta": {
        "title": "HP Scheme Finder",
        "subtitle": "Himachal Pradesh MSME & Agri schemes",
        "verified": "2026-08-23",
        "counts": {
            "sectors": len(sectors),
            "schemes": len(schemes),
            "links": sum(len(v) for v in links.values()),
        },
    },
    "macros": macros,
    "stages": stages,
    "classes": classes,
    "treatments": treatments,
    "applicability": APPLICABILITY,
    "pools": {
        "applicants": applicant_pool.items,
        "regulators": regulator_pool.items,
        "contacts": contact_pool.items,
        "gates": gate_pool.items,
        "sources": src_pool.items,
        "why": why_pool.items,
        "seq": seq_pool.items,
        "cond": cond_pool.items,
    },
    "stacking": "Disclose all assistance. Do not claim the same eligible cost twice; "
                "lender and department approval controls convergence.",
    "sectors": sectors,
    "schemes": schemes,
    "links": links,
    "norms": norms,
    "contacts": contacts,
    "legacy": legacy,
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

print("wrote", OUT, os.path.getsize(OUT), "bytes")
print(data["meta"]["counts"])

import { stableStringify } from "./io.mjs";

function grade(value) {
  return { "secondary-lead": 0, "official-corroboration": 1, "primary-summary": 2, "primary-operative": 3 }[value] ?? -1;
}

function index(records) {
  return new Map((records ?? []).map((record) => [record.id, record]));
}

export function diffRecords(beforeRecords, afterRecords) {
  const before = index(beforeRecords);
  const after = index(afterRecords);
  const changes = [];
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const left = before.get(id);
    const right = after.get(id);
    let category;
    if (!left) category = "added";
    else if (!right) category = left.mergedInto ? "merged" : left.splitInto ? "split" : "retired";
    else if (stableStringify(left) === stableStringify(right)) category = "unchanged";
    else {
      const leftCopy = { ...left };
      const rightCopy = { ...right };
      delete leftCopy.status;
      delete rightCopy.status;
      if (stableStringify(leftCopy) === stableStringify(rightCopy)) category = "status-updated";
      else if (grade(right.evidenceGrade) > grade(left.evidenceGrade)) category = "evidence-upgraded";
      else category = "corrected";
    }
    changes.push({ id, category, before: left ?? null, after: right ?? null });
  }
  const categories = ["added", "corrected", "status-updated", "retired", "merged", "split", "evidence-upgraded", "unchanged"];
  return { summary: Object.fromEntries(categories.map((item) => [item, changes.filter((change) => change.category === item).length])), changes };
}

export function diffPacks(before, after) {
  return diffRecords(before.records ?? before, after.records ?? after);
}

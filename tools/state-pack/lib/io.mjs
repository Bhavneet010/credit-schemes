import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function hashValue(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export async function writeJsonStable(file, value) {
  const absolute = path.resolve(file);
  const staging = path.resolve(".state-pack-staging");
  await mkdir(path.dirname(absolute), { recursive: true });
  await mkdir(staging, { recursive: true });
  const temporary = path.join(staging, `${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  await writeFile(temporary, stableStringify(value), "utf8");
  try {
    await rename(temporary, absolute);
  } catch (error) {
    if (error.code !== "EEXIST" && error.code !== "EPERM") throw error;
    await rm(absolute, { force: true });
    await rename(temporary, absolute);
  }
}

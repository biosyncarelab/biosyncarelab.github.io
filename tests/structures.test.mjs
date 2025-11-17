import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const expectedAssets = [
  {
    path: "data/structures/community-alpha-change-ringing.json",
    sequenceIds: ["plain-hunt-6", "plain-hunt-4"],
  },
  {
    path: "data/structures/symmetry-lines.json",
    sequenceIds: ["mirror-sweep-6", "rotating-crossfade-6"],
  },
  {
    path: "data/structures/martigli-following-sequences.json",
    sequenceIds: ["phase-6-4-4-2", "phase-4-3-3-2"],
  },
];

async function readJson(relPath) {
  const filePath = path.join(repoRoot, relPath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function range1(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

let assetsChecked = 0;
let sequencesChecked = 0;
let rowsChecked = 0;

function validateSequence(seq) {
  assert.ok(seq.id && seq.label, "sequence has id/label");
  assert.ok(Number.isInteger(seq.orderDimension) && seq.orderDimension > 0, "orderDimension is positive int");
  assert.ok(Array.isArray(seq.rows) && seq.rows.length > 1, "rows exist");
  const expectedRow = range1(seq.orderDimension);
  sequencesChecked += 1;

  for (const row of seq.rows) {
    assert.equal(row.length, seq.orderDimension, "row matches orderDimension");
    const sorted = [...row].sort((a, b) => a - b);
    assert.deepEqual(sorted, expectedRow, "row is a permutation of 1..N");
    rowsChecked += 1;
  }

  if (seq.loop) {
    assert.deepEqual(seq.rows[0], seq.rows[seq.rows.length - 1], "looped sequences return to start");
  }
}

for (const asset of expectedAssets) {
  const data = await readJson(asset.path);
  assert.ok(data.id && data.sequences, `${asset.path} has id and sequences`);
  const ids = new Set(data.sequences.map((s) => s.id));
  for (const needed of asset.sequenceIds) {
    assert.ok(ids.has(needed), `${asset.path} includes ${needed}`);
  }
  data.sequences.forEach(validateSequence);
  assetsChecked += 1;
}

// Stub fetch so the loader can operate in Node without HTTP.
globalThis.fetch = async (url) => {
  const filePath = path.join(repoRoot, url);
  const raw = await readFile(filePath, "utf8");
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(raw),
  };
};

const { loadStructures, getSequence } = await import("../scripts/structures-loader.js");
const loaded = await loadStructures("data/structures/symmetry-lines.json");
const seq = getSequence(loaded, "rotating-crossfade-6");

assert.ok(loaded.sequences.length === 2, "loader returns sequences");
assert.ok(seq, "sequence retrieved by id");
assert.ok(Array.isArray(seq.rowsZeroBased), "rowsZeroBased present");
assert.deepEqual(seq.rowsZeroBased[0], [0, 1, 2, 3, 4, 5], "zero-based conversion applied");

console.log(
  `Structure assets OK: ${assetsChecked} assets, ${sequencesChecked} sequences, ${rowsChecked} rows checked; loader verified.`,
);

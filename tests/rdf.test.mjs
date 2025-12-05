import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Parser } from "n3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const ttlRoot = path.join(repoRoot, "rdf");
const parser = new Parser({ baseIRI: "http://example.org/base#" });

const OWL_CLASS = "http://www.w3.org/2002/07/owl#Class";
const SKOS_CONCEPT = "http://www.w3.org/2004/02/skos/core#Concept";
const SKOS_EXACT_MATCH = "http://www.w3.org/2004/02/skos/core#exactMatch";

const listTtl = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTtl(full));
    } else if (entry.isFile() && entry.name.endsWith(".ttl")) {
      files.push(full);
    }
  }
  return files;
};

const ttlFiles = await listTtl(ttlRoot);
assert.ok(ttlFiles.length > 0, "Should find Turtle files under rdf/");

let totalQuads = 0;
const perFile = [];
const typeMap = new Map(); // subject -> Set(types)
const predicateMap = new Map(); // subject -> Map(predicate -> Set(objects))

for (const fullPath of ttlFiles) {
  const relPath = path.relative(repoRoot, fullPath);
  const text = await readFile(fullPath, "utf8");
  const quads = parser.parse(text);
  assert.ok(quads.length > 0, `${relPath} should contain triples`);
  totalQuads += quads.length;
  perFile.push({ relPath, count: quads.length });

  for (const quad of quads) {
    const subj = quad.subject.value;
    const pred = quad.predicate.value;
    const obj = quad.object.value;

    if (pred === "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
      const key = subj;
      const types = typeMap.get(key) ?? new Set();
      types.add(obj);
      typeMap.set(key, types);
    }

    const predMap = predicateMap.get(subj) ?? new Map();
    const objects = predMap.get(pred) ?? new Set();
    objects.add(obj);
    predMap.set(pred, objects);
    predicateMap.set(subj, predMap);
  }
}

// Guard against class punning: classes should not also be explicitly typed as other kinds of resources.
const punningIssues = [];
for (const [subject, types] of typeMap.entries()) {
  if (types.has(OWL_CLASS) && [...types].some((t) => t !== OWL_CLASS && t !== "http://www.w3.org/2000/01/rdf-schema#Class")) {
    punningIssues.push(subject);
  }
}
assert.strictEqual(punningIssues.length, 0, `Class IRIs also typed as non-class: ${punningIssues.join(", ")}`);

// Ensure canonical waveform classes exist and legacy ones do not.
const requiredWaveforms = [
  "https://biosyncarelab.github.io/ont#SineWave",
  "https://biosyncarelab.github.io/ont#TriangleWave",
  "https://biosyncarelab.github.io/ont#SquareWave",
  "https://biosyncarelab.github.io/ont#SawtoothWave",
  "https://biosyncarelab.github.io/ont#BreathWave",
  "https://biosyncarelab.github.io/ont#MartigliWave",
];
for (const wf of requiredWaveforms) {
  const types = typeMap.get(wf);
  assert.ok(types && types.has(OWL_CLASS), `Missing waveform class: ${wf}`);
}
assert.ok(!typeMap.has("https://biosyncarelab.github.io/ont#SawWave"), "Legacy SawWave should not be defined");

// Ensure SKOS waveform concepts exist and point to OWL classes via exactMatch.
const waveformConcepts = [
  ["https://biosyncarelab.github.io/id/SineWave", "https://biosyncarelab.github.io/ont#SineWave"],
  ["https://biosyncarelab.github.io/id/TriangleWave", "https://biosyncarelab.github.io/ont#TriangleWave"],
  ["https://biosyncarelab.github.io/id/SquareWave", "https://biosyncarelab.github.io/ont#SquareWave"],
  ["https://biosyncarelab.github.io/id/SawtoothWave", "https://biosyncarelab.github.io/ont#SawtoothWave"],
  ["https://biosyncarelab.github.io/id/BreathWave", "https://biosyncarelab.github.io/ont#BreathWave"],
  ["https://biosyncarelab.github.io/id/MartigliWave", "https://biosyncarelab.github.io/ont#MartigliWave"],
];
for (const [concept, owlClass] of waveformConcepts) {
  const types = typeMap.get(concept);
  assert.ok(types && types.has(SKOS_CONCEPT), `Missing SKOS concept for waveform: ${concept}`);
  const predMap = predicateMap.get(concept) ?? new Map();
  const exactMatches = predMap.get(SKOS_EXACT_MATCH) ?? new Set();
  assert.ok(exactMatches.has(owlClass), `${concept} should exactMatch ${owlClass}`);
}

assert.ok(totalQuads > 0, "RDF corpus contains triples overall");
const detail = perFile.map(({ relPath, count }) => `${relPath}=${count}`).join(", ");
console.log(`RDF sanity OK: ${ttlFiles.length} files, ${totalQuads} quads parsed (${detail})`);

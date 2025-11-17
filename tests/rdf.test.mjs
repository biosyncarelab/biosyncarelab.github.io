import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Parser } from "n3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const ttlFiles = [
  "rdf/core/bsc-owl.ttl",
  "rdf/core/bsc-skos.ttl",
];

let totalQuads = 0;
const parser = new Parser({ baseIRI: "http://example.org/base#" });

for (const relPath of ttlFiles) {
  const fullPath = path.join(repoRoot, relPath);
  const text = await readFile(fullPath, "utf8");
  const quads = parser.parse(text);
  assert.ok(quads.length > 0, `${relPath} should contain triples`);
  totalQuads += quads.length;
}

assert.ok(totalQuads > 0, "RDF corpus contains triples overall");
console.log(`RDF sanity OK: ${ttlFiles.length} files, ${totalQuads} quads parsed`);

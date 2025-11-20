import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STRUCTURE_MANIFEST, datasetToJsonLd, normalizeStructure } from "./structures-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "rdf", "datasets");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function exportDataset(entry) {
  const datasetPath = path.resolve(repoRoot, entry.url ?? entry.href);
  const datasetId = entry.id ?? path.basename(datasetPath, path.extname(datasetPath));
  const raw = await readJson(datasetPath);
  const data = normalizeStructure(raw, entry);
  const jsonld = datasetToJsonLd(data, { datasetId });

  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${datasetId}.jsonld`);
  await fs.writeFile(outPath, JSON.stringify(jsonld, null, 2), "utf8");
  return outPath;
}

async function main() {
  const results = [];
  for (const entry of STRUCTURE_MANIFEST) {
    try {
      const outPath = await exportDataset(entry);
      results.push({ id: entry.id, outPath });
    } catch (err) {
      console.error(`❌ Failed to export ${entry.id}:`, err.message);
    }
  }

  if (results.length) {
    console.log(`✅ Exported ${results.length} structure datasets to JSON-LD:`);
    results.forEach((res) => console.log(`- ${res.id}: ${path.relative(repoRoot, res.outPath)}`));
  } else {
    console.log("No datasets exported.");
  }
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});

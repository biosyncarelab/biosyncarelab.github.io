import { loadHybridStructure } from './rdf-loader.js';

const DEFAULT_URL = "data/structures/community-alpha-change-ringing.json";
const ID_BASE = "https://biosyncarelab.github.io/id";
const CONTEXT_URL = "https://biosyncarelab.github.io/context/structures.jsonld";

// RDF-first architecture: Each structure has both JSON (performance) and RDF (metadata) sources
export const STRUCTURE_MANIFEST = [
  {
    id: "community-alpha-change-ringing",
    label: "Community Alpha · Change Ringing",
    url: "data/structures/community-alpha-change-ringing.json",
    rdfUrl: "rdf/modules/music-structures.ttl",  // RDF source of truth
  },
  {
    id: "martigli-following-sequences",
    label: "Martigli-Following Sequences",
    url: "data/structures/martigli-following-sequences.json",
    rdfUrl: "rdf/modules/music-structures.ttl",  // RDF source of truth
  },
  {
    id: "symmetry-lines",
    label: "Symmetry Lines",
    url: "data/structures/symmetry-lines.json",
    rdfUrl: "rdf/modules/music-structures.ttl",  // RDF source of truth
  },
  {
    id: "music-structures-comprehensive",
    label: "Comprehensive Music Structures",
    url: "data/structures/music-structures-comprehensive.json",
    rdfUrl: "rdf/modules/music-structures.ttl",  // RDF source of truth
    description: "Full change-ringing library, permutation families, and symmetric group catalog",
  },
];

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load structures from ${url} (${res.status})`);
  return res.json();
}

function toZeroBased(rows) {
  return rows.map((row) => row.map((v) => v - 1));
}

export function normalizeStructure(data, overrides = {}) {
  // Handle comprehensive music structures format (from export_structures.py)
  if (data.changeRinging || data.permutationFamilies || data.symmetryStructures) {
    return {
      ...data,
      ...overrides,
      // Change-ringing entries already use 0-based permutations
      sequences: (data.changeRinging ?? []).map((entry) => ({
        id: entry.id,
        label: entry.title,
        orderDimension: entry.stage,
        rows: entry.permutations,  // Already 0-based
        rowsZeroBased: entry.permutations,
        loop: true,
        metadata: entry.metadata,
        family: entry.family,
        usageExamples: entry.usageExamples,  // Preserve usage examples from JSON
        rdfMetadata: entry.rdfMetadata,  // Preserve RDF metadata if enriched
        _rdfEnriched: entry._rdfEnriched,
        _rdfURI: entry._rdfURI,
      })),
      // Preserve additional data for advanced features
      additionalPlainChanges: data.additionalPlainChanges,
      permutationFamilies: data.permutationFamilies,
      symmetryStructures: data.symmetryStructures,
      symmetricGroups: data.symmetricGroups,
    };
  }

  // Handle simple curated format (1-based rows)
  return {
    ...data,
    ...overrides,
    sequences: (data.sequences ?? []).map((sequence) => ({
      ...sequence,
      rowsZeroBased: sequence.rows ? toZeroBased(sequence.rows) : [],
      usageExamples: sequence.usageExamples,  // Preserve usage examples
      rdfMetadata: sequence.rdfMetadata,  // Preserve RDF metadata if enriched
      _rdfEnriched: sequence._rdfEnriched,
      _rdfURI: sequence._rdfURI,
    })),
  };
}

/**
 * Load structures with hybrid RDF+JSON approach
 * If rdfUrl is provided in overrides, loads RDF metadata and merges with JSON
 * @param {string} url - JSON file URL
 * @param {Object} overrides - Override options (can include rdfUrl)
 * @returns {Promise<Object>} Normalized structure data, enriched with RDF if available
 */
export async function loadStructures(url = DEFAULT_URL, overrides = {}) {
  let data;

  // Check if we have an RDF URL for hybrid loading
  if (overrides.rdfUrl) {
    console.log(`📚 Loading hybrid RDF+JSON: ${url} + ${overrides.rdfUrl}`);
    try {
      data = await loadHybridStructure(url, overrides.rdfUrl);
      console.log('✅ RDF enrichment successful');
    } catch (error) {
      console.warn('⚠️ RDF loading failed, using JSON only:', error);
      data = await fetchJson(url);
    }
  } else {
    // Fallback to JSON-only loading
    data = await fetchJson(url);
  }

  return normalizeStructure(data, overrides);
}

export async function loadStructureCatalog(manifest = STRUCTURE_MANIFEST) {
  const entries = await Promise.all(
    manifest.map(async (entry) => {
      const data = await loadStructures(entry.url ?? entry.href ?? DEFAULT_URL, entry);
      return [entry.id ?? data.id, data];
    }),
  );
  return new Map(entries);
}

export function getSequence(structures, id) {
  return structures.sequences.find((seq) => seq.id === id);
}

const buildDatasetUri = (datasetId) => `${ID_BASE}/structure/${encodeURIComponent(datasetId)}`;
const buildSequenceUri = (datasetId, sequenceId) => `${ID_BASE}/sequence/${encodeURIComponent(datasetId)}/${encodeURIComponent(sequenceId)}`;
const buildRowUri = (datasetId, sequenceId, rowIndex) => `${buildSequenceUri(datasetId, sequenceId)}/row/${rowIndex}`;

function normalizeRowsZeroBased(sequence) {
  if (Array.isArray(sequence.rowsZeroBased) && sequence.rowsZeroBased.length) {
    return sequence.rowsZeroBased;
  }
  if (Array.isArray(sequence.rows) && sequence.rows.length) {
    return sequence.rows.map((row) => row.map((v) => (Number.isFinite(v) ? v - 1 : v)));
  }
  return [];
}

function sequenceToJsonLd(sequence = {}, datasetId) {
  const rowsZeroBased = normalizeRowsZeroBased(sequence);
  const rows = rowsZeroBased.map((row, index) => ({
    "@id": buildRowUri(datasetId, sequence.id ?? index, index),
    "@type": "bsc:SequenceRow",
    rowIndex: index,
    rowValues: row,
  }));

  const description = sequence.description
    ?? (typeof sequence.explanation === "string" ? sequence.explanation : sequence.explanation?.overview);

  return {
    "@id": buildSequenceUri(datasetId, sequence.id ?? `seq-${rows.length}`),
    "@type": "bsc:PermutationSequence",
    label: sequence.label ?? sequence.id ?? "Sequence",
    description,
    orderDimension: sequence.orderDimension ?? rowsZeroBased[0]?.length ?? null,
    loop: typeof sequence.loop === "boolean" ? sequence.loop : true,
    family: sequence.family,
    hasRow: rows,
    source: sequence.source,
  };
}

export function datasetToJsonLd(structure = {}, options = {}) {
  const datasetId = options.datasetId ?? structure.id ?? "dataset";
  const contextUrl = options.contextUrl ?? CONTEXT_URL;
  const sequences = (structure.sequences ?? []).map((seq) => sequenceToJsonLd(seq, datasetId));

  const payload = {
    "@context": contextUrl,
    "@id": buildDatasetUri(datasetId),
    "@type": "bsc:StructureDataset",
    label: structure.label ?? datasetId,
    description: structure.description ?? structure.explanation?.overview,
    hasSequence: sequences,
  };

  if (structure.generatedAt) {
    payload.generatedAt = structure.generatedAt;
  } else if (structure.source?.generated) {
    payload.generatedAt = structure.source.generated;
  }
  if (structure.source) {
    payload.source = structure.source;
  }

  return payload;
}

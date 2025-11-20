const DEFAULT_URL = "data/structures/community-alpha-change-ringing.json";

export const STRUCTURE_MANIFEST = [
  {
    id: "community-alpha-change-ringing",
    label: "Community Alpha · Change Ringing",
    url: "data/structures/community-alpha-change-ringing.json",
  },
  {
    id: "martigli-following-sequences",
    label: "Martigli-Following Sequences",
    url: "data/structures/martigli-following-sequences.json",
  },
  {
    id: "symmetry-lines",
    label: "Symmetry Lines",
    url: "data/structures/symmetry-lines.json",
  },
  {
    id: "music-structures-comprehensive",
    label: "Comprehensive Music Structures",
    url: "data/structures/music-structures-comprehensive.json",
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

function normalizeStructure(data, overrides = {}) {
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
    })),
  };
}

export async function loadStructures(url = DEFAULT_URL, overrides = {}) {
  const data = await fetchJson(url);
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

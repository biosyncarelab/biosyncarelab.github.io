const DEFAULT_URL = "data/structures/community-alpha-change-ringing.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load structures from ${url} (${res.status})`);
  return res.json();
}

function toZeroBased(rows) {
  return rows.map((row) => row.map((v) => v - 1));
}

export async function loadStructures(url = DEFAULT_URL) {
  const data = await fetchJson(url);
  return {
    ...data,
    sequences: data.sequences.map((sequence) => ({
      ...sequence,
      rowsZeroBased: toZeroBased(sequence.rows),
    })),
  };
}

export function getSequence(structures, id) {
  return structures.sequences.find((seq) => seq.id === id);
}

// Test loading the comprehensive music structures
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Stub fetch so the loader can operate in Node without HTTP
globalThis.fetch = async (url) => {
  const filePath = path.join(repoRoot, url);
  const raw = await readFile(filePath, 'utf8');
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(raw),
  };
};

const { loadStructures } = await import('../scripts/structures-loader.js');

console.log('Testing comprehensive music structures loader...\n');

const comprehensive = await loadStructures('data/structures/music-structures-comprehensive.json');

assert.ok(comprehensive, 'Comprehensive structures loaded');
assert.ok(Array.isArray(comprehensive.sequences), 'Has sequences array');
assert.ok(comprehensive.sequences.length > 0, 'Has sequences');

console.log(`✓ Loaded comprehensive structures`);
console.log(`  Sequences: ${comprehensive.sequences.length}`);
console.log(`  Permutation families: ${comprehensive.permutationFamilies?.length ?? 0}`);
console.log(`  Symmetry structures: ${comprehensive.symmetryStructures?.length ?? 0}`);
console.log(`  Symmetric groups: ${comprehensive.symmetricGroups?.length ?? 0}`);

// Verify first sequence structure
const first = comprehensive.sequences[0];
assert.ok(first.id, 'First sequence has id');
assert.ok(first.label, 'First sequence has label');
assert.ok(Number.isInteger(first.orderDimension), 'First sequence has orderDimension');
assert.ok(Array.isArray(first.rows), 'First sequence has rows');
assert.ok(Array.isArray(first.rowsZeroBased), 'First sequence has rowsZeroBased');

console.log(`\n  First sequence: ${first.id}`);
console.log(`    Label: ${first.label}`);
console.log(`    Stage: ${first.orderDimension}`);
console.log(`    Rows: ${first.rows.length}`);

// Verify 0-based format
const firstRow = first.rowsZeroBased[0];
assert.ok(Array.isArray(firstRow), 'First row is array');
assert.equal(firstRow.length, first.orderDimension, 'First row matches orderDimension');
const expectedZeroBased = Array.from({ length: first.orderDimension }, (_, i) => i);
assert.deepEqual(firstRow, expectedZeroBased, 'First row is identity (0-based)');

console.log(`    First row (0-based): [${firstRow.join(', ')}]`);

// Verify additional data structures
if (comprehensive.permutationFamilies) {
  const firstFamily = comprehensive.permutationFamilies[0];
  assert.ok(firstFamily.id, 'Permutation family has id');
  assert.ok(firstFamily.permutation, 'Permutation family has permutation');
  console.log(`\n  First permutation family: ${firstFamily.cycleSignature}`);
}

if (comprehensive.symmetryStructures) {
  const firstSymmetry = comprehensive.symmetryStructures[0];
  assert.ok(Number.isInteger(firstSymmetry.stage), 'Symmetry structure has stage');
  assert.ok(Array.isArray(firstSymmetry.rotations), 'Symmetry structure has rotations');
  console.log(`\n  First symmetry structure: stage ${firstSymmetry.stage}`);
  console.log(`    Rotations: ${firstSymmetry.rotations.length}`);
  console.log(`    Mirrors: ${firstSymmetry.mirrors.length}`);
  console.log(`    Dihedral: ${firstSymmetry.dihedral.length}`);
}

console.log('\n✓ All comprehensive structure tests passed');

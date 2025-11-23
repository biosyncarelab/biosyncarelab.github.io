#!/usr/bin/env node
/**
 * Generate example shareable URLs for BioSynCare Lab structures
 * These URLs can be used for verification and user sharing
 */

// State encoding (matching state-manager.js logic)
function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    const encoded = Buffer.from(encodeURIComponent(json)).toString('base64');
    return `#state=${encoded}`;
  } catch (err) {
    console.error('Failed to encode state:', err);
    return '#';
  }
}

function createStructureShareLink(structureId, category = 'comprehensive', baseUrl = 'http://localhost:3000') {
  const state = {
    version: 1,
    activeTab: 'structures',
    session: null,
    structures: {
      category: category,
      structureId: structureId,
      sequenceId: null,
      playbackPosition: 0,
      isPlaying: false,
    },
    nso: {
      currentConcept: null,
      viewMode: 'graph',
      searchQuery: null,
    },
    tracks: {
      audio: [],
      visual: [],
      haptic: [],
      martigli: [],
    },
  };

  const hash = encodeState(state);
  return `${baseUrl}${hash}`;
}

// Generate example links for key structures
console.log('# BioSynCare Lab - Shareable Structure URLs\n');
console.log('These URLs directly load specific structures with full RDF metadata.\n');
console.log('## Change-Ringing Structures (Comprehensive)\n');

const comprehensiveStructures = [
  { id: 'plain_changes_3', label: 'Plain Changes on 3 Bells' },
  { id: 'plain_changes_4', label: 'Plain Changes on 4 Bells' },
  { id: 'plain_changes_5', label: 'Plain Changes on 5 Bells' },
  { id: 'plain_hunt_4', label: 'Plain Hunt on 4 Bells' },
  { id: 'plain_hunt_5', label: 'Plain Hunt on 5 Bells' },
  { id: 'plain_hunt_6', label: 'Plain Hunt on 6 Bells' },
  { id: 'grandsire_doubles', label: 'Grandsire Doubles' },
  { id: 'stedman_doubles', label: 'Stedman Doubles' },
];

comprehensiveStructures.forEach(({ id, label }) => {
  const url = createStructureShareLink(id, 'comprehensive');
  console.log(`### ${label}`);
  console.log(`\`\`\`\n${url}\n\`\`\``);
  console.log();
});

console.log('## Usage Examples\n');
console.log('### For Local Development');
console.log('Replace `http://localhost:3000` with your local server URL.\n');

console.log('### For Production');
console.log('Replace with your production URL, e.g.:');
const productionUrl = createStructureShareLink('plain_changes_3', 'comprehensive', 'https://biosyncarelab.github.io');
console.log(`\`\`\`\n${productionUrl}\n\`\`\``);
console.log();

console.log('### Custom Structure Links');
console.log('Use the "📋 Share" button on any structure card to generate a shareable link.');
console.log('The link is automatically copied to your clipboard!\n');

// Generate a quick reference for all structures
console.log('## All Available Structures (IDs)\n');
console.log('Use these IDs with the share link generator:');
console.log('```');
comprehensiveStructures.forEach(({ id }) => {
  console.log(`  - ${id}`);
});
console.log('```\n');

console.log('---');
console.log('Generated on:', new Date().toISOString());

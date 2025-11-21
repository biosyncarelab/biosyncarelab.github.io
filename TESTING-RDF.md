# RDF-First Architecture Testing Guide

## Overview

The RDF-first architecture has been successfully implemented for BioSynCare Lab. This guide explains how to test the hybrid RDF+JSON loading system.

## What Was Implemented

### 1. RDF Loader Utility ([scripts/rdf-loader.js](scripts/rdf-loader.js))

- **`loadRDFGraph(turtleUrl)`** - Loads and parses Turtle/RDF files using N3.js
- **`getStructureMetadata(store, structureId)`** - Extracts metadata from RDF
- **`getUsageExamples(store, structureURI)`** - Retrieves usage examples from RDF
- **`loadHybridStructure(jsonUrl, rdfUrl)`** - Loads both JSON and RDF, merging them with RDF as priority

### 2. Updated Structures Loader ([scripts/structures-loader.js](scripts/structures-loader.js))

- Modified `loadStructures()` to support hybrid RDF+JSON loading
- Added `rdfUrl` parameter to STRUCTURE_MANIFEST entries
- Preserves RDF metadata (`rdfMetadata`, `_rdfEnriched`, `_rdfURI`) through normalization

### 3. RDF Ontology Files

- **[rdf/modules/music-structures.ttl](rdf/modules/music-structures.ttl)** - 236 quads
- **[rdf/modules/music-structures-usage-examples.ttl](rdf/modules/music-structures-usage-examples.ttl)** - 245 quads
- All 37 usage examples defined as RDF individuals

## Testing

### Node.js Tests

Run the RDF parsing test:

```bash
npm run test:rdf
```

**Expected output:**
```
RDF sanity OK: 4 files, 861 quads parsed
```

### Browser Tests

1. **Start a local HTTP server:**

```bash
python3 -m http.server 3000
```

2. **Open the test page:**

Navigate to [http://localhost:3000/test-rdf-browser.html](http://localhost:3000/test-rdf-browser.html)

3. **Run the tests:**

Click each test button in order:

- ✅ **Test 1: Load RDF Graph** - Loads `music-structures.ttl` and shows quad count
- ✅ **Test 2: Get Structure Metadata** - Retrieves metadata for `PlainChanges3`
- ✅ **Test 3: Get Usage Examples** - Gets all usage examples from RDF
- ✅ **Test 4: Hybrid RDF+JSON Loading** - Loads comprehensive JSON with RDF enrichment

4. **Console Testing:**

The test page exposes functions in the browser console for manual testing:

```javascript
// Load RDF graph
const { store, prefixes } = await loadRDFGraph('rdf/modules/music-structures.ttl');

// Get metadata for a structure
const metadata = getStructureMetadata(store, 'plain_changes_3');
console.log(metadata);

// Get usage examples
const uri = findStructureURI(store, 'plain_changes_3');
const examples = getUsageExamples(store, uri);
console.log(examples);

// Hybrid loading (RDF + JSON)
const data = await loadHybridStructure(
  'data/structures/music-structures-comprehensive.json',
  'rdf/modules/music-structures.ttl'
);
console.log(data.changeRinging[0].usageExamples);  // From RDF!
```

### Testing in Main Application

1. **Start the app** (with your preferred method)

2. **Open DevTools Console**

3. **Navigate to Structure Explorer tab**

4. **Load a comprehensive structure** (e.g., "Comprehensive Music Structures")

5. **Check console for hybrid loading messages:**

```
📚 Loading hybrid RDF+JSON: data/structures/music-structures-comprehensive.json + rdf/modules/music-structures.ttl
✅ RDF enrichment successful
```

6. **Select a structure** (e.g., "Plain Changes on 3 Bells")

7. **Verify usage examples appear** - These should now come from RDF, not JSON!

8. **Check the data in console:**

```javascript
// Get the loaded structure data
const structureData = window.testData || /* find in global state */;

// Verify RDF enrichment
console.log(structureData.sequences[0]._rdfEnriched);  // true
console.log(structureData.sequences[0].rdfMetadata);   // {...}
console.log(structureData.sequences[0].usageExamples);  // From RDF
```

## Expected Results

### RDF Metadata Structure

```json
{
  "uri": "https://w3id.org/biosyncare/ontology#PlainChanges3",
  "id": "plain_changes_3",
  "label": "Plain Changes on 3 Bells",
  "comment": "Basic 3-bell peal with 1 hunt bell",
  "definition": "The simplest change-ringing pattern...",
  "scopeNote": "Perfect for beginners exploring change-ringing...",
  "orderDimension": "3",
  "rowCount": "6",
  "isLooping": "true"
}
```

### Usage Example Structure

```json
{
  "uri": "https://w3id.org/biosyncare/ontology#PlainChanges3_Example1",
  "category": "audio",
  "label": "Minimalist three-track ambient composition",
  "scenario": "Minimalist three-track ambient composition",
  "breathing": "Short cycle (6-12 seconds)...",
  "trackMapping": "3 drone layers with different timbres...",
  "outcome": "Gentle timbral breathing with clear mathematical structure..."
}
```

## Verification Checklist

- [ ] RDF files parse without errors (`npm run test:rdf`)
- [ ] Browser test page loads all 4 tests successfully
- [ ] Hybrid loading shows `_rdfEnriched: true` on sequences
- [ ] Usage examples come from RDF (contain `uri` and `category` fields)
- [ ] RDF metadata includes `definition`, `scopeNote`, etc.
- [ ] Console shows "✅ RDF enrichment successful" message
- [ ] Fallback to JSON works if RDF fails to load

## Troubleshooting

### "Failed to fetch RDF file"

- Ensure you're running a local server (CORS restrictions)
- Check that RDF files exist in `rdf/modules/`
- Verify file paths in STRUCTURE_MANIFEST

### "No RDF data found for structure"

- Check that `dcterms:identifier` in RDF matches JSON `id`
- Verify structure exists in `music-structures.ttl`

### "Usage examples are empty"

- Ensure `music-structures-usage-examples.ttl` is loaded
- Check that structure has `bsc:hasUsageExample` links
- Verify example individuals exist

## Next Steps

With RDF loading verified, the next implementation steps are:

1. ✅ **RDF Hover Tooltips** - Show RDF metadata on hover
2. **State Management Integration** - Store RDF URIs in session state
3. **Semantic Navigation** - Click structure → jump to NSO Navigator
4. **SPARQL Queries** - "Show me all structures suitable for meditation"

## Architecture Reminder

**RDF is PRIMARY SOURCE OF TRUTH:**

- Read metadata from RDF (labels, definitions, usage examples)
- Read permutations from JSON (performance)
- Link UI to RDF URIs (semantic integration)
- Validate with SHACL (data quality)

See [rdf/modules/README-RDF-FIRST.md](rdf/modules/README-RDF-FIRST.md) for complete architecture documentation.

/**
 * RDF Loader Utility
 *
 * Loads and parses RDF/Turtle files for BioSynCare Lab
 * Provides utilities to extract metadata and usage examples from RDF ontology
 *
 * IMPORTANT: This loader treats RDF as the PRIMARY SOURCE OF TRUTH
 * JSON files should only be used for performance-critical permutation arrays
 */

import N3 from 'https://cdn.skypack.dev/n3';

const { DataFactory } = N3;
const { namedNode, literal } = DataFactory;

// BioSynCare ontology namespace
const BSC = 'https://w3id.org/biosyncare/ontology#';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';

/**
 * Load an RDF graph from a Turtle file URL
 * @param {string} turtleUrl - URL to the .ttl file
 * @returns {Promise<{store: N3.Store, prefixes: Object}>}
 */
export async function loadRDFGraph(turtleUrl) {
  const response = await fetch(turtleUrl);
  const turtleText = await response.text();

  const parser = new N3.Parser();
  const store = new N3.Store();

  return new Promise((resolve, reject) => {
    let parsedPrefixes = {};

    parser.parse(turtleText, (error, quad, prefixes) => {
      if (error) {
        reject(error);
        return;
      }

      if (quad) {
        store.addQuad(quad);
      } else {
        // Parsing complete
        parsedPrefixes = prefixes || {};
        resolve({ store, prefixes: parsedPrefixes });
      }
    });
  });
}

/**
 * Get a property value from RDF store
 * @param {N3.Store} store - RDF store
 * @param {string} subject - Subject URI
 * @param {string} predicate - Predicate URI
 * @returns {string|null} Property value or null
 */
function getProperty(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null);
  if (quads.length === 0) return null;
  return quads[0].object.value;
}

/**
 * Get all property values from RDF store
 * @param {N3.Store} store - RDF store
 * @param {string} subject - Subject URI
 * @param {string} predicate - Predicate URI
 * @returns {string[]} Array of property values
 */
function getProperties(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null);
  return quads.map(quad => quad.object.value);
}

/**
 * Get metadata for a music structure from RDF
 * @param {N3.Store} store - RDF store
 * @param {string} structureId - Structure identifier (e.g., "plain_changes_3")
 * @returns {Object|null} Structure metadata
 */
export function getStructureMetadata(store, structureId) {
  // Find structure by dcterms:identifier
  const quads = store.getQuads(null, DCTERMS + 'identifier', literal(structureId));

  if (quads.length === 0) {
    console.warn(`No RDF structure found with identifier: ${structureId}`);
    return null;
  }

  const structureURI = quads[0].subject.value;

  return {
    uri: structureURI,
    id: structureId,
    label: getProperty(store, structureURI, RDFS + 'label'),
    comment: getProperty(store, structureURI, RDFS + 'comment'),
    definition: getProperty(store, structureURI, SKOS + 'definition'),
    scopeNote: getProperty(store, structureURI, SKOS + 'scopeNote'),
    altLabel: getProperty(store, structureURI, SKOS + 'altLabel'),
    orderDimension: getProperty(store, structureURI, BSC + 'hasOrderDimension'),
    rowCount: getProperty(store, structureURI, BSC + 'hasRowCount'),
    isLooping: getProperty(store, structureURI, BSC + 'isLooping'),
    source: getProperty(store, structureURI, DCTERMS + 'source'),
  };
}

/**
 * Get usage examples for a music structure from RDF
 * @param {N3.Store} store - RDF store
 * @param {string} structureURI - Structure URI (e.g., "https://w3id.org/biosyncare/ontology#PlainChanges3")
 * @returns {Array} Array of usage example objects
 */
export function getUsageExamples(store, structureURI) {
  const examples = [];

  // Get all usage example URIs linked to this structure
  const exampleQuads = store.getQuads(structureURI, BSC + 'hasUsageExample', null);

  exampleQuads.forEach(quad => {
    const exampleURI = quad.object.value;

    // Get RDF type to determine example category
    const typeQuads = store.getQuads(exampleURI, RDF + 'type', null);
    const types = typeQuads.map(q => q.object.value);

    let category = 'unknown';
    if (types.includes(BSC + 'AudioUsageExample')) {
      category = 'audio';
    } else if (types.includes(BSC + 'VisualUsageExample')) {
      category = 'visual';
    } else if (types.includes(BSC + 'MixedUsageExample')) {
      category = 'mixed';
    }

    const example = {
      uri: exampleURI,
      category: category,
      label: getProperty(store, exampleURI, RDFS + 'label'),
      scenario: getProperty(store, exampleURI, BSC + 'hasScenario'),
      breathing: getProperty(store, exampleURI, BSC + 'hasBreathingPattern'),
      trackMapping: getProperty(store, exampleURI, BSC + 'hasTrackMapping'),
      outcome: getProperty(store, exampleURI, BSC + 'hasExpectedOutcome'),
    };

    examples.push(example);
  });

  return examples;
}

/**
 * Find structure URI by identifier
 * @param {N3.Store} store - RDF store
 * @param {string} structureId - Structure identifier (e.g., "plain_changes_3")
 * @returns {string|null} Structure URI or null
 */
export function findStructureURI(store, structureId) {
  const quads = store.getQuads(null, DCTERMS + 'identifier', literal(structureId));
  if (quads.length === 0) return null;
  return quads[0].subject.value;
}

/**
 * Enrich JSON structure data with RDF metadata
 * @param {Object} jsonData - JSON structure data
 * @param {N3.Store} store - RDF store
 * @returns {Object} Enriched structure data
 */
export function enrichWithRDF(jsonData, store) {
  if (!jsonData || !store) return jsonData;

  // Handle comprehensive structure files with sequences array
  if (jsonData.sequences && Array.isArray(jsonData.sequences)) {
    return {
      ...jsonData,
      sequences: jsonData.sequences.map(seq => enrichSequenceWithRDF(seq, store))
    };
  }

  // Handle individual structure files
  return enrichSequenceWithRDF(jsonData, store);
}

/**
 * Enrich a single sequence with RDF metadata
 * @param {Object} sequence - JSON sequence object
 * @param {N3.Store} store - RDF store
 * @returns {Object} Enriched sequence
 */
function enrichSequenceWithRDF(sequence, store) {
  if (!sequence.id) return sequence;

  const structureURI = findStructureURI(store, sequence.id);
  if (!structureURI) {
    console.warn(`No RDF data found for structure: ${sequence.id}`);
    return sequence;
  }

  const metadata = getStructureMetadata(store, sequence.id);
  const usageExamples = getUsageExamples(store, structureURI);

  return {
    ...sequence,
    rdfMetadata: metadata,
    // Replace JSON usage examples with RDF usage examples (RDF is source of truth)
    usageExamples: usageExamples.length > 0 ? usageExamples : sequence.usageExamples,
    _rdfEnriched: true,
    _rdfURI: structureURI,
  };
}

/**
 * Load both RDF and JSON for a structure, merging them with RDF as priority
 * @param {string} jsonUrl - URL to JSON file
 * @param {string} rdfUrl - URL to RDF/Turtle file (can be main structures file)
 * @returns {Promise<Object>} Merged structure data
 */
export async function loadHybridStructure(jsonUrl, rdfUrl) {
  try {
    // Determine usage examples file path (same directory as structures file)
    const rdfDir = rdfUrl.substring(0, rdfUrl.lastIndexOf('/'));
    const usageExamplesUrl = `${rdfDir}/music-structures-usage-examples.ttl`;

    // Load JSON and both RDF files in parallel
    const [jsonData, structuresRdf, examplesRdf] = await Promise.all([
      fetch(jsonUrl).then(r => r.json()),
      loadRDFGraph(rdfUrl),
      loadRDFGraph(usageExamplesUrl).catch(err => {
        console.warn('⚠️ Usage examples RDF not found, continuing without it:', err.message);
        return null;
      })
    ]);

    // Merge both RDF stores if usage examples were loaded
    let combinedStore = structuresRdf.store;
    if (examplesRdf) {
      // Add all quads from usage examples to the main store
      examplesRdf.store.getQuads(null, null, null, null).forEach(quad => {
        combinedStore.addQuad(quad);
      });
      console.log('📚 Merged usage examples RDF:', examplesRdf.store.size, 'quads');
    }

    // Enrich JSON with combined RDF metadata
    const enriched = enrichWithRDF(jsonData, combinedStore);

    console.log('✅ Hybrid RDF+JSON loading complete:', {
      jsonUrl,
      rdfUrl,
      usageExamplesUrl,
      totalQuads: combinedStore.size,
      enriched: enriched._rdfEnriched || (enriched.sequences && enriched.sequences[0]?._rdfEnriched)
    });

    return enriched;
  } catch (error) {
    console.error('❌ Hybrid loading failed:', error);
    // Fallback to JSON only
    console.warn('⚠️ Falling back to JSON-only loading');
    return fetch(jsonUrl).then(r => r.json());
  }
}

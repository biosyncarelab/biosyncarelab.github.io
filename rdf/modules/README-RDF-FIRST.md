# RDF-First Architecture for BioSynCare Lab

## Core Principle

**RDF is the PRIMARY SOURCE OF TRUTH** for all BioSynCare Lab semantic data, including musical structures, neurosensory ontology concepts, and usage examples.

JSON files are **derived serializations** optimized for runtime performance. They must remain synchronized with RDF data.

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│          RDF Ontologies (Source of Truth)            │
│                                                       │
│  • music-structures.ttl                              │
│  • music-structures-usage-examples.ttl               │
│  • bsc-owl.ttl                                       │
│  • bsc-skos.ttl                                      │
│  • audio.ttl, visual.ttl, martigli.ttl              │
└──────────────┬───────────────────────────────────────┘
               │
               │ Derived from (export scripts)
               ▼
┌──────────────────────────────────────────────────────┐
│        JSON Serializations (Performance Layer)       │
│                                                       │
│  • data/structures/*.json                            │
│  • data/nso/*.json                                   │
│  • data/outcomes/*.json                              │
└──────────────┬───────────────────────────────────────┘
               │
               │ Loaded by
               ▼
┌──────────────────────────────────────────────────────┐
│          BioSynCare Lab Web Application              │
│                                                       │
│  • Structure Visualizer                              │
│  • NSO Navigator                                     │
│  • Session Manager                                   │
└──────────────────────────────────────────────────────┘
```

## Data Flow

### 1. RDF → JSON Export (Python Pods)

```python
# scripts/music/export_structures.py
def export_to_json_and_rdf():
    """
    1. Generate change-ringing permutations using music package
    2. Write comprehensive RDF ontology with:
       - Structure individuals (bsc:PlainChanges3, etc.)
       - Usage examples (bsc:PlainChanges3_Example1, etc.)
       - Semantic relationships
    3. Derive JSON serialization for web performance
    """
```

### 2. JSON Loading (Web Application)

```javascript
// scripts/structures-loader.js
async function loadStructures(url) {
    // Load JSON for runtime performance
    const data = await fetch(url).then(r => r.json());

    // TODO: Enrich with RDF metadata
    // const rdfData = await loadRDF('rdf/modules/music-structures.ttl');
    // return mergeJSONwithRDF(data, rdfData);

    return normalizeStructure(data);
}
```

### 3. RDF-Enhanced Features (Future)

- **Hover Tooltips**: Show `rdfs:comment`, `skos:definition` from RDF
- **Semantic Navigation**: Click structure → jump to NSO Navigator showing related concepts
- **SPARQL Queries**: "Show me all structures suitable for meditation"
- **Usage Example Search**: Filter by domain (audio/visual/mixed)

## File Organization

```
rdf/
├── core/
│   ├── bsc-owl.ttl         # Core ontology classes
│   └── bsc-skos.ttl        # SKOS concept hierarchies
├── modules/
│   ├── music-structures.ttl               # Structure individuals
│   ├── music-structures-usage-examples.ttl # All 37 examples
│   ├── audio.ttl           # Audio concepts
│   ├── visual.ttl          # Visual concepts
│   └── martigli.ttl        # Breathing entrainment
└── shapes/
    └── structures.shacl.ttl # Validation rules

data/
└── structures/
    ├── community-alpha-change-ringing.json       # Derived
    ├── martigli-following-sequences.json         # Derived
    ├── symmetry-lines.json                       # Derived
    └── music-structures-comprehensive.json       # Derived
```

## Usage Examples in RDF

All 37 usage examples are defined as RDF individuals with rich metadata:

```turtle
bsc:PlainChanges3_Example1 a bsc:AudioUsageExample ;
    rdfs:label "Minimalist three-track ambient composition" ;
    bsc:hasScenario "Minimalist three-track ambient composition" ;
    bsc:hasBreathingPattern "Short cycle (6-12 seconds)..." ;
    bsc:hasTrackMapping """3 drone layers with different timbres...""" ;
    bsc:hasExpectedOutcome """Gentle timbral breathing...""" ;
    bsc:appliesToDomain bsc:AmbientMusic, bsc:SoundDesign .

bsc:PlainChanges3 bsc:hasUsageExample bsc:PlainChanges3_Example1 .
```

### Benefits

1. **Queryable**: SPARQL can find "all audio examples for meditation"
2. **Linkable**: Usage examples connect to other ontology concepts
3. **Discoverable**: NSO Navigator can show related examples
4. **Validatable**: SHACL ensures data quality
5. **Evolvable**: Add properties without breaking JSON

## AI Pod Instructions

### Reading Structures

**DO:**
```javascript
// Primary: Read from RDF for metadata
const rdfData = await loadRDFGraph('rdf/modules/music-structures.ttl');
const structure = rdfData.getIndividual('bsc:PlainChanges3');
const examples = structure.getProperty('bsc:hasUsageExample');

// Secondary: Read JSON for permutation arrays
const jsonData = await fetch('data/structures/comprehensive.json');
const permutations = jsonData.changeRinging.find(s => s.id === 'plain_changes_3').permutations;
```

**DON'T:**
```javascript
// ❌ Don't treat JSON as source of truth for metadata
const jsonData = await fetch('data/structures/comprehensive.json');
// This loses semantic richness!
```

### Writing Structures

1. **Define in RDF first**:
   ```turtle
   bsc:MyNewStructure a bsc:ChangeRingingPattern ;
       rdfs:label "My New Pattern" ;
       bsc:hasOrderDimension 7 ;
       bsc:hasUsageExample bsc:MyNewStructure_Example1 .
   ```

2. **Generate JSON serialization**:
   ```python
   # scripts/music/export_structures.py
   def export_new_structure():
       # Read from RDF
       rdf_data = load_rdf('rdf/modules/music-structures.ttl')
       # Generate permutations
       permutations = generate_plain_changes(7)
       # Write JSON
       write_json('data/structures/my-new-structure.json', {
           'id': 'my-new-structure',
           'sequences': [{...permutations...}]
       })
   ```

3. **Validate against SHACL**:
   ```bash
   pyshacl -s rdf/shapes/structures.shacl.ttl \
           -d rdf/modules/music-structures.ttl
   ```

## Migration Path

### Phase 1: RDF Augmentation (Current)
- JSON files remain primary for UI
- RDF files available for enrichment
- Manual synchronization

### Phase 2: Hybrid Loading (Next)
- `structures-loader.js` loads both JSON + RDF
- Merges RDF metadata into JSON objects
- RDF tooltips and semantic navigation enabled

### Phase 3: RDF-First Runtime (Future)
- Direct RDF graph querying in browser (via RDFLib.js or similar)
- JSON generated on-the-fly for performance-critical paths
- Full semantic web integration

## SPARQL Query Examples

```sparql
# Find all structures suitable for meditation
PREFIX bsc: <https://w3id.org/biosyncare/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?structure ?label ?example ?outcome
WHERE {
    ?structure a bsc:MusicStructure ;
               rdfs:label ?label ;
               bsc:hasUsageExample ?example .
    ?example bsc:hasExpectedOutcome ?outcome .
    FILTER(CONTAINS(LCASE(?outcome), "meditation"))
}
```

```sparql
# Find visual usage examples with breathing synchronization
PREFIX bsc: <https://w3id.org/biosyncare/ontology#>

SELECT ?structure ?example ?scenario ?breathing
WHERE {
    ?structure bsc:hasUsageExample ?example .
    ?example a bsc:VisualUsageExample ;
             bsc:hasScenario ?scenario ;
             bsc:hasBreathingPattern ?breathing .
    FILTER(CONTAINS(LCASE(?breathing), "breath"))
}
```

## Tools and Libraries

### Python
- `rdflib`: Read/write RDF graphs
- `pyshacl`: Validate RDF data
- `SPARQLWrapper`: Query SPARQL endpoints

### JavaScript
- `rdflib.js`: RDF graph manipulation
- `N3.js`: Fast Turtle parser
- `SPARQL.js`: SPARQL query engine

## Validation

All RDF data must validate against SHACL shapes:

```turtle
# rdf/shapes/structures.shacl.ttl
bsc:MusicStructureShape a sh:NodeShape ;
    sh:targetClass bsc:MusicStructure ;
    sh:property [
        sh:path rdfs:label ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
    ] ;
    sh:property [
        sh:path bsc:hasOrderDimension ;
        sh:minCount 1 ;
        sh:datatype xsd:positiveInteger ;
    ] ;
    sh:property [
        sh:path bsc:hasUsageExample ;
        sh:class bsc:UsageExample ;
    ] .
```

## Summary

**For AI Pods:**
- ✅ Read metadata from RDF
- ✅ Read permutations from JSON (performance)
- ✅ Link UI to RDF URIs
- ✅ Use SPARQL for discovery
- ✅ Validate with SHACL

**For Humans:**
- RDF provides semantic richness and discoverability
- JSON provides runtime performance
- Both are kept in sync through export scripts
- Future: full RDF integration in browser

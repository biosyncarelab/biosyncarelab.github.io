# Ontology Linking Strategy for BioSynCare Lab

**Date**: 2025-11-18
**Purpose**: Define how NSO Navigator links to external ontologies for semantic enrichment

---

## Executive Summary

The NSO (Neurosensory Stimulation Ontology) uses **Linked Open Data** principles to connect local concepts with authoritative external ontologies. This enables:
- **Interoperability** with medical databases (PubMed, clinical trials)
- **Semantic reasoning** using established knowledge bases
- **Evidence integration** from research literature
- **Standardization** with global medical/scientific terminology

---

## Currently Implemented Links

### 1. MeSH (Medical Subject Headings)
**Status**: ✅ Implemented in `rdf/modules/audio.ttl`

**Example**:
```turtle
bsc:BinauralBeat
  rdfs:seeAlso <http://purl.bioontology.org/ontology/MESH/D013016> .  # Sound
```

**Use Cases**:
- Link to 30M+ PubMed articles tagged with MeSH terms
- Access curated medical definitions
- Connect to evidence-based research

**Navigator Features**:
- 🏥 Icon indicator for MeSH links
- Click to open BioPortal browser
- Copy URI button for citations
- Green badge showing "MeSH"

---

## Recommended Ontology Links

### Priority 1: Medical/Clinical

#### MeSH (Medical Subject Headings)
**URI Pattern**: `http://purl.bioontology.org/ontology/MESH/D*`
**Browser**: https://bioportal.bioontology.org/ontologies/MESH
**Coverage**: Diseases, anatomy, chemicals, therapies

**Mapping Examples**:
```turtle
bsc:AnxietyReduction
  skos:exactMatch mesh:D001007 ;  # Anxiety
  rdfs:seeAlso mesh:D012064 .     # Relaxation Therapy

bsc:BinauralBeat
  rdfs:seeAlso mesh:D013016 ;  # Sound
  rdfs:seeAlso mesh:D055536 .  # Acoustic Stimulation

bsc:AlphaEnhancement
  rdfs:seeAlso mesh:D000514 .  # Alpha Rhythm
```

#### SNOMED CT (Systematized Nomenclature of Medicine)
**URI Pattern**: `http://snomed.info/id/*`
**Browser**: https://browser.ihtsdotools.org/
**Coverage**: Clinical terminology, procedures, findings

**Mapping Examples**:
```turtle
bsc:FlickerStimulation
  owl:equivalentClass sct:410028008 .  # Light stimulus (procedure)

bsc:VibroacousticTherapy
  rdfs:seeAlso sct:229063003 .  # Vibratory massage
```

### Priority 2: Neuroscience

#### Gene Ontology (GO)
**URI Pattern**: `http://purl.obolibrary.org/obo/GO_*`
**Browser**: http://amigo.geneontology.org/
**Coverage**: Biological processes, cellular components

**Mapping Examples**:
```turtle
bsc:MemoryEnhancement
  rdfs:seeAlso obo:GO_0007613 ;  # Memory
  rdfs:seeAlso obo:GO_0050890 .  # Cognition

bsc:BrainwaveEntrainment
  rdfs:seeAlso obo:GO_0060078 .  # Regulation of postsynaptic membrane potential
```

#### CogPO (Cognitive Paradigm Ontology)
**URI Pattern**: `http://www.cogpo.org/ontologies/CogPO.owl#*`
**Coverage**: Cognitive tests, experimental paradigms

**Mapping Examples**:
```turtle
bsc:AttentionEnhancement
  bsc:measuredBy cogpo:ContinuousPerformanceTest .

bsc:WorkingMemoryEnhancement
  bsc:measuredBy cogpo:NBackTask .
```

### Priority 3: Psychology

#### APA Thesaurus
**Coverage**: Psychological concepts, behaviors

**Mapping Examples**:
```turtle
bsc:EmotionalRegulationImprovement
  rdfs:seeAlso apa:EmotionalRegulation .

bsc:MoodEnhancement
  rdfs:seeAlso apa:Mood .
```

---

## Linking Predicates

### rdfs:seeAlso
**Meaning**: Related resource (loose connection)
**Use**: When the external term is relevant but not equivalent

```turtle
bsc:BinauralBeat rdfs:seeAlso mesh:D013016 .  # Related to "Sound"
```

### owl:equivalentClass
**Meaning**: Exact semantic equivalence
**Use**: When BSC class means exactly the same as external class

```turtle
bsc:AnxietyReduction owl:equivalentClass mesh:D001007 .  # Exactly "Anxiety"
```

### skos:closeMatch
**Meaning**: Close but not exact match
**Use**: Concepts that overlap significantly

```turtle
bsc:RelaxationResponse skos:closeMatch mesh:D012064 .  # Close to "Relaxation Therapy"
```

### skos:exactMatch
**Meaning**: Can be used interchangeably
**Use**: Different URIs for the same real-world concept

```turtle
bsc:AlphaWave skos:exactMatch mesh:D000514 .  # "Alpha Rhythm"
```

### skos:relatedMatch
**Meaning**: Associatively related
**Use**: Connected concepts in different contexts

```turtle
bsc:FlickerStimulation skos:relatedMatch mesh:D019050 .  # Related to "Photic Stimulation"
```

---

## Navigation Features

### Internal Links (within NSO)
**Visual**: Blue underlined links
**Behavior**: Click to navigate to node in graph
**Example**: `isReplacedBy`, `subClassOf`

### External Links (to other ontologies)
**Visual**: Green dashed underline + icon + badge
**Behavior**: Opens in new tab to external browser
**Icons**:
- 🏥 MeSH
- 🧬 Gene Ontology
- 🔬 OBO ontologies
- ⚕️ SNOMED CT
- 📚 Dublin Core
- 🔗 Generic external

**Features**:
- Hover to see full URI
- Click badge to open in external browser
- Click 📋 button to copy URI
- Auto-detects ontology type from URI pattern

**Example Display**:
```
seeAlso
  🏥 Sound [MeSH] 📋
  🧬 GO_0007613 [GO] 📋
```

---

## Benefits of Ontology Linking

### 1. Literature Integration
```sparql
# SPARQL query: Find all PubMed articles about binaural beats
SELECT ?article WHERE {
  bsc:BinauralBeat rdfs:seeAlso ?meshTerm .
  ?article mesh:hasDescriptor ?meshTerm .
}
```
→ Returns 1000+ PubMed articles

### 2. Automatic Reasoning
```turtle
# Define equivalence
bsc:AnxietyReduction owl:equivalentClass mesh:D001007 .

# Infer new knowledge
bsc:BinauralBeat bsc:hasOutcome bsc:AnxietyReduction .
# Reasoner infers:
bsc:BinauralBeat bsc:hasOutcome mesh:D001007 .
```

### 3. Cross-Database Queries
```sparql
# Find clinical trials related to our techniques
SELECT ?trial WHERE {
  bsc:AudiovisualEntrainment bsc:hasOutcome ?outcome .
  ?outcome owl:equivalentClass ?meshTerm .
  ?trial clinicaltrials:intervention ?meshTerm .
}
```

### 4. Evidence Validation
- MeSH terms link to systematic reviews
- SNOMED terms connect to clinical guidelines
- GO terms provide molecular mechanisms

### 5. Federated Search
Users can search across:
- BSCLab local ontology
- PubMed (via MeSH)
- Clinical trials databases
- Genetic databases (via GO)
- All simultaneously!

---

## Implementation Roadmap

### Phase 1: Core Medical Links ✅
- [x] MeSH for audio techniques
- [ ] MeSH for visual techniques
- [ ] MeSH for outcomes taxonomy
- [ ] MeSH for mixed modalities

### Phase 2: Neuroscience Links
- [ ] GO for biological processes
- [ ] CogPO for cognitive tests
- [ ] NIFSTD for brain regions

### Phase 3: Clinical Links
- [ ] SNOMED for procedures
- [ ] ICD-11 for conditions
- [ ] RxNorm for interventions (if applicable)

### Phase 4: Integration Features
- [ ] SPARQL endpoint for federated queries
- [ ] PubMed literature widget in inspector
- [ ] Clinical trials finder
- [ ] Evidence aggregation dashboard

---

## Best Practices

### 1. Use Specific Terms
❌ `rdfs:seeAlso mesh:D013812` (Therapeutics - too broad)
✅ `rdfs:seeAlso mesh:D055536` (Acoustic Stimulation - specific)

### 2. Document Rationale
```turtle
bsc:BinauralBeat
  rdfs:seeAlso mesh:D013016 ;
  rdfs:comment "Linked to MeSH 'Sound' as primary acoustic modality" .
```

### 3. Use Appropriate Predicates
- `owl:equivalentClass` - only for exact matches
- `skos:closeMatch` - for similar concepts
- `rdfs:seeAlso` - for related information

### 4. Validate Links
- Check that external URI resolves
- Verify semantic accuracy
- Test browser navigation

---

## Adding New Ontology Links

### Step 1: Identify Target Ontology
Use BioPortal search: https://bioportal.bioontology.org/

### Step 2: Find Exact URI
Example: Search "anxiety" → Copy URI:
`http://purl.bioontology.org/ontology/MESH/D001007`

### Step 3: Add to RDF File
```turtle
bsc:AnxietyReduction
  rdfs:seeAlso <http://purl.bioontology.org/ontology/MESH/D001007> ;
  rdfs:label "Anxiety Reduction" ;
  rdfs:comment "Linked to MeSH D001007 (Anxiety)" .
```

### Step 4: Update Navigator (if needed)
If using a new ontology, add URL resolver to `createExternalOntologyLink()`:
```javascript
else if (uri.includes("newontology.org")) {
  externalURL = `https://browser.newontology.org/term/${id}`;
  ontologyName = "NewOnt";
  iconSymbol = "🆕";
}
```

### Step 5: Document
Add to this file's "Currently Implemented Links" section.

---

## Resources

- **BioPortal**: https://bioportal.bioontology.org/ (browse all biomedical ontologies)
- **OBO Foundry**: http://www.obofoundry.org/ (life science ontologies)
- **Linked Open Data Cloud**: https://lod-cloud.net/ (semantic web datasets)
- **SPARQL Tutorial**: https://www.w3.org/TR/sparql11-query/

---

**Next Steps**:
1. Add MeSH links to visual and outcomes modules
2. Implement PubMed literature integration
3. Create SPARQL query interface
4. Build evidence dashboard with cross-ontology aggregation

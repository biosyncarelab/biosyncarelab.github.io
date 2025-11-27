# RDF Enrichment

How semantic metadata enhances structures and data throughout BioSynCare Lab.

---

## Overview

**RDF (Resource Description Framework)** is a standard for expressing semantic metadata as linked data. BioSynCare Lab uses RDF to enrich structures with:

- **Formal definitions**: Precise mathematical and musical descriptions
- **Ontology links**: Connections to standard vocabularies (schema.org, SKOS, etc.)
- **Provenance**: Authorship, creation date, version history
- **Relationships**: Links between related structures, concepts, outcomes

This enrichment enables:
- Semantic search and discovery
- Automated reasoning and inference
- Interoperability with other systems
- Enhanced documentation and explanation

---

## RDF in Structures

### JSON-LD Embedding

Every structure includes embedded JSON-LD metadata:

```json
{
  "@context": {
    "bsc": "http://purl.org/biosyncarelab/core#",
    "schema": "http://schema.org/",
    "skos": "http://www.w3.org/2004/02/skos/core#"
  },
  "@id": "bsc:structure/plain-hunt-6",
  "@type": "bsc:ChangeRingingStructure",
  "schema:name": "Plain Hunt on 6",
  "bsc:numBells": 6,
  "bsc:extent": 720,
  "bsc:hasSymmetry": "palindromic",
  "skos:definition": "A fundamental change-ringing method where bells hunt up and down in a symmetrical pattern",
  "skos:scopeNote": "Plain Hunt forms the foundation for many complex methods"
}
```

### RDF Properties

#### Basic Properties

- **@id**: Unique URI identifier
- **@type**: Class membership (e.g., ChangeRingingStructure)
- **schema:name**: Human-readable name
- **schema:description**: Detailed text description

#### Musical Properties

- **bsc:numBells**: Number of bells in sequence
- **bsc:extent**: Total number of unique rows
- **bsc:notation**: Bell-ringing notation system
- **bsc:method**: Classification (Plain Hunt, Grandsire, etc.)

#### Mathematical Properties

- **bsc:hasSymmetry**: Symmetry type (palindromic, rotational, etc.)
- **bsc:order**: Group-theoretic order
- **bsc:isPrime**: Whether extent is prime
- **bsc:cycles**: Permutation cycle structure

#### Semantic Links

- **skos:definition**: Formal definition from ontology
- **skos:scopeNote**: Usage notes and context
- **skos:broader**: Link to parent concept
- **skos:related**: Link to related concepts

### Viewing RDF Metadata

Every structure card has an **RDF** button that displays:

```json
{
  "@context": { ... },
  "@id": "bsc:structure/plain-hunt-6",
  "schema:name": "Plain Hunt on 6",
  "bsc:numBells": 6,
  "bsc:extent": 720,
  ...
}
```

This viewer:
- Formats JSON-LD for readability
- Syntax highlights properties and values
- Allows copying to clipboard
- Shows full semantic context

---

## RDF Modules

BioSynCare Lab loads RDF data from Turtle (`.ttl`) files in `rdf/modules/`:

### music-structures.ttl

Defines musical structure concepts:

```turtle
@prefix bsc: <http://purl.org/biosyncarelab/core#> .
@prefix schema: <http://schema.org/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

bsc:ChangeRingingStructure
  a rdfs:Class ;
  rdfs:label "Change Ringing Structure" ;
  skos:definition "A mathematical permutation sequence used in bell ringing" ;
  rdfs:subClassOf bsc:MusicStructure .

bsc:PlainHunt
  a bsc:ChangeRingingStructure ;
  schema:name "Plain Hunt" ;
  skos:definition "A fundamental method where bells hunt up and down symmetrically" ;
  bsc:hasSymmetry "palindromic" .
```

### outcomes.ttl

Defines therapeutic outcomes:

```turtle
bsc:RelaxationOutcome
  a bsc:TherapeuticOutcome ;
  schema:name "Relaxation" ;
  skos:definition "Reduction in physiological arousal and psychological tension" ;
  bsc:measuredBy bsc:HeartRateVariability, bsc:SelfReportScale .

bsc:FocusEnhancement
  a bsc:TherapeuticOutcome ;
  schema:name "Focus Enhancement" ;
  skos:definition "Improved sustained attention and cognitive control" ;
  bsc:inducedBy bsc:AudiovisualEntrainment .
```

### music-structures-usage-examples.ttl

Provides usage examples:

```turtle
bsc:example-1
  a bsc:UsageExample ;
  schema:name "Meditation with Plain Hunt" ;
  bsc:usesStructure bsc:PlainHunt ;
  bsc:targetOutcome bsc:RelaxationOutcome ;
  bsc:recommendedTempo 60 ;
  bsc:duration 600 .
```

---

## Ontology Integration

### External Vocabularies

BioSynCare Lab integrates standard ontologies:

#### Schema.org

- **schema:name**: Names and labels
- **schema:description**: Descriptions
- **schema:author**: Authorship information
- **schema:dateCreated**: Creation timestamps

#### SKOS (Simple Knowledge Organization System)

- **skos:definition**: Formal definitions
- **skos:scopeNote**: Usage notes
- **skos:broader/narrower**: Hierarchical relationships
- **skos:related**: Associative relationships

#### Dublin Core

- **dc:creator**: Creator information
- **dc:date**: Date information
- **dc:rights**: Rights and licensing

#### FOAF (Friend of a Friend)

- **foaf:name**: Person names
- **foaf:mbox**: Email addresses
- **foaf:homepage**: Personal websites

### Custom Vocabulary

BioSynCare Core (`bsc:`) defines domain-specific terms:

```turtle
bsc:MusicStructure
bsc:TherapeuticOutcome
bsc:SensoryModality
bsc:SynchronizationPattern
bsc:AudiovisualEntrainment
```

---

## Enrichment Benefits

### 1. Semantic Search

RDF enables search by meaning, not just keywords:

**Query**: "Find structures with palindromic symmetry"
```sparql
SELECT ?structure ?name WHERE {
  ?structure a bsc:ChangeRingingStructure ;
             schema:name ?name ;
             bsc:hasSymmetry "palindromic" .
}
```

**Results**:
- Plain Hunt on 6
- Stedman Doubles
- Mirror Sweep patterns

### 2. Automated Reasoning

RDF enables logical inference:

**Rule**: If a structure has palindromic symmetry, it's suitable for meditation

**Inference**:
```turtle
bsc:PlainHunt bsc:hasSymmetry "palindromic" .
→ bsc:PlainHunt bsc:suitableFor bsc:Meditation .
```

### 3. Linked Data

RDF connects BioSynCare to the broader semantic web:

```turtle
bsc:PlainHunt
  owl:sameAs <http://changeR inging.org/method/plain-hunt-6> ;
  skos:related <http://dbpedia.org/resource/Change_ringing> ;
  schema:about <http://musicbrainz.org/tag/bell-ringing> .
```

### 4. Provenance Tracking

RDF records complete history:

```turtle
bsc:structure-v2
  prov:wasDerivedFrom bsc:structure-v1 ;
  prov:wasGeneratedBy bsc:StructureGenerator ;
  prov:generatedAtTime "2025-11-25T10:30:00Z"^^xsd:dateTime ;
  dc:creator <http://orcid.org/0000-0002-1234-5678> .
```

### 5. Interoperability

RDF enables data exchange:

**Export**:
```bash
curl https://biosyncarelab.github.io/structures/plain-hunt-6.jsonld
```

**Import to other systems**:
- Triple stores (Apache Jena, Virtuoso)
- Knowledge graphs (Neo4j, GraphDB)
- Semantic applications (Protégé, SPARQL endpoints)

---

## RDF Quality

### Validation

Structures are validated against SHACL shapes:

```turtle
bsc:ChangeRingingStructureShape
  a sh:NodeShape ;
  sh:targetClass bsc:ChangeRingingStructure ;
  sh:property [
    sh:path schema:name ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
  ] ;
  sh:property [
    sh:path bsc:numBells ;
    sh:minCount 1 ;
    sh:datatype xsd:integer ;
    sh:minInclusive 3 ;
  ] .
```

Run validation:
```bash
make validate-structures-shacl
```

### Best Practices

#### 1. Use Standard Vocabularies

**Good**:
```turtle
schema:name "Plain Hunt on 6" .
```

**Bad**:
```turtle
bsc:customName "Plain Hunt on 6" .
```

#### 2. Provide Definitions

**Good**:
```turtle
bsc:PlainHunt
  skos:definition "A fundamental method where bells hunt symmetrically" .
```

**Bad**:
```turtle
bsc:PlainHunt
  rdfs:label "Plain Hunt" .  # No definition
```

#### 3. Link to External Resources

**Good**:
```turtle
bsc:PlainHunt
  owl:sameAs <http://cccbr.org.uk/method/plain-hunt> ;
  skos:related <http://dbpedia.org/resource/Change_ringing> .
```

**Bad**:
```turtle
bsc:PlainHunt
  schema:name "Plain Hunt" .  # No external links
```

#### 4. Include Provenance

**Good**:
```turtle
bsc:PlainHunt
  dc:creator <http://example.org/author> ;
  dc:date "2025-11-25"^^xsd:date ;
  prov:wasGeneratedBy bsc:Generator-v2 .
```

**Bad**:
```turtle
bsc:PlainHunt
  schema:name "Plain Hunt" .  # No provenance
```

---

## Export & Sharing

### Export RDF

Export structures as JSON-LD:

```bash
npm run export:structures:jsonld
# Creates data/structures/structures.jsonld
```

Structure:
```json
{
  "@context": { ... },
  "@graph": [
    {
      "@id": "bsc:structure/plain-hunt-6",
      "@type": "bsc:ChangeRingingStructure",
      ...
    },
    ...
  ]
}
```

### Share via URL

RDF metadata is preserved in shareable URLs:

```
https://biosyncarelab.github.io/#state=...
```

The encoded state includes:
- Structure ID (resolves to RDF)
- Category (links to collection)
- Playback position
- Synthesis parameters

### Publish to Web

Serve RDF with content negotiation:

**HTML Request**:
```http
GET /structures/plain-hunt-6
Accept: text/html
```

**RDF Request**:
```http
GET /structures/plain-hunt-6
Accept: application/ld+json
```

---

## Future Enhancements

### 1. SPARQL Endpoint

Query structures via SPARQL:

```sparql
PREFIX bsc: <http://purl.org/biosyncarelab/core#>
PREFIX schema: <http://schema.org/>

SELECT ?structure ?name ?bells WHERE {
  ?structure a bsc:ChangeRingingStructure ;
             schema:name ?name ;
             bsc:numBells ?bells .
  FILTER(?bells > 5)
}
ORDER BY ?bells
```

### 2. Reasoning Engine

Infer new facts:

```turtle
# Rule: Structures with >6 bells are complex
bsc:ComplexStructure rdfs:subClassOf bsc:ChangeRingingStructure .

# Inference:
bsc:Grandsire bsc:numBells 7 .
→ bsc:Grandsire a bsc:ComplexStructure .
```

### 3. Knowledge Graph Visualization

Interactive graph of all RDF relationships:
- Nodes: Structures, concepts, outcomes
- Edges: Properties and relationships
- Filters: By type, date, creator
- Export: GraphML, GEXF, JSON

### 4. Federated Queries

Query across multiple endpoints:

```sparql
SELECT ?structure ?label ?dbpediaInfo WHERE {
  SERVICE <https://biosyncarelab.github.io/sparql> {
    ?structure a bsc:ChangeRingingStructure ;
               rdfs:label ?label .
  }
  SERVICE <https://dbpedia.org/sparql> {
    ?dbpediaInfo foaf:name ?label .
  }
}
```

---

## Related Documentation

- [RDF Quality Strategy](rdf-quality) - RDF validation and quality assurance
- [NSO Navigator](nso-navigator) - Browse RDF ontologies
- [Ontology Linking](ontology-linking) - External ontology integration
- [Structure Playback](structures-playback) - Structure explorer guide

---

**Last Updated**: 2025-11-25
**Maintained by**: BioSynCare Lab AI Assistants

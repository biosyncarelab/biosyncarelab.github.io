# NSO External Ontology Links - Complete Reference

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintainer**: BioSynCare Lab

---

## Overview

This document provides a comprehensive reference of all external ontology links in NSO v1.0.0, enabling semantic interoperability with major biomedical and clinical databases.

### Linked Ontologies

| Ontology | Full Name | Coverage | Link Count | Purpose |
|----------|-----------|----------|------------|---------|
| **MeSH** | Medical Subject Headings | Comprehensive | 50+ | Clinical terminology, PubMed literature integration |
| **GO** | Gene Ontology | Planned v1.1 | 0 | Biological processes (future) |
| **SNOMED CT** | Systematized Nomenclature of Medicine | Planned v1.1 | 0 | Clinical procedures (future) |

### SKOS Relationship Types Used

NSO uses SKOS (Simple Knowledge Organization System) vocabulary properties for precise semantic alignment:

| Property | Meaning | When to Use | Example |
|----------|---------|-------------|---------|
| `skos:exactMatch` | Concepts are essentially identical | High confidence equivalence | `bsc:Anxiety exactMatch MESH:D001007` |
| `skos:closeMatch` | Concepts are highly similar | Similar but not identical | `bsc:LongTermMemoryEnhancement closeMatch MESH:D008570` |
| `skos:related` | Concepts are related/associated | Broader association | `bsc:AnxietyReduction related MESH:D001008` |
| `rdfs:seeAlso` | General reference | Additional context | `bsc:FlickerStimulation seeAlso Wikipedia` |

---

## MeSH Links by Module

### Core Module (`bsc-owl.ttl`)

**Total**: 0 (core classes are abstract)

### Audio Module (`audio.ttl`)

**Total**: 1 MeSH link

| NSO Class | MeSH Term | MeSH ID | Relationship |
|-----------|-----------|---------|--------------|
| `bsc:AudioTechnique` (base class) | - | - | - |
| `bsc:BinauralBeat` | Sound | D013016 | `rdfs:seeAlso` |
| `bsc:MonauralBeat` | - | - | - |
| `bsc:IsochronicTone` | - | - | - |
| `bsc:SolfeggioFrequency` | - | - | - |
| `bsc:HemiSync` | - | - | - |

**Coverage**: 1/6 classes (16.7%)

**Recommended Enhancements (v1.1)**:
- Add `MESH:D013016` (Sound) to all audio techniques
- Add `MESH:D000161` (Acoustic Stimulation) where applicable

### Visual Module (`visual.ttl`)

**Total**: 6 MeSH links

| NSO Class | MeSH Term | MeSH ID | Relationship |
|-----------|-----------|---------|--------------|
| `bsc:VisualTechnique` (base class) | - | - | - |
| `bsc:FlickerStimulation` | Photic Stimulation | D019050 | `rdfs:seeAlso` |
| `bsc:VisualEntrainment` | Photic Stimulation | D019050 | `rdfs:seeAlso` |
| `bsc:ColorTherapy` | Light Therapy | D008027 | `rdfs:seeAlso` |
| `bsc:StroboscopicStimulation` | Photic Stimulation | D019050 | `rdfs:seeAlso` |
| `bsc:SoftLightPulsing` | Light | D008027 | `rdfs:seeAlso` |
| `bsc:GanzfeldStimulation` | Sensory Deprivation | D012676 | `rdfs:seeAlso` |

**Coverage**: 6/7 classes (85.7%)

**Key Benefits**:
- Enables PubMed searches for photic stimulation research
- Links to clinical guidelines for photosensitive epilepsy
- Connection to light therapy treatment protocols

### Mixed Module (`mixed.ttl`)

**Total**: 13 MeSH links (with 5 SKOS relationship triples)

| NSO Class | Primary MeSH Term | MeSH ID | Additional Links |
|-----------|-------------------|---------|------------------|
| `bsc:AudiovisualTechnique` (base class) | Audiovisual Aids | D000161 | `rdfs:seeAlso` |
| `bsc:AudiovisualEntrainment` | (inherited) | - | - |
| `bsc:MindMachine` | Audiovisual Aids | D000161 | `rdfs:seeAlso`<br>`skos:closeMatch` D019050 (Photic Stimulation) |
| `bsc:MartigliBreathingCue` | Breathing Exercises | D001945 | `rdfs:seeAlso` |
| `bsc:SynestheticStimulation` | Synesthesia | D013545 | `rdfs:seeAlso`<br>+ D010465 (Perception)<br>`skos:related` D000161 (Audiovisual Aids) |
| `bsc:VibroacousticTherapy` | Vibration | D014732 | `rdfs:seeAlso`<br>+ D013016 (Sound)<br>`skos:related` D059408 (Music Therapy) |
| `bsc:HapticEntrainment` | Touch | D014110 | `rdfs:seeAlso`<br>+ D014732 (Vibration)<br>`skos:related` D055698 (Touch Perception) |
| `bsc:ImmersiveVRNeurostimulation` | Virtual Reality | D000077562 | `rdfs:seeAlso`<br>`skos:exactMatch` D000067586 (Virtual Reality Exposure Therapy)<br>`skos:related` D019464 (Computer-Assisted Therapy) |

**Coverage**: 7/9 classes (77.8%)

**Key Benefits**:
- Links to VR therapy clinical trials databases
- Enables research on multimodal sensory integration
- Connection to music therapy and sound healing literature

### Outcomes Module (`outcomes.ttl`)

**Total**: 35+ MeSH links (comprehensive coverage)

#### Cognitive Outcomes (7 classes, 10 MeSH links)

| NSO Class | Primary MeSH Term | MeSH ID | SKOS Relationship | Additional Links |
|-----------|-------------------|---------|-------------------|------------------|
| `bsc:CognitiveOutcome` (base class) | Cognition | D003071 | `rdfs:seeAlso` | - |
| `bsc:AttentionEnhancement` | Attention | D001288 | `skos:exactMatch` | `skos:related` D001289 (ADHD) |
| `bsc:MemoryEnhancement` | Memory | D008568 | `skos:exactMatch` | `skos:related` D008569 (Memory Disorders) |
| `bsc:WorkingMemoryEnhancement` | Memory, Short-Term | D057567 | `skos:exactMatch` | - |
| `bsc:LongTermMemoryEnhancement` | Memory Consolidation | D008570 | `skos:closeMatch` | - |
| `bsc:ExecutiveFunctionEnhancement` | Executive Function | D056344 | `skos:exactMatch` | - |
| `bsc:ProcessingSpeedEnhancement` | Reaction Time | D011930 | `skos:closeMatch` | `skos:related` D011599 (Psychomotor Performance) |
| `bsc:CognitiveFlexibilityEnhancement` | Executive Function | D056344 | `skos:closeMatch` | `skos:related` D003071 (Cognition) |

**Key Benefits**:
- Direct link to cognitive neuroscience literature
- Connection to ADHD and memory disorder research
- Enables meta-analysis of cognitive enhancement studies

#### Emotional Outcomes (5 classes, 9 MeSH links)

| NSO Class | Primary MeSH Term | MeSH ID | SKOS Relationship | Additional Links |
|-----------|-------------------|---------|-------------------|------------------|
| `bsc:EmotionalOutcome` (base class) | Emotions | D004644 | `rdfs:seeAlso` | - |
| `bsc:AnxietyReduction` | Anxiety | D001007 | `skos:exactMatch` | `skos:related` D013315 (Stress, Psychological)<br>+ D001008 (Anxiety Disorders) |
| `bsc:MoodEnhancement` | Affect | D000339 | `skos:exactMatch` | `skos:related` D019964 (Mood Disorders) |
| `bsc:DepressionReduction` | Depression | D003863 | `skos:exactMatch` | `skos:closeMatch` D003866 (Depressive Disorder) |
| `bsc:EmotionalRegulationImprovement` | Emotional Regulation | D000079885 | `skos:exactMatch` | `skos:related` D004644 (Emotions) |
| `bsc:RelaxationResponse` | Relaxation | D012064 | `skos:exactMatch` | `skos:related` D064866 (Mindfulness) |

**Key Benefits**:
- Links to clinical depression and anxiety research
- Connection to mindfulness and meditation literature
- Enables searches in psychiatric and psychological databases

#### Physiological Outcomes (10 classes, 17 MeSH links)

| NSO Class | Primary MeSH Term | MeSH ID | SKOS Relationship | Additional Links |
|-----------|-------------------|---------|-------------------|------------------|
| `bsc:PhysiologicalOutcome` (base class) | Physiology | D010827 | `rdfs:seeAlso` | - |
| `bsc:BrainwaveEntrainment` | Brain Waves | D001931 | `skos:exactMatch` | `skos:related` D004569 (EEG) |
| `bsc:AlphaEnhancement` | Alpha Rhythm | D000513 | `skos:exactMatch` | - |
| `bsc:ThetaEnhancement` | Theta Rhythm | D013826 | `skos:exactMatch` | - |
| `bsc:BetaEnhancement` | Beta Rhythm | D001611 | `skos:exactMatch` | - |
| `bsc:GammaEnhancement` | Gamma Rhythm | D065818 | `skos:exactMatch` | - |
| `bsc:DeltaEnhancement` | Delta Rhythm | D003712 | `skos:exactMatch` | - |
| `bsc:HeartRateVariabilityImprovement` | Heart Rate Variability | D059289 | `skos:exactMatch` | `skos:related` D001341 (Autonomic Nervous System) |
| `bsc:CortisolReduction` | Hydrocortisone (Cortisol) | D006854 | `skos:exactMatch` | `skos:related` D013312 (Stress, Physiological) |
| `bsc:BloodPressureReduction` | Blood Pressure | D001794 | `skos:exactMatch` | `skos:related` D006973 (Hypertension) |
| `bsc:RespiratoryRateReduction` | Respiratory Rate | D056152 | `skos:exactMatch` | `skos:related` D001945 (Breathing Exercises) |

**Key Benefits**:
- **Critical for clinical integration**: Direct links to EEG, HRV, and cardiovascular research
- Enables federated queries across neuroscience databases
- Connection to autonomic nervous system and stress research
- Links to hypertension and cardiovascular health literature

#### Behavioral Outcomes (5 classes, 6 MeSH links)

| NSO Class | Primary MeSH Term | MeSH ID | SKOS Relationship | Additional Links |
|-----------|-------------------|---------|-------------------|------------------|
| `bsc:BehavioralOutcome` (base class) | Behavior | D001519 | `rdfs:seeAlso` | - |
| `bsc:SleepQualityImprovement` | Sleep | D012890 | `skos:exactMatch` | `skos:related` D007319 (Sleep Disorders) |
| `bsc:SleepLatencyReduction` | Sleep Disorders | D007319 | `skos:closeMatch` | - |
| `bsc:SleepDurationIncrease` | Sleep | D012890 | `skos:related` | - |
| `bsc:PhysicalActivityIncrease` | Exercise | D015444 | `skos:exactMatch` | `skos:related` D009043 (Motor Activity) |
| `bsc:PainReduction` | Pain | D010146 | `rdfs:seeAlso` | - |

**Key Benefits**:
- Links to sleep medicine and insomnia research
- Connection to exercise science and physical therapy literature
- Enables pain management research queries

---

## Coverage Statistics by Module

| Module | Total Classes | Classes with MeSH Links | Coverage % | Total MeSH URIs |
|--------|---------------|-------------------------|------------|-----------------|
| **Core** | 7 | 0 | 0% | 0 |
| **Audio** | 6 | 1 | 16.7% | 1 |
| **Visual** | 7 | 6 | 85.7% | 6 |
| **Mixed** | 9 | 7 | 77.8% | 13 |
| **Outcomes** | 30+ | 27 | 90.0% | 35+ |
| **TOTAL** | **59+** | **41** | **69.5%** | **55+** |

---

## Practical Applications

### 1. PubMed Literature Search

**Example**: Find research on binaural beats and anxiety reduction

```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?technique ?meshTerm WHERE {
  ?technique a bsc:BinauralBeat ;
             rdfs:seeAlso ?meshTerm .

  ?outcome a bsc:AnxietyReduction ;
           skos:exactMatch ?anxietyMeSH .

  FILTER (CONTAINS(STR(?meshTerm), "MESH"))
}
```

**Result**: Returns MeSH IDs that can be used in PubMed Advanced Search:
- `(MESH:D013016[MeSH Terms]) AND (MESH:D001007[MeSH Terms])`

### 2. Federated SPARQL Query

Query NSO alongside external ontologies (requires SPARQL endpoint):

```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?technique ?meshLabel ?pubmedCount WHERE {
  # Query NSO
  ?technique a bsc:Technique ;
             skos:exactMatch ?meshURI .

  # Federated query to BioPortal
  SERVICE <http://sparql.bioontology.org/sparql> {
    ?meshURI rdfs:label ?meshLabel ;
             <hasPubMedCount> ?pubmedCount .
  }
}
ORDER BY DESC(?pubmedCount)
```

### 3. Clinical Decision Support

Link NSO outcomes to clinical guidelines:

```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?outcome ?guideline WHERE {
  ?outcome rdfs:subClassOf bsc:PhysiologicalOutcome ;
           skos:exactMatch ?meshURI .

  # Link to clinical guidelines database
  ?guideline <relatedToMeSH> ?meshURI ;
             <guidelineType> "treatment" .
}
```

### 4. Automatic Evidence Discovery

Find new research automatically:

```javascript
// JavaScript example using NSO + PubMed API
const meshID = "D001931"; // Brain Waves
const pubmedURL = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${meshID}[MeSH]&retmode=json&sort=date&retmax=10`;

fetch(pubmedURL)
  .then(res => res.json())
  .then(data => {
    console.log(`Found ${data.esearchresult.count} recent studies on brainwave entrainment`);
  });
```

---

## Future Enhancements (v1.1+)

### Gene Ontology (GO) Integration

**Target**: 15+ links

| NSO Class | GO Term (Planned) | GO ID | Purpose |
|-----------|-------------------|-------|---------|
| `bsc:BrainwaveEntrainment` | neural oscillation | GO:0060453 | Biological process |
| `bsc:CortisolReduction` | glucocorticoid secretion | GO:0035934 | Hormone regulation |
| `bsc:HeartRateVariabilityImprovement` | autonomic nervous system | GO:0003008 | System regulation |

**Benefits**:
- Link to molecular biology databases
- Enable systems biology analysis
- Connection to neurophysiology research

### SNOMED CT Integration

**Target**: 20+ links

| NSO Class | SNOMED CT Term (Planned) | SNOMED ID | Purpose |
|-----------|--------------------------|-----------|---------|
| `bsc:AudiovisualEntrainment` | Phototherapy | 410192002 | Clinical procedure |
| `bsc:VibroacousticTherapy` | Vibrational therapy | 277956007 | Treatment modality |
| `bsc:ImmersiveVRNeurostimulation` | Virtual reality therapy | 448865001 | Procedure |

**Benefits**:
- Integration with electronic health records (EHR)
- Clinical coding and billing
- Connection to healthcare IT systems

### CogPO (Cognitive Paradigm Ontology)

**Target**: 10+ links for cognitive outcomes

**Benefits**:
- Link to cognitive neuroscience experiments
- Standardize cognitive task descriptions
- Enable meta-analysis of cognitive studies

---

## Technical Implementation

### RDF Format Example

```turtle
bsc:AnxietyReduction a owl:Class ;
  rdfs:subClassOf bsc:EmotionalOutcome ;
  rdfs:label "Anxiety Reduction" ;

  # Exact equivalence (high confidence)
  skos:exactMatch <http://purl.bioontology.org/ontology/MESH/D001007> ;  # MeSH: Anxiety

  # Related concepts (broader association)
  skos:related <http://purl.bioontology.org/ontology/MESH/D013315> ,  # MeSH: Stress, Psychological
               <http://purl.bioontology.org/ontology/MESH/D001008> .  # MeSH: Anxiety Disorders
```

### NSO Navigator Integration

The NSO Navigator automatically detects MeSH links and creates clickable badges:

```javascript
// In nso-navigator.js
if (uri.includes("purl.bioontology.org/ontology/MESH")) {
  const meshID = uri.split("/").pop();
  const externalURL = `https://bioportal.bioontology.org/ontologies/MESH?p=classes&conceptid=${encodeURIComponent(uri)}`;

  // Create link with 🏥 MeSH badge
  const link = createExternalOntologyLink(uri, "MeSH", "🏥");
}
```

### API Integration

```python
# Python example: Query NSO + MeSH
from rdflib import Graph, Namespace
import requests

# Load NSO
g = Graph()
g.parse("https://biosyncarelab.github.io/ont/releases/1.0.0", format="turtle")

# Find MeSH links
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")
BSC = Namespace("https://biosyncarelab.github.io/ont#")

for s, p, o in g.triples((None, SKOS.exactMatch, None)):
    if "MESH" in str(o):
        mesh_id = str(o).split("/")[-1]
        print(f"NSO class: {s}")
        print(f"MeSH ID: {mesh_id}")

        # Query BioPortal API for MeSH details
        api_url = f"https://data.bioontology.org/ontologies/MESH/classes/{mesh_id}"
        # ... (requires API key)
```

---

## Quality Assurance

### Link Validation Process

1. **Conceptual Accuracy**: Each link reviewed by domain expert
2. **URI Validation**: All URIs tested against BioPortal API
3. **SKOS Semantics**: Relationship types verified (exactMatch vs closeMatch)
4. **Literature Search**: PubMed queries tested for each MeSH link

### Known Limitations

1. **MeSH Updates**: MeSH is updated annually; links may need revision
2. **Polysemy**: Some MeSH terms have multiple meanings (context-dependent)
3. **Coverage Gaps**: Audio techniques have limited MeSH coverage (16.7%)

### Maintenance Schedule

- **Quarterly**: Check for broken URIs
- **Annually**: Review MeSH updates and revise links
- **On-demand**: Add new links as NSO evolves

---

## References

### External Resources

- **MeSH Browser**: https://meshb.nlm.nih.gov/
- **BioPortal**: https://bioportal.bioontology.org/
- **PubMed Advanced Search**: https://pubmed.ncbi.nlm.nih.gov/advanced/
- **SKOS Specification**: https://www.w3.org/2004/02/skos/

### Related NSO Documentation

- `NSO-Integration-Roadmap.md` - Development phases for external links
- `Ontology-Linking-Strategy.md` - Why and how we link ontologies
- `ONTOLOGY-CHANGELOG.md` - Version history of link additions

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintainer**: BioSynCare Lab
**License**: CC BY 4.0

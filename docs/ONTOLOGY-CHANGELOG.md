# NSO Ontology Changelog

**BioSynCare Neurosensory Stimulation Ontology (NSO)**
**Project**: BioSynCare Lab
**Namespace**: `https://biosyncarelab.github.io/ont#`
**License**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## Versioning Scheme

NSO follows **Semantic Versioning 2.0.0** ([semver.org](https://semver.org/)):

- **MAJOR.MINOR.PATCH** (e.g., `1.2.3`)
- **MAJOR**: Incompatible changes (breaking changes to class hierarchies, property domains/ranges)
- **MINOR**: Backwards-compatible additions (new classes, properties, or modules)
- **PATCH**: Backwards-compatible fixes (typo corrections, clarifications, metadata updates)

### Version URIs

Each versioned release has a unique URI:
```turtle
<https://biosyncarelab.github.io/ont/1.0.0>  # Core ontology v1.0.0
<https://biosyncarelab.github.io/ont/modules/audio/1.0.0>  # Audio module v1.0.0
```

### Current Version

**Latest Stable Release**: `1.0.0` (2025-11-18)
**Status**: CURRENT (authoritative)

---

## Version 1.0.0 — First Stable Release

**Release Date**: 2025-11-18
**Status**: CURRENT (authoritative)

### Overview

Version 1.0.0 establishes NSO as the **authoritative source of truth** for BioSynCare Lab semantic data, superseding the following legacy ontologies:

- **SSO (Sensory Stimulation Ontology)** - `https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl`
- **ONC (Old NSO Core)** - `https://biosyncare.github.io/ont#`

This release consolidates fragmented ontology modules into a unified, versioned, and well-documented semantic framework.

### What's New

#### 1. Semantic Versioning

All ontology modules now include comprehensive version metadata:

- `owl:versionIRI` - Canonical version URI
- `owl:versionInfo` - Human-readable version string
- `dct:issued` - Publication date
- `dct:modified` - Last modification date
- `dct:hasVersion` - Explicit version declaration
- `rdfs:comment` - Version notes and status

**Example**:
```turtle
<https://biosyncarelab.github.io/ont/1.0.0> a owl:Ontology ;
  owl:versionIRI <https://biosyncarelab.github.io/ont/1.0.0> ;
  owl:versionInfo "1.0.0" ;
  dct:issued "2025-11-18"^^xsd:date ;
  rdfs:comment "Version 1.0.0: First stable release. Status: CURRENT (authoritative)." .
```

#### 2. Modular Architecture

NSO is organized into **5 core modules**:

| Module | URI | Classes | Description |
|--------|-----|---------|-------------|
| **Core** | `ont/1.0.0` | 7 | Base classes and properties (Project, Protocol, Technique, Session, Outcome, Report) |
| **Audio** | `ont/modules/audio/1.0.0` | 6 | Audio techniques (binaural beats, isochronic tones, solfeggio) |
| **Visual** | `ont/modules/visual/1.0.0` | 7 | Visual techniques (flicker, ganzfeld, color therapy) |
| **Mixed** | `ont/modules/mixed/1.0.0` | 9 | Multimodal techniques (AVE, mind machines, VR) |
| **Outcomes** | `ont/modules/outcomes/1.0.0` | 30+ | Outcome taxonomy (cognitive, emotional, physiological, behavioral) |

**Total**: 59+ classes, 15+ properties

#### 3. Evidence Metadata Framework

All technique classes now include structured evidence ratings:

- `bsc:evidenceLevel` (0-5 scale): Quantitative evidence strength
- `bsc:evidenceCurator`: Who assessed the evidence
- `bsc:evidenceCorpus`: Literature reviewed
- `bsc:evidenceReasoning`: Rationale for rating
- `bsc:contraindications`: Safety warnings (with `SERIOUS:` prefix for life-threatening risks)

**Example**:
```turtle
bsc:BinauralBeat
  bsc:evidenceLevel 2.5 ;  # moderate
  bsc:evidenceCurator "Claude Sonnet 4.5 (2025-11-17)" ;
  bsc:evidenceCorpus "PubMed search: 'binaural beats' (2020-2024), 14 systematic reviews" ;
  bsc:evidenceReasoning "Moderate evidence from controlled studies showing modest effects" ;
  bsc:contraindications "SERIOUS: Photosensitive epilepsy if combined with visual flicker." .
```

#### 4. External Ontology Links

NSO now links to authoritative external ontologies for semantic interoperability:

- **MeSH (Medical Subject Headings)**: Medical/clinical terminology
- **Gene Ontology (GO)**: Biological processes
- **SNOMED CT**: Clinical procedures
- **Dublin Core**: Metadata standards

**Example**:
```turtle
bsc:BinauralBeat rdfs:seeAlso <http://purl.bioontology.org/ontology/MESH/D013016> .  # MeSH: Sound
bsc:CognitiveOutcome rdfs:seeAlso <http://purl.bioontology.org/ontology/MESH/D003071> .  # MeSH: Cognition
```

**Benefits**:
- Link to 30M+ PubMed articles via MeSH
- Enable federated SPARQL queries across databases
- Support automatic reasoning and knowledge discovery

#### 5. Deprecation Management

Legacy SSO/ONC classes are properly deprecated with replacement mappings:

```turtle
sso:BinauralBeats owl:deprecated true ;
  dct:isReplacedBy bsc:BinauralBeat ;
  rdfs:comment "Deprecated: Use singular bsc:BinauralBeat instead." .
```

NSO Navigator automatically merges deprecated entities into their replacements and redirects URLs.

#### 6. Enhanced Documentation

New comprehensive documentation:

- **NSO-Integration-Roadmap.md**: 6-phase development plan
- **Ontology-Linking-Strategy.md**: External ontology integration guide
- **ONTOLOGY-CHANGELOG.md**: This file - version history and release notes

---

### Module Details

#### Core Module (`ont/1.0.0`)

**Classes**:
- `bsc:Project` - Research project or initiative
- `bsc:Protocol` - Standardized procedure
- `bsc:Technique` - Neurosensory stimulation method
- `bsc:Session` - Individual stimulation session
- `bsc:Outcome` - Measurable result
- `bsc:Report` - Documentation artifact
- `bsc:ParticipantGroup` - Study cohort

**Properties**:
- Object properties: `usesTechnique`, `appliesTechnique`, `hasOutcome`, `partOfProject`, `documents`, `occurredDuring`
- Datatype properties: `participantCount`, `durationMinutes`, `minLatencyDays`, `maxLatencyDays`, `notes`
- Evidence properties: `evidenceLevel`, `evidenceCurator`, `evidenceCorpus`, `evidenceReasoning`, `contraindications`, `invasiveness`, `usageCount`

**Status**: CURRENT (authoritative)
**Supersedes**: `https://biosyncare.github.io/ont#` (ONC)

#### Audio Module (`ont/modules/audio/1.0.0`)

**Techniques** (6 classes):
- `bsc:AudioTechnique` (base class)
- `bsc:BinauralBeat` - Evidence level 2.5 (moderate)
- `bsc:MonauralBeat` - Evidence level 2.0
- `bsc:IsochronicTone` - Evidence level 1.8
- `bsc:SolfeggioFrequency` - Evidence level 0.5 (anecdotal)
- `bsc:HemiSync` - Evidence level 2.2 (proprietary binaural system)

**MeSH Links**: 1 (Sound)
**Status**: CURRENT (authoritative)
**Supersedes**: SSO `AudioTechniques` (plural)

#### Visual Module (`ont/modules/visual/1.0.0`)

**Techniques** (7 classes):
- `bsc:VisualTechnique` (base class)
- `bsc:FlickerStimulation` - Evidence level 3.2 (high-moderate)
- `bsc:VisualEntrainment` - Evidence level 2.8
- `bsc:ColorTherapy` - Evidence level 1.2 (low)
- `bsc:StroboscopicStimulation` - Evidence level 3.8 (high)
- `bsc:SoftLightPulsing` - Evidence level 1.5
- `bsc:GanzfeldStimulation` - Evidence level 2.0

**Safety**: SERIOUS photosensitive epilepsy warnings on all flicker-based techniques
**Status**: CURRENT (authoritative)
**Supersedes**: SSO `VisualTechniques` (plural)

#### Mixed Module (`ont/modules/mixed/1.0.0`)

**Techniques** (9 classes):
- `bsc:AudiovisualTechnique` (base class)
- `bsc:MultimodalTechnique` (base class)
- `bsc:AudiovisualEntrainment` - Evidence level 3.5 (high)
- `bsc:MindMachine` - Evidence level 3.2 (commercial AVE devices)
- `bsc:MartigliBreathingCue` - Evidence level 2.3 (breathing guidance)
- `bsc:SynestheticStimulation` - Evidence level 1.5 (VR applications)
- `bsc:VibroacousticTherapy` - Evidence level 2.8 (minimally-invasive)
- `bsc:HapticEntrainment` - Evidence level 1.8 (tactile stimulation)
- `bsc:ImmersiveVRNeurostimulation` - Evidence level 2.2 (emerging)

**MeSH Links**: 2 (Audiovisual Aids, Breathing Exercises)
**Status**: CURRENT (authoritative)

#### Outcomes Module (`ont/modules/outcomes/1.0.0`)

**Top-Level Domains** (4 classes):
- `bsc:CognitiveOutcome` - Mental processes (attention, memory, executive function)
- `bsc:EmotionalOutcome` - Affective states (anxiety, mood, regulation)
- `bsc:PhysiologicalOutcome` - Biological measures (HRV, brainwaves, cortisol)
- `bsc:BehavioralOutcome` - Observable actions (sleep, activity, pain)

**Specific Outcomes** (30+ classes):

*Cognitive*: AttentionEnhancement, MemoryEnhancement, WorkingMemoryEnhancement, LongTermMemoryEnhancement, ExecutiveFunctionEnhancement, ProcessingSpeedEnhancement, CognitiveFlexibilityEnhancement

*Emotional*: AnxietyReduction, MoodEnhancement, DepressionReduction, EmotionalRegulationImprovement, RelaxationResponse

*Physiological*: BrainwaveEntrainment, AlphaEnhancement, ThetaEnhancement, BetaEnhancement, GammaEnhancement, DeltaEnhancement, HeartRateVariabilityImprovement, CortisolReduction, BloodPressureReduction, RespiratoryRateReduction

*Behavioral*: SleepQualityImprovement, SleepLatencyReduction, SleepDurationIncrease, PhysicalActivityIncrease, PainReduction

**Measurement Properties**:
- `measurementType` - subjective/objective/mixed
- `measurementTool` - specific assessment (STAI, EEG, PSQI, etc.)
- `validatedScale` - psychometric validation
- `typicalLatency` - time to observable effect

**MeSH Links**: 5 (Cognition, Emotions, Physiology, Behavior, Pain)
**Status**: CURRENT (authoritative)

---

### File Inventory

All files in NSO v1.0.0 release:

```
rdf/
├── core/
│   └── bsc-owl.ttl                    # Core ontology v1.0.0
├── modules/
│   ├── audio.ttl                      # Audio techniques v1.0.0
│   ├── visual.ttl                     # Visual techniques v1.0.0
│   ├── mixed.ttl                      # Mixed-modality techniques v1.0.0
│   └── outcomes.ttl                   # Outcomes taxonomy v1.0.0
└── releases/
    └── nso-consolidated-v1.0.ttl      # Consolidated release (all modules merged)

docs/
├── ONTOLOGY-CHANGELOG.md              # This file
├── NSO-Integration-Roadmap.md         # Development roadmap
└── Ontology-Linking-Strategy.md       # External ontology linking guide
```

---

### Breaking Changes from Legacy Ontologies

#### SSO → NSO Migration

| SSO (Deprecated) | NSO v1.0.0 | Change Type |
|------------------|------------|-------------|
| `sso:AudioTechniques` (plural) | `bsc:AudioTechnique` (singular) | Naming convention |
| `sso:BinauralBeats` | `bsc:BinauralBeat` | Naming convention |
| `sso:MonauralBeats` | `bsc:MonauralBeat` | Naming convention |
| `sso:IsochronicTones` | `bsc:IsochronicTone` | Naming convention |
| `sso:VisualTechniques` | `bsc:VisualTechnique` | Naming convention |

**Rationale**: Singular class names follow OWL best practices. Each instance represents one technique, not multiple techniques.

#### ONC → NSO Migration

| ONC (Deprecated) | NSO v1.0.0 | Change Type |
|------------------|------------|-------------|
| `https://biosyncare.github.io/ont#` | `https://biosyncarelab.github.io/ont#` | Namespace change |
| No version URIs | Versioned URIs (`/ont/1.0.0`) | Versioning added |
| No evidence metadata | Full evidence framework | Metadata added |
| No external links | MeSH/GO/SNOMED links | Interoperability added |

**Rationale**: New namespace reflects project evolution to "BioSynCare Lab". Versioning enables change tracking and API stability.

#### Backward Compatibility

NSO v1.0.0 includes **deprecation mappings** for all legacy classes:

```turtle
sso:BinauralBeats owl:deprecated true ;
  dct:isReplacedBy bsc:BinauralBeat .
```

**Migration Path**:
1. Update SPARQL queries to use `bsc:` prefix
2. Replace plural class names with singular
3. Update namespace URIs to `https://biosyncarelab.github.io/ont#`
4. Consult Migration Guide (see `docs/Migration-Guide.md`)

---

### Statistics

**NSO v1.0.0 by the numbers**:

- **5** ontology modules
- **59+** OWL classes
- **15+** properties (object + datatype)
- **22** technique classes with evidence ratings
- **30+** outcome classes
- **8** MeSH external links
- **100%** CC BY 4.0 licensed
- **0** proprietary dependencies

**Documentation**:
- **3** comprehensive guides (Roadmap, Linking Strategy, Changelog)
- **500+** lines of inline comments in RDF files
- **100%** classes have `rdfs:comment` descriptions

**Evidence Coverage**:
- **22** technique classes with `evidenceLevel` ratings
- **22** techniques with safety `contraindications`
- **6** techniques with `SERIOUS:` contraindications (seizure risk)
- **22** techniques with `evidenceCorpus` citations

---

## Future Versions (Planned)

### Version 1.1.0 — Enhanced External Links (Q1 2026)

**Planned Additions**:
- Complete MeSH linking for all visual techniques (7/7)
- Add Gene Ontology (GO) links for biological processes
- Add SNOMED CT links for clinical procedures
- Add CogPO (Cognitive Paradigm Ontology) links for outcomes

**Expected**: 20+ new external ontology links

### Version 1.2.0 — Community Contributions (Q2 2026)

**Planned Additions**:
- User-submitted technique definitions
- Community evidence annotations
- Usage statistics from Firestore telemetry (`bsc:usageCount`)
- Expert validation metadata

### Version 2.0.0 — SPARQL Endpoint (Q3 2026)

**Breaking Changes**:
- Federated SPARQL query interface
- Automatic reasoning with OWL-DL reasoner
- Integration with PubMed literature database
- Clinical trials finder

**Why MAJOR**: May restructure property hierarchies for reasoning optimization

---

## Version Citation

### How to Cite NSO v1.0.0

**BibTeX**:
```bibtex
@misc{nso2025,
  author = {{BioSynCare Lab}},
  title = {Neurosensory Stimulation Ontology (NSO)},
  version = {1.0.0},
  year = {2025},
  month = {November},
  url = {https://biosyncarelab.github.io/ont/1.0.0},
  license = {CC BY 4.0}
}
```

**APA**:
> BioSynCare Lab. (2025). *Neurosensory Stimulation Ontology (NSO)* (Version 1.0.0) [Ontology]. https://biosyncarelab.github.io/ont/1.0.0

**Permanent URI**:
```
https://biosyncarelab.github.io/ont/1.0.0
```

---

## Version Comparison Table

| Version | Release Date | Status | Classes | Properties | External Links | Breaking Changes |
|---------|--------------|--------|---------|------------|----------------|------------------|
| **1.0.0** | 2025-11-18 | **CURRENT** | 59+ | 15+ | 8 (MeSH) | Initial release |
| 0.x (SSO/ONC) | 2024-2025 | DEPRECATED | ~40 | ~10 | 0 | N/A |

---

## Governance

### Change Request Process

1. **Propose Change**: Open GitHub issue with `ontology` label
2. **Community Review**: 7-day comment period
3. **Technical Review**: Ontology curator approval
4. **Implementation**: PR with version bump
5. **Release**: Update changelog, publish versioned URI

### Version Bump Guidelines

- **PATCH** (1.0.X): Typo fixes, clarifications, metadata updates
- **MINOR** (1.X.0): New classes, properties, modules (backwards-compatible)
- **MAJOR** (X.0.0): Breaking changes to class hierarchies, property domains/ranges

### Contributors

- **BioSynCare Lab** - Ontology design and curation
- **Claude Sonnet 4.5** (AI Assistant) - Evidence curation, documentation, technical implementation

---

## Resources

- **NSO Navigator**: Interactive ontology browser ([nso-navigator.html](../scripts/nso-navigator.html))
- **Source Repository**: GitHub (TBD - add when public)
- **License**: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Contact**: BioSynCare Lab (contact info TBD)
- **Issues**: GitHub Issues (TBD)
- **SPARQL Endpoint**: Planned for v2.0.0

---

**Last Updated**: 2025-11-18
**Changelog Version**: 1.0.0
**Maintainer**: BioSynCare Lab

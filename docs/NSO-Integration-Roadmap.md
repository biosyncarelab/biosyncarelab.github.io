# NSO Integration Roadmap
## Enriching User Interfaces with Semantic Integration

**Date**: 2025-11-18
**Status**: Active Planning
**Version**: 1.0.0

---

## Vision

Transform BSCLab into a semantically-aware platform that seamlessly integrates internal ontologies with external knowledge bases, providing users with:
- Evidence-based recommendations backed by linked research
- Intelligent session suggestions using semantic reasoning
- Cross-referenced clinical validation
- Automated literature discovery

---

## Phase 1: Foundation Enhancement (Weeks 3-4)

### 1.1 Ontology Consolidation ✓ IN PROGRESS

**Goal**: Establish NSO as the single source of truth, deprecating SSO and ONC ontologies.

**Tasks**:
- [x] Create modular BSC ontology structure (core, audio, visual, mixed, outcomes)
- [x] Implement deprecation mapping system
- [x] Merge concept/class data in inspector
- [ ] **Version all RDF modules with semantic versioning**
- [ ] **Add version metadata to all files (dct:hasVersion, owl:versionInfo)**
- [ ] **Create CHANGELOG.md for ontology evolution**
- [ ] **Mark SSO/ONC as deprecated with migration guide**
- [ ] **Publish v1.0.0 consolidated release**

**Deliverables**:
- `rdf/releases/nso-v1.0.0.ttl` - Single consolidated file
- `docs/Migration-Guide.md` - SSO/ONC → NSO transition
- `ONTOLOGY-CHANGELOG.md` - Version history

### 1.2 External Ontology Linking

**Goal**: Link all BSC techniques and outcomes to authoritative external ontologies.

**Tasks**:
- [x] MeSH links for audio techniques (6/6)
- [ ] MeSH links for visual techniques (0/7)
- [ ] MeSH links for mixed techniques (0/9)
- [ ] MeSH links for outcomes (0/30)
- [ ] Gene Ontology links for biological processes
- [ ] SNOMED CT links for clinical procedures
- [ ] CogPO links for measurement tools

**Target**: 80% of classes linked to ≥1 external ontology

**Deliverables**:
- Updated RDF modules with comprehensive external links
- `docs/External-Mappings-Index.md` - Registry of all external links

---

## Phase 2: NSO Navigator Enhancements (Weeks 5-6)

### 2.1 Evidence Explorer Panel

**Goal**: Show research evidence directly in the navigator.

**UI Features**:
```
┌─────────────────────────────────────┐
│ 🧬 Evidence Explorer                │
├─────────────────────────────────────┤
│ 📚 Literature (via MeSH)            │
│   • 142 PubMed articles             │
│   • 8 Systematic reviews            │
│   • 3 Meta-analyses                 │
│   [View in PubMed →]                │
│                                     │
│ 🔬 Clinical Trials                  │
│   • 5 Active trials                 │
│   • 12 Completed trials             │
│   [Search ClinicalTrials.gov →]     │
│                                     │
│ ⚕️ Clinical Guidelines              │
│   • NICE Guidance (UK)              │
│   • APA Practice Guidelines         │
│   [View Sources →]                  │
└─────────────────────────────────────┘
```

**Implementation**:
- Fetch PubMed article counts via NCBI E-utilities API
- Link to ClinicalTrials.gov via MeSH terms
- Display evidence strength indicators

**Tasks**:
- [ ] Create Evidence Explorer component
- [ ] Integrate NCBI E-utilities API
- [ ] Add PubMed article count widgets
- [ ] Implement ClinicalTrials.gov search
- [ ] Create evidence strength badges (1-5 scale)

### 2.2 Smart Ontology Browser

**Goal**: Enhanced graph navigation with semantic filtering.

**Features**:
- **Semantic Filters**:
  - Filter by evidence level (0-5)
  - Filter by safety (contraindications)
  - Filter by modality (audio/visual/mixed)
  - Filter by outcome type

- **Relationship Explorer**:
  - "Find all techniques for anxiety reduction"
  - "Show evidence for binaural beats"
  - "What outcomes does this technique support?"

- **Graph Overlays**:
  - Evidence strength (node size)
  - Safety warnings (node color)
  - External links (node badges)

**Tasks**:
- [ ] Add semantic filter controls
- [ ] Implement SPARQL-like queries on client
- [ ] Create relationship path finder
- [ ] Add evidence visualization layer
- [ ] Implement safety indicator overlays

### 2.3 External Link Integration

**Goal**: Seamless navigation between NSO and external ontologies.

**Features**:
- **Smart Link Previews**:
  - Hover over external link → Preview card appears
  - Shows: Definition, synonyms, related terms
  - Powered by BioPortal API

- **Bidirectional Navigation**:
  - Navigate from NSO → MeSH → PubMed → back to NSO
  - Breadcrumb trail showing navigation path
  - "Related NSO Concepts" panel on external sites (browser extension)

**Tasks**:
- [ ] Implement link preview cards
- [ ] Integrate BioPortal REST API
- [ ] Create navigation breadcrumb component
- [ ] Build Chrome/Firefox extension for bidirectional links
- [ ] Add "Jump to NSO" buttons in external ontologies

---

## Phase 3: BSCLab App Integration (Weeks 7-9)

### 3.1 Semantic Session Builder

**Goal**: Use ontology reasoning to suggest session configurations.

**User Flow**:
```
1. User selects goal: "Reduce Anxiety"
   ↓
2. System queries NSO:
   "Find techniques with outcome=AnxietyReduction"
   ↓
3. Results ranked by:
   - Evidence level (3.5/5 for AVE)
   - Safety (no contraindications for user profile)
   - User history (previous preferences)
   ↓
4. Suggestions:
   ✓ Audiovisual Entrainment (10Hz alpha)
   ✓ Binaural Beats (4Hz theta)
   ✓ Breathing Cue (6 breaths/min)
```

**Implementation**:
- Query NSO ontology directly from app
- Use `bsc:hasOutcome` relationships
- Filter by `bsc:evidenceLevel`
- Check `bsc:contraindications` against user profile

**Tasks**:
- [ ] Create SPARQL endpoint for NSO
- [ ] Build semantic query engine in app
- [ ] Implement reasoning rules (if X hasOutcome Y, recommend X)
- [ ] Add evidence-based ranking algorithm
- [ ] Create safety profile matcher

### 3.2 Evidence-Based Explanations

**Goal**: Show users *why* a technique is recommended.

**UI Component**:
```
┌─────────────────────────────────────────┐
│ Why Binaural Beats?                     │
├─────────────────────────────────────────┤
│ Evidence Level: ⭐⭐⭐ (2.5/5)           │
│                                         │
│ 📊 Research Support:                    │
│ • 14 systematic reviews                │
│ • Evidence: Modest anxiety reduction   │
│ • Typical effect: 10-15% improvement   │
│                                         │
│ 🏥 Clinical Context:                    │
│ • MeSH: Acoustic Stimulation           │
│ • Used in: Meditation, stress mgmt     │
│                                         │
│ ⚠️ Safety:                              │
│ • Non-invasive                          │
│ • Contraindications: Severe tinnitus   │
│                                         │
│ [View Full Evidence →]                  │
└─────────────────────────────────────────┘
```

**Tasks**:
- [ ] Create evidence explanation component
- [ ] Pull data from `bsc:evidenceLevel`, `bsc:evidenceReasoning`
- [ ] Format contraindications as user-friendly warnings
- [ ] Add "Learn More" links to PubMed/MeSH

### 3.3 Outcome Tracking & Validation

**Goal**: Track user outcomes and validate against ontology predictions.

**Features**:
- Map user's self-reported outcomes to NSO outcome classes
- Compare predicted vs. actual outcomes
- Update evidence ratings based on user data (crowdsourced validation)

**Example**:
```
Session: Binaural Beats (10Hz alpha)
Predicted: AnxietyReduction (70% probability)
User Reports: ✓ Anxiety -25% (STAI score)
              ✓ Relaxation increased
              ✗ No memory improvement

→ Update bsc:BinauralBeat evidence profile
→ Strengthen AnxietyReduction link
→ Add community validation note
```

**Tasks**:
- [ ] Create outcome mapping system
- [ ] Implement prediction vs. actual comparison
- [ ] Build community evidence aggregation
- [ ] Add "Community Validation" section to ontology
- [ ] Create outcome analytics dashboard

---

## Phase 4: Advanced Semantic Features (Weeks 10-12)

### 4.1 Federated SPARQL Queries

**Goal**: Query across NSO + MeSH + GO + SNOMED simultaneously.

**Example Query**:
```sparql
# Find neurostimulation techniques that affect memory
# with genetic evidence from Gene Ontology

SELECT ?technique ?outcome ?gene WHERE {
  # NSO local data
  ?technique bsc:hasOutcome ?outcome .
  ?outcome rdfs:subClassOf bsc:MemoryEnhancement .

  # Link to GO via equivalence
  ?outcome owl:equivalentClass ?goTerm .

  # Federated query to GO endpoint
  SERVICE <http://sparql.geneontology.org/sparql> {
    ?goTerm rdfs:subClassOf* obo:GO_0007613 .  # Memory
    ?gene obo:participatesIn ?goTerm .
  }
}
```

**Tasks**:
- [ ] Set up SPARQL endpoint for NSO
- [ ] Configure federated query support
- [ ] Create pre-built query templates
- [ ] Build query builder UI
- [ ] Add query result export (CSV, JSON-LD)

### 4.2 Semantic Reasoner Integration

**Goal**: Infer new knowledge using OWL reasoning.

**Example Inference**:
```turtle
# Explicit data:
bsc:BinauralBeat bsc:hasOutcome bsc:AnxietyReduction .
bsc:AnxietyReduction rdfs:subClassOf bsc:EmotionalOutcome .

# Reasoner infers:
bsc:BinauralBeat bsc:hasOutcome bsc:EmotionalOutcome .

# Also infers via equivalence:
bsc:AnxietyReduction owl:equivalentClass mesh:D001007 .
→ bsc:BinauralBeat bsc:reducesSymptom mesh:D001007 .
```

**Implementation**:
- Use RDFLib + OWL-RL reasoner (Python backend)
- Or use Jena Fuseki with OWL reasoning
- Cache inferred triples for performance

**Tasks**:
- [ ] Deploy SPARQL server with reasoning (Jena/Fuseki)
- [ ] Configure OWL-DL reasoning rules
- [ ] Create materialized view of inferred triples
- [ ] Add reasoning toggle in UI ("Show Inferred")
- [ ] Build inference explanation feature

### 4.3 Literature Auto-Discovery

**Goal**: Automatically find new research relevant to NSO techniques.

**Workflow**:
```
1. Weekly cron job:
   - For each bsc:Technique with MeSH link
   - Query PubMed for new articles (last 7 days)
   - Filter by: randomized trial, meta-analysis, systematic review

2. NLP Processing:
   - Extract outcomes mentioned
   - Match to bsc:Outcome classes
   - Detect evidence level indicators

3. Update Ontology:
   - Add dct:source links to new papers
   - Suggest evidence level updates
   - Flag for human review

4. Notify Users:
   - "New Evidence: 3 studies on Binaural Beats"
   - Show in Evidence Explorer
```

**Tasks**:
- [ ] Build PubMed polling service
- [ ] Integrate NLP for outcome extraction
- [ ] Create evidence update pipeline
- [ ] Add human review interface
- [ ] Implement notification system

---

## Phase 5: Community & Collaboration (Weeks 13-16)

### 5.1 Ontology Contribution Workflow

**Goal**: Allow community to propose ontology enhancements.

**Features**:
- **Web-based Ontology Editor**:
  - Add new techniques
  - Propose evidence updates
  - Submit external links
  - All via GitHub PRs automatically

- **Validation Pipeline**:
  - Automated RDF syntax validation
  - Evidence source checking
  - Expert review queue
  - Version bump automation

**Tasks**:
- [ ] Build web-based RDF editor (Protégé Web-like)
- [ ] Integrate GitHub API for PR creation
- [ ] Add automated validation (RDFLib, SHACL)
- [ ] Create expert review dashboard
- [ ] Implement auto-merge for trusted contributors

### 5.2 Expert Validation System

**Goal**: Enable specialists to review and validate evidence ratings.

**Workflow**:
```
1. Specialist logs in (ORCID authentication)
2. System shows techniques needing validation
3. Specialist reviews:
   - Current evidence level (AI-rated)
   - Source corpus
   - Reasoning
4. Specialist provides:
   - Updated evidence level
   - Additional sources
   - Expert commentary
5. System updates:
   bsc:evidenceCurator "Dr. Jane Smith (ORCID: 0000-0002-1234-5678)"
   bsc:validatedDate "2025-11-18"
```

**Tasks**:
- [ ] Implement ORCID authentication
- [ ] Create expert review interface
- [ ] Add validation metadata schema
- [ ] Build expert credibility scoring
- [ ] Generate validation reports

### 5.3 Multilingual Support

**Goal**: Support international users with translated ontologies.

**Implementation**:
```turtle
bsc:BinauralBeat
  rdfs:label "Binaural Beat"@en ;
  rdfs:label "Battement Binaural"@fr ;
  rdfs:label "Pulso Binaural"@es ;
  rdfs:label "Binauraler Beat"@de ;
  rdfs:comment "Auditory illusion..."@en ;
  rdfs:comment "Illusion auditive..."@fr .
```

**Tasks**:
- [ ] Add @language tags to all labels/comments
- [ ] Integrate translation API (DeepL)
- [ ] Create translation review interface
- [ ] Add language selector in UI
- [ ] Link to multilingual external ontologies

---

## Phase 6: Versioning & Governance (Ongoing)

### 6.1 Semantic Versioning for Ontology

**Versioning Scheme**:
- **Major (X.0.0)**: Breaking changes (class deletions, property changes)
- **Minor (1.X.0)**: New classes, new properties (backward compatible)
- **Patch (1.0.X)**: Corrections, metadata updates

**Version Metadata**:
```turtle
<http://biosyncarelab.github.io/ont/1.0.0>
  a owl:Ontology ;
  owl:versionIRI <http://biosyncarelab.github.io/ont/1.0.0> ;
  owl:versionInfo "1.0.0" ;
  owl:priorVersion <http://biosyncarelab.github.io/ont/0.9.0> ;
  dct:issued "2025-11-18"^^xsd:date ;
  dct:modified "2025-11-18"^^xsd:date ;
  dct:hasVersion "1.0.0" ;
  rdfs:comment "Initial stable release. Supersedes SSO v0.9 and ONC v0.5." .
```

**Tasks**:
- [x] Add version metadata to all modules ✓
- [ ] Create version comparison tool
- [ ] Generate migration scripts for major versions
- [ ] Implement version negotiation (clients request specific version)
- [ ] Archive old versions in `rdf/releases/archive/`

### 6.2 Change Management

**Process**:
1. All changes tracked in `ONTOLOGY-CHANGELOG.md`
2. Breaking changes require RFC (Request for Comments)
3. Deprecation warnings added 1 major version before removal
4. Migration guide updated with each release

**CHANGELOG Format**:
```markdown
## [1.1.0] - 2025-12-01
### Added
- bsc:Photobiomodulation class (red light therapy)
- MeSH links for all outcomes (30 new links)

### Changed
- bsc:evidenceLevel scale: 0-5 → 0-10 (more granular)

### Deprecated
- sso:AudioTechniques (use bsc:AudioTechnique instead)

### Fixed
- Corrected bsc:AlphaEnhancement MeSH link (D000513 → D000514)
```

**Tasks**:
- [ ] Create ONTOLOGY-CHANGELOG.md
- [ ] Implement RFC process
- [ ] Add deprecation warning generator
- [ ] Create version diff tool
- [ ] Automate changelog from git commits

---

## Success Metrics

### User Engagement
- 80% of users explore external ontology links
- 50% increase in evidence-based session creation
- 90% user satisfaction with recommendations

### Ontology Quality
- 80% of classes linked to ≥1 external ontology
- 100% of classes have evidence metadata
- ≥3 expert validations per technique category

### Technical Performance
- SPARQL queries < 500ms response time
- 99.9% ontology endpoint uptime
- < 1 breaking change per year

---

## Resource Requirements

### Development
- **Phase 1-2**: 1 developer × 4 weeks
- **Phase 3**: 2 developers × 3 weeks (1 ontology, 1 frontend)
- **Phase 4**: 1 backend developer × 3 weeks
- **Phase 5**: 1 full-stack developer × 4 weeks

### Infrastructure
- SPARQL endpoint hosting (AWS/Azure)
- BioPortal API access (free tier: 1000 calls/day)
- PubMed E-utilities (free, no rate limit with API key)
- GitHub Actions for CI/CD

### Ongoing
- Domain expert reviews (1-2 hours/week)
- Community moderation (2-3 hours/week)
- Ontology maintenance (4 hours/week)

---

## Next Immediate Actions (This Week)

1. ✅ Create this roadmap document
2. ⏳ **Version all RDF modules** (add owl:versionInfo, dct:hasVersion)
3. ⏳ **Create consolidated v1.0.0 release**
4. ⏳ **Mark SSO/ONC as deprecated**
5. ⏳ **Create Migration Guide**
6. ⏳ **Add MeSH links to visual/mixed/outcomes modules**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-18
**Next Review**: 2025-12-01

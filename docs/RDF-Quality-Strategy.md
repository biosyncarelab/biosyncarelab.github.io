# NSO/BSC Ontology Quality & Consolidation Strategy

**Date**: 2025-11-17
**Context**: Currently we have multiple ontology sources (BSC, SSO, ONC, HarmoniCare, NFO) with overlapping concepts, inconsistent naming (e.g., `AudioTechniques` plural class), and no clear modular structure. This document addresses how to consolidate and enhance the RDF data quality for the NSO Navigator and BSCLab integration.

---

## Current State Analysis

**Files inventory**:
- `rdf/core/bsc-owl.ttl` — Minimal BSC core (7 classes, clean design)
- `rdf/core/bsc-skos.ttl` — SKOS vocabulary (techniques + outcomes)
- `rdf/external/sso/` — 4 SSO variants (ontology, extended, initial, updated)
- `rdf/external/onc/` — 2 ONC files (attachment-2 + duplicate)
- `rdf/external/harmonicare/` — 2 SSO variants
- `rdf/Attachment 2_ONC_Ontology.ttl` — duplicate in root

**Issues identified**:
1. **Plural class names**: `AudioTechniques` instead of `AudioTechnique` (violates OWL best practices)
2. **Namespace fragmentation**: `bsc:`, `sso:`, `onc:`, `harmonicare:` with overlapping concepts
3. **No modular taxonomy**: Audio/video/haptic/mixed techniques not clearly separated
4. **Missing metadata**: No invasive/non-invasive flags, effectiveness ratings, contraindications
5. **Duplicate files**: Root-level `Attachment 2_ONC_Ontology.ttl` duplicates `rdf/external/onc/onc-ontology-attachment-2.ttl`
6. **Inconsistent versioning**: Multiple SSO variants without clear provenance

---

## Recommended Strategy (Hybrid Approach)

### ✅ **Option: Federated Core + Domain Modules**

Keep one **canonical BSC Core** (`bsc-owl.ttl`) as the integration spine, then create **domain-specific modules** that import and extend it:

```
rdf/
├── core/
│   ├── bsc-owl.ttl         # Integration spine (Session, Protocol, Technique base classes)
│   └── bsc-skos.ttl        # High-level concept scheme
├── modules/
│   ├── audio.ttl           # AudioTechnique subclasses (binaural, monaural, isochronic)
│   ├── visual.ttl          # VisualTechnique subclasses (flicker, pattern, color)
│   ├── haptic.ttl          # HapticTechnique subclasses (vibration, texture)
│   ├── mixed.ttl           # Multi-modal techniques
│   ├── outcomes.ttl        # Outcome taxonomy (cognitive, emotional, physiological)
│   └── safety.ttl          # Invasiveness, contraindications, risk levels
├── external/               # Keep originals for provenance
│   ├── sso/ (archived)
│   ├── onc/ (archived)
│   └── harmonicare/ (archived)
└── releases/
    └── nso-consolidated-v1.0.ttl  # Weekly snapshot merging core + modules
```

**Why this works**:
- **Modularity**: Each domain expert can edit their module independently
- **Backward compatibility**: External files remain for audit/diff
- **Clear namespace**: All new URIs use `bsc:` prefix
- **Versioned releases**: Weekly consolidated snapshots for UI consumption

---

## Detailed Recommendations

### 1️⃣ **Derive ONE Consolidated Ontology? → Partial YES**

**Action**: Create `nso-consolidated-v1.0.ttl` as a **weekly release snapshot** merging:
- `bsc-owl.ttl` (core spine)
- All domain modules (`audio.ttl`, `visual.ttl`, etc.)
- Curated imports from SSO/ONC (de-duplicated, renamed)

**Do NOT delete external files** — archive them under `rdf/external/` with provenance metadata:
```turtle
<rdf/external/sso/sso-ontology.ttl> dct:source <https://acca-harmonicare.../> ;
    dct:replaces <...> ;
    dct:isReplacedBy <https://biosyncare.github.io/ont#AudioTechnique> .
```

**Rationale**: You need ONE truth for the UI, but keep originals for academic transparency.

---

### 2️⃣ **Fix Naming Conventions? → YES**

**Apply these rules**:

| ❌ Current | ✅ Fixed | Rationale |
|-----------|---------|-----------|
| `AudioTechniques` | `AudioTechnique` | OWL classes are types (singular) |
| `sso:BinauralBeatsTechnique` | `bsc:BinauralBeat` | Simpler, avoid redundant "Technique" suffix |
| `id:SuicidalIdeationRelief` | `bsc:SuicidalIdeationReduction` | "Relief" is vague; "Reduction" is measurable |
| `skos:prefLabel "AudioTechniques Concept"` | Remove | Redundant metadata clutter |

**Migration path**:
1. Create `scripts/rdf-refactor.py` to parse TTL and apply rename rules
2. Generate deprecation triples:
   ```turtle
   sso:AudioTechniques owl:deprecated true ;
       rdfs:isDefinedBy <rdf/external/sso/sso-ontology.ttl> ;
       dct:isReplacedBy bsc:AudioTechnique .
   ```
3. Update NSO Navigator to show deprecation warnings in inspector sidebar

---

### 3️⃣ **Create Taxonomic Structure? → YES**

**Add modality + invasiveness hierarchy**:

```turtle
# audio.ttl
bsc:AudioTechnique a owl:Class ;
    rdfs:subClassOf bsc:Technique ;
    rdfs:label "Audio Technique" ;
    rdfs:comment "Auditory neurosensory stimulation methods" .

bsc:BinauralBeat a owl:Class ;
    rdfs:subClassOf bsc:AudioTechnique ;
    bsc:invasiveness "non-invasive" ;
    bsc:evidenceLevel "moderate" ;  # systematic review tier
    bsc:contraindications "epilepsy, severe tinnitus" .

bsc:IsochronicTone a owl:Class ;
    rdfs:subClassOf bsc:AudioTechnique ;
    bsc:invasiveness "non-invasive" ;
    bsc:evidenceLevel "low" .

# visual.ttl
bsc:VisualTechnique a owl:Class ;
    rdfs:subClassOf bsc:Technique .

bsc:FlickerStimulation a owl:Class ;
    rdfs:subClassOf bsc:VisualTechnique ;
    bsc:invasiveness "non-invasive" ;
    bsc:contraindications "photosensitive epilepsy" .

# mixed.ttl
bsc:AudiovisualTechnique a owl:Class ;
    rdfs:subClassOf [ a owl:Class ;
        owl:intersectionOf ( bsc:AudioTechnique bsc:VisualTechnique ) ] .
```

**Add data properties** (in `core/bsc-owl.ttl`):
```turtle
bsc:invasiveness a owl:DatatypeProperty ;
    rdfs:domain bsc:Technique ;
    rdfs:range [ a rdfs:Datatype ;
        owl:oneOf ( "non-invasive" "minimally-invasive" "invasive" ) ] .

bsc:evidenceLevel a owl:DatatypeProperty ;
    rdfs:domain bsc:Technique ;
    rdfs:range [ a rdfs:Datatype ;
        owl:oneOf ( "high" "moderate" "low" "anecdotal" ) ] .

bsc:contraindications a owl:DatatypeProperty ;
    rdfs:domain bsc:Technique ;
    rdfs:range xsd:string .
```

---

### 4️⃣ **Eliminate Material? → Selective YES**

**Archive (don't delete)**:
- Duplicate files: Move `rdf/Attachment 2_ONC_Ontology.ttl` → `rdf/external/onc/` with `.archived` extension
- Obsolete SSO variants: Keep only `sso-ontology-extended.ttl` as reference; archive others
- Empty/stub classes: Mark with `owl:deprecated true` instead of deleting

**Merge candidates** (concepts appearing in 3+ sources):
- `BinauralBeat`, `IsochronicTone`, `MonauralBeat` → consolidate into `bsc:` namespace
- `AudioTechniques` plural → rename to singular `bsc:AudioTechnique`

**Document provenance**:
```turtle
bsc:BinauralBeat dct:source <rdf/external/sso/sso-ontology.ttl> ,
                            <rdf/external/onc/onc-ontology-attachment-2.ttl> ;
    rdfs:seeAlso <https://en.wikipedia.org/wiki/Binaural_beat> .
```

---

### 5️⃣ **Additional Actions**

#### A. **Add Change-Ringing Ontology Module**
Since BSCLab integrates Python `music` package sequences:
```turtle
# modules/structures.ttl
bsc:ChangeRingingPattern a owl:Class ;
    rdfs:subClassOf bsc:AudioTechnique ;
    rdfs:label "Change Ringing Pattern" ;
    rdfs:comment "Permutation-based tone sequences from campanology" .

bsc:hasPermutationGroup a owl:ObjectProperty ;
    rdfs:domain bsc:ChangeRingingPattern ;
    rdfs:range bsc:SymmetryGroup .
```

#### B. **Link to Existing Standards**
```turtle
bsc:AudioTechnique rdfs:seeAlso <http://purl.bioontology.org/ontology/MESH/D013016> ;  # Sound therapy
    skos:closeMatch <http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C157767> .  # Auditory stimulation
```

#### C. **Add Telemetry Annotations**
```turtle
bsc:usageCount a owl:DatatypeProperty ;
    rdfs:domain bsc:Technique ;
    rdfs:range xsd:integer ;
    rdfs:comment "Community usage statistics from Firestore aggregates" .
```

#### D. **Weekly Diff Visualization**
Create `scripts/rdf-diff.sh`:
```bash
#!/bin/bash
# Compare this week vs last week's consolidated release
diff -u rdf/releases/nso-consolidated-v0.9.ttl \
        rdf/releases/nso-consolidated-v1.0.ttl \
    | diffstat
```
Output rendered in NSO Navigator's "Recent Changes" panel.

---

## Implementation Roadmap

### Week 1: Audit & Planning
- [ ] Run `scripts/rdf-audit.py` to count classes/properties per file
- [ ] Identify exact duplicates vs. near-duplicates
- [ ] Draft `bsc:` namespace URI policy (singular nouns, camelCase)

### Week 2: Core Consolidation
- [ ] Refactor `bsc-owl.ttl` with base Technique/Outcome classes
- [ ] Create `modules/audio.ttl` with singular class names
- [ ] Migrate 5 most-used techniques from SSO → BSC namespace

### Week 3: Metadata Enrichment
- [ ] Add `invasiveness`, `evidenceLevel`, `contraindications` properties
- [ ] Populate values for top 10 techniques based on literature review
- [ ] Generate first `nso-consolidated-v1.0.ttl` snapshot

### Week 4: UI Integration
- [ ] Update NSO Navigator to show "Replaced by" badges for deprecated URIs
- [ ] Add "Evidence Level" and "Safety" filters to graph view
- [ ] Render change-ringing structures in ontology inspector sidebar

### Week 5+: Community Curation
- [ ] Open Firestore annotations to collect user expertise
- [ ] Weekly expert review cycles to approve/reject proposed changes
- [ ] Automated diff generation + notification to stakeholders

---

## Decision Matrix

| Question | Recommendation | Priority |
|----------|---------------|----------|
| 1) One ontology? | Federated core + modules → weekly releases | 🔴 High |
| 2) Fix naming? | YES — singular classes, deprecate plurals | 🔴 High |
| 3) Add structure? | YES — modality + invasiveness taxonomy | 🟡 Medium |
| 4) Eliminate material? | Archive duplicates, deprecate (don't delete) | 🟢 Low |
| 5) Something else? | Add change-ringing module, link to MeSH/NCI, telemetry props | 🟡 Medium |

---

## Next Steps for You

**Choose one path**:

**Option A**: **Start Small** (conservative)
- Fix `AudioTechniques` → `AudioTechnique` in `bsc-owl.ttl`
- Create `modules/audio.ttl` with 5 classes (binaural, monaural, isochronic, hemi-sync, solfeggio)
- Archive duplicate `Attachment 2_ONC_Ontology.ttl`

**Option B**: **Full Refactor** (ambitious)
- Implement complete modular structure (audio/visual/haptic/mixed/outcomes/safety)
- Migrate all SSO/ONC concepts into `bsc:` namespace with deprecation mappings
- Generate first consolidated release (`nso-consolidated-v1.0.ttl`)

**Option C**: **Iterative Hybrid** (recommended)
- Week 1: Audit + naming fixes
- Week 2: Audio module only
- Week 3: Add invasiveness/evidence properties
- Week 4: Visual module
- Week 5: First consolidated release

**I recommend Option C** for sustainable progress without disrupting current NSO Navigator functionality.

---

## Open Questions for You

1. **Namespace authority**: Should we use `https://biosyncare.github.io/ont#` (current) or register a proper domain like `https://nso.ontology.org/`?

2. **Evidence standards**: Who validates `evidenceLevel` values? Link to PubMed IDs? Require systematic review citations?

3. **Contraindications scope**: Medical disclaimers only, or include cultural/ethical considerations (e.g., religious objections to certain frequencies)?

4. **Change-ringing priority**: Should symmetry group structures be first-class ontology citizens, or just JSON metadata linked via `rdfs:seeAlso`?

5. **Collaboration model**: Open PRs on GitHub for ontology changes, or Firestore-first curation with weekly snapshots?

Let me know which option (A/B/C) or hybrid you prefer, and I'll start implementing! 🚀

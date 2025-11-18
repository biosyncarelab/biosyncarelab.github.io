# Migration Guide: SSO/ONC → NSO v1.0.0

**Migrating from Legacy Ontologies to NSO (Neurosensory Stimulation Ontology)**

**Target Audience**: Developers, researchers, SPARQL query authors
**Difficulty**: Moderate (mostly find-and-replace, some structural changes)
**Estimated Time**: 1-3 hours depending on codebase size

---

## Overview

This guide helps you migrate from legacy ontologies to **NSO v1.0.0**, the new authoritative semantic framework for BioSynCare Lab.

### What's Being Replaced

| Legacy Ontology | Status | Replacement |
|-----------------|--------|-------------|
| **SSO** (Sensory Stimulation Ontology) | DEPRECATED | NSO v1.0.0 |
| Namespace: `https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#` | ❌ End-of-life | `https://biosyncarelab.github.io/ont#` |
| **ONC** (Old NSO Core) | DEPRECATED | NSO v1.0.0 |
| Namespace: `https://biosyncare.github.io/ont#` | ❌ End-of-life | `https://biosyncarelab.github.io/ont#` |

### Why Migrate?

✅ **Semantic Versioning**: Stable URIs with version guarantees
✅ **Evidence Framework**: All techniques have 0-5 evidence ratings
✅ **External Links**: MeSH/GO/SNOMED integration for PubMed queries
✅ **Safety Metadata**: Comprehensive contraindications with SERIOUS: warnings
✅ **Modular Architecture**: Clean separation of concerns (audio, visual, mixed, outcomes)
✅ **Active Maintenance**: Regular updates following semver
✅ **Better Documentation**: Comprehensive guides, changelog, roadmap

---

## Migration Checklist

- [ ] **Step 1**: Update namespace prefixes in RDF files
- [ ] **Step 2**: Replace plural class names with singular (e.g., `BinauralBeats` → `BinauralBeat`)
- [ ] **Step 3**: Update SPARQL queries
- [ ] **Step 4**: Update application code (JavaScript, Python, etc.)
- [ ] **Step 5**: Verify external tools (Protégé, SPARQL endpoints)
- [ ] **Step 6**: Test with NSO Navigator
- [ ] **Step 7**: Update documentation and citations

---

## Step 1: Update Namespace Prefixes

### RDF/Turtle Files

**Before** (SSO):
```turtle
@prefix sso: <https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#> .

sso:BinauralBeats a owl:Class .
```

**After** (NSO):
```turtle
@prefix bsc: <https://biosyncarelab.github.io/ont#> .

bsc:BinauralBeat a owl:Class .
```

**Before** (ONC):
```turtle
@prefix old: <https://biosyncare.github.io/ont#> .

old:Technique a owl:Class .
```

**After** (NSO):
```turtle
@prefix bsc: <https://biosyncarelab.github.io/ont#> .

bsc:Technique a owl:Class .
```

### Automated Find-and-Replace

Use these sed commands to bulk update files:

```bash
# Replace SSO prefix declaration
sed -i 's|@prefix sso:.*|@prefix bsc: <https://biosyncarelab.github.io/ont#> .|g' *.ttl

# Replace ONC prefix declaration
sed -i 's|@prefix old:.*biosyncare.*|@prefix bsc: <https://biosyncarelab.github.io/ont#> .|g' *.ttl

# Replace sso: usage with bsc:
sed -i 's|sso:|bsc:|g' *.ttl

# Replace old: usage with bsc:
sed -i 's|old:|bsc:|g' *.ttl
```

---

## Step 2: Replace Plural Class Names (SSO Only)

SSO used **plural** class names (`BinauralBeats`). NSO uses **singular** (`BinauralBeat`) following OWL best practices.

### Class Name Mappings

| SSO (Deprecated) | NSO v1.0.0 | Type |
|------------------|------------|------|
| `sso:AudioTechniques` | `bsc:AudioTechnique` | Base class |
| `sso:BinauralBeats` | `bsc:BinauralBeat` | Technique |
| `sso:MonauralBeats` | `bsc:MonauralBeat` | Technique |
| `sso:IsochronicTones` | `bsc:IsochronicTone` | Technique |
| `sso:VisualTechniques` | `bsc:VisualTechnique` | Base class |

### Automated Replacement

```bash
# Audio techniques
sed -i 's|bsc:AudioTechniques|bsc:AudioTechnique|g' *.ttl
sed -i 's|bsc:BinauralBeats|bsc:BinauralBeat|g' *.ttl
sed -i 's|bsc:MonauralBeats|bsc:MonauralBeat|g' *.ttl
sed -i 's|bsc:IsochronicTones|bsc:IsochronicTone|g' *.ttl

# Visual techniques
sed -i 's|bsc:VisualTechniques|bsc:VisualTechnique|g' *.ttl
```

### Manual Review Required

After automated replacement, **manually verify** that:
- Class hierarchies (`rdfs:subClassOf`) still make sense
- Property domains/ranges still reference correct classes
- SPARQL queries return expected results

---

## Step 3: Update SPARQL Queries

### Example 1: Find All Binaural Beat Sessions

**Before** (SSO):
```sparql
PREFIX sso: <https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#>
PREFIX old: <https://biosyncare.github.io/ont#>

SELECT ?session WHERE {
  ?session old:appliesTechnique sso:BinauralBeats .
}
```

**After** (NSO):
```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>

SELECT ?session WHERE {
  ?session bsc:appliesTechnique bsc:BinauralBeat .
}
```

### Example 2: Find Techniques with High Evidence

**New capability in NSO** (not available in SSO/ONC):
```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>

SELECT ?technique ?evidenceLevel WHERE {
  ?technique a bsc:Technique ;
             bsc:evidenceLevel ?evidenceLevel .
  FILTER (?evidenceLevel >= 3.0)  # High evidence only
}
```

### Example 3: Find Techniques with Safety Warnings

**New capability in NSO**:
```sparql
PREFIX bsc: <https://biosyncarelab.github.io/ont#>

SELECT ?technique ?warning WHERE {
  ?technique a bsc:Technique ;
             bsc:contraindications ?warning .
  FILTER (CONTAINS(?warning, "SERIOUS:"))  # Life-threatening risks only
}
```

---

## Step 4: Update Application Code

### JavaScript (Node.js / Browser)

**Before** (SSO/ONC):
```javascript
const SSO = "https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#";
const OLD = "https://biosyncare.github.io/ont#";

const binauralBeatsClass = SSO + "BinauralBeats";
const techniqueProperty = OLD + "appliesTechnique";
```

**After** (NSO):
```javascript
const BSC = "https://biosyncarelab.github.io/ont#";

const binauralBeatClass = BSC + "BinauralBeat";  // Singular!
const techniqueProperty = BSC + "appliesTechnique";
```

### Python (rdflib)

**Before**:
```python
from rdflib import Namespace

SSO = Namespace("https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#")
OLD = Namespace("https://biosyncare.github.io/ont#")

binaural_beats = SSO.BinauralBeats
```

**After**:
```python
from rdflib import Namespace

BSC = Namespace("https://biosyncarelab.github.io/ont#")

binaural_beat = BSC.BinauralBeat  # Singular!
```

### Java (Apache Jena)

**Before**:
```java
String SSO_NS = "https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#";
Resource binauralBeats = model.createResource(SSO_NS + "BinauralBeats");
```

**After**:
```java
String BSC_NS = "https://biosyncarelab.github.io/ont#";
Resource binauralBeat = model.createResource(BSC_NS + "BinauralBeat");
```

---

## Step 5: Verify External Tools

### Protégé

1. Open your ontology in Protégé
2. Check **Entities** tab for deprecated classes (should show `owl:deprecated true`)
3. Verify all `dct:isReplacedBy` links point to NSO classes
4. Run **reasoner** to check for inconsistencies
5. If using imports, update import statements to versioned URIs:

**Before**:
```turtle
owl:imports <../core/bsc-owl.ttl> .
```

**After**:
```turtle
owl:imports <https://biosyncarelab.github.io/ont/1.0.0> .
```

### SPARQL Endpoints

If you're running a SPARQL endpoint (Fuseki, Blazegraph, etc.):

1. **Clear old graphs**:
```sparql
DROP GRAPH <https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl>
```

2. **Load NSO v1.0.0**:
```sparql
LOAD <https://biosyncarelab.github.io/ont/releases/1.0.0>
```

3. **Test with sample queries** (see Step 3 examples)

---

## Step 6: Test with NSO Navigator

**URL**: `http://localhost:4173/nso-navigator.html`

### Verify Deprecated Entity Handling

1. Navigate to a deprecated entity (e.g., `sso:BinauralBeats`)
2. **Expected**: Automatically redirects to `bsc:BinauralBeat`
3. Inspector shows **deprecation notice** with SSO source info

### Check External Ontology Links

1. Navigate to `bsc:BinauralBeat`
2. Inspector shows **MeSH link** with icon: 🏥 Sound [MeSH]
3. Click badge → Opens BioPortal in new tab

### Verify Property Visualization

Properties should appear as **edges** (not nodes):
- `bsc:appliesTechnique` → edge from Session to Technique
- `bsc:hasOutcome` → edge from Session to Outcome

---

## Step 7: Update Documentation

### Code Comments

**Before**:
```javascript
// Fetch all sessions using SSO:BinauralBeats technique
```

**After**:
```javascript
// Fetch all sessions using bsc:BinauralBeat technique (NSO v1.0.0)
```

### Citations

**Before**:
> Using SSO (Sensory Stimulation Ontology) from HarmoniCare project...

**After**:
> Using NSO v1.0.0 (Neurosensory Stimulation Ontology) from BioSynCare Lab. Citation: BioSynCare Lab. (2025). *Neurosensory Stimulation Ontology* (Version 1.0.0). https://biosyncarelab.github.io/ont/1.0.0

### README Updates

Add NSO version badge:

```markdown
![NSO Version](https://img.shields.io/badge/NSO-v1.0.0-blue)
```

Update dependency table:

| Dependency | Version | Status |
|------------|---------|--------|
| NSO | 1.0.0 | ✅ Current |
| SSO | N/A | ❌ Deprecated |

---

## Common Migration Issues

### Issue 1: Plural Class Names Not Replaced

**Symptom**: SPARQL queries return empty results

**Cause**: Forgot to update plural class names (SSO → NSO)

**Fix**:
```bash
# Check for remaining plural names
grep -r "BinauralBeats" .
grep -r "AudioTechniques" .

# Replace globally
sed -i 's|BinauralBeats|BinauralBeat|g' **/*.ttl
```

### Issue 2: Mixed Prefixes (sso: and bsc:)

**Symptom**: Some classes resolve, others don't

**Cause**: Incomplete prefix replacement

**Fix**:
```bash
# Find all SSO prefix usage
grep -r "sso:" .

# Verify no leftover SSO references
grep -r "acca-harmonicare" .
```

### Issue 3: Import Statements Broken

**Symptom**: Ontology won't load in Protégé or parsers fail

**Cause**: Old relative import paths

**Fix**: Update all imports to use versioned URIs:
```turtle
# ❌ Old (relative path)
owl:imports <../core/bsc-owl.ttl> .

# ✅ New (versioned URI)
owl:imports <https://biosyncarelab.github.io/ont/1.0.0> .
```

### Issue 4: Evidence Properties Missing

**Symptom**: Code expects `evidenceLevel` but property doesn't exist

**Cause**: Using legacy SSO classes (no evidence metadata)

**Fix**: Update to NSO classes which include full evidence framework:
```javascript
// ✅ NSO classes have evidenceLevel, contraindications, etc.
const evidenceLevel = technique.properties["evidenceLevel"][0].value;
```

---

## Deprecation Timeline

| Date | Event |
|------|-------|
| **2025-11-18** | NSO v1.0.0 released (CURRENT) |
| **2025-11-18** | SSO/ONC marked DEPRECATED |
| **2026-02-18** | 3-month grace period ends |
| **2026-05-18** | SSO/ONC support ends (6 months) |
| **2026-11-18** | SSO/ONC removed from codebase (12 months) |

**Recommendation**: Migrate **before 2026-02-18** (3 months) to avoid urgent fixes.

---

## Migration Validation Checklist

After migration, verify:

- [ ] All RDF files parse without errors
- [ ] SPARQL queries return expected results
- [ ] NSO Navigator displays correct class hierarchies
- [ ] External links (MeSH) resolve properly
- [ ] No console errors in web applications
- [ ] Deprecated entity URLs redirect correctly
- [ ] Evidence metadata accessible (`evidenceLevel`, `contraindications`)
- [ ] Tests pass (unit tests, integration tests)
- [ ] Documentation updated
- [ ] Citations updated to NSO v1.0.0

---

## Rollback Plan (If Needed)

If migration causes critical issues:

1. **Revert namespace changes**:
```bash
git checkout HEAD -- *.ttl  # Restore old files
```

2. **Use compatibility layer** (temporary):
```turtle
# Add both prefixes during transition
@prefix sso: <https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#> .
@prefix bsc: <https://biosyncarelab.github.io/ont#> .

# Map deprecated classes
sso:BinauralBeats owl:equivalentClass bsc:BinauralBeat .
```

3. **Report issue**: Open GitHub issue with `migration` label

---

## Getting Help

### Resources

- **NSO Changelog**: `docs/ONTOLOGY-CHANGELOG.md`
- **Integration Roadmap**: `docs/NSO-Integration-Roadmap.md`
- **Ontology Linking Strategy**: `docs/Ontology-Linking-Strategy.md`
- **NSO Navigator**: Interactive browser for testing changes

### Support Channels

- **GitHub Issues**: Report bugs or request clarifications (tag `migration`)
- **BioSynCare Lab**: Contact maintainers (contact info TBD)

### Example Migration PRs

See these example pull requests for reference:

- [ ] PR #1: Migrate audio module (TBD)
- [ ] PR #2: Migrate SPARQL queries (TBD)
- [ ] PR #3: Update JavaScript client (TBD)

---

## New Features to Explore

After migrating, take advantage of NSO v1.0.0 features:

### 1. Evidence Filtering

```sparql
# Find only evidence-based techniques (level >= 2.0)
SELECT ?technique WHERE {
  ?technique bsc:evidenceLevel ?level .
  FILTER (?level >= 2.0)
}
```

### 2. Safety Queries

```sparql
# Find all techniques safe for epilepsy patients
SELECT ?technique WHERE {
  ?technique a bsc:Technique .
  FILTER NOT EXISTS {
    ?technique bsc:contraindications ?warning .
    FILTER (CONTAINS(?warning, "epilepsy"))
  }
}
```

### 3. External Ontology Navigation

- Click MeSH links to browse PubMed literature
- Explore Gene Ontology for biological mechanisms
- Cross-reference with clinical trials databases

### 4. Measurement Standards

```sparql
# Find outcomes with validated measurement scales
SELECT ?outcome ?tool WHERE {
  ?outcome bsc:validatedScale true ;
           bsc:measurementTool ?tool .
}
```

---

## FAQ

**Q: Can I use both SSO and NSO simultaneously during migration?**
A: Yes, use `owl:equivalentClass` mappings temporarily, but migrate fully within 3 months.

**Q: Will old SSO URIs break?**
A: NSO Navigator redirects deprecated URIs automatically. External systems may need updates.

**Q: What if I find a missing class from SSO?**
A: Open GitHub issue. We'll add it to NSO with proper evidence metadata.

**Q: How often will NSO be updated?**
A: Follow semantic versioning. PATCH fixes monthly, MINOR additions quarterly, MAJOR changes annually.

**Q: Can I contribute to NSO?**
A: Yes! See `NSO-Integration-Roadmap.md` Phase 5 for contribution workflow (planned Q2 2026).

---

**Migration Status**: ✅ READY
**NSO Version**: 1.0.0
**Guide Version**: 1.0.0
**Last Updated**: 2025-11-18
**Maintainer**: BioSynCare Lab

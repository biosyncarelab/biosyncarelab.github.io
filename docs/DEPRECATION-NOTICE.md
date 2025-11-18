# DEPRECATION NOTICE

**Effective Date**: 2025-11-18
**Affected Ontologies**: SSO (Sensory Stimulation Ontology), ONC (Old NSO Core)
**Replacement**: NSO v1.0.0 (Neurosensory Stimulation Ontology)
**Deprecation ID**: DEP-2025-001

---

## Official Deprecation Statement

As of **November 18, 2025**, the following ontologies are **officially DEPRECATED** and will no longer receive updates or maintenance:

### 1. SSO (Sensory Stimulation Ontology)
- **Namespace**: `https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl#`
- **Status**: ❌ DEPRECATED (End-of-Life)
- **Last Version**: Unversioned (pre-semver)
- **Reason**: Replaced by modular, versioned NSO architecture with evidence metadata
- **Replacement**: `https://biosyncarelab.github.io/ont#` (NSO v1.0.0)

### 2. ONC (Old NSO Core)
- **Namespace**: `https://biosyncare.github.io/ont#`
- **Status**: ❌ DEPRECATED (End-of-Life)
- **Last Version**: Unversioned (pre-semver)
- **Reason**: Namespace consolidation and versioning implementation
- **Replacement**: `https://biosyncarelab.github.io/ont#` (NSO v1.0.0 with versioned URIs)

---

## Rationale for Deprecation

### Problems with Legacy Ontologies

#### SSO Issues:
1. **Plural Class Names**: Violated OWL best practices (`BinauralBeats` should be `BinauralBeat`)
2. **No Evidence Metadata**: Techniques lacked scientific validation ratings
3. **No Safety Information**: Missing contraindications and invasiveness classifications
4. **External Hosting**: Dependency on external URL (netlify.app) created availability risks
5. **No Versioning**: No semantic versioning or stable API guarantees
6. **Limited Documentation**: Minimal inline comments and no changelog

#### ONC Issues:
1. **Namespace Change**: Project evolved from "BioSynCare" to "BioSynCare Lab"
2. **No Versioning**: URIs changed without version tracking
3. **Fragmented Structure**: Core classes scattered across multiple unorganized files
4. **Missing Properties**: No evidence framework or measurement standards

### NSO v1.0.0 Solutions

✅ **Semantic Versioning**: Stable URIs with version guarantees (`ont/1.0.0`, `ont/1.1.0`, etc.)
✅ **Evidence Framework**: All 22 techniques rated 0-5 with curator, corpus, reasoning
✅ **Safety Metadata**: Comprehensive contraindications with `SERIOUS:` prefix for life-threatening risks
✅ **Modular Architecture**: Clean separation (core, audio, visual, mixed, outcomes)
✅ **External Links**: MeSH, GO, SNOMED integration for PubMed/clinical database queries
✅ **Measurement Standards**: Outcome classes include validated scales and latency metadata
✅ **Active Maintenance**: Regular updates following semver, documented changelog
✅ **Comprehensive Documentation**: Roadmap, linking strategy, migration guide, changelog

---

## Deprecation Timeline

| Date | Milestone | Action Required |
|------|-----------|-----------------|
| **2025-11-18** | NSO v1.0.0 Released | ✅ None (NSO available for migration) |
| **2025-11-18** | SSO/ONC Deprecated | ⚠️ Plan migration (use Migration Guide) |
| **2026-02-18** | 3-Month Warning | ⚠️ **Deadline**: Complete migration to NSO |
| **2026-05-18** | 6-Month Grace Ends | ❌ SSO/ONC support ends (no bug fixes) |
| **2026-11-18** | 12-Month EOL | ❌ SSO/ONC removed from codebase |

### What Happens at Each Milestone

**Now - 2026-02-18 (3 months)**:
- SSO/ONC still functional
- Deprecation warnings in NSO Navigator
- Migration Guide available
- Support for migration questions

**2026-02-18 - 2026-05-18 (3-6 months)**:
- SSO/ONC still functional but **unsupported**
- No bug fixes or updates
- Migration strongly recommended

**2026-05-18 - 2026-11-18 (6-12 months)**:
- SSO/ONC may stop working
- Deprecation mappings may be removed
- **Migration required** to continue using BioSynCare Lab

**After 2026-11-18 (12+ months)**:
- SSO/ONC **completely removed**
- No backward compatibility
- Systems using SSO/ONC will **break**

---

## Migration Path

### Quick Start

1. **Read Migration Guide**: `docs/Migration-Guide-SSO-ONC-to-NSO.md` (comprehensive step-by-step)
2. **Update Namespaces**: Replace `sso:` and `old:` with `bsc:`
3. **Fix Plural Names**: `BinauralBeats` → `BinauralBeat`
4. **Test**: Use NSO Navigator to verify changes
5. **Deploy**: Update production systems

**Estimated Time**: 1-3 hours for most projects

### Automated Tools

We provide automated migration scripts (coming in NSO v1.1.0):

```bash
# Planned for Q1 2026
nso-migrate --input ./old-ontology.ttl --output ./new-ontology.ttl
```

### Support

- **Migration Guide**: Full documentation with examples
- **GitHub Issues**: Tag with `migration` label
- **Example PRs**: Reference implementations (coming soon)

---

## Deprecated Class Mappings

All deprecated SSO/ONC classes have `owl:deprecated true` and `dct:isReplacedBy` mappings in NSO v1.0.0.

### SSO → NSO Mappings

| Deprecated Class (SSO) | Replacement (NSO) | Module |
|------------------------|-------------------|--------|
| `sso:AudioTechniques` | `bsc:AudioTechnique` | audio.ttl |
| `sso:BinauralBeats` | `bsc:BinauralBeat` | audio.ttl |
| `sso:MonauralBeats` | `bsc:MonauralBeat` | audio.ttl |
| `sso:IsochronicTones` | `bsc:IsochronicTone` | audio.ttl |
| `sso:VisualTechniques` | `bsc:VisualTechnique` | visual.ttl |

**Metadata in NSO files**:
```turtle
sso:BinauralBeats owl:deprecated true ;
  rdfs:isDefinedBy <https://acca-harmonicare-chromosound.netlify.app/rdf/SSO_Ontology.owl> ;
  dct:isReplacedBy bsc:BinauralBeat ;
  rdfs:comment "Deprecated: Use singular bsc:BinauralBeat instead." .
```

### ONC → NSO Mappings

ONC used the same class names but different namespace:

| Deprecated Namespace | New Namespace |
|---------------------|---------------|
| `https://biosyncare.github.io/ont#` | `https://biosyncarelab.github.io/ont#` |

**Metadata in NSO core**:
```turtle
<https://biosyncarelab.github.io/ont/1.0.0>
  owl:priorVersion <https://biosyncare.github.io/ont#> ;
  rdfs:comment "Supersedes unversioned ONC ontology." .
```

---

## Automatic Redirects (NSO Navigator)

NSO Navigator **automatically handles** deprecated entities:

1. **URL Redirect**: `?concept=sso:BinauralBeats` → redirects to `bsc:BinauralBeat`
2. **Deprecation Notice**: Inspector shows amber warning with deprecated entity details
3. **Merged Data**: All deprecated entity properties merged into replacement
4. **External Link**: Shows SSO source ontology with clickable link

**Example**:

```
When accessing: http://localhost:4173/nso-navigator.html?concept=sso%3ABinauralBeats

Result:
- Graph focuses on bsc:BinauralBeat (replacement)
- Inspector shows: "⚠️ This class replaces 1 deprecated entity"
- Details: sso:BinauralBeats from SSO_Ontology.owl
- Recommendation: "Update your code to use bsc:BinauralBeat directly"
```

---

## Impact Assessment

### Who is Affected?

1. **SPARQL Query Authors**: Need to update prefixes and class names
2. **Application Developers**: JavaScript/Python code using SSO/ONC namespaces
3. **Ontology Engineers**: RDF files importing SSO/ONC
4. **Researchers**: Citations and literature references

### What Breaks?

❌ **SPARQL queries** using `sso:` or `old:` prefixes
❌ **RDF imports** with `owl:imports <SSO_Ontology.owl>`
❌ **Application code** with hardcoded SSO/ONC URIs
❌ **External tools** (Protégé, reasoners) loading SSO/ONC graphs

### What Still Works? (During Grace Period)

✅ **NSO Navigator**: Auto-redirects deprecated URIs
✅ **Deprecation mappings**: `dct:isReplacedBy` resolves to NSO classes
✅ **Legacy data**: Old RDF files can coexist with NSO during migration

---

## Governance

### Deprecation Policy

BioSynCare Lab follows this deprecation policy for all ontology changes:

1. **Announcement**: 12 months advance notice (this document)
2. **Grace Period**: Minimum 6 months of backward compatibility
3. **Migration Support**: Comprehensive guides and automated tools
4. **Community Input**: GitHub issues for feedback and questions
5. **Versioning**: All breaking changes increment MAJOR version (e.g., 1.x.x → 2.0.0)

### Appeal Process

If you have concerns about this deprecation:

1. Open GitHub issue with `deprecation-concern` label
2. Explain your use case and migration blockers
3. BioSynCare Lab will review and respond within 7 days
4. Possible outcomes:
   - Extended grace period for specific use cases
   - Custom migration scripts provided
   - NSO enhancement to support missing features

---

## Compliance Checklist

For systems using SSO/ONC, verify migration compliance:

### Technical Compliance
- [ ] All `sso:` prefixes replaced with `bsc:`
- [ ] All `old:` prefixes replaced with `bsc:`
- [ ] Plural class names replaced with singular (e.g., `BinauralBeats` → `BinauralBeat`)
- [ ] SPARQL queries updated and tested
- [ ] Application code updated (JavaScript, Python, Java, etc.)
- [ ] RDF imports point to NSO versioned URIs
- [ ] External tools (Protégé) load NSO without errors

### Documentation Compliance
- [ ] README updated to reference NSO v1.0.0
- [ ] Code comments updated
- [ ] API documentation reflects NSO namespace
- [ ] Citations updated to NSO v1.0.0
- [ ] Version badges updated

### Testing Compliance
- [ ] Unit tests pass with NSO
- [ ] Integration tests pass with NSO
- [ ] SPARQL queries return expected results
- [ ] NSO Navigator displays correct data
- [ ] No deprecation warnings in production logs

---

## Frequently Asked Questions

**Q: Can I continue using SSO/ONC after 2025-11-18?**
A: Yes, during the 12-month grace period. However, migration is strongly recommended within 3 months.

**Q: Will my old data become invalid?**
A: No. RDF data using SSO/ONC URIs remains valid. NSO provides deprecation mappings for resolution.

**Q: What if I find a bug in SSO/ONC?**
A: Bugs in deprecated ontologies will not be fixed. Migrate to NSO v1.0.0 which has active maintenance.

**Q: Can I request an extension to the deprecation timeline?**
A: Yes, for valid reasons. Open a GitHub issue with `deprecation-concern` label.

**Q: Will NSO v1.x.x also be deprecated someday?**
A: NSO follows semantic versioning. v1.x.x will be supported until v2.0.0 is released (planned 2026+).

**Q: What about data I've already published using SSO URIs?**
A: Published data is immutable. Add `owl:sameAs` mappings to NSO classes in new metadata files.

**Q: How do I cite the deprecated ontologies in papers?**
A: Use: "We used SSO (deprecated 2025-11-18, replaced by NSO v1.0.0) for historical data. Current work uses NSO v1.0.0."

---

## Contact and Support

### Report Issues
- **Migration Problems**: GitHub issue with `migration` label
- **Broken Mappings**: GitHub issue with `deprecation-bug` label
- **Feature Requests**: GitHub issue with `enhancement` label

### Resources
- **Migration Guide**: `docs/Migration-Guide-SSO-ONC-to-NSO.md`
- **NSO Changelog**: `docs/ONTOLOGY-CHANGELOG.md`
- **NSO Roadmap**: `docs/NSO-Integration-Roadmap.md`
- **Linking Strategy**: `docs/Ontology-Linking-Strategy.md`

### BioSynCare Lab
- **Maintainer**: BioSynCare Lab
- **Contact**: (TBD - add email/website)
- **License**: CC BY 4.0 (NSO and all documentation)

---

## Acknowledgments

We thank all SSO and ONC users for their patience during this transition. The lessons learned from SSO and ONC directly informed NSO's design, making it a more robust and sustainable semantic framework.

**Special Thanks**:
- HarmoniCare project (original SSO creators)
- Early NSO adopters and testers
- Claude Sonnet 4.5 (AI-assisted evidence curation and migration tooling)

---

**Deprecation Notice Version**: 1.0.0
**Last Updated**: 2025-11-18
**Status**: ACTIVE (12-month grace period until 2026-11-18)
**Authority**: BioSynCare Lab Ontology Working Group

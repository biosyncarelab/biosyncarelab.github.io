# BioSynCare Lab Feature Backlog

Status legend: ✅ implemented · 🚧 in progress · 🧩 scoped (needs design) · ❓ needs clarification

**Simplicity directive:** every feature must shrink total surface area whenever possible—favor fewer files, flatter hierarchies, reusable primitives, and reversible experiments. New work should justify any line-count growth and note the deletion path for legacy code.

## 1. BSCLab Client Application

### 1.1 Session & Track Management (🧩)
- CRUD for sessions and tracks, including presets and live editing of parameters (frequency, gain, panning).
- Snapshot feature that captures current state (see sample JSON in `README.md`).
- Persist martigli/breathing parameters with every session.
- Decisions:
	- Presets follow biosyncare snapshot model: single latest per user with `createdAt`/`updatedAt`, no undo tree.
	- Session modes: owner-only editing and collaborative mode with precedence-based conflict resolution.
- Todo: spec precedence rules + session mode toggle UI.

### 1.2 Firebase Persistence & Telemetry (🧩)
- Realtime reporting of interactions (opens, creates, deletes, parameter changes).
- User authentication + personas with Firestore security rules.
- Storage schema for presets, interaction logs, preferred defaults, and multi-preset "instrument" libraries.
- Decisions:
	- Telemetry + annotations stored in Firebase; data may be shared publicly, anonymized, with nonprofit disclaimer.
	- Names shown only on opt-in; aggregate counters for public dashboards.
	- Target Firebase free tier with dashboard showing quota usage.
- Todo: draft disclaimer/legal text, define opt-in flag, design quota dashboard tiles.

### 1.3 GUI/UX System (🧩)
- Slider/knob library selection, layout strategy for dense parameter space.
- Dedicated Martigli widget with waveform editor, inhale/exhale ratio control, live value display (period range 0.1–120 s; sine/saw/square/triangle).
- Documentation hooks: tooltips, modals, deep links to RDF entries, status bar for inline help.
- Decisions: must work on all screens, desktop is reference. English-first UI; provide translate helper.
- Todo: codify help/tooltip rules in UI kit.

### 1.4 Audio Engine Abstraction (🚧)
- Runtime switch between Web Audio API and Tone.js backends.
- Shared parameter model so Martigli modulation applies uniformly.
- Ensure low-latency scheduling for isochronous events and binaural offsets.
- Tests: compare left/right phase alignment, verify modulation depth ranges.
- Decisions: ship Web Audio baseline first (biosyncare engine reference); keep adapter interface ready for Tone.js.

### 1.5 Video Engine Abstraction (🧩)
- Toggle between Canvas baseline and optional engine (PixiJS / Three.js / p5.js).
- Quadrant-based blinking/oscillation tied to Martigli value; support particle trajectories.
- Need presets for visual scenes and parameter binding DSL similar to audio side.
- Decisions: Canvas baseline ships first; advanced engines follow once adapter ready.

### 1.6 Feature Toggles & Defaults (🧩)
- Save "instrument" default ranges per user; shareable bundles.
- Guard rails on value ranges (frequency, gain) with rationale documented in RDF.
- Need UX for scaling coefficients (linear vs exponential mapping).
- Decisions: multi-preset libraries w/ share capability; tie metrics to usage of each preset.

## 2. NSO / RDF Tooling

### 2.1 Semantic Graph Navigator (🧩)
- Graph view (Cytoscape/Graphology/NetworkX.js) with distinct edge styles for subclass vs property relations.
- Click-to-inspect sidebar showing labels, comments, relations, version info.
- Multi-version diffing so ontology updates remain trackable.

### 2.2 Annotation System (🧩)
- Comment threads on any URI, nested replies, moderation workflow.
- Store annotations in Firebase; sync to RDF as needed.
- Moderators scoped to ontologies/URIs/groups; need tooling for approvals.

### 2.3 RDF-Linked Documentation (🧩)
- Inline doc popovers in BSCLab linking to ontology definitions.
- Export snippets for offline review or PDF.
- Decisions: weekly RDF updates; lightweight diff visualization integrated.

## 3. Python Musical Structures

- Scripts leveraging PyPI `music` package (recommend editable install) to generate permutations.
- Export to JSON/RDF for loading as audio modulation sequences.
- Provide test fixtures verifying expected permutation cycles.
### 3.1 Change Ringing & Group Permutations (🚧)
- Scripts leveraging PyPI `music` package (recommend editable install) to generate permutations.
- Export to JSON/RDF for loading as audio modulation sequences (static assets in repo).
- Provide test fixtures verifying expected permutation cycles.
- Decisions: `music` package is first-party; license-clear to use all generated sequences.
- Scripts leveraging PyPI `music` package (recommend editable install) to generate permutations.
- Export to JSON/RDF for loading as audio modulation sequences.
- Provide test fixtures verifying expected permutation cycles.

### 3.2 Integration Pipeline (🧩)
- Define transport format between Python outputs and BSCLab (REST? static JSON?).
- UI hooks to browse and assign sequences to tracks/parameters.
- Decisions: keep backend-free; load static JSON/RDF, link to tracks via IDs.

## 4. Cross-Cutting Infrastructure

### 4.1 Documentation Hub (🚧)
- Files in place: `docs/Agents.md`, `docs/clarifications.md`, `docs/prior_art.md`.
- Keep README links updated as docs evolve.

### 4.2 Testing & QA (🧩)
- Strategy for regression tests on audio/video engines and Firebase rules (maybe Playwright + mock audio nodes).
- Automated sanity checks: ensure previous functionality remains intact (aligns with README rule #1).
- Decisions: include telemetry dashboard checks (quotas, KPI metrics) as part of regression suite.

### 4.3 Deployment (🧩)
- GitHub Pages pipeline for static assets + PWA manifest updates.
- Versioning scheme for ontology data and musical libraries.
- Decisions: weekly RDF releases need matching deploy cadence; include telemetry + disclaimer updates.

## Immediate Next Steps
1. Implement Firebase persistence first (per clarified priorities), then BSCLab UI tied to presets, then migrate/simplify biosyncare algorithms.
2. Stand up telemetry disclaimer + quota dashboard.
3. Define Martigli widget UI spec with validated ranges/waveforms and session mode toggle.

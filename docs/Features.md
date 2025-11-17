# BioSynCare Lab Feature Backlog

Status legend: ✅ implemented · 🚧 in progress · 🧩 scoped (needs design) · ❓ needs clarification

**Simplicity directive:** every feature must shrink total surface area whenever possible—favor fewer files, flatter hierarchies, reusable primitives, and reversible experiments. New work should justify any line-count growth and note the deletion path for legacy code.

## 1. BSCLab Client Application

### 1.1 Session & Track Management (🧩)
- CRUD for sessions and tracks, including presets and live editing of parameters (frequency, gain, panning).
- Snapshot feature that captures current state (see sample JSON in `README.md`).
- Persist martigli/breathing parameters with every session.
- Open questions: versioning of presets, undo/redo requirements, multi-user editing expectations.

### 1.2 Firebase Persistence & Telemetry (❓)
- Realtime reporting of interactions (opens, creates, deletes, parameter changes).
- User authentication + personas with Firestore security rules.
- Storage schema for presets, interaction logs, and preferred defaults.
- Open questions: retention policy, anonymization, quota limits.

### 1.3 GUI/UX System (❓)
- Slider/knob library selection, layout strategy for dense parameter space.
- Dedicated Martigli widget with waveform editor, inhale/exhale ratio control, live value display.
- Documentation hooks: tooltips, modals, deep links to RDF entries.
- Open questions: responsive design targets, accessibility constraints (WCAG level?).

### 1.4 Audio Engine Abstraction (🧩)
- Runtime switch between Web Audio API and Tone.js backends.
- Shared parameter model so Martigli modulation applies uniformly.
- Ensure low-latency scheduling for isochronous events and binaural offsets.
- Tests: compare left/right phase alignment, verify modulation depth ranges.

### 1.5 Video Engine Abstraction (🧩)
- Toggle between Canvas baseline and optional engine (PixiJS / Three.js / p5.js).
- Quadrant-based blinking/oscillation tied to Martigli value; support particle trajectories.
- Need presets for visual scenes and parameter binding DSL similar to audio side.

### 1.6 Feature Toggles & Defaults (❓)
- Save "instrument" default ranges per user; shareable bundles.
- Guard rails on value ranges (frequency, gain) with rationale documented in RDF.
- Need UX for scaling coefficients (linear vs exponential mapping).

## 2. NSO / RDF Tooling

### 2.1 Semantic Graph Navigator (🧩)
- Graph view (Cytoscape/Graphology/NetworkX.js) with distinct edge styles for subclass vs property relations.
- Click-to-inspect sidebar showing labels, comments, relations, version info.
- Multi-version diffing so ontology updates remain trackable.

### 2.2 Annotation System (🧩)
- Comment threads on any URI, nested replies, moderation workflow.
- Possibly store annotations back in Firestore or dedicated RDF dataset.
- Need permissions model for specialists vs end users.

### 2.3 RDF-Linked Documentation (❓)
- Inline doc popovers in BSCLab linking to ontology definitions.
- Export snippets for offline review or PDF.

## 3. Python Musical Structures

### 3.1 Change Ringing & Group Permutations (🧩)
- Scripts leveraging PyPI `music` package (recommend editable install) to generate permutations.
- Export to JSON/RDF for loading as audio modulation sequences.
- Provide test fixtures verifying expected permutation cycles.

### 3.2 Integration Pipeline (❓)
- Define transport format between Python outputs and BSCLab (REST? static JSON?).
- UI hooks to browse and assign sequences to tracks/parameters.

## 4. Cross-Cutting Infrastructure

### 4.1 Documentation Hub (🚧)
- Future files: `docs/Agents.md`, `docs/clarifications.md`, `docs/prior_art.md`.
- Link from `README.md` once stabilized.

### 4.2 Testing & QA (❓)
- Strategy for regression tests on audio/video engines and Firebase rules (maybe Playwright + mock audio nodes).
- Automated sanity checks: ensure previous functionality remains intact (aligns with README rule #1).

### 4.3 Deployment (🧩)
- GitHub Pages pipeline for static assets + PWA manifest updates.
- Versioning scheme for ontology data and musical libraries.

## Immediate Next Questions
1. Confirm priority order for BSCLab vs RDF vs Python tracks.
2. Approve default tech stacks (Tone.js vs Web Audio, Canvas vs Pixi/Three, Cytoscape vs alternatives).
3. Provide access or archive links to previous implementations (biosyncare.github.io, etc.) for code reuse analysis.

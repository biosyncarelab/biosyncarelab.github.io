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
- Dedicated Martigli widget with waveform editor, inhale/exhale ratio control, live value display (period range 0.1–120 s; sine/saw/square/triangle) plus real-time period overrides so users can lengthen/shorten breathing at any moment.
- Documentation hooks: tooltips, modals, deep links to RDF entries, status bar for inline help.
- Decisions: must work on all screens, desktop is reference. English-first UI; provide translate helper.
- Todo: codify help/tooltip rules in UI kit.

### 1.4 Audio Engine Abstraction (🚧)
- Runtime switch between Web Audio API and Tone.js backends.
- Shared parameter model so Martigli modulation applies uniformly.
- Ensure low-latency scheduling for isochronous events and binaural offsets.
- Tests: compare left/right phase alignment, verify modulation depth ranges.
- Decisions: ship Web Audio baseline first (biosyncare engine reference); keep adapter interface ready for Tone.js.
- Current work: `scripts/structures.js::AudioEngine` handles Web Audio preview + cleanup; extend it to full session playback and Martigli modulation hooks.

### 1.5 Video Engine Abstraction (🧩)
- Toggle between Canvas baseline and optional engine (PixiJS / Three.js / p5.js).
- Quadrant-based blinking/oscillation tied to Martigli value; support particle trajectories.
- Sentence-collection tracks render guidance text in the background, synced to Martigli tempo and optionally linked to audio narration.
- Need presets for visual scenes and parameter binding DSL similar to audio side.
- Decisions: Canvas baseline ships first; advanced engines follow once adapter ready.
- Current work: `scripts/structures.js::VideoEngine` stores Martigli-aware layers; next milestone is rendering a visible canvas and binding to dashboard modals.

### 1.6 Feature Toggles & Defaults (🧩)
- Save "instrument" default ranges per user; shareable bundles.
- Guard rails on value ranges (frequency, gain) with rationale documented in RDF.
- Need UX for scaling coefficients (linear vs exponential mapping).
- Decisions: multi-preset libraries w/ share capability; tie metrics to usage of each preset.

### 1.7 Conversational Session Assistant (🧩)
- Embedded AI chat that captures user feelings/goals and generates session presets.
- Suggests track lists, breathing shapes, and parameter tweaks while citing ontology concepts.
- Must log prompts/responses for auditability and let users accept, tweak, or discard suggestions.
- Safety rails to prevent invalid parameter ranges; integrates with preset CRUD (1.1).

### 1.8 Multi-User Sessions & Presence (🧩)
- Scheduling layer so users across timezones can start synchronized sessions with countdowns.
- Allow mid-session joins with state sync and ownership/precedence rules for edits.
- Track lifecycle events (create/join/end/interact) for analytics; evaluate optional chat/mic/cam support (decision pending).
- Requires presence indicators, notifications, and simple conflict resolution UI.

### 1.9 Guided Sentence Audio Tracks (🧩)
- Mirror sentence collections as audio tracks via TTS or recorded narrations.
- Provide asset pipeline (text sources, TTS voices, uploads) and sync sentences with Martigli tempo.
- UI needs library selection, preview, and mix controls per track.

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

### 2.4 NSO-Driven Session Creator (🧩)
- Allow users to build sessions directly from the NSO Navigator: pick an isochronous-sound concept/triple, read its definition + related links, then instantiate tracks using the isochronous model/presets.
- Trigger a DJ-style audiovisual preview so the selected ontology bundle immediately renders as a neurosensory session sketch.
- Todo: spec the cross-link between navigator nodes and the session builder (data contract, preset mapping, visualization cues).

## 3. Python Musical Structures

### 3.1 Change Ringing & Group Permutations (✅)
- Scripts leveraging PyPI `music` package (v1.0.0b5) to generate permutations.
- Export to JSON/RDF for loading as audio modulation sequences (static assets in repo).
- Provide test fixtures verifying expected permutation cycles.
- Decisions: `music` package is first-party; license-clear to use all generated sequences.
- Current asset: `data/structures/community-alpha-change-ringing.json` (plain-hunt rows for 4/6 bells, loops to rounds).
- New assets: `data/structures/symmetry-lines.json` (mirror/rotation sweeps) and `data/structures/martigli-following-sequences.json` (phase-aligned orderings).
- **Generated outputs** (2025-11-20):
  - Raw peal files: 4 plain-changes peals (3-6 bells, 6-120 rows each)
  - Comprehensive export: `external/biosyncare/scripts/music/output/musicStructures.json` (770KB)
    - 4 change-ringing library entries + 1 additional (7 bells)
    - 14 unique permutation families
    - 4 symmetric group catalogs (S₃ through S₆)
    - 4 symmetry structures with rotation/mirror/dihedral generators
  - Compact version: `musicStructures.compact.json` (58KB) for frontend integration
  - Minified versions available for production use

### 3.2 Integration Pipeline (✅)
- Transport format: static JSON files synced to `data/structures/` directory.
- Sync command: `make web-sync-music-data` copies compact export to frontend.
- UI hooks to browse and assign sequences to tracks/parameters.
- Decisions: keep backend-free; load static JSON/RDF, link to tracks via IDs.
- Loader enhanced to handle both curated (1-based) and comprehensive (0-based) formats.

### 3.3 Export Schema & Loader (✅)
- Format shape (1-based rows; convert to 0-based in UI):
	- `id`, `label`, `description`
	- `source`: `method`, `library`, `generator`, `generated`, `notes`
	- `sequences[]`: `id`, `label`, `orderDimension`, `rows[][]`, `loop`
- Loader: `scripts/structures-loader.js` exports `loadStructures(url)` → adds `rowsZeroBased`, and `getSequence(structures, id)`.
- Fixtures: `tests/structures.test.mjs` and `tests/comprehensive-structures.test.mjs` verify integrity.
- Current work: `scripts/structures.js::StructureStore` caches the JSON payload and feeds the dashboard modal; still need Firestore-backed selection flows.
- Assets now include `data/structures/martigli-following-sequences.json` and `data/structures/symmetry-lines.json`; the manifest exposes them all so the GUI can preview Martigli-following and symmetry datasets in addition to change ringing.
- **Visualizer**: `structure-visualizer.html` provides standalone exploration UI with color-coded sequences, statistics, and permutation family/symmetry structure metadata (2025-11-20).

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

### 4.4 Global Neurosensory Registry & Standards (🧩)
- Provide submission workflow for initiatives to register practices, devices, and services (with metadata + compliance info).
- Generate public recommendation pages and authority-ready packets (similar to W3C notes) based on aggregated data.
- Offer moderation, verification, and export tools so stakeholders can engage regulators and health authorities.
- Tie registry entries back to RDF concepts for discoverability.

## Immediate Next Steps
1. Implement Firebase persistence first (per clarified priorities), then BSCLab UI tied to presets, then migrate/simplify biosyncare algorithms.
2. Stand up telemetry disclaimer + quota dashboard.
3. Define Martigli widget UI spec with validated ranges/waveforms, instant override controls, session mode toggle, and conversational assistant entrypoints.

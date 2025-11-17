# AI Agent Playbooks

These briefs align with the principles in `README.md`: keep diffs small, define specs first, and coordinate agents before touching code. Measure success primarily by how much simpler, shorter, and flatter the codebase becomes after each contribution.

## Shared Guardrails
- Always validate that new work preserves existing functionality; rerun relevant checks after each change.
- Prefer Make targets for essential workflows (`make firebase-login`, `make seed-local`, `make deploy-firestore-rules`, `make test`, etc.) so commands stay reproducible across agents.
- The dashboard now exposes a direct "Open NSO Navigator" link; use it when coordinating ontology tasks so users can reach `nso-navigator.html` from the main UI.
- Prefer simplifying or deleting code over adding complexity; document why additions are unavoidable.
- Track line counts and file additions in every PR; if the diff grows, explain the payback plan (e.g., forthcoming deletions, consolidation).
- Keep specs (`docs/Features.md`, clarifications log) in sync with implementation decisions.
- Record assumptions; if anything is unclear, append to the clarifications list before coding.
- Respect clarified priorities: 1) Firebase persistence, 2) BSCLab UI tied to Firebase, 3) migrate biosyncare algorithms with simplification.

## Current Focus Pods (Nov 2025)

| Pod | Scope | Immediate Backlog |
| --- | ----- | ----------------- |
| **BSCLab GUI & Engines** (UI + Martigli + Video agents in a single squad) | End-to-end session/preset dashboard, Martigli widget, audio/video algorithms, Firebase-driven state management | 1) Flesh out the dashboard using the seeded `sessions`/`presets` (list + detail modal). 2) Land the Martigli inspector card with live overrides. 3) Port the binaural/isochronous engines from legacy repo, keeping Web Audio baseline tiny before layering Tone.js/Pixi adapters. |
| **Python Structures** | `music` package workflows that emit JSON/RDF artifacts for sequences and symmetry lines | 1) Reproduce the canonical change-ringing peals as deterministic JSON exports. 2) Document the export schema + provenance in `docs/Features.md`. 3) Provide a minimal loader for the UI pod (static import first, Firestore later). |
| **RDF Navigator** | Ontology browser, annotation UX, registry linkages | 1) Prototype Cytoscape-based viewer pointed at `rdf/core/bsc-owl.ttl`. 2) Ship URI detail sidebar with comments stored in Firestore. 3) Surface ontology links inside the BSCLab dashboard cards for traceability. |
| **Testing & QA** | Owns regression cadence across pods (structures, Playwright smoke, rules) | 1) Ensure `npm test` (structures + Playwright) stays green on pushes/PRs. 2) Add/maintain fixtures when new sequence exports land. 3) Raise targeted issues to owning pods when failures arise; keep summaries concise. |

Pods can rotate contributors, but always announce hand-offs in the clarifications doc to keep responsibilities visible.

- **Mandate:** Build the client-side PWA (sessions, tracks, audio/video controls, documentation hooks).
- **Inputs:** Feature entries 1.x, approved UI wireframes, Firestore schema, Martigli parameter ranges.
- **Deliverables:** Modular UI components, audio/video engine integration, Firebase wiring, UX copy tied to RDF entries, conversational-assistant surfaces, multi-user scheduling/presence UI.
- **Stack preferences:** Start with vanilla + lightweight components; baseline Web Audio + Canvas first, then add Tone.js/Pixi adapters.
- **Key checks:** Cross-browser audio timing, responsive layout (desktop reference), translation helper UX, Martigli widget respecting 0.1–120 s + waveforms with instant overrides, smooth entry to collaborative sessions.

## Agent: Firebase & Telemetry
- **Mandate:** Authentication, Firestore rules, event logging, preset storage.
- **Inputs:** Data models from README/Features doc, security requirements, quota constraints, multi-user scheduling requirements.
- **Deliverables:** Firestore collections, rule set, multi-preset libraries, telemetry dashboard (quota usage, KPIs), disclaimer/legal copy, presence/scheduling services, registry submissions, conversational-assistant logs.
- **Key checks:** Rules unit tests, anonymization, opt-in name sharing, quota monitoring, offline persistence strategy, conflict-resolution enforcement for collaborative edits.

## Agent: Martigli & Audio Algorithms
- **Mandate:** Implement breathing/Martigli oscillator, modulation routing, audio synthesis primitives (binaural, isochronous, symmetry lines).
- **Inputs:** Mathematical definitions in README/docs, parameter ranges, integration contracts from UI agent, guidance sentence libraries.
- **Deliverables:** Engine-agnostic parameter graph, modulation DSL (`value = base + coeff * martigli`), presets, guided-sentence audio tracks (TTS/recorded) with sync metadata.
- **Key checks:** Numerical stability, aliasing limits, automation smoothing, Web Audio baseline parity with future Tone.js adapter, safe TTS integration.

## Agent: Testing & QA
- **Mandate:** Run and evolve the regression net across pods.
- **Inputs:** Repo test scripts (`npm test` → structures + Playwright), new data exports, Firestore rule changes.
- **Deliverables:** Green `npm test` on pushes/PRs, quick fixtures for new sequence assets, issue pings to owning pods with minimal repro.
- **Key checks:** Structures/loader integrity, Playwright smoke stability under emulators, clear pass/fail summaries in CI logs.

## Agent: Video & Visualizations
- **Mandate:** Quadrant blinks, oscillations, particle trajectories driven by Martigli values.
- **Inputs:** Visual spec, engine selection (Canvas baseline + optional advanced engine), parameter contracts.
- **Deliverables:** Visual scenes, performance budget guidelines, hooks for documentation overlays, sentence-track rendering (background guidance text synced to Martigli/AIs).
- **Key checks:** Frame-sync with audio, accessibility (flash frequency limits), GPU/CPU usage caps, clean switch from Canvas baseline to Pixi/Three/p5 when ready, readability of text overlays.

## Agent: RDF/NSO Navigator
- **Mandate:** Build ontology viewer/editor with annotations.
- **Inputs:** RDF datasets in `rdf/`, requirements section 2 in README, tooling decisions (Cytoscape/etc).
- **Deliverables:** Graph exploration UI, URI inspector panel, comment system, version diff view.
- **Deliverables (expanded):**
	- Deep-link router so `nso-navigator.html?concept=<URI>&ontology=<id>` selects the node, opens the inspector, and exposes definition + annotation threads + relation badges by default.
	- Lightweight summary service (precomputed JSON or Firestore doc) that surfaces `label`, `definition/comment snippet`, and `related[]` so dashboard/tooltips can show a preview without parsing the OWL on the fly.
	- Commenting UI already planned; ensure deep links land on the same thread list so “Add comment” is one click away from dashboard context.
- **Key checks:** Handles seed RDF sizes now, scales with weekly updates, caching strategy, clear visual differentiation of relation types, moderator tooling tied to Firebase roles, **plus a shareable URI surface** (deep-linkable viewer panels so `...#BinauralBeats` opens inside the Navigator instead of force-downloading the OWL file) and hover-ready summaries (definition fallback string when none exists).

## Agent: Documentation & Knowledge Ops
- **Mandate:** Maintain `README.md`, `docs/*.md`, changelogs, clarifications, prior-art findings.
- **Inputs:** Updates from all agents, stakeholder feedback.
- **Deliverables:** Up-to-date documentation, Q&A backlog, decision records, onboarding guides.
- **Key checks:** Docs stay concise, cross-link nicely, reflect current implementation status; close clarifications once actioned and link to commits.

## Agent: Conversational Session Assistant
- **Mandate:** Build and maintain the AI chat workflow that captures user intent and generates/edit session presets safely.
- **Inputs:** Prompt templates, safety rules, ontology-backed explanations, telemetry feedback.
- **Deliverables:** Prompt/response pipelines, validation hooks before presets are saved, audit logs, fallback UX when AI suggestions fail.
- **Key checks:** Parameter bounds respected, reproducibility of generated sessions, latency targets, privacy of user narratives.

## Agent: Standards & Registry
- **Mandate:** Operate the global Neurosensory Stimulation registry and recommendation publishing workflow.
- **Inputs:** Submission schemas, verification rules, authority requirements, RDF mappings.
- **Deliverables:** Submission portal UI, moderation tooling, exportable reports/whitepapers, links from registry entries to ontology concepts.
- **Key checks:** Data accuracy, compliance with disclosure requirements, scalable moderation queue, alignment with simplicity directive (avoid bloated workflows).

## Agent: Python Musical Structures
- **Mandate:** Use the `music` package (and other math libraries if required) to generate change-ringing peals, group permutations, and other sequences.
- **Inputs:** Desired sequence specs, export formats, integration expectations from UI/audio agents.
- **Deliverables:** Reusable Python scripts/notebooks, JSON/RDF exports, unit tests verifying permutations.
- **Key checks:** Deterministic outputs, traceable provenance, static JSON/RDF artifacts kept small and versioned with repo.

## Collaboration Protocol
1. Start from `docs/Features.md` to pick scoped tasks; confirm open questions before coding.
2. Update clarifications/decisions docs after every major insight; notify dependent agents.
3. Keep branches small; ship vertical slices (e.g., Martigli widget + minimal backend hook) to avoid drift.
4. After merges, ensure deployment checklist (tests, lint, build) passes and update documentation references.

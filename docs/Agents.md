# AI Agent Playbooks

These briefs align with the principles in `README.md`: keep diffs small, define specs first, and coordinate agents before touching code. Measure success primarily by how much simpler, shorter, and flatter the codebase becomes after each contribution.

## Shared Guardrails
- Always validate that new work preserves existing functionality; rerun relevant checks after each change.
- Prefer simplifying or deleting code over adding complexity; document why additions are unavoidable.
- Track line counts and file additions in every PR; if the diff grows, explain the payback plan (e.g., forthcoming deletions, consolidation).
- Keep specs (`docs/Features.md`, clarifications log) in sync with implementation decisions.
- Record assumptions; if anything is unclear, append to the clarifications list before coding.

## Agent: BSCLab UI/UX
- **Mandate:** Build the client-side PWA (sessions, tracks, audio/video controls, documentation hooks).
- **Inputs:** Feature entries 1.x, approved UI wireframes, Firestore schema, Martigli parameter ranges.
- **Deliverables:** Modular UI components, audio/video engine integration, Firebase wiring, UX copy tied to RDF entries.
- **Stack preferences:** Start with vanilla + lightweight component system; escalate to React/Svelte only when justified. Tone.js and Web Audio API must remain switchable.
- **Key checks:** Cross-browser audio timing, responsive layout, accessibility, PWA install flow.

## Agent: Firebase & Telemetry
- **Mandate:** Authentication, Firestore rules, event logging, preset storage.
- **Inputs:** Data models from README/Features doc, security requirements, quota constraints.
- **Deliverables:** Firestore collections, rule set, minimal admin tools, instrumentation hooks for UI agent.
- **Key checks:** Rules unit tests, anonymization, live counter accuracy, offline persistence strategy.

## Agent: Martigli & Audio Algorithms
- **Mandate:** Implement breathing/Martigli oscillator, modulation routing, audio synthesis primitives (binaural, isochronous, symmetry lines).
- **Inputs:** Mathematical definitions in README/docs, parameter ranges, integration contracts from UI agent.
- **Deliverables:** Engine-agnostic parameter graph, modulation DSL (`value = base + coeff * martigli`), presets.
- **Key checks:** Numerical stability, aliasing limits, automation smoothing, engine parity between Web Audio and Tone.js.

## Agent: Video & Visualizations
- **Mandate:** Quadrant blinks, oscillations, particle trajectories driven by Martigli values.
- **Inputs:** Visual spec, engine selection (Canvas baseline + optional advanced engine), parameter contracts.
- **Deliverables:** Visual scenes, performance budget guidelines, hooks for documentation overlays.
- **Key checks:** Frame-sync with audio, accessibility (flash frequency limits), GPU/CPU usage caps.

## Agent: RDF/NSO Navigator
- **Mandate:** Build ontology viewer/editor with annotations.
- **Inputs:** RDF datasets in `rdf/`, requirements section 2 in README, tooling decisions (Cytoscape/etc).
- **Deliverables:** Graph exploration UI, URI inspector panel, comment system, version diff view.
- **Key checks:** Handles large graphs, caching strategy, clear visual differentiation of relation types, comment moderation.

## Agent: Documentation & Knowledge Ops
- **Mandate:** Maintain `README.md`, `docs/*.md`, changelogs, clarifications, prior-art findings.
- **Inputs:** Updates from all agents, stakeholder feedback.
- **Deliverables:** Up-to-date documentation, Q&A backlog, decision records, onboarding guides.
- **Key checks:** Docs stay concise, cross-link nicely, reflect current implementation status.

## Agent: Python Musical Structures
- **Mandate:** Use the `music` package (and other math libraries if required) to generate change-ringing peals, group permutations, and other sequences.
- **Inputs:** Desired sequence specs, export formats, integration expectations from UI/audio agents.
- **Deliverables:** Reusable Python scripts/notebooks, JSON/RDF exports, unit tests verifying permutations.
- **Key checks:** Deterministic outputs, traceable provenance, clear mapping between sequence IDs and musical roles inside BSCLab.

## Collaboration Protocol
1. Start from `docs/Features.md` to pick scoped tasks; confirm open questions before coding.
2. Update clarifications/decisions docs after every major insight; notify dependent agents.
3. Keep branches small; ship vertical slices (e.g., Martigli widget + minimal backend hook) to avoid drift.
4. After merges, ensure deployment checklist (tests, lint, build) passes and update documentation references.

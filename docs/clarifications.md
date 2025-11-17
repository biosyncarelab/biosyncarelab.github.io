# Clarifications Backlog

Last updated: 2025-11-17. Every previously open question now has an explicit decision so implementers can move forward. Keep pruning this list—when a clarification feeds into code/docs, add the link and remove the entry.

## BSCLab Client Application
1. **Preset lifecycle** _(resolved 2025-11-17)_ — Keep biosyncare's lightweight snapshot model: one latest preset per user with `createdAt`/`updatedAt` metadata; no full version tree or undo stack. _Action:_ reflect schema in `docs/Features.md` 1.1 and Firestore model.
2. **Collaboration expectations** _(resolved 2025-11-17)_ — Support two modes: owner-only edits and collaborative sessions where conflicts resolve by user precedence (arrival/role priority). _Action:_ document precedence rules and expose mode toggle in session settings.
3. **Martigli parameters** _(resolved 2025-11-17)_ — Period range 0.1–120 s, basic waveforms (sine/saw/square/triangle). Reference `Martigli Breathing Signal Processor - AudioWorklet` for implementation; keep it minimal. _Action:_ encode limits + waveform list in UI + validation.
4. **GUI density** _(resolved 2025-11-17)_ — Must function on all screen sizes; desktop is the reference layout. _Action:_ prioritize responsive design with desktop-first mocks.
5. **Audio/video engines** _(resolved 2025-11-17)_ — Ship Web Audio + Canvas baseline first, then add Tone.js and Pixi/Three/p5 parity later. _Action:_ design clean engine interfaces to allow the future adapters.
6. **Feature toggles** _(resolved 2025-11-17)_ — Extend to multi-preset "instrument" libraries with sharing support. _Action:_ add preset library UX spec + Firestore structure.

## Firebase & Telemetry
7. **Data retention** _(resolved 2025-11-17)_ — Data remains open/anonymized for community insight; include nonprofit disclaimer and note that datasets may be shared publicly. Add GDPR/legal pointers if needed. _Action:_ draft disclaimer text + retention policy doc.
8. **Privacy** _(resolved 2025-11-17)_ — Only expose names when users opt in; aggregate realtime counters (tracks created, sessions launched, deletions, etc.). _Action:_ add opt-in flag + aggregation logic to telemetry spec.
9. **Quota & pricing** _(resolved 2025-11-17)_ — Target Firebase free tier initially; add a dashboard showing usage vs quota and projected costs. _Action:_ spec telemetry dashboard tiles.

## Documentation & UX Hooks
10. **Inline help** _(resolved 2025-11-17)_ — Use hover/click affordances, tooltips, status bar, and contextual links to docs/RDF without clutter. _Action:_ define help guidelines in UI kit.
11. **Localization** _(resolved 2025-11-17)_ — English-first; assist users in enabling browser translation (e.g., Google Translate widget) rather than shipping localized copy now. _Action:_ add optional translate helper component.

## RDF / NSO Tooling
12. **Graph size** _(resolved 2025-11-17)_ — Start with current datasets under `rdf/` as baseline; treat as seed that will grow. _Action:_ run node/edge counts to inform graph library choice while keeping footprint small.
13. **Annotations** _(resolved 2025-11-17)_ — Store comments in Firebase as soon as possible; allow moderators scoped to ontologies/URIs. _Action:_ extend Firebase schema + roles for moderation.
14. **Versioning cadence** _(resolved 2025-11-17)_ — Publish new RDF dumps roughly weekly after expert interviews, with lightweight diff visualization preferred. _Action:_ plan weekly pipeline + diff tooling.

## Python Musical Structures
15. **Delivery format** _(resolved 2025-11-17)_ — Bundle canonical sequences as static JSON/RDF files (concise representations) to stay backend-free. _Action:_ define file format + location in repo.
16. **Scale & licensing** _(resolved 2025-11-17)_ — Use as many sequences as needed; the `music` package is first-party so licensing is clear. _Action:_ script exports + reference IDs for UI.

## Cross-Project
17. **Priority order** _(resolved 2025-11-17)_ — Sequence work: (a) Firebase comms/persistence, (b) BSCLab UI tied to presets + Firebase, (c) migrate/simplify biosyncare algorithms. _Action:_ reflect order in roadmap / Features doc.
18. **Legacy assets** _(resolved 2025-11-17)_ — All referenced repos were authored in-house, so reuse is allowed. _Action:_ when porting, still honor simplicity directive (adapter wrappers, etc.).
19. **Success metrics** _(resolved 2025-11-17)_ — Track feedback submissions, interaction counts, most-used sessions/tracks, etc. _Action:_ add metrics list to telemetry backlog.

- **Pod kickoff log** _(added 2025-11-17)_ — Whenever a pod (GUI/Engines, Python Structures, RDF Navigator) starts or pauses work, add a bullet here summarizing the date, pod name, scope slice, and owning AI agent. This keeps ownership visible for hand-offs.
- **Checklist discipline** _(added 2025-11-17)_ — Each pod maintains a 3–5 bullet “Next Actions” list inside `README.md` (section 1 for GUI/Engines, section 3 for Python Structures, section 2 for RDF Navigator). Update it after every push so other agents can pick up instantly.
- **Inter-agent requests** _(added 2025-11-17)_ — When a pod needs assistance or input from another pod, add a bolded `**Request:**` entry under the relevant pod’s “Next Actions” list in `README.md`, tagging the target pod and describing the ask. The receiving pod clears the request once addressed.
- **Merge cadence** _(added 2025-11-17)_ — Commit/merge order stays: (1) GUI/Engines vertical slices, (2) Python data exports feeding UI, (3) RDF navigator updates. Later pods should branch from the latest GUI/Engines commit to avoid rebase churn.

No open clarifications remain. Add new entries only when blockers appear, and drop resolved ones once the corresponding docs/code are linked.

# Clarifications Backlog

Track unresolved questions before coding. Close each item by linking to the PR or document that answers it. Prefer deleting questions over letting them age.

## BSCLab Client Application
1. **Preset lifecycle:** What versioning or snapshot history is required for sessions/tracks? Is undo/redo mandatory?
2. **Collaboration expectations:** Do multiple users edit the same session simultaneously? If so, what conflict strategy is acceptable?
3. **Martigli parameters:** Confirm min/max periods, waveform options, and validation rules for inhale/exhale ratios.
4. **GUI density:** Which breakpoints/devices must be first-class (mobile portrait, tablet, desktop)? Target accessibility level (WCAG AA?).
5. **Audio/video engines:** Are Web Audio API and Tone.js both required at launch, or can one ship as default with an adapter for the other? Same question for Canvas vs. advanced engines.
6. **Feature toggles:** Should users store multiple "instrument" presets, and can they share them publicly?

## Firebase & Telemetry
7. **Data retention:** How long must interaction logs live, and do we need GDPR-style deletion workflows?
8. **Privacy:** What anonymization or aggregation is required before exposing realtime counters? Any PII constraints?
9. **Quota & pricing:** Expected active-user counts and write frequencies determine Firestore plan—need ballpark numbers.

## Documentation & UX Hooks
10. **Inline help:** Should the app open full docs, tooltips, or RDF entries in-app? How intrusive can guidance be?
11. **Localization:** Are multiple languages required, or is English-only acceptable initially?

## RDF / NSO Tooling
12. **Graph size:** Largest expected ontology size (node/edge counts) to size rendering strategy?
13. **Annotations:** Who may comment? Are comments public, private, or role-restricted? Need moderation/flagging?
14. **Versioning:** How often do we publish new ontology files, and do we need automated diffs or manual review first?

## Python Musical Structures
15. **Delivery format:** Should sequences ship as static JSON checked into the repo, generated on-demand, or served via API?
16. **Scale:** How many permutations/peals should be available at launch? Any licensing concerns for sourced data?

## Cross-Project
17. **Priority order:** Should we focus on BSCLab UI, RDF tooling, or Python pipelines first?
18. **Legacy assets:** Which previous deployments (biosyncare.github.io, aeterni.github.io, etc.) are approved for code or design reuse? Are there licensing or attribution requirements?
19. **Success metrics:** Besides simplicity, what KPIs (sessions launched, annotation count, etc.) should instrumentation track?

Append new questions with timestamps and owners; archive resolved entries with links to decisions.

# Clarifications Backlog

Track unresolved questions before coding. Close each item by linking to the PR or document that answers it. Prefer deleting questions over letting them age.

## BSCLab Client Application
1. **Preset lifecycle:** Default to biosyncare's lightweight snapshot approach—single latest preset stored per user with optional timestamp history. Need confirmation if full version tree / undo is required or if "latest + manual export" suffices.
R: no need for full version tree for presets. It should have the data for when it was created and when updated, though.
2. **Collaboration expectations:** Do multiple users edit the same session simultaneously? If so, what conflict strategy is acceptable?
R: There should be at least one mode in which the creator of the session is the only one to edit the session parameters, be them transmitted/broadcasted on the fly or not. There should be at least another mode in which more than one user, potentially all users in the session, may edit its parameters. In this mode, the system manages conflicts with a simple strategy, such as establishing a user precedence or priority, because usage or arrival in the session, so that if there is a conflict, the change by the user with the highest precedence wins.
3. **Martigli parameters:** Confirm min/max periods, waveform options, and validation rules for inhale/exhale ratios.
R: A breathing cycle might go from what? 0.1s to what? 120s? These might be reasonable min max periods.
Waveforms use the basic sine saw square triangle.
You might want to look at the
`Martigli Breathing Signal Processor - AudioWorklet`
in the biosyncare.github.io repo. Make it as simple as possible. The concept of the Martigli oscillation is simple.
4. **GUI density:** Which breakpoints/devices must be first-class (mobile portrait, tablet, desktop)? Target accessibility level (WCAG AA?).
R: it should work perfectly in any screen. If needed to choose, the desktop is the complete and default paradigm.
5. **Audio/video engines:** README rule says both Web Audio API and Tone.js should stay available, but can we ship biosyncare's Web Audio baseline first, then add Tone.js parity? Same question for Canvas baseline before Pixi/Three optional engines.
R: yep, start a version using only Web Audio and Canvas. Then we'll add the functions using Tone.js and Pixi/Three/p5.
6. **Feature toggles:** Biosyncare stores per-user "instrument" defaults locally. Should BSCLab extend that to multi-preset libraries with sharing, or keep it single-profile until Firebase multi-tenancy is ready?
R: extend it to multi-preset libraries.

## Firebase & Telemetry
7. **Data retention:** Biosyncare keeps reports client-side + optional Firebase. For BSCLab, do we persist telemetry for 30/90 days or indefinitely? Any GDPR deletion/portability promises?
R: The data collected is open to the user herself and is used to guide the user and the users themselves in using BSCLab. As it is open source, and uses open standards, and allows for the users to study themselves, I would go with a Disclaimer that it is a non-profit initiative and that the data is available to anyone, anonymized, for guiding scientific knowledge and usege by practicioners and those in need. If needed to add any mention to GDPR or the like, or any legal note, do so or help me to do so.
8. **Privacy:** What anonymization or aggregation is required before exposing realtime counters? Any PII constraints?
R: Anonym: names not revealed if user didn't check the box to share with name. Aggregation: how many tracks created/started, how many sessions started, how many tracks removed, etc.
9. **Quota & pricing:** Expected active-user counts and write frequencies determine Firestore plan—need ballpark numbers.
R: I hope the cost will be zero while I don't have any money input from investors. The usage of Firebase in the projects I created didn't need any payment to work, we can count on the free services to start. It would be nice to have a central with the total usage of the Firebase resources and how near we are to paying for anything and the prices.

## Documentation & UX Hooks
10. **Inline help:** Should we replicate biosyncare's diagnostics/doc links (modals/tooltips) or embed RDF viewer snippets inline? How much UI chrome is acceptable before it clutters the minimal surface?
R: where reasonable, make a text or visual element hoverable and/or clickable. Key information should be displayed as a tooltip, or in an information bar/field, and/or it should open a page related to the element clicked. Use it smartly, e.g. though maintaining a statusbar, and with criteria to avoid cluttering the interface.
11. **Localization:** README and prior art show multilingual widgets (Google Translate). Do we replicate that auto-translate approach or ship English-first with a roadmap for localized copy?
R: English first. Help user activate translation if wanted.

## RDF / NSO Tooling
12. **Graph size:** biosyncare repos ship OWL/SKOS files—need concrete node/edge counts to decide between lightweight canvas vs heavier graph libs (graphology/cytoscape) while preserving simplicity.
R: look at the files in the `rdf/` folder. Consider it as the seed, only the starting RDF data.
13. **Annotations:** Should RDF comments reuse biosyncare's optional Firebase (tying entries to Google auth) or stay offline? Do specialists get moderation rights?
R: The annotation made by BSCLab users should be kept in sync with the Firebase/shared data as soon as possible. Comment moderation might be activated, and moderators might be linked to an ontology or vocabulary, or to individual URIs, or collection of classes/concepts.
14. **Versioning:** How frequently will new RDF dumps land (weekly? release-driven?) and do we automate diff visualizations to keep the UI lean?
R: New RDF versions should arrive ideally once a week following an interview with a specialits (e.g. a researcher or a product representative).

## Python Musical Structures
15. **Delivery format:** Favor biosyncare's zero-backend approach: can we bundle canonical sequences as static JSON (or RDF) in the repo, or do we need server-side generation for personalization?
R: we should bundle the sequences in JSON or RDF static files, favor short/sleem representations.
16. **Scale:** Minimum viable set of sequences? (biosyncare references change-ringing + symmetry permutations.) Need clarity on licensing for the `music` package outputs or any imported datasets.
R: I wrote the music package myself, you can use the generated sequences.

## Cross-Project
17. **Priority order:** With biosyncare as baseline, is the first milestone "bring BSCLab UI/audio to feature parity" before RDF + Python extras, or do stakeholders expect ontology tooling/Martigli libraries concurrently?
R: I would start with the data communication and persistence with Firebase. With that in place, I would start building the interface from scratch, with the sessions and track presets I/O to/from BSCLab/Firebase. Maybe migrating the algorithms from BioSynCare.github.io while simplifying them.
18. **Legacy assets:** Confirm licensing / attribution when reusing biosyncare assets (audio-engine, diagnostics) and whether aeterni/harmonicare code can be referenced only for patterns or directly vendored in.
R: I wrote all of the code in these cases, you can use them.
19. **Success metrics:** Besides simplicity, what KPIs (sessions launched, annotation count, etc.) should instrumentation track?
R: feedbacks given (about a preset, or a session, etc), interaction count (parameter change, button pressed, etc), most used session, most used track, etc.

Append new questions with timestamps and owners; archive resolved entries with links to decisions.

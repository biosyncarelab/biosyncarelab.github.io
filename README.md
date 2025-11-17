# biosyncarelab.github.io

I want to streamline writting applications with AI.
The main drawback I ì've been facing is when AI agents starts failing to
do what it says it is doing, and starts making the code more and more complex,
unparseable for the coder and for the AI, that thus becomes even more prompt to
reach wrong conclusions and bad outcomes in writting code and reaching specific results in the software.

Such an outcome is also a problem of client-side web programming.
We need to constant check if the functionalities work and if any of the previous functionalities have been removed.

In this context, the rules I derived and hope to allow for faster and better software development witn AI:
1) Aim at reducing and simplifying the code, use negative number of lines or smaller number of added lines as good characteristics.
2) Make the specifications and guiding documents before starting the software: which features should the software have, which tickets they entail? It can help to state audience and broader context to guide AI workings.
3) Describe the AI agents beforehand when possible, so that we can start working with agents in a coordinated way from the start.

## Working documents
- `docs/Features.md`: living backlog; now reflects resolved priorities (Firebase first, UI next, algorithm migration) and decisions on presets, Martigli ranges, engines, etc.
- `docs/Agents.md`: roles, guardrails, and collaboration rules updated with clarified mandates per subsystem.
- `docs/clarifications.md`: snapshot of resolved decisions (last update 2025-11-17); append new questions only when blockers appear.
- `docs/prior_art.md`: findings from earlier BSC deployments with explicit reuse decisions.

## Testing

To protect the simplicity of the codebase we rely on a single Playwright smoke suite that only checks what absolutely must keep working: the login shell loads, the primary actions render, and the default auth state initializes. Tests live under `tests/` and run against the static site via Python's built-in web server; expand them as higher-level flows land, but keep the core UI/data/audio engines lean.

```bash
npm install
npm test
```

`npm test` wraps the Playwright run inside `firebase emulators:exec --only auth,firestore`, so the suite can create/delete users and read/write sample documents without touching production. While the site is served from `localhost`/`127.0.0.1`, the UI auto-connects to the Auth emulator, disables Google sign-in (unsupported there), and surfaces "Using local Auth emulator" in the status bar. Flip the inline "Use production auth" button in the Google card (or run `localStorage.setItem('bsc.useProdAuth','1')` in DevTools) if you need to talk to the live project.

`test:structures` now runs automatically before Playwright to verify the static sequence exports and loader helpers.

Each test run seeds the Firestore emulator with:
- `sessions/community-default-alpha`: canonical Martigli/binaural blend for dashboards to consume.
- `presets/sine` and `presets/binaural-alpha`: starter track definitions for future UI flows.

Need the data without running the suite? Start the emulators in another terminal and execute `npm run seed:firestore`.

Prefer Make targets whenever possible—each essential workflow is wired up for consistency:

- `make firebase-login` → authenticated Firebase CLI session (set `FIREBASE_LOGIN_FLAGS="--reauth"` if needed).
- `make seed-local` → runs the emulator seeding script (`npm run seed:firestore`).
- `make test` / `make test-structures` → wrappers around `npm test` and `npm run test:structures`.
- `make seed-prod` → production seeding helper (see below for env vars).
- `make deploy-firestore-rules` → pushes `firestore.rules` to the project in `BSC_FIREBASE_PROJECT`.

Need to prime the live Firestore project? Use the guarded script:

```bash
BSC_ALLOW_PROD_SEED=1 \
BSC_FIREBASE_PROJECT=bsc-lab \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
npm run seed:firestore:prod
```

The extra env vars ensure you opt in explicitly (`BSC_ALLOW_PROD_SEED=1`), target the right project, and authenticate via a service account or `gcloud auth application-default login`.

Prefer Make targets? Run:

```bash
BSC_FIREBASE_PROJECT=bsc-lab \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
make seed-prod
```

`make seed-prod` delegates to `scripts/seed-prod.sh`, which performs the same guard checks and exports `BSC_ALLOW_PROD_SEED=1` automatically. If you store a service-account key at `hidden/bsc-lab-firebase-adminsdk-fbsvc-9262a53b1c.json` (ignored by git), simply run:

```bash
make seed-prod
```

The helper exports `BSC_FIREBASE_PROJECT=bsc-lab` and points `GOOGLE_APPLICATION_CREDENTIALS` at that hidden path for you. You can also execute `bash scripts/seed-prod.sh` directly or override those env vars when needed.

After seeding production for the first time, deploy the Firestore security rules so the UI can read the new collections:

```bash
npm run deploy:firestore-rules
```

The command targets `bsc-lab` explicitly; ensure you are logged into Firebase CLI with access to that project. Rerun it any time `firestore.rules` changes or you notice `Missing or insufficient permissions` errors despite permissive local rules.

Need to seed the live Firestore project instead? Authenticate with Application Default Credentials (e.g., `gcloud auth application-default login` or set `GOOGLE_APPLICATION_CREDENTIALS`) and run:

```bash
BSC_ALLOW_PROD_SEED=1 BSC_FIREBASE_PROJECT=bsc-lab npm run seed:firestore:prod
```

The safety flag `BSC_ALLOW_PROD_SEED=1` is required to avoid accidental production writes; adjust `BSC_FIREBASE_PROJECT` if you target a different Firebase project ID.

CI mirrors this flow via `.github/workflows/playwright.yml`, so every push and PR to `main` runs the emulator-backed smoke suite in GitHub Actions' Ubuntu runners.

Our software, BioSynCare Lab, or BSCLab, is a client-side web and PWA app to enable sensory stimulation
in usual computers and mobile phones. It consists of a few core parts:
1) A Web GUI which allows for the usage of sessions and track presets, and allow for the parametrization on the fly of the parameters involved, such as the frequency of the left channel of a binaural beat, or how much it oscillates with the breathing cue (which is an oscillation itself). The full specification of this software is in the next session.
2) Semantic specifications as OWL and SKOS RDF data. These should be easily browsearable and commentable. We have to build our own tools for such, described in full below.
3) Python scripts to synthesize change ringuing peals and sequences related to symmetry group permutations. This is performed using the Python's music package.
4) A Firestore database connection to login and data persistence.

## 1) BSCLab

### GUI & Engines Pod · Next Actions
- [x] Render the seeded sessions/presets as cards with summary metadata and an "Open" button.
- [x] Build a lightweight detail modal showing Martigli parameters + track list; link "Open" to it.
- [x] Stub the Martigli widget (period sliders + waveform picker) and wire it to live state.
- [x] **Request (Python Structures)**: schema delivered (`data/structures/community-alpha-change-ringing.json`) and previewed beneath the Martigli widget.
- [x] After modal+widget, integrate audio synthesis baseline (pure Web Audio) for the sine/binaural tracks (modal track list now has Preview buttons).
- [x] Promote the new `scripts/structures.js` kernel (Martigli + audio + video + RDF) into dashboard flows by logging Firestore interactions and exposing a public API for other pods.
- [x] Fill `.ontology-slot` via the kernel's `RDFLinker` so dashboard cards render real NSO references.
- [x] Turn the `VideoEngine` stub into a visible Martigli-driven canvas widget to validate the abstraction.

The woking of the BSCLab has at least three parts of considerable complexity:
1.1) the Firebase data persistence and sharing. The software should reports in real time the number of interactions performed by all users. And the kind of interactions, opening, creation and deletion of tracks and presets, parameter updates/setting, changes in the breathing cue's parameters and of its usage in the audiovisual tracks. The database is envisioned to keep/manage, at least: user's login and persona's data, interactions of users with the interface, presets for sessions and tracks.
1.2) The user interface, with sliders and knobs, with the presets, with user data. It has a lot of information to display and a lot of interaction possibilities to enable, with numbers, names, buttons, switches, sliders, knobs and other GUI elements. The UX challenge here is not transcurable.
1.3) The algorithms and procedures related to the sensory stimulation usage. There are Sessions, which are sets of tracks with specific parameters. A Session may be loaded from presets, or created on the fly by the user, and even saved from current settings. And there are tracks, which may also be loaded from presets, or loaded on the fly by the user, and the user may tweak with its parameters on the fly.
A session preset may have this data structure, for example:
```
{
  "createdAt": "16 novembre 2025 alle ore 23:41:15 UTC+1",
  "createdBy": "RIVX8NRYtxU1fbPBHjsYWTgLLAl2",
  "description": "",
  "folderId": "community",
  "label": "Session Snapshot 11:41:13 PM",
  "metadata": {},
  "source": "client_snapshot",
  "trackCount": 2,
  "name": "Session Snapshot 11:41:13 PM",
  "scheduling": {},
  "startUtc": null,
  "type": "one-shot",
  "symmetryTrack": {
    "enabled": false
  },
  "tags": [],
  "updatedAt": "16 novembre 2025 alle ore 23:41:15 UTC+1",
  ```
  make deploy-firestore-rules
  ```

  That Make target wraps `firebase deploy --only firestore:rules --project $(BSC_FIREBASE_PROJECT)` so you never forget which project you are touching. Run `make firebase-login` beforehand (once per machine or after switching Google accounts). Trigger it again whenever `firestore.rules` changes or you hit `Missing or insufficient permissions` in the UI despite permissive local rules.
  "voices": [
    {
      "durationSec": null,
      "gain": 0.2,
      "label": "Pure sine • 440Hz",

      "martigli": {
        "frequency": { "depth": 0, "enabled": false },
        "gain": { "depth": 0, "enabled": false },
        "pan": { "depth": 0, "enabled": false }
      },

      "params": {
        "frequency": 440,
        "gain": 0.2,
        "martigliDepth_frequency": 0,
        "martigliDepth_gain": 0,
        "martigliDepth_pan": 0,
        "pan": 0
      },

      "presetId": "sine",
      "startOffsetSec": 0
    },

    {
      "durationSec": null,
      "gain": 0.25,
      "label": "Binaural beat • Alpha 10Hz",

      "martigli": {
        "base": { "depth": 0, "enabled": false },
        "beat": { "depth": 0, "enabled": false },
        "gain": { "depth": 0, "enabled": false }
      },

      "params": {
        "base": 200,
        "beat": 10,
        "crossfadeDuration": 20,
        "crossfadeHold": 120,
        "frequencyMode": "carrier-beat",
        "gain": 0.25,
        "leftFrequency": 195,
        "martigliDepth_base": 0,
        "martigliDepth_beat": 0,
        "martigliDepth_gain": 0,
        "martigliFrequency": 0.1,
        "panBaseOffset": 0,
        "panDepth": 1,
        "panFrequency": 0.2,
        "panMode": "static",
        "rightFrequency": 205
      },

      "presetId": "binaural",
      "startOffsetSec": 0
    }
  ]
}
```
A session always holds information about it's (starting and ending) values on Breathing.
You can find an extended explanation of the basic audiovisual stimulation framework in the `docs/` folder.
We basically have:
* The Martigli wave, or the breathing wave. It starts with a period, by default 10s per breathing cycle, and ends with a period, by default 20s per breathing cycle, and has a transition duration between both breathing periods. After it reaches the final breathing period, it gets stable there. The user can tweak with such periods/frequencies at any time—including on-the-fly overrides to lengthen or shorten the current breath. The Martigli wave is usually sinusoidal, but other waveforms can also be chosen by the user, and s/he can also set an inhale/exhale proportion. As the Martigli wave and dynamics is so crucial to BSCLab, breathing is crucial, the Martigli oscillation should receive a dedicated widget, maybe a card, to display all the parameters and allow the user to understand and set it using both with crude numbers and using a visual element for the wave to be edited in its shape. The Martigli wave always has an instantaneous value inside [-1, 1], visible in the widget and used system-wide to parametrize audiovisual features.
* Other techniques include well-known beats, both binaural and monaural, and isochronous sounds. The parameters should be visible and open to interaction in different represetations. For example: a Binaural beat may be set by its carrier and modulator frequencies, or by its L-R frequencies. Keep in mind that volume, panning, frequency, and many other characteristics, should be linkable to the Martigli frequency. The general model to include a Martigli component to the parameter is to use:
value = base_value + coefficient_set_by_user * martigli_value
* on the `docs/` folder, there is one technique more that constitutes an audio track: the sonic symmetries. They are isochronous sounds played with notes whose pitches are equally distributed in the spectrum. For example, 5 notes would have frequencies `f_i = f_0 * 2 ^ { (i - 1) / (5 * n) }` where `n` is the number of octaves in which the notes are equally distributed. One may choose to use `(i - 1)` or just `i` if wanting to use `f_0` and its higher octave. Of course, if `n` is integer and positive, but the algorithm works perfectly also for non-integer `n` and also for negative values, thus the interface should allow for it.
* The system should allow for new features, including features that were not included before, such as: A) Martigli-following cues that are not crude continuous sounds, but arbitrary scales, such as those from indian music and Messiaen's modes of limited transposition. B) Symmetry lines may use other scales beyond the `f_i` described in this paragraph; the consist of sequences of permutations, to be applied in a musical line's parameters. The musical line is played again and again, each time with a specific permutation of its parameters applied to it.
* Sentence collections should act as audiovisual tracks: text can fade in the video background and the same sentences may be rendered through speech synthesis or recorded narrations, synced to the Martigli tempo and session events.
* BSCLab should expose a conversational AI assistant: the user describes how they feel/what they need, the AI drafts a session preset, and then helps the user tweak/add/remove tracks safely.

Other things to consider for the BSCLab:
1.4) The interface should be linked to documentation. It can come in the form of modals, tooltips, webpages, links to the RDF files or interface links to specific Classes or Entities or Concepts.
1.5) It is a client-side web app and PWA hosted in a github pages site, namely: biosyncarelab.github.io
1.6) It should keep the audio algorithms using at least Web Audio API and Tone.js, the user should be able to select one or the other, and the whole audio engine should run in one or the other, as far as possible. This is to guide the algorithms and enable the AI to keep them as simple and clean and small as possible.
1.7) The same goes for the video part; the user should be able to select between different engines, maybe between these Canvas/DOM, PixiJS, Three.js and p5.js or between the Canvas and one other option. The video should make possible the blinking and oscillation of lights at the same time on a quadrant. There may be many quadrants and a quadrant may be the whole screen. Video features may follow the Martigli oscillation. Beyong blinking and oscillating in quadrants, the user may explore visuals with drawings that define trajectories for particles and particle sources and sinkholes.
1.8) The AI agents may choose to use any libraries to aid in structuring and writting the code. It can be vanilla JS, but it can also use JQuery, Svelte, React, Bootstrap, etc, as the agents see fit. The AI agents are also free to use libraries for network visualization (for navigating and commenting the RDF ontologies and vocabularies), RDF parsing, GUI, Firebase database, and the like.
1.9) Parametrization scales and limits should be set smart by default and be configurable by the user. For example, the a Martigli oscillation component might regard frequency or pitch. Martigli components in the volume should be volume and not RMS value oscillations by default. The preffered settings of default values, and limits and scales should be saved in the database for that user. It can be saved as an "audiovisual instruments" preset or so and shared with other users.
1.10) Breathing overrides must be available in every major screen so users can immediately lengthen/shorten the Martigli period without diving into menus.
1.11) Sentence collections are first-class video/audio track types, with asset libraries and selection UX for both background text and speech playback.
1.12) Provide an AI conversational surface capable of crafting/updating sessions from natural-language intent, while logging prompts and keeping outputs within safe parameter bounds.
1.13) Sessions should be joinable across timezones, support synchronized starts, and allow mid-session joining. Consider (still undecided) whether BSCLab should embed chat, live audio, or webcam features for these shared sessions.
1.14) BSCLab aims to be the open reference for Neurosensory Stimulation—akin to W3C recommendations—by enabling initiatives to register their practices/devices/services, exposing public recommendations, and generating authority-ready documentation for regulators and healthcare agencies.

This software has had different incarnations, the last one is at biosyncare.github.io and the open github repo. If it's code is useful, ask for it.


## 2) NSO

### RDF Navigator Pod · Next Actions
- [x] Prototype Cytoscape viewer pointed at `rdf/core/bsc-owl.ttl` (standalone page for now).
- [x] Add URI inspector sidebar pulling label/definition/comments, storing annotations in Firestore.
- [x] Visual key differentiating class vs property edges with colors/icons.
- [ ] Add navigation link from main dashboard to NSO Navigator page.
- [ ] Hook ontology links into the dashboard cards (e.g., session links to relevant NSO concept).
- [x] **Request (GUI & Engines)**: placeholder area exposed in dashboard cards (`.ontology-slot`) for future ontology links.

The RDF data should work as the basis for BSCLab, giving it the definitions used in the algorithms and the texts for documentations and links to further context in the RDF data itself.

It consits of OWL ontologies and SKOS vocabularies about Neurosensory Stimulation.
Such semantic structures should be navigated and annotated by users.
Specialists and end-users alike should be able to understand the concepts,
read the RDF data and the Neurosensory conceptual specifications.
In summary, the NSO/ONC (or the name chosen for it, BSC? SSO? NSO (Neurosensory Stimulation Ontology?))
is a formalized representation of the knowledge on Neurosensory Stimulation,
enabling incremental corrections and growth through interviews with specialists,
such as researchers and commercial representatives.
It also enables one to better understand Neurosensory Stimulation,
and enriches the BSCLab interface for Neurosensory stimulation itself.

To navigate the RDF structures, we should:
1) Probably use something like cytoscape, and/or graphology, networkx.js etc, to see the semantic graphs.
2) have arrows representing 2.1) object and data properties; 2.2) class-subClass relations, or hypernym-hyponym relations. 2.1 and 2.2 should be clearly distinct, one should be able to see the departing and the arriving tips of each arrow.
3) Colors should be seatable and used to color semantic URIs meaningfully: class, concept, data type, object property, data property, class-subclass arrow, has/doesn't have comments, etc.
4) When a user clicks on an URI, its data should appear on a column (say to the right or left), together with its relations and possible relations with other URIs, and its comments.
5) Any URI may receive comments. Any comment may receive comments.
6) It should have some smart way of dealing with new versions of the NSO: new URIs, fixed or enhanced this or that.

## 3) Python-derived musical structures

### Python Structures Pod · Next Actions
- [x] Recreate the "Community Alpha" change-ringing set via the `music` package and export deterministic JSON (`data/structures/community-alpha-change-ringing.json`).
- [x] Document the export schema + provenance in `docs/Features.md` 3.x.
- [x] Provide a tiny loader (ES module) that reads the JSON for the GUI pod (`scripts/structures-loader.js`).
- [ ] **Request (GUI & Engines)**: confirm where in the UI these structures will surface first (modal or separate panel) before wiring the loader.
- [x] Plan and ship follow-up exports (symmetry lines, Martigli-following sequences) once the first schema is accepted (`data/structures/symmetry-lines.json`, `data/structures/martigli-following-sequences.json`).

All three datasets above are bundled into the shared StructureStore manifest so the dashboard modal can preview each family side-by-side.

We'll be creating JSON data (or RDF data or maybe both JSON and RDF) represeting
sequences or orderings. Such orderings are to be applied to notes or characteristics of notes, typically.
To obtain such structures, use Python's `music` package, installable through PyPI.

You might want to `pip install -e` using a fresh clone of the `music` repo (in github) so to tweak with the code if useful.

The structures obtained using the package should be at least:
* the change ringuing peals available in the library, at least some of them.
* the sequences obtained through algebraic group permutations.

Such structures, sequences of ordered elements (represented by indexes),
are to be loaded in the BSCLab software, as parameters in the audio tracks.
One such sequence of orderings may act on a sequence of notes
or in a specific parameter of a sequence of notes, for example;
it can swap the duration of the notes in each iteration,
or a control parameter used in distortion or spatialization.

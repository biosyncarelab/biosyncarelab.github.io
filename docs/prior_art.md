# Prior Art & Legacy Review

Purpose: capture reusable insights from earlier BSC implementations and related projects while keeping the architecture lean. Document only what informs current decisions; delete stale entries aggressively.

## Review Checklist
- ✅ Record URL and repo link.
- ✅ Summarize architecture in <5 lines (frameworks, build tooling, hosting).
- ✅ List elements worth reusing (UI patterns, audio algorithms, data models).
- ✅ Note pain points or complexity traps we must avoid.
- ✅ Capture licensing/attribution constraints.

## Targets

### biosyncare.github.io
- **Repo:** https://github.com/biosyncare/biosyncare.github.io
- **Status:** _Reviewed 2025-11-17_
- **Architecture:** static ES modules, zero bundler, Web Audio API first with optional Tone.js detection, optional Firebase telemetry, Makefile-driven helpers, shipping a diagnostics widget.
- **What stands out:** ready-made audio-engine wrapper (`src/core/audio-engine.js`), lightweight diagnostics UI for system profiling, Firebase rules + deploy scripts we can mirror.
- **Complexity traps:** temptation to keep diagnostics widget + app fused; we should extract only the Martigli/audio slices to avoid inheriting all telemetry wiring.
- **Reuse decision:** plan to port the audio-engine skeleton and diagnostics widget as reference implementations, but rewrap them behind our own adapter to keep file count minimal.

### aeterni.github.io
- **Repo:** https://github.com/aeterni/aeterni.github.io
- **Status:** _Reviewed 2025-11-17_
- **Architecture:** single `index.html` booting a bundled module (`scripts/bundle.js`), custom CSS-only modal + toggle system, Google Translate auto-integration, no build tooling exposed beyond prebuilt bundle.
- **What stands out:** streamlined loader overlay, modal framework, and file-upload hook that could inspire our playback/session picker UI.
- **Complexity traps:** monolithic bundle with unknown toolchain—hard to cherry-pick without source maps.
- **Reuse decision:** borrow UI patterns (modal/toggle styles, loader) as design references only; no direct code import until bundle source becomes available.

### audiovisualmedicine.github.io
- **Repo:** https://github.com/audiovisualmedicine/audiovisualmedicine.github.io
- **Status:** _Reviewed 2025-11-17_
- **Architecture:** Node-assisted dev server (`app.js`), Browserify build that outputs `scripts/bundle.js`, heavy npm dependency list covering Tone.js, Pixi.js, dat.gui, graphology, MongoDB Stitch, React, etc.
- **What stands out:** rich visual/audio stack (Pixi + Tone), graph tooling for ontology work, and extensible browser extension scripts (`you/`).
- **Complexity traps:** very large dependency surface (hundreds of packages, 475k-line lockfile) plus custom dev server; importing code wholesale would violate our simplicity directive.
- **Reuse decision:** cherry-pick algorithm ideas (e.g., graphology usages, Tone presets) after re-implementing in plain ES modules; avoid carrying over build system or server.

### harmonicare.github.io
- **Repo:** https://github.com/cantaprete/audiovisualmedicine.github.io (mirrors the Netlify deploy at https://harmonicare.netlify.app/)
- **Status:** _Reviewed 2025-11-17_
- **Architecture:** static site with Italian marketing copy, Google Fonts/Analytics, Google Translate widget, and a bundled ES-module loader (`scripts/bundle.js`). Uses the same Browserify/Nodemon toolchain and dependency tree as `audiovisualmedicine.github.io`, including Pixi.js, Tone.js, dat.gui, graphology, etc.
- **Verification:** `index.html` in the repo contains the exact “HarmoniCare / 15 minuti al benessere / Scegli la tua sessione” blocks and preset links seen on https://harmonicare.netlify.app/, confirming this is the source for the production site.
- **Complexity traps:** identical large dependency surface (~475k-line lockfile), plus inline CSS that couples marketing site and app controls. Pulling code directly would bloat our footprint.
- **Reuse decision:** treat it as a reference for copywriting and preset organization; re-implement required widgets in our lean stack instead of importing the bundle wholesale.

Add new incarnations as they appear. Each review entry should end with explicit reuse decisions (e.g., “Adopted Martigli slider SVG, dropped bespoke state manager”).

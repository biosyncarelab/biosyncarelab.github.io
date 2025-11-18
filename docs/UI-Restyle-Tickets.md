# BioSynCare Lab · UI Restyle Tickets

This document breaks the requested redesign into concrete tickets. Each ticket lists a goal, main steps, and definition of done so we can track progress and keep the desktop/mobile experience aligned with the reference mockups.

## T1 · Shell + Layout Framework
- **Goal**: Replace the stacked auth card with a full-viewport responsive shell that supports a single wide column on small screens and multi-column breathing space on desktops.
- **Steps**:
  - Introduce global CSS variables (spacing, corner radius, palette) and shared layout primitives (app shell, column containers, glass panels).
  - Switch the `<body>` to a flex layout that centers the application while allowing 100% width on phones.
  - Add media queries (≥1280px, ≥768px, <768px) to adapt padding, card stacking order, and typography.
- **Definition of Done**: Grid/flex scaffolding matches the provided screenshots, no horizontal scrolling down to 375px, and Lighthouse mobile layout shift score ≥0.95 (manual run).

## T2 · Auth Header & Visibility Rules
- **Goal**: Move login widgets into the top header and hide them whenever a user session is active.
- **Steps**:
  - Refactor `index.html` header into left (logo/title) and right (auth state + actions) regions.
  - Add conditional rendering logic in `scripts/auth.js` so Google + email forms appear only when `auth.currentUser` is null; otherwise show a compact status chip with sign-out button.
  - Ensure auth controls remain keyboard accessible and survive window resizing.
- **Definition of Done**: Header stays fixed at top, login forms disappear immediately after sign-in, and tab order flows left-to-right without hidden inputs receiving focus.

## T3 · Sessions Card & Summary Compaction
- **Goal**: Keep session summaries lightweight and inline while delegating detailed info to track cards.
- **Steps**:
  - Update the Sessions card to show only: session name, updated time, and quick actions (apply/save/open in navigator).
  - Move Martigli/audio/visual/haptic details into their respective track sections.
  - Add metadata badges (ID, duration, created/updated) in a collapsible drawer within the same card.
- **Definition of Done**: Sessions card height remains under 40% of the viewport on desktop with one session selected, and no Martigli-specific wording leaks into its body copy.

## T4 · Track Model (Martigli as Track Zero)
- **Goal**: Treat Martigli oscillations as tracks so other sensory tracks can bind to them.
- **Steps**:
  - Extend the session schema (frontend side for now) to represent an array of `tracks` with `type`, `params`, and `bindings`.
  - Represent Martigli oscillations inside this array with `type: "martigli"` and expose their runtime metrics via the same interface as audio/visual/haptic tracks.
  - Update the data binding utilities in `scripts/auth.js` so audio track sliders can reference `martigliState` entries (value = base + depth * martigli value).
- **Definition of Done**: At least one audio track control can select a Martigli oscillator for modulation, defaults to the primary oscillator, and unbinds gracefully when no oscillations exist.

**Progress 2025-11-18:** Front-end track models now inject Martigli oscillations as `type: "martigli"` entries, audio track cards expose base/depth sliders plus a Martigli binding dropdown, and session drafts serialize the normalized track array for future persistence. Remaining: remember per-session expanded state and wire backend schema once available.

## T5 · Track Controls, Visualization & Toggles
- **Goal**: Allow each track to be collapsed/expanded, with type-specific controls and live previews.
- **Steps**:
  - Introduce a shared `TrackPanel` component (HTML template + CSS class) with a header (label, badges, toggle button).
  - Embed canvases/mini-charts per track type (e.g., Martigli wave preview, monaural carrier vs modifier plot, change-ringing timeline).
  - Implement modulation depth UI: `base`, `depth`, `binding` dropdown, and preview text (base ± delta) for each parameter that supports Martigli linkage.
  - Provide fullscreen modal for visual previews (e.g., click a canvas to expand).
- **Definition of Done**: Track panels remember their expanded state per session (in-memory), each panel shows at least one visualization, and keyboard users can toggle panels via Enter/Space.

## T6 · Change-Ringing Tracks Integration
- **Goal**: Replace the passive “Change-Ringing Structures” list with playable track templates.
- **Steps**:
  - Transform each change-ringing entry into an audio track definition (waveform, timing, optional Martigli binding).
  - Add playback controls (play/pause, tempo multiplier, instrument selector) in the Audio Tracks section.
  - Update the loader so selecting a structure adds an audio track instance rather than just showing text.
- **Definition of Done**: Users can add/remove ringing tracks, see their notation, and hear audio feedback (stubbed or real) using the same track UI as other audio layers.

## T7 · Responsive Polish & QA
- **Goal**: Verify the entire experience works on phones, tablets, and desktops.
- **Steps**:
  - Manual testing at 375px, 768px, 1024px, 1440px, 1920px widths; adjust breakpoints where panels feel cramped.
  - Run `npm run test:structures` plus any UI linting/formatting tasks.
  - Document known limitations + future enhancements in `docs/UI-Restyle-Tickets.md` as checklist items.
- **Definition of Done**: No overlapping widgets at 375px, header/auth flows pass keyboard-only test, and ticket checkboxes updated with completion notes.

---

**Tracking**
- Update this file as tickets complete (date, commit hash short ref, notes).
- Mirror ticket IDs in PR titles/branch names when feasible (e.g., `feature/t2-auth-header`).

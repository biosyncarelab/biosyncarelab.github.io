# Quick Start Guide for AI Pods

**Target Audience:** AI agents working on BSCLab neurosensory stimulation interface
**Last Updated:** November 19, 2025
**Architecture:** Modular, reactive, Firebase-backed

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Common Patterns](#common-patterns)
3. [Adding User Action Logging](#adding-user-action-logging)
4. [Saving State to Firestore](#saving-state-to-firestore)
5. [Making UI Reactive](#making-ui-reactive)
6. [Binding Martigli to Parameters](#binding-martigli-to-parameters)
7. [Adding New Track Types](#adding-new-track-types)
8. [Testing Checklist](#testing-checklist)

---

## Architecture Overview

### **Core Principle: Session State = Usage State**

Everything the user does creates a **session state** that can be:
- ✅ Saved as a preset (stored in Firestore)
- ✅ Shared via URL (serialized to query parameters)
- ✅ Restored on page load (from URL or Firestore)

### **Three-Layer Architecture**

```
┌─────────────────────────────────────┐
│         UI Layer (auth.js)          │  ← Event handlers, DOM updates
├─────────────────────────────────────┤
│    State Layer (app-state.js)       │  ← Observer pattern, reactive state
├─────────────────────────────────────┤
│  Data Layer (session-manager.js)    │  ← Firestore CRUD operations
└─────────────────────────────────────┘
```

### **Key Modules**

- **[scripts/auth/app-state.js](../scripts/auth/app-state.js)** - Centralized state with observer pattern
- **[scripts/auth/session-manager.js](../scripts/auth/session-manager.js)** - Session CRUD (create, read, update, delete)
- **[scripts/auth/url-state-manager.js](../scripts/auth/url-state-manager.js)** - URL serialization/deserialization
- **[scripts/auth/auth-manager.js](../scripts/auth/auth-manager.js)** - Authentication operations
- **[scripts/auth/firebase-init.js](../scripts/auth/firebase-init.js)** - Firebase initialization
- **[scripts/kernel.js](../scripts/kernel.js)** - Core utilities (telemetry, constants)

---

## Common Patterns

### **1. Get Current User**

```javascript
import { getCurrentUser } from "./auth/auth-manager.js";

const user = getCurrentUser();
if (!user) {
  console.warn("User not signed in");
  return;
}

console.log("User ID:", user.uid);
console.log("Email:", user.email);
```

### **2. Access Application State**

```javascript
import { appState } from "./auth/app-state.js";

// Get a snapshot of current state
const state = appState.snapshot();

console.log("Current user:", state.currentUser);
console.log("Sessions:", state.sessions);
console.log("Active session ID:", state.activeSessionId);
console.log("Martigli state:", state.martigliState);
```

### **3. Update State (triggers UI updates automatically)**

```javascript
import { appState } from "./auth/app-state.js";

// Set user (automatically updates auth UI via subscription)
appState.setUser({
  uid: "user123",
  email: "user@example.com",
  displayName: "Test User"
});

// Set sessions (automatically re-renders session list)
appState.setSessions([
  { id: "session1", label: "Morning Meditation" },
  { id: "session2", label: "Focus Session" }
]);

// Set active session
appState.setActiveSessionId("session1");

// Update busy state (shows/hides loading indicators)
appState.setBusy(true);
```

---

## Adding User Action Logging

**Rule:** Log EVERY user action to create a comprehensive activity log for research.

### **Pattern: Log User Action**

```javascript
import { kernel } from "./kernel.js";

// When user starts a sensory stimulation track
function onTrackStart(track) {
  kernel.recordInteraction("track.audio.started", {
    trackId: track.id,
    type: track.type,  // "binaural", "isochronous", etc.
    duration: track.durationMs,
    martigliModulated: !!track.martigliBindings,
    timestamp: Date.now()
  });

  // ... start playback
}

// When user changes a track parameter
function onParameterChange(track, parameter, oldValue, newValue) {
  kernel.recordInteraction("track.parameter.changed", {
    trackId: track.id,
    parameter: parameter,  // "frequency", "volume", etc.
    oldValue: oldValue,
    newValue: newValue,
    timestamp: Date.now()
  });

  // ... apply parameter change
}

// When user completes a full session
function onSessionComplete(session, elapsedTime, playedTracks) {
  kernel.recordInteraction("session.completed", {
    sessionId: session.id,
    durationMs: elapsedTime,
    tracksPlayed: playedTracks.length,
    timestamp: Date.now()
  });
}
```

### **Existing Logged Events**

See [ACTIVITY-LOGGING.md](../ACTIVITY-LOGGING.md) for the complete list of 16+ events already tracked:
- `sessions.loaded`, `session.saved`, `session.share.url`, `session.url.restored`
- `martigli.oscillation.create`, `martigli.oscillation.select`, etc.
- `modal.open`, `modal.close`
- `track.visualizer.open`, `track.visualizer.close`, `track.preview.toggle`

---

## Saving State to Firestore

### **Pattern: Save a Session**

```javascript
import { appState } from "./auth/app-state.js";
import { createSession } from "./auth/session-manager.js";
import { collectSessionDraft } from "./auth/session-validator.js";
import { getCurrentUser } from "./auth/auth-manager.js";
import { kernel } from "./kernel.js";

async function saveCurrentSession() {
  // 1. Check authentication
  const user = getCurrentUser();
  if (!user) {
    console.error("User must be signed in to save sessions");
    return;
  }

  // 2. Collect current state into a draft
  const draft = collectSessionDraft(appState.snapshot(), {
    id: null,  // null = new session
    label: "My Custom Session",
    kind: "custom",
    description: "Created from current state",
    tags: ["meditation", "focus"]
  });

  // 3. Validate Martigli state (required)
  if (!draft.martigli) {
    console.error("Martigli configuration is required");
    return;
  }

  // 4. Save to Firestore
  try {
    appState.setBusy(true);

    const savedSession = await createSession(user.uid, draft);

    // 5. Update state (triggers UI refresh via subscription)
    const state = appState.snapshot();
    appState.setSessions([...state.sessions, savedSession]);

    // 6. Log activity
    kernel.recordInteraction("session.saved", {
      sessionId: savedSession.id,
      label: draft.label,
      userId: user.uid
    });

    console.log("✅ Session saved:", savedSession.id);

  } catch (err) {
    console.error("❌ Session save failed:", err);
  } finally {
    appState.setBusy(false);
  }
}
```

### **Pattern: Load User's Sessions**

```javascript
import { appState } from "./auth/app-state.js";
import { fetchSessions } from "./auth/session-manager.js";
import { getCurrentUser } from "./auth/auth-manager.js";
import { kernel } from "./kernel.js";

async function loadUserSessions() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    appState.setFetchingDashboard(true);

    // Fetch from Firestore (user-scoped - only their sessions)
    const sessions = await fetchSessions(user.uid);

    // Update state (triggers UI refresh)
    appState.setSessions(sessions);

    // Log activity
    kernel.recordInteraction("sessions.loaded", {
      count: sessions.length,
      userId: user.uid
    });

    console.log(`✅ Loaded ${sessions.length} sessions`);

  } catch (err) {
    console.error("❌ Session load failed:", err);
    appState.setSessions([]);
  } finally {
    appState.setFetchingDashboard(false);
  }
}
```

---

## Making UI Reactive

**Pattern:** Subscribe to state changes, update UI automatically.

### **Setup Reactive UI (do this once on page load)**

```javascript
import { appState } from "./auth/app-state.js";

// Get DOM elements
const ui = {
  sessionList: document.getElementById("session-list"),
  sessionStatus: document.getElementById("session-status"),
  authState: document.getElementById("auth-state"),
  userEmail: document.getElementById("user-email"),
  userId: document.getElementById("user-id"),
  loadingSpinner: document.getElementById("loading-spinner")
};

// Subscribe to state changes
appState.subscribe((state) => {
  // Update session list when sessions change
  if (ui.sessionList && state.sessions) {
    renderSessionList(state.sessions);
  }

  // Update auth UI when user changes
  if (state.currentUser) {
    ui.authState.textContent = "Signed in";
    ui.userEmail.textContent = state.currentUser.email || "No email";
    ui.userId.textContent = `UID: ${state.currentUser.uid}`;
  } else {
    ui.authState.textContent = "Signed out";
    ui.userEmail.textContent = "";
    ui.userId.textContent = "";
  }

  // Update loading indicators
  if (ui.loadingSpinner) {
    ui.loadingSpinner.style.display = state.busy ? "block" : "none";
  }

  // Update controls based on state
  refreshControls(state);
});

function renderSessionList(sessions) {
  if (sessions.length === 0) {
    ui.sessionList.innerHTML = "<li>No sessions found.</li>";
    return;
  }

  ui.sessionList.innerHTML = sessions
    .map(session => `
      <li class="session-item" data-id="${session.id}">
        <strong>${session.label}</strong>
        <span class="session-meta">${session.kind}</span>
      </li>
    `)
    .join("");
}

function refreshControls(state) {
  // Enable/disable buttons based on state
  const saveButton = document.getElementById("save-session");
  if (saveButton) {
    saveButton.disabled = !state.currentUser || state.busy;
  }
}
```

**Now whenever you call `appState.setUser()`, `appState.setSessions()`, or `appState.setBusy()`, the UI updates automatically!**

---

## Binding Martigli to Parameters

**Martigli** = breathing-synchronized oscillating values that modulate track parameters (frequency, volume, etc.)

### **Pattern: Bind Martigli to a Track Parameter**

```javascript
import { appState } from "./auth/app-state.js";

function bindMartigliToTrack(trackId, parameterName, targetRange) {
  const state = appState.snapshot();

  // Get active Martigli oscillator
  const activeOscillator = state.martigliState?.getActiveOscillator();
  if (!activeOscillator) {
    console.warn("No active Martigli oscillator");
    return;
  }

  // Create binding
  const binding = {
    trackId: trackId,
    parameter: parameterName,  // e.g., "frequency", "volume"
    oscillatorId: activeOscillator.id,
    targetMin: targetRange.min,  // e.g., 100 Hz
    targetMax: targetRange.max,  // e.g., 200 Hz
    mappingCurve: "linear"  // or "exponential", "logarithmic"
  };

  // Register binding
  state.trackBindingRegistry.set(trackId, binding);

  console.log(`✅ Bound Martigli oscillator "${activeOscillator.label}" to ${parameterName}`);

  // Now when Martigli oscillates (breathing wave),
  // the parameter will modulate between targetMin and targetMax
}

// Example: Bind frequency to Martigli
bindMartigliToTrack("track-1", "frequency", { min: 100, max: 200 });
```

### **Pattern: Get Current Martigli Value**

```javascript
import { appState } from "./auth/app-state.js";

function getCurrentMartigliValue() {
  const state = appState.snapshot();
  const martigliState = state.martigliState;

  if (!martigliState) {
    return null;
  }

  // Get current phase of breathing cycle (0.0 to 1.0)
  const phase = martigliState.getCurrentPhase();

  // Get current breath period (in seconds)
  const period = martigliState.getCurrentPeriod();

  return { phase, period };
}

// Use in animation loop
function animationLoop() {
  const martigli = getCurrentMartigliValue();

  if (martigli) {
    // Map phase (0-1) to target range
    const frequency = 100 + (martigli.phase * 100);  // 100-200 Hz

    // Apply to audio oscillator
    audioOscillator.frequency.value = frequency;
  }

  requestAnimationFrame(animationLoop);
}
```

---

## Adding New Track Types

### **Pattern: Create a New Track Type**

```javascript
import { appState } from "./auth/app-state.js";
import { kernel } from "./kernel.js";

class CustomTrack {
  constructor(config) {
    this.id = `track-${Date.now()}`;
    this.type = "custom-type";  // e.g., "isochronic", "ambient"
    this.label = config.label || "Untitled Track";

    // Track-specific parameters
    this.frequency = config.frequency || 440;
    this.volume = config.volume || 0.5;
    this.duration = config.duration || 60000;  // milliseconds

    // Martigli binding (optional)
    this.martigliBindings = null;

    // Audio context
    this.audioContext = new AudioContext();
    this.isPlaying = false;
  }

  async start() {
    if (this.isPlaying) return;

    // Log activity
    kernel.recordInteraction("track.audio.started", {
      trackId: this.id,
      type: this.type,
      duration: this.duration,
      martigliModulated: !!this.martigliBindings
    });

    this.isPlaying = true;

    // Create audio nodes
    this.oscillator = this.audioContext.createOscillator();
    this.gainNode = this.audioContext.createGain();

    this.oscillator.frequency.value = this.frequency;
    this.gainNode.gain.value = this.volume;

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.oscillator.start();

    console.log(`▶️ Started track: ${this.label}`);
  }

  stop() {
    if (!this.isPlaying) return;

    this.oscillator.stop();
    this.isPlaying = false;

    // Log activity
    kernel.recordInteraction("track.audio.stopped", {
      trackId: this.id,
      type: this.type
    });

    console.log(`⏹️ Stopped track: ${this.label}`);
  }

  updateParameter(paramName, newValue) {
    const oldValue = this[paramName];
    this[paramName] = newValue;

    // Apply to audio
    if (paramName === "frequency" && this.oscillator) {
      this.oscillator.frequency.value = newValue;
    } else if (paramName === "volume" && this.gainNode) {
      this.gainNode.gain.value = newValue;
    }

    // Log activity
    kernel.recordInteraction("track.parameter.changed", {
      trackId: this.id,
      parameter: paramName,
      oldValue: oldValue,
      newValue: newValue
    });
  }

  // Bind to Martigli oscillator
  bindToMartigli(oscillatorId, parameterName, targetRange) {
    this.martigliBindings = {
      oscillatorId: oscillatorId,
      parameter: parameterName,
      targetMin: targetRange.min,
      targetMax: targetRange.max
    };

    // Log activity
    kernel.recordInteraction("track.martigli.bound", {
      trackId: this.id,
      oscillatorId: oscillatorId,
      parameter: parameterName
    });
  }

  // Serialize to session state
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      frequency: this.frequency,
      volume: this.volume,
      duration: this.duration,
      martigliBindings: this.martigliBindings
    };
  }

  // Restore from session state
  static fromJSON(data) {
    const track = new CustomTrack(data);
    track.id = data.id;
    track.martigliBindings = data.martigliBindings;
    return track;
  }
}

// Usage
const track = new CustomTrack({
  label: "Alpha Wave Generator",
  frequency: 10,  // 10 Hz alpha wave
  volume: 0.7,
  duration: 300000  // 5 minutes
});

track.start();

// Bind to Martigli
track.bindToMartigli("osc-1", "frequency", { min: 8, max: 12 });
```

---

## Testing Checklist

Before committing changes, ensure:

### **Node Tests** ✅

```bash
npm run test:structures   # Structure assets validation
npm run test:rdf          # RDF ontology validation
npm run test:state        # State management tests
```

**Expected:** All tests pass (10/10)

### **Browser Tests** ✅

```bash
npm test                  # Run full test suite with emulators
npm run test:headed       # Run with visible browser
```

**Expected:** Playwright tests pass

### **Manual Testing** ✅

1. **Authentication Flow**
   - Sign in with Google
   - Sign in with email/password
   - Sign out
   - Check activity logging in Firestore

2. **Session Management**
   - Create a new session (adjust Martigli, save)
   - Load saved sessions (should appear in list)
   - Share session via URL (copy link, open in new tab)
   - Verify state restored from URL

3. **Martigli Integration**
   - Create oscillators
   - Rename/delete oscillators
   - Bind to track parameters
   - Verify breathing wave animation

4. **Activity Logging**
   - Open Firestore console: https://console.firebase.google.com/project/bsc-lab/firestore
   - Check `telemetry` collection
   - Verify events logged with correct payloads

### **Code Quality** ✅

- No console errors in browser
- No eslint warnings (if configured)
- Code follows existing patterns
- JSDoc comments added for new functions
- Activity logging added for all user actions

---

## Need Help?

- **Migration Complete:** See [MIGRATION-COMPLETE.md](../MIGRATION-COMPLETE.md)
- **Activity Logging Reference:** See [ACTIVITY-LOGGING.md](../ACTIVITY-LOGGING.md)
- **Architecture Deep Dive:** See [docs/ARCHITECTURE.md](./ARCHITECTURE.md) (if exists)
- **Firebase Docs:** https://firebase.google.com/docs

---

**Happy coding!** Remember: Session state = usage state. Log everything. Keep it simple. 🚀

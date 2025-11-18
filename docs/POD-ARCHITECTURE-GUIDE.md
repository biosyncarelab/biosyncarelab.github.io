# Pod Architecture Guide - Refactored BSCLab

**Date:** November 2025
**Status:** Active - All pods must follow this architecture

---

## 🎯 Core Concepts (Never Forget!)

### **1. Neurosensory Stimulation Sessions**
- **What**: Collections of sensory tracks (audio/visual/haptic) synchronized to create therapeutic experiences
- **Components**:
  - Martigli oscillators (breathing-synchronized waves)
  - Sensory tracks (sound, light, vibration)
  - RDF ontology links (semantic meaning)
  - Parameter modulations (dynamic changes)

### **2. Martigli Waves (Central to Everything)**
- **What**: Breathing-synchronized oscillating values that modulate parameters
- **Formula**: `parameter_value = base_value + coefficient * martigli_value`
- **Key Features**:
  - Multiple oscillators can exist simultaneously
  - Each oscillator: startPeriod → endPeriod (transition over time)
  - Drives ALL modulation: audio frequency, volume, brightness, etc.
  - Period range: 0.1s - 120s
  - Waveforms: sine, triangle, square, sawtooth

### **3. Sensory Tracks (Many Tracks → Rich Experience)**
- **Audio Tracks**: Tones, binaural beats, isochronous pulses, voice guidance
- **Visual Tracks**: Brightness, hue, saturation, patterns, particles
- **Haptic Tracks**: Vibration intensity and frequency (future)
- Each track can be modulated by Martigli values
- Multiple tracks combine to create the session

### **4. RDF Semantic Integration (CENTRAL!)**
- **What**: Every session, track, and technique is linked to formal ontology concepts
- **Why**: Traceability, evidence-based practice, global registry
- **How**: Sessions reference RDF URIs (e.g., `NSO#BinauralBeats`)
- **Where**: `rdf/` directory, constants.js, nso-navigator.html
- **Goal**: BSCLab as W3C-equivalent reference for neurosensory stimulation

---

## 🏗️ New Architecture - Required for All Pods

### **Module Structure**

```
scripts/
├── state/                    # STATE LAYER
│   ├── app-state.js          # Centralized state + observer pattern
│   └── url-state-manager.js  # URL sharing
├── auth/                     # DATA + UI LAYERS
│   ├── firebase-init.js      # Firebase setup
│   ├── auth-manager.js       # Authentication logic
│   ├── session-manager.js    # Session CRUD (pure data)
│   ├── ui-renderer.js        # Rendering (pure UI)
│   ├── modal-controller.js   # Modal lifecycle
│   └── integration-example.js# How to wire everything
├── constants.js              # All magic values
└── structures.js             # Core engine (already clean!)
```

### **Architecture Rules (MUST FOLLOW)**

1. **Separation of Concerns**:
   - Data layer: Fetch/save, return data (no UI)
   - UI layer: Render from data (no fetching)
   - State layer: Central state, notify subscribers (no UI or data)

2. **State Management**:
   ```javascript
   import { appState } from './scripts/state/app-state.js';

   // Subscribe for reactive UI
   appState.subscribe((state) => {
     updateUI(state); // Auto-called when state changes
   });

   // Update state → subscribers notified
   appState.setSessions(sessions);
   ```

3. **Always Import from Modules**:
   - ❌ `import { getAuth } from 'firebase/auth'` (WRONG!)
   - ✅ `import { auth } from './auth/firebase-init.js'` (CORRECT!)

4. **Use Constants**:
   - ❌ `if (period < 0.1)` (MAGIC NUMBER!)
   - ✅ `if (period < MARTIGLI_CONFIG.MIN_PERIOD)` (CORRECT!)

---

## 📋 Pod-Specific Guidelines

### **Pod: BSCLab GUI & Engines**

**Mission**: Build session UI using new architecture + integrate Martigli/sensory engines

**MUST USE**:
- `app-state.js` for all state operations
- `session-manager.js` for session CRUD
- `ui-renderer.js` for rendering session cards, tracks, etc.
- `modal-controller.js` for detail modals
- `constants.js` for all config values

**Key Tasks (Post-Refactoring)**:
1. **Migrate auth.js** to use new modules:
   ```javascript
   // OLD (in auth.js):
   const db = getFirestore(app);
   const sessions = await getDocs(collection(db, 'sessions'));

   // NEW (use session-manager):
   import { fetchSessions } from './auth/session-manager.js';
   const sessions = await fetchSessions(userId);
   ```

2. **Add URL Sharing Button**:
   ```javascript
   import { copyShareableURL } from './state/url-state-manager.js';

   button.onclick = async () => {
     const success = await copyShareableURL(appState);
     if (success) alert('Link copied!');
   };
   ```

3. **Wire Martigli → Sensory Tracks**:
   - Multiple Martigli oscillators in `app-state.martigliState`
   - Each oscillator modulates track parameters
   - Use formula: `value = base + coefficient * martigli_value`

4. **Integrate RDF Links**:
   - Use `DASHBOARD_ONTOLOGY_LINKS` from constants.js
   - Render RDF links in session cards
   - Link to nso-navigator.html with URI parameter

**Example - Creating a Session**:
```javascript
import { createSession } from './auth/session-manager.js';
import { appState } from './state/app-state.js';
import { collectSessionDraft } from './auth/session-manager.js';

// Collect current state
const draft = collectSessionDraft(appState, {
  label: 'Meditation Session',
  kind: 'custom',
});

// Save to Firestore
const newSession = await createSession(userId, draft);

// Update app state → UI auto-updates!
appState.addSession(newSession);
```

---

### **Pod: RDF Navigator**

**Mission**: Ontology browser + semantic integration (**CENTRAL TO ARCHITECTURE**)

**MUST PRESERVE**:
- `nso-navigator.js` works well, don't break it!
- Cytoscape integration
- URI deep linking

**Key Tasks**:
1. **Continue nso-navigator.html development** (no immediate refactoring needed)
2. **Add state management** (optional, when convenient):
   ```javascript
   // Could use app-state for navigator state
   const navState = new AppState({
     selectedURI: null,
     activeOntology: null,
     filterState: {},
   });
   ```

3. **Integrate with BSCLab Dashboard**:
   - Sessions should link to RDF concepts
   - Clicking RDF link → opens nso-navigator.html with URI
   - Navigator can deep-link back to sessions

4. **URL Sharing for Ontology Views**:
   ```javascript
   // Share specific ontology view
   const url = `nso-navigator.html?uri=${encodeURIComponent(conceptURI)}&ontology=${ontologyId}`;
   ```

**RDF Integration Points**:
- Sessions have `rdfLinks` array (URIs to concepts)
- Tracks reference technique URIs
- Martigli configurations link to breathing patterns
- Use constants.js `DASHBOARD_ONTOLOGY_LINKS` for mappings

---

### **Pod: Martigli & Audio Algorithms**

**Mission**: Implement oscillators and audio synthesis with new architecture

**MUST USE**:
- `app-state.martigliState` for oscillator state
- `constants.js` MARTIGLI_CONFIG for limits
- `structures.js` BSCLabKernel (already good!)

**Key Concepts**:
```javascript
// Multiple Martigli oscillators
const martigliState = appState.martigliState;

martigliState.addOscillation({
  id: 'breath-primary',
  startPeriod: 10,
  endPeriod: 20,
  transitionSeconds: 120,
});

martigliState.addOscillation({
  id: 'breath-secondary',
  startPeriod: 5,
  endPeriod: 15,
  transitionSeconds: 90,
});

// Get current value
const snapshot = martigliState.snapshot();
const value = snapshot.oscillations[0].currentValue;

// Modulate parameters
const frequency = baseFrequency + (depthHz * value);
```

**Parameter Modulation**:
- **Audio**: frequency, volume, pan, filter cutoff
- **Visual**: brightness, hue, saturation, scale
- **Haptic**: intensity, frequency

**RDF Integration**:
- Link oscillators to `NSO#BreathingSynchronization`
- Link techniques to `NSO#BinauralBeats`, etc.
- Store RDF provenance in session data

---

### **Pod: Testing & QA**

**Mission**: Maintain all tests + add new architecture tests

**MUST TEST**:
1. **State Management** (`npm run test:state`):
   - AppState observer pattern
   - URL serialization/deserialization
   - Session manager CRUD
   - Auth validation

2. **Structures** (`npm run test:structures`):
   - Existing structure tests (keep passing!)
   - Add tests for Martigli modulation

3. **RDF** (`npm run test:rdf`):
   - Ontology integrity
   - URI resolution

4. **Integration** (Playwright):
   - End-to-end flows
   - URL sharing works
   - RDF links navigate correctly

**New Test Template**:
```javascript
// tests/martigli-modulation.test.mjs
import { strict as assert } from 'node:assert';
import { appState } from '../scripts/state/app-state.js';

// Test Martigli modulation
const martigli = appState.martigliState;
martigli.addOscillation({ id: 'test', startPeriod: 10, endPeriod: 20 });

const snapshot = martigli.snapshot();
assert.equal(snapshot.oscillations.length, 1, 'Oscillation added');

// Test parameter modulation
const baseFreq = 440;
const depth = 100;
const modulated = baseFreq + (depth * snapshot.oscillations[0].currentValue);

assert.ok(modulated >= baseFreq - depth && modulated <= baseFreq + depth, 'Modulation within range');
```

---

### **Pod: Video & Visualizations**

**Mission**: Visual experiences driven by Martigli values

**MUST USE**:
- `appState.martigliState` for oscillator values
- `app-state.js` subscriptions for reactive rendering
- `constants.js` VISUAL_CONFIG for limits

**Architecture**:
```javascript
import { appState } from './state/app-state.js';
import { VISUAL_CONFIG } from './constants.js';

// Subscribe to Martigli changes
appState.martigliState.subscribe((snapshot) => {
  const martigliValue = snapshot.oscillations[0].currentValue;

  // Modulate brightness
  const brightness = VISUAL_CONFIG.DEFAULT_BRIGHTNESS + (0.2 * martigliValue);

  // Update canvas
  renderFrame(brightness);
});
```

**Visual Techniques**:
- Quadrant blinks (synchronized to Martigli)
- Particle systems (driven by oscillator)
- Color gradients (modulated hue)
- Pattern animations (breathing effect)

**RDF Integration**:
- Link visual techniques to `NSO#VisualEntrainment`
- Link patterns to `NSO#FlashingLight` or `NSO#MovingPattern`

---

## 🔄 Migration Workflow (Option B: Full Integration)

### **Week 1: Core Migration**

**Day 1-2: Firebase & Auth**
```bash
# Task: Migrate Firebase operations in auth.js

# BEFORE (auth.js):
import { getAuth } from 'firebase/auth';
const auth = getAuth(app);

# AFTER:
import { auth } from './auth/firebase-init.js';
import { signInWithGoogle, signOut } from './auth/auth-manager.js';

# Test:
npm run test:state
```

**Day 3-4: Sessions**
```bash
# Task: Migrate session operations

# BEFORE (auth.js):
const sessions = await getDocs(collection(db, 'sessions'));

# AFTER:
import { fetchSessions, createSession } from './auth/session-manager.js';
const sessions = await fetchSessions(userId);

# Test:
npm test
```

**Day 5: State & UI**
```bash
# Task: Wire up state management

# Add subscriptions:
appState.subscribe((state) => {
  renderSessionList(ui.sessionList, ui.sessionStatus, state.sessions, handleClick);
});

# Test:
npm run test:state
```

### **Week 2: Features & RDF**

**Day 6-7: URL Sharing**
```bash
# Task: Add URL sharing UI
# Add button, wire up copyShareableURL()
# Test restoration from URLs
```

**Day 8-9: RDF Integration**
```bash
# Task: Surface RDF links in sessions
# Use DASHBOARD_ONTOLOGY_LINKS
# Link to nso-navigator.html
```

**Day 10: Martigli Multi-Oscillator**
```bash
# Task: Support multiple Martigli waves
# Update UI to show all oscillators
# Wire modulation to tracks
```

### **Week 3: Polish & Deploy**

**Day 11-13: Testing**
```bash
# Comprehensive testing
# Fix any issues
# Performance optimization
```

**Day 14-15: Deploy**
```bash
# Deploy Firestore rules
npm run deploy:firestore-rules

# Deploy to production
# Monitor for issues
```

---

## 🎯 Success Criteria

### **For All Pods**:
- ✅ Using new modules (no direct Firebase imports)
- ✅ State via app-state.js
- ✅ Constants from constants.js
- ✅ Tests passing
- ✅ Documentation updated

### **For GUI Pod**:
- ✅ auth.js migrated to new modules
- ✅ URL sharing working
- ✅ RDF links in session cards
- ✅ Multiple Martigli oscillators supported

### **For RDF Pod**:
- ✅ Navigator integrated with dashboard
- ✅ Deep linking works
- ✅ Ontology links bidirectional

### **For Martigli Pod**:
- ✅ Multiple oscillators
- ✅ Parameter modulation working
- ✅ RDF provenance links

---

## 📚 Quick Reference

**State Operations**:
```javascript
import { appState } from './state/app-state.js';

appState.subscribe((state) => {}); // Reactive UI
appState.setSessions(sessions);    // Update sessions
appState.setActiveSession(id);     // Set active
appState.addSession(session);      // Add new
```

**Session Operations**:
```javascript
import { fetchSessions, createSession } from './auth/session-manager.js';

const sessions = await fetchSessions(userId);
const newSession = await createSession(userId, data);
```

**URL Sharing**:
```javascript
import { createShareableURL, restoreFromURL } from './state/url-state-manager.js';

const url = createShareableURL(appState);
const restored = restoreFromURL();
```

**Constants**:
```javascript
import { MARTIGLI_CONFIG, DASHBOARD_ONTOLOGY_LINKS } from './constants.js';

const minPeriod = MARTIGLI_CONFIG.MIN_PERIOD;
const links = DASHBOARD_ONTOLOGY_LINKS['binaural-alpha'];
```

---

**This is the new way. All pods must follow this architecture!** 🚀

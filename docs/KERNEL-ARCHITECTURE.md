# Kernel Architecture

Deep dive into BioSynCare Lab's core architecture and system design.

---

## Overview

BioSynCare Lab is built on a **kernel architecture** where a central kernel manages state, coordinates modules, and provides core services to specialized subsystems.

### Design Principles

1. **Separation of Concerns**: Clear boundaries between kernel, modules, and UI
2. **Single Source of Truth**: Centralized state management in kernel
3. **Event-Driven**: Modules communicate via events and subscriptions
4. **Immutability**: State updates are immutable and versioned
5. **Modularity**: Features are independent, hot-swappable modules

---

## System Layers

```
┌─────────────────────────────────────────┐
│           User Interface Layer          │
│  (Tabs, Panels, Controls, Visualizers)  │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│         Application Module Layer        │
│ (Structures, NSO, Sessions, Tracks)     │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│              Kernel Layer               │
│  (State Manager, Event Bus, Services)   │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│          Infrastructure Layer           │
│  (Firebase, Web Audio, Storage, RDF)    │
└─────────────────────────────────────────┘
```

---

## Kernel Components

### 1. State Manager

Central state container managing the entire application state.

**Location**: `scripts/state/app-state.js`

**Responsibilities**:
- Store application state
- Validate state updates
- Notify subscribers of changes
- Persist state to localStorage
- Encode/decode state for URLs

**State Structure**:
```javascript
{
  version: 1,                    // Schema version
  activeTab: 'dashboard',        // Current tab
  session: {                     // Active session
    id: 'session-123',
    metadata: { ... }
  },
  structures: {                  // Structure explorer state
    category: 'comprehensive',
    structureId: 'plain_hunt_6',
    sequenceId: null,
    playbackPosition: 0,
    isPlaying: false
  },
  nso: {                        // NSO Navigator state
    currentConcept: 'bsc:AudioModality',
    viewMode: 'graph',
    searchQuery: ''
  },
  tracks: {                     // Track manager state
    audio: [],
    visual: [],
    haptic: [],
    martigli: []
  }
}
```

**API**:
```javascript
// Get state
const state = getState();
const value = getPath('structures.category');

// Set state
setState(newState);
setPath('structures.playbackPosition', 42);

// Subscribe to changes
subscribe('structures', (newValue, oldValue) => {
  console.log('Structures changed:', newValue);
});
```

### 2. URL State Manager

Synchronizes application state with URL fragments for deep linking.

**Location**: `scripts/state/url-state-manager.js`

**Responsibilities**:
- Encode state to base64 URL fragments
- Decode URL fragments to state objects
- Update URL without page reload
- Listen for popstate events (back/forward)

**Encoding Pipeline**:
```
State Object
  → JSON.stringify()
  → encodeURIComponent()
  → base64 encode
  → prepend #state=
  → update window.location.hash
```

**Decoding Pipeline**:
```
window.location.hash
  → extract base64 portion
  → base64 decode
  → decodeURIComponent()
  → JSON.parse()
  → validate schema
  → restore State Object
```

**Usage**:
```javascript
// Save state to URL
await saveStateToURL();

// Restore state from URL
const restored = await restoreStateFromURL();

// Listen for URL changes
window.addEventListener('popstate', () => {
  restoreStateFromURL();
});
```

### 3. Event Bus

Pub/sub system for inter-module communication.

**Location**: `scripts/kernel/event-bus.js` (planned)

**Responsibilities**:
- Register event listeners
- Emit events to subscribers
- Support wildcards and namespaces
- Event logging and debugging

**API**:
```javascript
// Subscribe to events
on('structure.play', (event) => {
  console.log('Structure playing:', event.sequenceId);
});

// Emit events
emit('structure.play', {
  sequenceId: 'plain_hunt_6',
  tempo: 120
});

// Unsubscribe
off('structure.play', handler);
```

### 4. Service Registry

Manages kernel services like auth, storage, RDF.

**Location**: `scripts/kernel/service-registry.js` (planned)

**Services**:
- **AuthService**: Firebase authentication
- **StorageService**: Firestore/LocalStorage
- **RDFService**: Ontology loading and querying
- **AudioService**: Web Audio API management
- **TelemetryService**: Usage tracking

**API**:
```javascript
// Get service
const authService = kernel.getService('auth');
await authService.signIn(email, password);

// Register custom service
kernel.registerService('myService', new MyService());
```

---

## Module System

### Module Lifecycle

```
Initialize → Mount → Ready → Update → Unmount → Destroy
```

**Phases**:

1. **Initialize**: Module constructor, setup internal state
2. **Mount**: Attach to DOM, register event listeners
3. **Ready**: Module fully loaded and operational
4. **Update**: Respond to state changes and user interactions
5. **Unmount**: Remove from DOM, cleanup listeners
6. **Destroy**: Release resources, garbage collection

### Module Interface

Every module implements:

```javascript
class Module {
  constructor(kernel) {
    this.kernel = kernel;
    this.state = {};
  }

  // Lifecycle methods
  async init() { }
  async mount(container) { }
  async unmount() { }
  async destroy() { }

  // State methods
  getState() { }
  setState(newState) { }

  // Event methods
  on(event, handler) { }
  emit(event, data) { }
}
```

### Core Modules

#### 1. Structures Module

**Location**: `scripts/structures-tab.js`

**Responsibilities**:
- Load structure data from JSON
- Render structure cards
- Handle playback controls
- Generate shareable links
- Display RDF metadata

**Dependencies**:
- State Manager (for playback state)
- Audio Service (for synthesis)
- RDF Service (for metadata)

#### 2. NSO Navigator Module

**Location**: `scripts/nso-navigator.js`

**Responsibilities**:
- Load RDF/Turtle ontologies
- Render concept graph/tree
- Handle search and filtering
- Display concept details
- Export Turtle source

**Dependencies**:
- RDF Service (for ontology loading)
- State Manager (for current concept)

#### 3. Session Manager Module

**Location**: `scripts/auth/session-manager.js`

**Responsibilities**:
- Create and save sessions
- Load and apply sessions
- Manage session metadata
- Handle folder organization
- Generate session share links

**Dependencies**:
- State Manager (for session state)
- Storage Service (for Firestore)
- Auth Service (for user context)

#### 4. Track Manager Module

**Location**: `scripts/tracks/TrackManager.js`

**Responsibilities**:
- Add/remove tracks
- Play/pause/stop playback
- Adjust volume, pan, mute
- Visualize waveforms
- Manage track metadata

**Dependencies**:
- Audio Engine (for audio tracks)
- Video Engine (for visual tracks)
- Haptic Engine (for haptic tracks)

---

## Data Flow

### Unidirectional Flow

```
User Action
  → Event Handler
  → State Update (immutable)
  → State Manager
  → Notify Subscribers
  → UI Re-render
```

**Example**: Playing a structure

```javascript
// 1. User clicks Play button
handlePlayClick(sequenceId) {
  // 2. Update state
  setPath('structures.isPlaying', true);
  setPath('structures.playbackPosition', 0);

  // 3. State manager notifies subscribers
  // (audio engine starts playback)

  // 4. UI re-renders with new state
  // (Play button → Stop button)
}
```

### State Sync Flow

```
Local State Change
  → State Manager
  → URL State Manager (encode to URL)
  → window.location.hash updated
  → localStorage.setItem('lastState', ...)

Browser Back/Forward
  → popstate event
  → URL State Manager (decode from URL)
  → State Manager
  → Modules receive updates
  → UI re-renders
```

---

## Rendering Architecture

### Virtual DOM Alternative

BioSynCare Lab uses **targeted DOM updates** instead of virtual DOM:

```javascript
// Bad: Full re-render
function render() {
  container.innerHTML = generateHTML(state);
}

// Good: Targeted update
function updatePlaybackPosition(position) {
  const positionElement = document.querySelector('.playback-position');
  positionElement.textContent = `Row: ${position}`;
}
```

**Benefits**:
- Minimal DOM manipulation
- No framework overhead
- Direct control over updates
- Better performance for large lists

### Event Delegation

Use event delegation for dynamic content:

```javascript
// Bad: Individual listeners
rows.forEach(row => {
  row.addEventListener('click', handleClick);
});

// Good: Delegated listener
container.addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (row) handleClick(row);
});
```

---

## Performance Patterns

### 1. Lazy Loading

Load modules only when needed:

```javascript
async function loadStructuresModule() {
  const { StructuresTab } = await import('./scripts/structures-tab.js');
  return new StructuresTab(kernel);
}
```

### 2. Debouncing

Batch rapid updates:

```javascript
const debouncedSave = debounce(saveState, 500);

input.addEventListener('input', () => {
  debouncedSave(getState());
});
```

### 3. Memoization

Cache expensive computations:

```javascript
const memoizedRender = memoize((state) => {
  return generateHTML(state);
});
```

### 4. Web Workers

Offload heavy processing:

```javascript
const worker = new Worker('rdf-parser-worker.js');

worker.postMessage({ turtle: turtleString });

worker.onmessage = (e) => {
  const graph = e.data;
  renderGraph(graph);
};
```

---

## Error Handling

### Error Boundaries

Catch errors at module boundaries:

```javascript
class Module {
  async mount(container) {
    try {
      await this.init();
      await this.render(container);
    } catch (error) {
      console.error(`Module ${this.name} failed to mount:`, error);
      this.renderError(container, error);
    }
  }
}
```

### Graceful Degradation

Provide fallbacks for missing features:

```javascript
// Check Web Audio support
if (!window.AudioContext) {
  showWarning('Audio playback not supported in this browser');
  disablePlaybackControls();
}

// Check localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  showWarning('Session persistence disabled');
  useInMemoryStorage();
}
```

---

## Testing Strategy

### Unit Tests

Test individual functions and modules:

```javascript
import { encodeState, decodeState } from './url-state-manager.js';

test('encodeState preserves data', () => {
  const state = { version: 1, activeTab: 'dashboard' };
  const encoded = encodeState(state);
  const decoded = decodeState(encoded);
  expect(decoded).toEqual(state);
});
```

### Integration Tests

Test module interactions:

```javascript
test('playing structure updates state', async () => {
  const structures = new StructuresModule(kernel);
  await structures.mount(container);

  structures.play('plain_hunt_6');

  expect(getPath('structures.isPlaying')).toBe(true);
  expect(getPath('structures.sequenceId')).toBe('plain_hunt_6');
});
```

### End-to-End Tests

Test full user workflows:

```javascript
test('user can share structure link', async () => {
  await page.goto('http://localhost:4173');
  await page.click('#tab-structures');
  await page.selectOption('#structure-select', 'plain_hunt_6');
  await page.click('.share-structure-btn');

  const clipboardText = await page.evaluate(() => {
    return navigator.clipboard.readText();
  });

  expect(clipboardText).toContain('#state=');
});
```

---

## Security Considerations

### XSS Prevention

Sanitize user input:

```javascript
function sanitizeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}
```

### CSRF Protection

Use Firebase security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null
        && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Content Security Policy

Restrict resource loading:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://cdn.jsdelivr.net;
               connect-src 'self' https://*.firebaseio.com;">
```

---

## Future Architecture

### 1. Micro-frontends

Split into independent apps:

```
/dashboard    → Dashboard App
/structures   → Structures App
/nso          → NSO App
/docs         → Docs App
```

### 2. Plugin System

Allow third-party extensions:

```javascript
kernel.registerPlugin({
  name: 'CustomVisualizer',
  version: '1.0.0',
  mount: (container) => { ... },
  unmount: () => { ... }
});
```

### 3. WebAssembly

High-performance RDF parsing:

```javascript
const { parseRDF } = await import('./rdf-parser.wasm');
const graph = parseRDF(turtleString);
```

### 4. Real-time Collaboration

Operational transformation for multi-user editing:

```javascript
socket.on('state-update', (op) => {
  const transformed = transform(localOp, op);
  applyOperation(transformed);
});
```

---

## Related Documentation

- [POD Architecture](pod-architecture) - POD system overview
- [Agents](agents) - Agent system architecture
- [Refactoring Summary](refactoring) - Recent architectural changes
- [Features](features) - Complete feature reference

---

**Last Updated**: 2025-11-25
**Maintained by**: BioSynCare Lab AI Assistants

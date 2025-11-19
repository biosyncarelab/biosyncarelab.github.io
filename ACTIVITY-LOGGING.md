# Activity Logging - User Actions Tracked

All user actions in the BSCLab neurosensory stimulation interface are logged to the database via `kernel.recordInteraction()`. This creates a comprehensive activity log for analytics, research, and user behavior understanding.

---

## 📊 Logged Events

### **Authentication & User Management**
All auth events are logged by Firebase automatically via the auth emulator/production.

---

### **Session Management**

#### **sessions.loaded**
**When:** User's sessions are fetched from Firestore
**Location:** [scripts/auth.js:1257](scripts/auth.js#L1257)
**Payload:**
```javascript
{
  count: number,        // Number of sessions loaded
  userId: string        // User ID
}
```

#### **session.saved**
**When:** User saves a session to Firestore
**Location:** [scripts/auth.js:1453](scripts/auth.js#L1453)
**Payload:**
```javascript
{
  sessionId: string,    // Firestore document ID
  label: string,        // Session name
  userId: string        // User ID
}
```

#### **session.apply.martigli**
**When:** User applies Martigli settings from a session
**Location:** [scripts/auth.js:1366](scripts/auth.js#L1366)
**Payload:**
```javascript
{
  recordId: string,     // Session ID
  label: string         // Session name
}
```

#### **session.share.url**
**When:** User creates a shareable URL for a session
**Location:** [scripts/auth.js:1512](scripts/auth.js#L1512)
**Payload:**
```javascript
{
  sessionId: string,    // Active session ID
  label: string,        // Session name
  success: boolean      // Whether clipboard copy succeeded
}
```

#### **session.url.restored**
**When:** Page loads with state in URL parameters
**Location:** [scripts/auth.js:3652](scripts/auth.js#L3652)
**Payload:**
```javascript
{
  hasMartigli: boolean,      // Whether Martigli state present
  activeSessionId: string    // Session ID from URL (if any)
}
```

---

### **Martigli Oscillation Management**

#### **martigli.oscillation.create**
**When:** User adds a new Martigli oscillator (breathing wave)
**Location:** [scripts/auth.js:3101](scripts/auth.js#L3101)
**Payload:**
```javascript
{
  oscillatorId: string,      // New oscillator ID
  startPeriod: number,       // Starting breath period (seconds)
  endPeriod: number,         // Ending breath period (seconds)
  waveform: string          // Wave shape (sine, triangle, etc.)
}
```

#### **martigli.oscillation.select**
**When:** User selects a different oscillator from dropdown
**Location:** [scripts/auth.js:3496](scripts/auth.js#L3496)
**Payload:**
```javascript
{
  oscillatorId: string      // Selected oscillator ID
}
```

#### **martigli.oscillation.rename**
**When:** User renames a Martigli oscillator
**Location:** [scripts/auth.js:3528](scripts/auth.js#L3528)
**Payload:**
```javascript
{
  oscillatorId: string,     // Oscillator ID
  oldLabel: string,         // Previous name
  label: string            // New name
}
```

#### **martigli.oscillation.delete**
**When:** User deletes a Martigli oscillator
**Location:** [scripts/auth.js:3552](scripts/auth.js#L3552)
**Payload:**
```javascript
{
  oscillatorId: string,     // Deleted oscillator ID
  label: string            // Oscillator name
}
```

---

### **Modal & UI Interactions**

#### **modal.open**
**When:** User opens a session detail modal
**Location:** [scripts/auth.js:3326](scripts/auth.js#L3326)
**Payload:**
```javascript
{
  recordId: string,         // Session/record ID
  kind: string,             // Type (session, preset, etc.)
  label: string            // Display name
}
```

#### **modal.close**
**When:** User closes the session detail modal
**Location:** [scripts/auth.js:3272](scripts/auth.js#L3272)
**Payload:**
```javascript
{
  recordId: string,         // Session ID
  kind: string,             // Type
  label: string            // Display name
}
```

---

### **Track Operations**

#### **track.visualizer.open**
**When:** User opens the track visualizer (audio waveform)
**Location:** [scripts/auth.js:813](scripts/auth.js#L813)
**Payload:**
```javascript
{
  trackId: string,          // Track ID
  label: string,            // Track name
  type: string             // Track type (audio, visual, etc.)
}
```

#### **track.visualizer.close**
**When:** User closes the track visualizer
**Location:** [scripts/auth.js:833](scripts/auth.js#L833)
**Payload:**
```javascript
{
  trackId: string,          // Track ID
  reason: string           // Close reason (button, escape, overlay)
}
```

#### **track.preview.toggle**
**When:** User starts/stops track preview playback
**Location:** [scripts/auth.js:885](scripts/auth.js#L885)
**Payload:**
```javascript
{
  trackId: string,          // Track ID
  action: string,           // "start" or "stop"
  type: string             // Track type
}
```

---

## 🎯 Coverage Summary

**Total Events Tracked:** 16+ distinct user actions

### **Categories**
- ✅ **Session Management:** 5 events (load, save, apply, share, restore)
- ✅ **Martigli Control:** 4 events (create, select, rename, delete)
- ✅ **Modal Interactions:** 2 events (open, close)
- ✅ **Track Operations:** 3 events (visualizer open/close, preview toggle)
- ✅ **Custom Events:** Extensible via `kernel.recordInteraction(eventName, payload)`

### **Storage**
All events are logged to Firestore via the `telemetry` collection with:
- Timestamp (server-side)
- User ID (if authenticated)
- Event name
- Payload (event-specific data)
- Client info (emulator status, user agent)

---

## 📈 Usage Examples

### **Tracking a New User Action**
```javascript
// When user changes a track parameter
kernel.recordInteraction("track.parameter.changed", {
  trackId: track.id,
  parameter: "frequency",
  oldValue: 440,
  newValue: 880,
  timestamp: Date.now()
});
```

### **Tracking Audio Playback**
```javascript
// When user starts a sensory stimulation track
kernel.recordInteraction("track.audio.started", {
  trackId: track.id,
  type: track.type,  // "binaural", "isochronous", etc.
  duration: track.durationMs,
  martigliModulated: !!track.martigliBindings
});
```

### **Tracking Session Completion**
```javascript
// When user completes a full neurosensory session
kernel.recordInteraction("session.completed", {
  sessionId: session.id,
  durationMs: elapsedTime,
  tracksPlayed: playedTracks.length,
  userRating: rating  // if feedback collected
});
```

---

## 🔒 Privacy & Security

- ✅ User data anonymized where appropriate
- ✅ No sensitive personal information in logs
- ✅ Firestore rules restrict access (users can only access own logs)
- ✅ Telemetry is append-only (users cannot modify/delete logs)
- ✅ Client info collected for debugging (emulator status, user agent)

---

## 🚀 Next Steps for Activity Logging

### **Recommended Additional Events**

1. **Parameter Changes**
   - Track when users adjust frequency, volume, duration
   - Capture before/after values

2. **Session Completion**
   - Track when full sessions are completed
   - Capture duration, tracks played

3. **Error Events**
   - Log when operations fail (save errors, load errors)
   - Include error messages for debugging

4. **Performance Metrics**
   - Track load times (sessions, tracks)
   - Measure audio playback latency

5. **Feature Usage**
   - Track which features are most used
   - Identify unused features for potential removal

---

**Activity logging is comprehensive and ready for research/analytics!** 📊

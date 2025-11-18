# auth.js Migration Plan - Option B Full Integration

**Goal:** Migrate auth.js (3,545 lines) to use new modular architecture
**Status:** In Progress - Week 1
**Approach:** Incremental, testable, non-breaking

---

## 📊 Current State Analysis

### **What auth.js Does (Current):**
1. Firebase initialization (lines 1-103)
2. UI element references (lines 105-166)
3. Constants and configuration (lines 34-85, 168-203)
4. Utility functions (lines 204-300+)
5. Dashboard rendering (lines 1200-1400+)
6. Session management (scattered throughout)
7. Martigli dashboard (lines 2900-3100+)
8. Modal handling (lines 3180-3250+)
9. Event handlers (lines 3300-3500+)

### **Problems:**
- Mixed concerns (data + UI + events in same functions)
- Global state variables (20+)
- Direct Firebase imports
- Hard-coded constants
- No separation between data fetching and UI rendering

---

## 🎯 Migration Strategy

### **Phase 1: Imports & Initialization** ✅ (This Document)
**Goal:** Replace Firebase imports with module imports
**Files:** Lines 1-103
**Risk:** Low
**Testing:** `npm run test:state`

### **Phase 2: State Management** (Next)
**Goal:** Wire up app-state.js, add subscriptions
**Files:** Lines 240-260
**Risk:** Medium
**Testing:** Manual testing + state tests

### **Phase 3: Session Operations** (After Phase 2)
**Goal:** Replace session CRUD with session-manager.js
**Files:** Lines 1250-1270+ (loadDashboardData, etc.)
**Risk:** Medium-High
**Testing:** Full test suite

### **Phase 4: UI Rendering** (After Phase 3)
**Goal:** Use ui-renderer.js for rendering
**Files:** Lines 1238-1400+ (renderDashboardList, etc.)
**Risk:** Medium
**Testing:** Visual testing

### **Phase 5: Cleanup** (Final)
**Goal:** Remove old code, consolidate
**Files:** Throughout
**Risk:** Low
**Testing:** Full test suite

---

## 📝 Detailed Migration Steps

### **PHASE 1: Imports & Initialization** ⏳ Current

#### **Step 1.1: Replace Firebase Imports**

**BEFORE (lines 1-25):**
```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
```

**AFTER:**
```javascript
// Import from new modules
import { auth, db, useAuthEmulator } from "./auth/firebase-init.js";
import { signInWithGoogle, signInWithEmail, signOut, onAuthChange, getCurrentUser } from "./auth/auth-manager.js";
import { fetchSessions, createSession, updateSession, deleteSession } from "./auth/session-manager.js";
import { appState } from "./state/app-state.js";
import { createShareableURL, restoreFromURL, updateBrowserURL } from "./state/url-state-manager.js";
import { renderSessionList, renderAuthState, toggleAuthPanels, setMessage } from "./auth/ui-renderer.js";
import { createModalController } from "./auth/modal-controller.js";
import { NSO_BASE_URI, DASHBOARD_ONTOLOGY_LINKS, SESSION_CLASS_LINK, MARTIGLI_CONFIG, UI_CONFIG, FIRESTORE_COLLECTIONS } from "./constants.js";

// Keep existing imports
import { firebaseConfig } from "./firebase-config.js";
import { BSCLabKernel } from "./structures.js";
import { STRUCTURE_MANIFEST } from "./structures-loader.js";
```

**Changes:**
- ✅ Remove direct Firebase CDN imports
- ✅ Add new module imports
- ✅ Import constants from constants.js
- ✅ Remove duplicate Firebase initialization code

**Testing:**
```bash
# After changes, verify imports work
node -e "import('./scripts/auth.js').then(() => console.log('✅ Imports OK'))"
```

#### **Step 1.2: Remove Duplicate Constants**

**BEFORE (lines 34-85):**
```javascript
const NSO_BASE_URI = "https://biosyncare.github.io/rdf/harmonicare/SSO_Ontology.owl#";
const DASHBOARD_ONTOLOGY_LINKS = { /* 50 lines of data */ };
const SESSION_CLASS_LINK = { /* ... */ };
```

**AFTER:**
```javascript
// Import from constants.js (already defined there)
// Remove these lines entirely
```

**Changes:**
- ✅ Delete NSO_BASE_URI definition
- ✅ Delete DASHBOARD_ONTOLOGY_LINKS definition
- ✅ Delete SESSION_CLASS_LINK definition
- ✅ All usages now reference imports

**Result:** ~50 lines removed, no duplication

#### **Step 1.3: Initialize App State**

**BEFORE (lines 241-246):**
```javascript
const dashboardState = {
  sessions: [],
  activeSessionId: null,
  activeSessionLabel: null,
};
const kernel = new BSCLabKernel({ onInteraction: logInteraction });
kernel.init();
```

**AFTER:**
```javascript
// Initialize kernel
const kernel = new BSCLabKernel({ onInteraction: logInteraction });
await kernel.init();

// Set kernel in app state
appState.setKernel(kernel);

// Subscribe to state changes for reactive UI
appState.subscribe((state) => {
  // Render UI automatically when state changes
  if (ui.sessionList && ui.sessionStatus) {
    renderSessionList(ui.sessionList, ui.sessionStatus, state.sessions, openDetailModal);
  }

  // Update auth UI
  if (ui.authState && ui.email && ui.userId) {
    renderAuthState({ state: ui.authState, email: ui.email, userId: ui.userId }, state.currentUser);
  }

  // Toggle panels
  toggleAuthPanels(ui.authForms, ui.dashboard, !!state.currentUser);
});
```

**Changes:**
- ✅ Replace dashboardState with appState
- ✅ Wire up kernel to appState
- ✅ Add state subscription for reactive UI
- ✅ UI updates automatically when state changes

---

### **PHASE 2: Authentication Flow** 📅 Next

#### **Step 2.1: Replace Auth Event Handler**

**BEFORE (lines 3298-3305):**
```javascript
onAuthStateChanged(auth, (user) => {
  updateAuthState(user);
  if (user) {
    setMessage(`Welcome back, ${user.email ?? "friend"}!`, "success");
  } else if (!isBusy) {
    setMessage("Signed out", "info");
  }
});
```

**AFTER:**
```javascript
onAuthChange((user) => {
  // Update app state
  appState.setUser(user ? extractUserProfile(user) : null);

  // Show message
  if (user) {
    setMessage(ui.messages, `Welcome back, ${user.email ?? "friend"}!`, "success");

    // Load sessions
    loadUserSessions(user.uid);
  } else {
    setMessage(ui.messages, "Signed out", "info");
    appState.setSessions([]);
  }
});
```

**Changes:**
- ✅ Use onAuthChange from auth-manager.js
- ✅ Update via appState.setUser()
- ✅ UI updates via subscription (automatic)

#### **Step 2.2: Replace Sign-In Handlers**

**BEFORE (lines 3307-3319):**
```javascript
ui.googleSignIn.addEventListener("click", async () => {
  setBusy(true);
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});
```

**AFTER:**
```javascript
ui.googleSignIn.addEventListener("click", async () => {
  appState.setBusy(true);
  try {
    await signInWithGoogle();
    // onAuthChange handler will update state & UI
  } catch (err) {
    setMessage(ui.messages, err.message, "error");
  } finally {
    appState.setBusy(false);
  }
});
```

**Changes:**
- ✅ Use signInWithGoogle() from auth-manager.js
- ✅ Update busy state via appState
- ✅ Error handling with setMessage()

---

### **PHASE 3: Session Operations** 📅 Week 1, Day 3-4

#### **Step 3.1: Replace Session Loading**

**BEFORE (lines 1252-1269):**
```javascript
const loadDashboardData = async () => {
  if (isFetchingDashboard) return;
  if (!ui.dashboard) return;
  isFetchingDashboard = true;
  setDashboardVisibility(true);
  ui.sessionStatus.textContent = "Loading sessions…";
  try {
    const sessionSnap = await getDocs(collection(db, "sessions"));
    const sessions = sessionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    dashboardState.sessions = sessions;
    renderDashboardList(ui.sessionList, ui.sessionStatus, sessions, "No sessions found.", "session");
  } catch (err) {
    console.error("Dashboard load failed", err);
    ui.sessionStatus.textContent = "Unable to load sessions.";
  } finally {
    isFetchingDashboard = false;
  }
};
```

**AFTER:**
```javascript
const loadUserSessions = async (userId) => {
  if (!userId) return;

  try {
    appState.setFetchingDashboard(true);
    ui.sessionStatus.textContent = "Loading sessions…";

    // Fetch via session-manager (pure data)
    const sessions = await fetchSessions(userId);

    // Update app state → UI auto-updates via subscription!
    appState.setSessions(sessions);

  } catch (err) {
    console.error("Dashboard load failed", err);
    setMessage(ui.messages, "Failed to load sessions", "error");
    ui.sessionStatus.textContent = "Unable to load sessions.";
  } finally {
    appState.setFetchingDashboard(false);
  }
};
```

**Changes:**
- ✅ Use fetchSessions() from session-manager.js
- ✅ Update via appState.setSessions()
- ✅ UI updates automatically via subscription
- ✅ Separation: data fetching → state update → UI render

---

### **PHASE 4: UI Rendering** 📅 Week 1, Day 5

#### **Step 4.1: Replace Dashboard Rendering**

**BEFORE (lines 1238-1248):**
```javascript
const renderDashboardList = (list, statusEl, items, emptyLabel, kind) => {
  if (!list || !statusEl) return;
  clearList(list);
  if (!items || items.length === 0) {
    statusEl.textContent = emptyLabel;
    return;
  }
  statusEl.textContent = `${items.length} ${kind}${items.length > 1 ? "s" : ""}`;
  items.forEach((item) => {
    // ... 100+ lines of DOM construction
  });
};
```

**AFTER:**
```javascript
// Use ui-renderer.js function directly
// Already wired up in state subscription (Phase 1, Step 1.3)
// When appState.setSessions() is called → subscription triggers → renderSessionList() called automatically
```

**Changes:**
- ✅ Remove renderDashboardList function
- ✅ Use renderSessionList from ui-renderer.js
- ✅ Called automatically via state subscription

---

### **PHASE 5: URL Sharing** 📅 Week 2, Day 6-7

#### **Step 5.1: Add URL Sharing Button**

**ADD to HTML:**
```html
<!-- In index.html, add after session controls -->
<button id="copy-share-link" class="ghost small">
  📋 Copy Shareable Link
</button>
<span id="url-indicator" class="hidden badge">State in URL</span>
```

**ADD to auth.js:**
```javascript
// Wire up URL sharing button
if (ui.copyShareLink) {
  ui.copyShareLink.addEventListener("click", async () => {
    const success = await copyShareableURL(appState);
    if (success) {
      setMessage(ui.messages, "Shareable link copied to clipboard!", "success");

      // Show indicator
      if (ui.urlIndicator) {
        ui.urlIndicator.classList.remove("hidden");
      }
    } else {
      setMessage(ui.messages, "Failed to copy link", "error");
    }
  });
}

// Restore state from URL on load
const urlState = restoreFromURL();
if (urlState) {
  appState.setState(urlState.snapshot());
  appState.applySerializedMartigliState(urlState.toSerializable());

  // Show indicator
  if (ui.urlIndicator) {
    ui.urlIndicator.classList.remove("hidden");
  }
}
```

**Changes:**
- ✅ Add "Copy Shareable Link" button to UI
- ✅ Wire up copyShareableURL()
- ✅ Restore state from URL on page load
- ✅ Visual indicator when state is in URL

---

## ✅ Success Criteria

### **After Phase 1:**
- [ ] All imports use new modules
- [ ] No direct Firebase CDN imports
- [ ] Constants from constants.js
- [ ] App state initialized
- [ ] Tests pass: `npm run test:state`

### **After Phase 2:**
- [ ] Auth flow uses auth-manager.js
- [ ] State updates via appState
- [ ] UI updates automatically
- [ ] Sign-in/sign-out works
- [ ] Tests pass: `npm test`

### **After Phase 3:**
- [ ] Session CRUD uses session-manager.js
- [ ] Sessions load correctly
- [ ] Dashboard renders sessions
- [ ] Tests pass: `npm test`

### **After Phase 4:**
- [ ] UI rendering uses ui-renderer.js
- [ ] Rendering is pure (no data fetching)
- [ ] State subscriptions work
- [ ] Tests pass: Visual testing

### **After Phase 5:**
- [ ] URL sharing button added
- [ ] Shareable links work
- [ ] State restores from URLs
- [ ] Tests pass: Full suite

---

## 📊 Progress Tracking

| Phase | Status | Lines Changed | Tests | Notes |
|-------|--------|---------------|-------|-------|
| Phase 1 | 🔄 In Progress | 0-103 | ✅ State tests | Replace imports |
| Phase 2 | ⏳ Pending | 3298-3379 | ⏳ Pending | Auth flow |
| Phase 3 | ⏳ Pending | 1252-1400 | ⏳ Pending | Session ops |
| Phase 4 | ⏳ Pending | 1238-1400 | ⏳ Pending | UI rendering |
| Phase 5 | ⏳ Pending | New code | ⏳ Pending | URL sharing |

---

## 🚨 Risk Mitigation

### **Backup Strategy:**
- Keep original auth.js as auth.js.backup
- Create auth-migrated.js for new version
- Test thoroughly before replacing
- Git commits after each phase

### **Testing Strategy:**
- Run `npm test` after each phase
- Manual testing of all user flows
- Browser testing (Chrome, Firefox, Safari)
- Test with Firebase emulator

### **Rollback Plan:**
- If issues arise, revert to auth.js.backup
- Fix issues in auth-migrated.js
- Re-test before replacing again

---

## 📅 Timeline

**Week 1:**
- Day 1-2: Phase 1-2 (imports, auth) ← **WE ARE HERE**
- Day 3-4: Phase 3 (sessions)
- Day 5: Phase 4 (UI)

**Week 2:**
- Day 6-7: Phase 5 (URL sharing)
- Day 8-9: RDF integration
- Day 10: Multi-oscillator support

**Week 3:**
- Day 11-13: Testing & fixes
- Day 14-15: Deploy

---

**This migration plan ensures excellent, testable, non-breaking integration!** 🚀

/**
 * Tests for new state management and URL sharing functionality
 */

import { strict as assert } from "node:assert";

console.log('🧪 Testing State Management & URL Sharing...\n');

// ========================================
// 1. Test AppState (Centralized State)
// ========================================

console.log('1️⃣  Testing AppState...');

const { AppState } = await import("../scripts/state/app-state.js");

// Create new state instance
const state = new AppState();

// Test initial state
assert.equal(state.currentUser, null, 'Initial user is null');
assert.deepEqual(state.sessions, [], 'Initial sessions is empty array');
assert.equal(state.activeSessionId, null, 'Initial activeSessionId is null');

// Test state updates
state.setUser({ uid: 'user123', email: 'test@example.com' });
assert.equal(state.currentUser.uid, 'user123', 'User updated');

state.setSessions([
  { id: 's1', label: 'Session 1' },
  { id: 's2', label: 'Session 2' },
]);
assert.equal(state.sessions.length, 2, 'Sessions updated');

// Test observer pattern
let notificationCount = 0;
let lastSnapshot = null;

const unsubscribe = state.subscribe((snapshot) => {
  notificationCount++;
  lastSnapshot = snapshot;
});

state.setActiveSession('s1', 'Session 1');
assert.equal(notificationCount, 1, 'Subscriber notified on state change');
assert.equal(lastSnapshot.activeSessionId, 's1', 'Snapshot contains update');

// Test unsubscribe
unsubscribe();
state.setActiveSession('s2', 'Session 2');
assert.equal(notificationCount, 1, 'Unsubscribed listener not called');

console.log('✅ AppState works correctly\n');

// ========================================
// 2. Test State Serialization
// ========================================

console.log('2️⃣  Testing State Serialization...');

const stateForSerialization = new AppState({
  activeSessionId: 'session-abc',
  activeSessionLabel: 'My Test Session',
});

// Mock martigli state
const mockMartigliState = {
  snapshot: () => ({
    oscillations: [
      {
        id: 'osc1',
        startPeriod: 10,
        endPeriod: 20,
        transitionSeconds: 120,
      },
    ],
    referenceId: 'osc1',
  }),
};

// Mock kernel
stateForSerialization._kernel = {
  martigli: mockMartigliState,
};

const serialized = stateForSerialization.toSerializable();

assert.equal(serialized.version, '1.0', 'Serialized state has version');
assert.equal(serialized.activeSessionId, 'session-abc', 'Session ID serialized');
assert.ok(serialized.martigli, 'Martigli state serialized');
assert.equal(serialized.martigli.oscillations.length, 1, 'Oscillations serialized');
assert.equal(serialized.martigli.oscillations[0].startPeriod, 10, 'Oscillator data correct');

console.log('✅ State serialization works\n');

// ========================================
// 3. Test State Deserialization
// ========================================

console.log('3️⃣  Testing State Deserialization...');

const serializedData = {
  version: '1.0',
  activeSessionId: 'session-xyz',
  activeSessionLabel: 'Restored Session',
  martigli: {
    oscillations: [
      {
        id: 'osc2',
        startPeriod: 15,
        endPeriod: 25,
        transitionSeconds: 180,
      },
    ],
  },
};

const restoredState = AppState.fromSerializable(serializedData);

assert.equal(restoredState.activeSessionId, 'session-xyz', 'Session ID restored');
assert.equal(restoredState.activeSessionLabel, 'Restored Session', 'Session label restored');

console.log('✅ State deserialization works\n');

// ========================================
// 4. Test URL State Manager
// ========================================

console.log('4️⃣  Testing URL State Manager...');

// Mock window.location for Node environment
global.window = {
  location: {
    origin: 'https://biosyncarelab.github.io',
    pathname: '/',
    href: 'https://biosyncarelab.github.io/',
  },
  history: {
    pushState: () => {},
    replaceState: () => {},
  },
};

const { createShareableURL, restoreFromURL } = await import("../scripts/state/url-state-manager.js");

// Create shareable URL
const testState = new AppState({
  activeSessionId: 'test-session',
});
testState._kernel = {
  martigli: mockMartigliState,
};

const shareableURL = createShareableURL(testState, true);

assert.ok(shareableURL, 'Shareable URL created');
assert.ok(shareableURL.includes('?state='), 'URL contains state parameter');
assert.ok(shareableURL.startsWith('https://biosyncarelab.github.io'), 'URL has correct origin');

console.log('   Generated URL:', shareableURL);

// Test URL restoration by extracting the state parameter
const urlParams = new URLSearchParams(shareableURL.split('?')[1]);
const stateParam = urlParams.get('state');
assert.ok(stateParam, 'State parameter exists in URL');

// Manually construct URL for restoration test
global.window.location.href = shareableURL;

const restoredFromURL = restoreFromURL(shareableURL);
assert.ok(restoredFromURL, 'State restored from URL');
assert.equal(restoredFromURL.activeSessionId, 'test-session', 'Session ID restored from URL');

console.log('✅ URL state sharing works\n');

// ========================================
// 5. Test Round-Trip (State → URL → State)
// ========================================

console.log('5️⃣  Testing Round-Trip Serialization...');

const originalState = new AppState({
  activeSessionId: 'roundtrip-session',
  activeSessionLabel: 'Round Trip Test',
});

originalState._kernel = {
  martigli: {
    snapshot: () => ({
      oscillations: [
        {
          id: 'roundtrip-osc',
          startPeriod: 12,
          endPeriod: 22,
          transitionSeconds: 150,
        },
      ],
    }),
  },
};

// Serialize to URL
const url = createShareableURL(originalState, true);

// Restore from URL
const restored = restoreFromURL(url);

// Verify data matches
assert.equal(restored.activeSessionId, originalState.activeSessionId, 'Session ID matches after round-trip');
assert.equal(restored.activeSessionLabel, originalState.activeSessionLabel, 'Session label matches after round-trip');

console.log('✅ Round-trip serialization preserves data\n');

// ========================================
// 6. Test Session Manager (with mocked Firestore)
// ========================================

console.log('6️⃣  Testing Session Manager...');

const { validateSessionData, collectSessionDraft } = await import("../scripts/auth/session-validator.js");

// Test validation
const validSession = {
  label: 'Valid Session',
  martigli: { oscillations: [] },
};

const validation = validateSessionData(validSession);
assert.equal(validation.valid, true, 'Valid session passes validation');
assert.equal(validation.errors.length, 0, 'No validation errors');

const invalidSession = {
  label: '', // Empty label
  martigli: null, // Missing martigli
};

const invalidValidation = validateSessionData(invalidSession);
assert.equal(invalidValidation.valid, false, 'Invalid session fails validation');
assert.ok(invalidValidation.errors.length > 0, 'Validation errors present');

// Test draft collection
const draftState = new AppState({
  activeSessionId: 'draft-session',
});
draftState._kernel = {
  martigli: mockMartigliState,
};

const draft = collectSessionDraft(draftState, { label: 'Draft Session', kind: 'custom' });

assert.equal(draft.label, 'Draft Session', 'Draft label correct');
assert.equal(draft.kind, 'custom', 'Draft kind correct');
assert.ok(draft.martigli, 'Draft includes martigli state');

console.log('✅ Session manager works\n');

// ========================================
// 7. Test Auth Manager Validation
// ========================================

console.log('7️⃣  Testing Auth Manager Validation...');

const { isValidEmail, validatePassword } = await import("../scripts/auth/auth-validator.js");

// Test email validation
assert.equal(isValidEmail('test@example.com'), true, 'Valid email recognized');
assert.equal(isValidEmail('invalid-email'), false, 'Invalid email rejected');
assert.equal(isValidEmail(''), false, 'Empty email rejected');

// Test password validation
const strongPassword = validatePassword('StrongP@ssw0rd123');
assert.equal(strongPassword.valid, true, 'Strong password is valid');
assert.equal(strongPassword.strength, 'strong', 'Strong password detected');

const weakPassword = validatePassword('weak');
assert.equal(weakPassword.valid, false, 'Weak password is invalid');
assert.ok(weakPassword.errors.length > 0, 'Weak password has errors');

console.log('✅ Auth validation works\n');

// ========================================
// Summary
// ========================================

console.log('═══════════════════════════════════════════════════════');
console.log('🎉 All State Management Tests Passed!');
console.log('═══════════════════════════════════════════════════════');
console.log('✅ AppState - Observer pattern works');
console.log('✅ State Serialization - toSerializable() works');
console.log('✅ State Deserialization - fromSerializable() works');
console.log('✅ URL State Manager - URL generation works');
console.log('✅ URL Restoration - State restored from URL');
console.log('✅ Round-Trip - State → URL → State preserves data');
console.log('✅ Session Manager - Validation and drafts work');
console.log('✅ Auth Manager - Email and password validation work');
console.log('═══════════════════════════════════════════════════════');
console.log('\n🚀 New architecture is fully functional!\n');

/**
 * Integration Example - New Architecture
 * Demonstrates how to use the refactored modules together
 * This serves as a template for migrating the existing auth.js
 */

// ========================================
// IMPORTS - Clean module boundaries
// ========================================

// State management
import { appState } from '../state/app-state.js';
import {
  createShareableURL,
  restoreFromURL,
  updateBrowserURL,
  copyShareableURL,
  setupHistoryListener,
} from '../state/url-state-manager.js';

// Firebase & Data
import { auth, db } from './firebase-init.js';
import {
  signInWithGoogle,
  signInWithEmail,
  signOut,
  onAuthChange,
  extractUserProfile,
} from './auth-manager.js';
import {
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  collectSessionDraft,
} from './session-manager.js';

// UI Components
import {
  renderAuthState,
  toggleAuthPanels,
  renderSessionList,
  renderMartigliDashboardList,
  setMessage,
  clearMessage,
  showLoading,
  showError,
} from './ui-renderer.js';
import {
  createModalController,
  createVisualizerModalController,
} from './modal-controller.js';

// Configuration
import { BSCLabKernel } from '../structures.js';
import { TELEMETRY_EVENTS, FIRESTORE_COLLECTIONS } from '../constants.js';

// ========================================
// UI ELEMENT REFERENCES - Collected once
// ========================================

const ui = {
  // Auth elements
  authState: document.getElementById('auth-state'),
  userEmail: document.getElementById('user-email'),
  userId: document.getElementById('user-id'),
  googleSignInBtn: document.getElementById('google-sign-in'),
  signOutBtn: document.getElementById('status-sign-out'),
  authForms: document.getElementById('auth-forms'),
  dashboard: document.getElementById('dashboard'),

  // Message area
  messages: document.getElementById('messages'),

  // Session management
  sessionList: document.getElementById('session-list'),
  sessionStatus: document.getElementById('session-status'),

  // Martigli dashboard
  martigliDashboardList: document.getElementById('martigli-dashboard-list'),

  // Modal elements
  modal: document.getElementById('detail-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalClose: document.getElementById('modal-close'),
  modalTitle: document.getElementById('modal-title'),
  modalKind: document.getElementById('modal-kind'),
  modalMeta: document.getElementById('modal-meta'),
};

// ========================================
// KERNEL INITIALIZATION
// ========================================

const kernel = new BSCLabKernel({
  onInteraction: (event) => {
    // Telemetry logging would go here
    console.log('Interaction:', event);
  },
});

await kernel.init();

// Set kernel in app state
appState.setKernel(kernel);

// ========================================
// MODAL CONTROLLERS
// ========================================

const detailModal = createModalController({
  modal: ui.modal,
  overlay: ui.modalOverlay,
  closeButton: ui.modalClose,
  title: ui.modalTitle,
  kind: ui.modalKind,
  meta: ui.modalMeta,
});

// Register cleanup on modal close
detailModal.onClose(({ record, reason }) => {
  console.log(`Modal closed: ${reason}`, record);

  // Stop audio when modal closes
  appState.audioEngine?.stop();

  // Clear modal state in app state
  appState.clearModal();
});

// ========================================
// STATE RESTORATION FROM URL
// ========================================

// Try to restore state from URL on page load
const urlState = restoreFromURL();
if (urlState) {
  console.log('Restoring state from URL:', urlState);

  // Apply restored state
  appState.setState(urlState.snapshot());

  // Apply Martigli state to kernel
  appState.applySerializedMartigliState(urlState.toSerializable());
}

// Setup browser history listener for back/forward navigation
setupHistoryListener((restoredState) => {
  console.log('Navigated in history, restoring state');
  appState.setState(restoredState.snapshot());
});

// ========================================
// AUTHENTICATION STATE MANAGEMENT
// ========================================

// Subscribe to authentication state changes
onAuthChange(async (user) => {
  console.log('Auth state changed:', user ? user.email : 'signed out');

  // Update app state
  appState.setUser(user ? extractUserProfile(user) : null);

  // Update UI
  renderAuthState({
    state: ui.authState,
    email: ui.userEmail,
    userId: ui.userId,
  }, user);

  toggleAuthPanels(ui.authForms, ui.dashboard, !!user);

  // Show welcome message
  if (user) {
    setMessage(ui.messages, `Welcome back, ${user.email}!`, 'success');

    // Load user's sessions
    await loadUserSessions(user.uid);
  } else {
    setMessage(ui.messages, 'Signed out', 'info');
    appState.setSessions([]);
  }
});

// ========================================
// SESSION MANAGEMENT
// ========================================

/**
 * Load sessions for current user
 */
async function loadUserSessions(userId) {
  if (!userId) return;

  try {
    appState.setFetchingDashboard(true);
    ui.sessionStatus.textContent = 'Loading sessions…';

    const sessions = await fetchSessions(userId);

    appState.setSessions(sessions);

  } catch (err) {
    console.error('Failed to load sessions:', err);
    showError(ui.sessionList, 'Failed to load sessions');
    ui.sessionStatus.textContent = 'Error loading sessions';
  } finally {
    appState.setFetchingDashboard(false);
  }
}

/**
 * Handle session click (open detail modal)
 */
function handleSessionClick(session) {
  console.log('Opening session:', session);

  // Update app state
  appState.setActiveSession(session.id, session.label);
  appState.setModal(session);

  // Open modal
  detailModal.open(session, 'session');

  // Telemetry
  kernel.recordInteraction(TELEMETRY_EVENTS.SESSION_LOAD, {
    sessionId: session.id,
  });
}

/**
 * Handle create session
 */
async function handleCreateSession() {
  const user = appState.currentUser;

  if (!user) {
    setMessage(ui.messages, 'Sign in to create sessions', 'info');
    return;
  }

  try {
    appState.setBusy(true);

    // Collect current state as session draft
    const draft = collectSessionDraft(appState);

    // Create session in Firestore
    const newSession = await createSession(user.uid, draft);

    // Add to app state
    appState.addSession(newSession);

    // Show success
    setMessage(ui.messages, 'Session created!', 'success');

    // Telemetry
    kernel.recordInteraction(TELEMETRY_EVENTS.SESSION_CREATE, {
      sessionId: newSession.id,
    });

  } catch (err) {
    console.error('Failed to create session:', err);
    setMessage(ui.messages, 'Failed to create session', 'error');
  } finally {
    appState.setBusy(false);
  }
}

/**
 * Handle save current session
 */
async function handleSaveSession() {
  const user = appState.currentUser;
  const activeSessionId = appState.activeSessionId;

  if (!user) {
    setMessage(ui.messages, 'Sign in to save sessions', 'info');
    return;
  }

  if (!activeSessionId) {
    setMessage(ui.messages, 'No active session to save', 'info');
    return;
  }

  try {
    appState.setBusy(true);

    // Collect current state as update
    const draft = collectSessionDraft(appState);

    // Update session in Firestore
    await updateSession(activeSessionId, draft);

    // Update in app state
    appState.updateSession(activeSessionId, draft);

    // Show success
    setMessage(ui.messages, 'Session saved!', 'success');

  } catch (err) {
    console.error('Failed to save session:', err);
    setMessage(ui.messages, 'Failed to save session', 'error');
  } finally {
    appState.setBusy(false);
  }
}

/**
 * Handle delete session
 */
async function handleDeleteSession(sessionId) {
  if (!confirm('Delete this session? This cannot be undone.')) {
    return;
  }

  try {
    appState.setBusy(true);

    await deleteSession(sessionId);

    appState.removeSession(sessionId);

    setMessage(ui.messages, 'Session deleted', 'success');

  } catch (err) {
    console.error('Failed to delete session:', err);
    setMessage(ui.messages, 'Failed to delete session', 'error');
  } finally {
    appState.setBusy(false);
  }
}

// ========================================
// APP STATE SUBSCRIPTIONS (REACTIVE UI)
// ========================================

// Subscribe to app state changes → automatically update UI
appState.subscribe((state) => {
  // Update session list whenever sessions change
  renderSessionList(
    ui.sessionList,
    ui.sessionStatus,
    state.sessions,
    { onOpen: handleSessionClick }
  );

  // Update Martigli dashboard
  if (state.martigliWidgets.size > 0) {
    const oscillations = Array.from(state.martigliWidgets.values());
    renderMartigliDashboardList(
      ui.martigliDashboardList,
      oscillations,
      (osc) => console.log('Oscillator clicked:', osc)
    );
  }

  // Update URL with current state (debounced in production)
  // updateBrowserURL(appState, true); // Disabled for now - enable when ready
});

// ========================================
// EVENT HANDLERS
// ========================================

// Google Sign In
if (ui.googleSignInBtn) {
  ui.googleSignInBtn.addEventListener('click', async () => {
    try {
      appState.setBusy(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setMessage(ui.messages, err.message, 'error');
    } finally {
      appState.setBusy(false);
    }
  });
}

// Sign Out
if (ui.signOutBtn) {
  ui.signOutBtn.addEventListener('click', async () => {
    try {
      appState.setBusy(true);
      await signOut();
    } catch (err) {
      console.error('Sign-out failed:', err);
      setMessage(ui.messages, err.message, 'error');
    } finally {
      appState.setBusy(false);
    }
  });
}

// ========================================
// URL SHARING EXAMPLE
// ========================================

/**
 * Copy shareable URL to clipboard
 */
async function handleCopyShareableURL() {
  try {
    const success = await copyShareableURL(appState);

    if (success) {
      setMessage(ui.messages, 'Shareable URL copied to clipboard!', 'success');
    } else {
      setMessage(ui.messages, 'Failed to copy URL', 'error');
    }

  } catch (err) {
    console.error('Failed to copy URL:', err);
    setMessage(ui.messages, err.message, 'error');
  }
}

// Add "Share" button to UI (example)
// <button onclick="handleCopyShareableURL()">📋 Copy Shareable Link</button>

// ========================================
// EXPORT FOR GLOBAL ACCESS (if needed)
// ========================================

window.BSCLab = {
  appState,
  kernel,
  auth: {
    signInWithGoogle,
    signInWithEmail,
    signOut,
  },
  sessions: {
    create: handleCreateSession,
    save: handleSaveSession,
    delete: handleDeleteSession,
  },
  ui: {
    detailModal,
  },
  sharing: {
    copyURL: handleCopyShareableURL,
    createURL: () => createShareableURL(appState),
  },
};

console.log('✅ BSCLab initialized with new architecture');
console.log('📦 Access via window.BSCLab');

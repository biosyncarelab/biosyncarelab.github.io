/**
 * Session Manager - Pure Data Operations
 * Handles all Firestore CRUD operations for sessions
 * NO UI code - returns data only
 */

import { db } from './firebase-init.js';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { FIRESTORE_COLLECTIONS } from '../constants.js';

/**
 * Fetch all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of session objects
 */
export async function fetchSessions(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const sessionsRef = collection(db, FIRESTORE_COLLECTIONS.SESSIONS);
    const q = query(
      sessionsRef,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.error('Failed to fetch sessions:', err);
    throw new Error(`Failed to fetch sessions: ${err.message}`);
  }
}

/**
 * Fetch a single session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} Session object or null if not found
 */
export async function fetchSession(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  try {
    const sessionRef = doc(db, FIRESTORE_COLLECTIONS.SESSIONS, sessionId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    };
  } catch (err) {
    console.error('Failed to fetch session:', err);
    throw new Error(`Failed to fetch session: ${err.message}`);
  }
}

/**
 * Create a new session
 * @param {string} userId - User ID (creator)
 * @param {object} sessionData - Session configuration
 * @returns {Promise<object>} Created session with ID
 */
export async function createSession(userId, sessionData) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Session data is required');
  }

  try {
    const sessionsRef = collection(db, FIRESTORE_COLLECTIONS.SESSIONS);

    const payload = {
      ...sessionData,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: '1.0', // Schema version
    };

    const docRef = await addDoc(sessionsRef, payload);

    return {
      id: docRef.id,
      ...payload,
      createdAt: new Date(), // Approximate for immediate return
      updatedAt: new Date(),
    };
  } catch (err) {
    console.error('Failed to create session:', err);
    throw new Error(`Failed to create session: ${err.message}`);
  }
}

/**
 * Update an existing session
 * @param {string} sessionId - Session ID
 * @param {object} updates - Partial session data to update
 * @returns {Promise<object>} Updated session data
 */
export async function updateSession(sessionId, updates) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('Update data is required');
  }

  try {
    const sessionRef = doc(db, FIRESTORE_COLLECTIONS.SESSIONS, sessionId);

    // Remove fields that shouldn't be updated
    const { id, createdBy, createdAt, ...safeUpdates } = updates;

    const payload = {
      ...safeUpdates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(sessionRef, payload);

    return {
      id: sessionId,
      ...updates,
      updatedAt: new Date(),
    };
  } catch (err) {
    console.error('Failed to update session:', err);
    throw new Error(`Failed to update session: ${err.message}`);
  }
}

/**
 * Delete a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function deleteSession(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  try {
    const sessionRef = doc(db, FIRESTORE_COLLECTIONS.SESSIONS, sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    console.error('Failed to delete session:', err);
    throw new Error(`Failed to delete session: ${err.message}`);
  }
}

/**
 * Duplicate a session (create a copy)
 * @param {string} userId - User ID (creator of duplicate)
 * @param {string} sessionId - Session ID to duplicate
 * @returns {Promise<object>} New session object
 */
export async function duplicateSession(userId, sessionId) {
  if (!userId || !sessionId) {
    throw new Error('User ID and Session ID are required');
  }

  try {
    // Fetch original session
    const original = await fetchSession(sessionId);

    if (!original) {
      throw new Error('Session not found');
    }

    // Create copy with new name
    const copyData = {
      ...original,
      label: `${original.label || 'Untitled'} (Copy)`,
      // Remove ID and timestamps
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      createdBy: undefined,
    };

    return await createSession(userId, copyData);
  } catch (err) {
    console.error('Failed to duplicate session:', err);
    throw new Error(`Failed to duplicate session: ${err.message}`);
  }
}

/**
 * Share a session with other users
 * @param {string} sessionId - Session ID
 * @param {Array<string>} userIds - Array of user IDs to share with
 * @returns {Promise<void>}
 */
export async function shareSession(sessionId, userIds) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('User IDs array is required');
  }

  try {
    const sessionRef = doc(db, FIRESTORE_COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      sharedWith: userIds,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to share session:', err);
    throw new Error(`Failed to share session: ${err.message}`);
  }
}

/**
 * Unshare a session (remove from shared list)
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function unshareSession(sessionId) {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }

  try {
    const sessionRef = doc(db, FIRESTORE_COLLECTIONS.SESSIONS, sessionId);

    await updateDoc(sessionRef, {
      sharedWith: null,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to unshare session:', err);
    throw new Error(`Failed to unshare session: ${err.message}`);
  }
}

/**
 * Fetch recent sessions (limit to N most recent)
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of sessions to return
 * @returns {Promise<Array>} Array of session objects
 */
export async function fetchRecentSessions(userId, limit = 10) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const sessionsRef = collection(db, FIRESTORE_COLLECTIONS.SESSIONS);
    const q = query(
      sessionsRef,
      where('createdBy', '==', userId),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.error('Failed to fetch recent sessions:', err);
    throw new Error(`Failed to fetch recent sessions: ${err.message}`);
  }
}

/**
 * Collect current session draft from app state
 * This extracts the current configuration into a session-ready format
 * @param {object} appState - Current application state
 * @param {object} contextRecord - Base record to build from (optional)
 * @returns {object} Session draft object
 */
export function collectSessionDraft(appState, contextRecord = null) {
  const draft = {
    id: contextRecord?.id ?? null,
    label: contextRecord?.label ?? 'Untitled Session',
    kind: contextRecord?.kind ?? 'custom',
    folderId: contextRecord?.folderId ?? contextRecord?.folder ?? null,

    // Martigli state
    martigli: appState.martigliState?.snapshot() ?? null,

    // Track bindings
    trackBindings: appState.trackBindingRegistry.size > 0
      ? Array.from(appState.trackBindingRegistry.entries()).map(([id, binding]) => ({
          id,
          ...binding,
        }))
      : null,

    // Structure reference
    structure: appState.lastStructureRecord ? {
      id: appState.lastStructureRecord.id,
      label: appState.lastStructureRecord.label,
    } : null,

    // Video layer
    videoLayer: appState.activeVideoLayerId ?? null,

    // Metadata
    description: contextRecord?.description ?? null,
    tags: contextRecord?.tags ?? [],
  };

  return draft;
}

/**
 * Validate session data before saving
 * @param {object} sessionData - Session data to validate
 * @returns {object} Validation result { valid: boolean, errors: Array<string> }
 */
export function validateSessionData(sessionData) {
  const errors = [];

  if (!sessionData || typeof sessionData !== 'object') {
    errors.push('Session data must be an object');
    return { valid: false, errors };
  }

  if (!sessionData.label || typeof sessionData.label !== 'string') {
    errors.push('Session label is required');
  } else if (sessionData.label.length < 1 || sessionData.label.length > 100) {
    errors.push('Session label must be between 1 and 100 characters');
  }

  if (!sessionData.martigli) {
    errors.push('Martigli configuration is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

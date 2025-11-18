/**
 * URL State Manager - Enables shareable session links
 * Serializes app state to URLs and restores state from URLs
 * Supports browser history integration and QR code generation
 */

import { AppState } from './app-state.js';

/**
 * Compress state data using gzip-like compression (simplified for browser)
 * @param {string} jsonString - JSON string to compress
 * @returns {string} Compressed string
 */
function compressState(jsonString) {
  // For now, use simple base64 encoding
  // TODO: Add pako.js for actual gzip compression in future
  try {
    return jsonString;
  } catch (err) {
    console.warn('State compression failed:', err);
    return jsonString;
  }
}

/**
 * Decompress state data
 * @param {string} compressed - Compressed string
 * @returns {string} Decompressed JSON string
 */
function decompressState(compressed) {
  try {
    return compressed;
  } catch (err) {
    console.warn('State decompression failed:', err);
    return compressed;
  }
}

/**
 * Create a shareable URL from current app state
 * @param {AppState} appState - Current application state
 * @param {boolean} includeOrigin - Include full origin or just query params
 * @returns {string} Shareable URL
 */
export function createShareableURL(appState, includeOrigin = true) {
  try {
    const stateData = appState.toSerializable();

    // Remove null values to keep URL shorter
    const cleanedState = removeNullValues(stateData);

    // Convert to JSON
    const jsonString = JSON.stringify(cleanedState);

    // Compress (currently just pass-through, but ready for gzip)
    const compressed = compressState(jsonString);

    // Base64 encode for URL safety
    const encoded = btoa(compressed);

    // Create URL
    const params = new URLSearchParams();
    params.set('state', encoded);

    if (includeOrigin && typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }

    return `?${params.toString()}`;
  } catch (err) {
    console.error('Failed to create shareable URL:', err);
    return null;
  }
}

/**
 * Restore app state from URL parameters
 * @param {string} [url] - URL to parse (defaults to window.location)
 * @returns {AppState|null} Restored state or null if no state in URL
 */
export function restoreFromURL(url) {
  try {
    // Parse URL
    const urlObj = url
      ? new URL(url, window.location.origin)
      : new URL(window.location.href);

    const params = new URLSearchParams(urlObj.search);
    const encoded = params.get('state');

    if (!encoded) {
      return null;
    }

    // Decode from base64
    const compressed = atob(encoded);

    // Decompress
    const jsonString = decompressState(compressed);

    // Parse JSON
    const stateData = JSON.parse(jsonString);

    // Create AppState from serialized data
    return AppState.fromSerializable(stateData);
  } catch (err) {
    console.error('Failed to restore state from URL:', err);
    return null;
  }
}

/**
 * Update browser URL with current state (without page reload)
 * @param {AppState} appState - Current application state
 * @param {boolean} replaceState - Use replaceState instead of pushState
 */
export function updateBrowserURL(appState, replaceState = false) {
  if (typeof window === 'undefined' || !window.history) {
    return;
  }

  try {
    const url = createShareableURL(appState, false);

    if (!url) {
      return;
    }

    const fullURL = `${window.location.pathname}${url}`;

    if (replaceState) {
      window.history.replaceState({}, '', fullURL);
    } else {
      window.history.pushState({}, '', fullURL);
    }
  } catch (err) {
    console.error('Failed to update browser URL:', err);
  }
}

/**
 * Remove null/undefined values from object recursively
 * Keeps URLs shorter by excluding empty state
 * @param {object} obj
 * @returns {object}
 */
function removeNullValues(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.filter(item => item !== null && item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          const cleanedValue = removeNullValues(value);
          if (cleanedValue !== null && (!Array.isArray(cleanedValue) || cleanedValue.length > 0)) {
            cleaned[key] = cleanedValue;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Create a debounced version of updateBrowserURL
 * Prevents excessive history entries when state changes rapidly
 * @param {number} delayMs - Debounce delay in milliseconds
 * @returns {Function} Debounced update function
 */
export function createDebouncedURLUpdater(delayMs = 1000) {
  let timeoutId = null;

  return (appState, replaceState = true) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      updateBrowserURL(appState, replaceState);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Copy shareable URL to clipboard
 * @param {AppState} appState
 * @returns {Promise<boolean>} Success status
 */
export async function copyShareableURL(appState) {
  try {
    const url = createShareableURL(appState, true);

    if (!url) {
      return false;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (err) {
    console.error('Failed to copy URL to clipboard:', err);
    return false;
  }
}

/**
 * Generate a short URL by storing state in Firebase
 * @param {AppState} appState
 * @param {object} db - Firestore database instance
 * @returns {Promise<string>} Short URL
 */
export async function createShortURL(appState, db) {
  try {
    const { addDoc, collection } = await import(
      'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js'
    );

    const stateData = appState.toSerializable();

    // Store state in Firestore
    const docRef = await addDoc(collection(db, 'shared-states'), {
      state: stateData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    });

    // Create short URL with document ID
    const shortURL = `${window.location.origin}${window.location.pathname}?s=${docRef.id}`;

    return shortURL;
  } catch (err) {
    console.error('Failed to create short URL:', err);
    return null;
  }
}

/**
 * Restore state from short URL
 * @param {object} db - Firestore database instance
 * @param {string} [url] - URL to parse (defaults to window.location)
 * @returns {Promise<AppState|null>}
 */
export async function restoreFromShortURL(db, url) {
  try {
    const urlObj = url
      ? new URL(url, window.location.origin)
      : new URL(window.location.href);

    const params = new URLSearchParams(urlObj.search);
    const shortId = params.get('s');

    if (!shortId) {
      return null;
    }

    const { getDoc, doc } = await import(
      'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js'
    );

    // Fetch state from Firestore
    const docRef = doc(db, 'shared-states', shortId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn('Short URL state not found:', shortId);
      return null;
    }

    const data = docSnap.data();

    // Check expiration
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        console.warn('Short URL has expired:', shortId);
        return null;
      }
    }

    return AppState.fromSerializable(data.state);
  } catch (err) {
    console.error('Failed to restore from short URL:', err);
    return null;
  }
}

/**
 * Generate QR code data URL for shareable link
 * @param {AppState} appState
 * @returns {Promise<string|null>} QR code data URL (can be used as img src)
 */
export async function generateQRCode(appState) {
  try {
    // TODO: Add QR code library (e.g., qrcode.js) for this feature
    // For now, return a placeholder or use an API
    const url = createShareableURL(appState, true);

    if (!url) {
      return null;
    }

    // Use a QR code API service (example - replace with local library later)
    const qrAPI = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

    return qrAPI;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return null;
  }
}

/**
 * Listen for browser back/forward navigation and restore state
 * @param {Function} onStateRestore - Callback when state is restored from navigation
 */
export function setupHistoryListener(onStateRestore) {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('popstate', () => {
    const restoredState = restoreFromURL();

    if (restoredState && onStateRestore) {
      onStateRestore(restoredState);
    }
  });
}

/**
 * Unified State Manager for BioSynCare Lab
 * Manages URL-based state serialization for:
 * - Active tab (dashboard, structures, nso-navigator)
 * - Session configuration
 * - Track settings (audio, visual, haptic, Martigli)
 * - Structure selection and playback position
 * - NSO Navigator state
 */

// State structure
const DEFAULT_STATE = {
  version: 1,
  activeTab: 'dashboard',
  session: null, // Session ID or inline session data
  structures: {
    category: null, // 'curated' or 'comprehensive'
    structureId: null,
    sequenceId: null,
    playbackPosition: 0, // Current row index
    isPlaying: false,
  },
  nso: {
    currentConcept: null, // RDF URI
    viewMode: 'graph', // 'graph', 'tree', 'table'
    searchQuery: null,
  },
  tracks: {
    audio: [],
    visual: [],
    haptic: [],
    martigli: [],
  },
};

/**
 * Encode state to URL hash
 */
export function encodeState(state) {
  try {
    const json = JSON.stringify(state);
    // Use base64 for compact URL encoding
    const encoded = btoa(encodeURIComponent(json));
    return `#state=${encoded}`;
  } catch (err) {
    console.error('Failed to encode state:', err);
    return '#';
  }
}

/**
 * Decode state from URL hash
 */
export function decodeState(hash = window.location.hash) {
  if (!hash || !hash.includes('state=')) {
    return null;
  }

  try {
    const match = hash.match(/state=([^&]+)/);
    if (!match) return null;

    const encoded = match[1];
    const json = decodeURIComponent(atob(encoded));
    const state = JSON.parse(json);

    // Validate version
    if (state.version !== DEFAULT_STATE.version) {
      console.warn('State version mismatch, ignoring URL state');
      return null;
    }

    return state;
  } catch (err) {
    console.error('Failed to decode state:', err);
    return null;
  }
}

/**
 * Get current state from URL or return default
 */
export function getCurrentState() {
  return decodeState() || { ...DEFAULT_STATE };
}

/**
 * Update URL hash with new state
 */
export function updateURL(state) {
  const hash = encodeState(state);
  // Use replaceState to avoid adding to browser history on every change
  window.history.replaceState(null, '', hash);
}

/**
 * Create a shareable URL for the current state
 */
export function getShareableURL(state) {
  const hash = encodeState(state);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/**
 * State manager class for reactive updates
 */
export class StateManager {
  constructor() {
    this.state = getCurrentState();
    this.listeners = new Map();
    this.listenerIdCounter = 0;

    // Listen for browser back/forward
    window.addEventListener('hashchange', () => {
      const newState = decodeState();
      if (newState) {
        this.state = newState;
        this.notifyListeners();
      }
    });
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };
    updateURL(this.state);
    this.notifyListeners();
  }

  /**
   * Update nested state path
   */
  setPath(path, value) {
    const keys = path.split('.');
    const newState = { ...this.state };
    let current = newState;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      current[key] = { ...current[key] };
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    this.state = newState;
    updateURL(this.state);
    this.notifyListeners();
  }

  /**
   * Get value from nested path
   */
  getPath(path) {
    const keys = path.split('.');
    let current = this.state;

    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }

    return current;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    const id = this.listenerIdCounter++;
    this.listeners.set(id, listener);
    return () => this.listeners.delete(id);
  }

  /**
   * Subscribe to specific path changes
   */
  subscribePath(path, listener) {
    let previousValue = this.getPath(path);

    return this.subscribe(() => {
      const currentValue = this.getPath(path);
      if (currentValue !== previousValue) {
        listener(currentValue, previousValue);
        previousValue = currentValue;
      }
    });
  }

  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
  }

  /**
   * Get shareable URL
   */
  getShareableURL() {
    return getShareableURL(this.state);
  }

  /**
   * Copy shareable URL to clipboard
   */
  async copyShareableURL() {
    const url = this.getShareableURL();
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error('Failed to copy URL:', err);
      return false;
    }
  }

  /**
   * Restore state from session object
   */
  restoreFromSession(session) {
    const updates = {
      session: session.id || null,
      tracks: {
        audio: session.audioTracks || [],
        visual: session.visualTracks || [],
        haptic: session.hapticTracks || [],
        martigli: session.martigliTracks || [],
      },
    };

    // If session has a structure reference, restore it
    if (session.structure) {
      updates.structures = {
        ...this.state.structures,
        ...session.structure,
      };
    }

    this.setState(updates);
  }

  /**
   * Export current state as session data
   */
  exportSession() {
    return {
      version: this.state.version,
      activeTab: this.state.activeTab,
      tracks: this.state.tracks,
      structures: this.state.structures,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
export const stateManager = new StateManager();

// Global helper functions
export function getState() {
  return stateManager.getState();
}

export function setState(updates) {
  stateManager.setState(updates);
}

export function setPath(path, value) {
  stateManager.setPath(path, value);
}

export function getPath(path) {
  return stateManager.getPath(path);
}

export function subscribe(listener) {
  return stateManager.subscribe(listener);
}

export function subscribePath(path, listener) {
  return stateManager.subscribePath(path, listener);
}

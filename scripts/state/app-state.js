/**
 * Centralized application state management for BSCLab
 * Implements observer pattern for automatic UI synchronization
 * Supports serialization for URL state sharing
 */

export class AppState {
  constructor(initialState = {}) {
    // User authentication
    this.currentUser = initialState.currentUser ?? null;

    // Session management
    this.sessions = initialState.sessions ?? [];
    this.activeSessionId = initialState.activeSessionId ?? null;
    this.activeSessionLabel = initialState.activeSessionLabel ?? null;

    // Engines (these come from BSCLabKernel, not serializable)
    this._kernel = initialState.kernel ?? null;

    // UI state (not serializable - transient)
    this.isBusy = initialState.isBusy ?? false;
    this.isFetchingDashboard = initialState.isFetchingDashboard ?? false;

    // Track state
    this.trackExpansionState = initialState.trackExpansionState ?? new Map();
    this.trackVisualizerRegistry = initialState.trackVisualizerRegistry ?? new Map();
    this.trackBindingRegistry = initialState.trackBindingRegistry ?? new Map();

    // Modal state
    this.activeModalRecord = initialState.activeModalRecord ?? null;
    this.activeModalData = initialState.activeModalData ?? null;

    // Video/structure state
    this.lastStructureRecord = initialState.lastStructureRecord ?? null;
    this.activeVideoLayerId = initialState.activeVideoLayerId ?? null;

    // Martigli dashboard widgets (Map of oscillator ID -> widget data)
    this.martigliWidgets = initialState.martigliWidgets ?? new Map();

    // Observer pattern for reactive UI updates
    this.listeners = new Set();
  }

  /**
   * Set the BSCLabKernel instance (not serializable)
   * @param {BSCLabKernel} kernel
   */
  setKernel(kernel) {
    this._kernel = kernel;
    this._notifyListeners();
  }

  /**
   * Get kernel instance
   */
  get kernel() {
    return this._kernel;
  }

  /**
   * Get martigli state from kernel
   */
  get martigliState() {
    return this._kernel?.martigli ?? null;
  }

  /**
   * Get audio engine from kernel
   */
  get audioEngine() {
    return this._kernel?.audio ?? null;
  }

  /**
   * Get video engine from kernel
   */
  get videoEngine() {
    return this._kernel?.video ?? null;
  }

  /**
   * Get structure store from kernel
   */
  get structureStore() {
    return this._kernel?.structures ?? null;
  }

  /**
   * Get RDF linker from kernel
   */
  get rdfLinker() {
    return this._kernel?.rdf ?? null;
  }

  /**
   * Update state and notify listeners
   * @param {object} updates - Partial state updates
   */
  setState(updates) {
    Object.assign(this, updates);
    this._notifyListeners();
  }

  /**
   * Update user state
   * @param {object|null} user - Firebase user object
   */
  setUser(user) {
    this.currentUser = user;
    this._notifyListeners();
  }

  /**
   * Update sessions list
   * @param {Array} sessions
   */
  setSessions(sessions) {
    this.sessions = sessions;
    this._notifyListeners();
  }

  /**
   * Set active session
   * @param {string|null} sessionId
   * @param {string|null} sessionLabel
   */
  setActiveSession(sessionId, sessionLabel = null) {
    this.activeSessionId = sessionId;
    this.activeSessionLabel = sessionLabel;
    this._notifyListeners();
  }

  /**
   * Add a session to the list
   * @param {object} session
   */
  addSession(session) {
    this.sessions = [...this.sessions, session];
    this._notifyListeners();
  }

  /**
   * Update a session in the list
   * @param {string} sessionId
   * @param {object} updates
   */
  updateSession(sessionId, updates) {
    this.sessions = this.sessions.map(s =>
      s.id === sessionId ? { ...s, ...updates } : s
    );
    this._notifyListeners();
  }

  /**
   * Remove a session from the list
   * @param {string} sessionId
   */
  removeSession(sessionId) {
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
      this.activeSessionLabel = null;
    }
    this._notifyListeners();
  }

  /**
   * Set busy state
   * @param {boolean} busy
   */
  setBusy(busy) {
    this.isBusy = busy;
    this._notifyListeners();
  }

  /**
   * Set fetching dashboard state
   * @param {boolean} fetching
   */
  setFetchingDashboard(fetching) {
    this.isFetchingDashboard = fetching;
    this._notifyListeners();
  }

  /**
   * Set modal state
   * @param {object|null} record
   * @param {object|null} data
   */
  setModal(record, data = null) {
    this.activeModalRecord = record;
    this.activeModalData = data;
    this._notifyListeners();
  }

  /**
   * Clear modal state
   */
  clearModal() {
    this.activeModalRecord = null;
    this.activeModalData = null;
    this._notifyListeners();
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback that receives state snapshot
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  _notifyListeners() {
    const snapshot = this.snapshot();
    this.listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
  }

  /**
   * Get current state snapshot (immutable)
   * @returns {object} State snapshot
   */
  snapshot() {
    return {
      currentUser: this.currentUser,
      sessions: [...this.sessions],
      activeSessionId: this.activeSessionId,
      activeSessionLabel: this.activeSessionLabel,
      isBusy: this.isBusy,
      isFetchingDashboard: this.isFetchingDashboard,
      activeModalRecord: this.activeModalRecord,
      activeModalData: this.activeModalData,
      lastStructureRecord: this.lastStructureRecord,
      activeVideoLayerId: this.activeVideoLayerId,
      martigliWidgets: new Map(this.martigliWidgets),
    };
  }

  /**
   * Serialize state to plain object (for URL sharing, Firebase storage)
   * Only includes user-facing state, not transient UI state
   * @returns {object} Serializable state object
   */
  toSerializable() {
    const martigliSnapshot = this.martigliState?.snapshot();

    return {
      version: '1.0',  // Schema version for future migrations

      // Session state
      activeSessionId: this.activeSessionId,
      activeSessionLabel: this.activeSessionLabel,

      // Martigli oscillator state
      martigli: martigliSnapshot ? {
        oscillations: martigliSnapshot.oscillations,
        referenceId: martigliSnapshot.referenceId ?? null,
      } : null,

      // Track state (full configuration)
      tracks: this.kernel?.tracks?.toJSON() ?? null,

      // Track bindings (for parameter modulation)
      trackBindings: this.trackBindingRegistry.size > 0
        ? Array.from(this.trackBindingRegistry.entries()).map(([id, binding]) => ({
            id,
            ...binding,
          }))
        : null,

      // Structure state
      lastStructure: this.lastStructureRecord ? {
        id: this.lastStructureRecord.id,
        label: this.lastStructureRecord.label,
      } : null,

      // Video layer state
      activeVideoLayer: this.activeVideoLayerId,

      // Track expansion state (which tracks are expanded in UI)
      expandedTracks: this.trackExpansionState.size > 0
        ? Array.from(this.trackExpansionState.keys())
        : null,
    };
  }

  /**
   * Create AppState instance from serialized data
   * @param {object} data - Serialized state object
   * @returns {AppState}
   */
  static fromSerializable(data) {
    if (!data || typeof data !== 'object') {
      return new AppState();
    }

    // Handle version migrations in future
    if (data.version && data.version !== '1.0') {
      console.warn(`Unknown state version: ${data.version}, using defaults`);
      return new AppState();
    }

    // Reconstruct track binding registry
    const trackBindingRegistry = new Map();
    if (Array.isArray(data.trackBindings)) {
      data.trackBindings.forEach(binding => {
        if (binding.id) {
          const { id, ...rest } = binding;
          trackBindingRegistry.set(id, rest);
        }
      });
    }

    // Reconstruct track expansion state
    const trackExpansionState = new Map();
    if (Array.isArray(data.expandedTracks)) {
      data.expandedTracks.forEach(trackId => {
        trackExpansionState.set(trackId, true);
      });
    }

    return new AppState({
      activeSessionId: data.activeSessionId ?? null,
      activeSessionLabel: data.activeSessionLabel ?? null,
      lastStructureRecord: data.lastStructure ?? null,
      activeVideoLayerId: data.activeVideoLayer ?? null,
      trackBindingRegistry,
      trackExpansionState,
      // Note: martigli state is restored separately via kernel
    });
  }

  /**
   * Apply martigli state from serialized data to kernel
   * This must be called after kernel is initialized
   * @param {object} serializedState - Output from toSerializable()
   */
  applySerializedMartigliState(serializedState) {
    if (!this._kernel || !serializedState?.martigli) {
      return;
    }

    const martigliData = serializedState.martigli;

    // Restore oscillations to martigli state
    if (Array.isArray(martigliData.oscillations)) {
      martigliData.oscillations.forEach(osc => {
        try {
          this._kernel.martigli.addOscillation({
            id: osc.id,
            startPeriod: osc.startPeriod,
            endPeriod: osc.endPeriod,
            transitionSeconds: osc.transitionSeconds,
          });
        } catch (err) {
          console.warn('Failed to restore oscillation:', err);
        }
      });
    }
  }

  /**
   * Apply track state from serialized data to kernel
   * @param {object} serializedState - Output from toSerializable()
   */
  applySerializedTracks(serializedState) {
    if (!this._kernel || !serializedState?.tracks) {
      return;
    }

    try {
      this._kernel.tracks.load(serializedState.tracks);
    } catch (err) {
      console.warn('Failed to restore tracks:', err);
    }
  }
}

/**
 * Create singleton instance for app-wide state
 */
export const appState = new AppState();

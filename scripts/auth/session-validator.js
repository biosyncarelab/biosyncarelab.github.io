/**
 * Session Validator - Pure Validation Functions
 * NO Firebase dependencies - can be used in Node tests
 */

/**
 * Collect a session draft from current app state
 * @param {object} appState - Application state object
 * @param {object} contextRecord - Optional context record
 * @returns {object} Session draft
 */
export function collectSessionDraft(appState, contextRecord = null) {
  const draft = {
    id: contextRecord?.id ?? null,
    label: contextRecord?.label ?? 'Untitled Session',
    kind: contextRecord?.kind ?? 'custom',
    folderId: contextRecord?.folderId ?? contextRecord?.folder ?? null,

    // Martigli state
    martigli: appState.martigliState?.snapshot() ?? null,

    // Track Manager state (New Architecture)
    tracks: appState.kernel?.tracks?.toJSON() ?? [],

    // Track bindings (Legacy - to be migrated)
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

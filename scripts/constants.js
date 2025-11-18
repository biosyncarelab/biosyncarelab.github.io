/**
 * Application Constants
 * Centralized configuration values, magic numbers, and string constants
 */

/**
 * RDF/Ontology Constants
 */
export const NSO_BASE_URI = "https://biosyncare.github.io/rdf/harmonicare/SSO_Ontology.owl#";

export const SESSION_CLASS_LINK = {
  uri: `${NSO_BASE_URI}Session`,
  label: "Session Class",
  navigator: "harmonicare-sso",
  summary: "Canonical definition of the Session concept within the NSO / SSO ontology.",
};

/**
 * Dashboard Ontology Links
 * Maps session/structure IDs to relevant RDF concepts
 */
export const DASHBOARD_ONTOLOGY_LINKS = {
  "community-default-alpha": [
    {
      uri: `${NSO_BASE_URI}BrainwaveEntrainment`,
      label: "Brainwave Entrainment",
      navigator: "harmonicare-sso",
      summary: "Protocols that synchronize neural oscillations using rhythmic sensory cues.",
    },
    {
      uri: `${NSO_BASE_URI}AudiovisualStimulation`,
      label: "Audiovisual Stimulation",
      navigator: "harmonicare-sso",
      summary: "Combined light and sound entrainment techniques referenced by the session baseline.",
    },
  ],
  sine: [
    {
      uri: `${NSO_BASE_URI}AudioStimulation`,
      label: "Audio Stimulation",
      navigator: "harmonicare-sso",
      summary: "General-purpose sonic cues covering pure tones, isochronous beats, and modulated voices.",
    },
    {
      uri: `${NSO_BASE_URI}AudioTechniques`,
      label: "Audio Techniques",
      navigator: "harmonicare-sso",
      summary: "Families of sound design approaches catalogued in the SSO ontology.",
    },
  ],
  "binaural-alpha": [
    {
      uri: `${NSO_BASE_URI}BinauralBeats`,
      label: "Binaural Beats",
      navigator: "harmonicare-sso",
      summary: "Left/right carrier offsets targeting specific brainwave ranges (alpha, theta, etc.).",
    },
    {
      uri: `${NSO_BASE_URI}AudioTechniques`,
      label: "Audio Techniques",
      navigator: "harmonicare-sso",
      summary: "Families of sound design approaches catalogued in the SSO ontology.",
    },
  ],
};

/**
 * Martigli Oscillator Configuration
 */
export const MARTIGLI_CONFIG = {
  // Period limits (in seconds)
  MIN_PERIOD: 0.1,
  MAX_PERIOD: 120,
  DEFAULT_START_PERIOD: 10,
  DEFAULT_END_PERIOD: 20,
  DEFAULT_TRANSITION_SECONDS: 120,

  // Binding limits for parameter modulation
  BINDING_LIMITS: {
    baseMin: 40,
    baseMax: 1200,
    depthMin: 0,
    depthMax: 150,
  },

  // Available waveforms
  WAVEFORMS: ['sine', 'triangle', 'square', 'sawtooth'],

  // Default waveform
  DEFAULT_WAVEFORM: 'sine',
};

/**
 * Audio Engine Configuration
 */
export const AUDIO_CONFIG = {
  // Frequency limits (in Hz)
  MIN_FREQUENCY: 20,
  MAX_FREQUENCY: 20000,
  DEFAULT_FREQUENCY: 440,

  // Volume limits (0-1)
  MIN_VOLUME: 0,
  MAX_VOLUME: 1,
  DEFAULT_VOLUME: 0.5,

  // Pan limits (-1 to 1, left to right)
  MIN_PAN: -1,
  MAX_PAN: 1,
  DEFAULT_PAN: 0,

  // Available waveforms
  WAVEFORMS: ['sine', 'square', 'sawtooth', 'triangle'],

  // Binaural beat configuration
  BINAURAL: {
    MIN_BEAT_FREQUENCY: 0.5,
    MAX_BEAT_FREQUENCY: 40,
    COMMON_RANGES: {
      delta: { min: 0.5, max: 4, label: 'Delta (deep sleep)' },
      theta: { min: 4, max: 8, label: 'Theta (meditation)' },
      alpha: { min: 8, max: 13, label: 'Alpha (relaxation)' },
      beta: { min: 13, max: 30, label: 'Beta (focus)' },
      gamma: { min: 30, max: 40, label: 'Gamma (cognition)' },
    },
  },
};

/**
 * Visual Engine Configuration
 */
export const VISUAL_CONFIG = {
  // Brightness limits (0-1)
  MIN_BRIGHTNESS: 0,
  MAX_BRIGHTNESS: 1,
  DEFAULT_BRIGHTNESS: 0.8,

  // Color formats
  DEFAULT_COLOR: '#38bdf8',

  // Canvas rendering
  CANVAS: {
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
    DEFAULT_FPS: 60,
  },

  // Particle system
  PARTICLES: {
    MIN_COUNT: 1,
    MAX_COUNT: 1000,
    DEFAULT_COUNT: 100,
  },
};

/**
 * UI/UX Configuration
 */
export const UI_CONFIG = {
  // CSS class names
  CLASSES: {
    HIDDEN: 'hidden',
    PRIMARY: 'primary',
    GHOST: 'ghost',
    SMALL: 'small',
    TINY: 'tiny',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    ERROR: 'error',
    SUCCESS: 'success',
  },

  // Message types
  MESSAGE_TYPES: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
  },

  // Timing (in milliseconds)
  TIMING: {
    DEBOUNCE_DELAY: 300,
    MESSAGE_DISPLAY_DURATION: 5000,
    ANIMATION_DURATION: 300,
    TOOLTIP_DELAY: 500,
  },

  // Z-index layers
  Z_INDEX: {
    MODAL_OVERLAY: 1000,
    MODAL: 1001,
    TOOLTIP: 1002,
    NOTIFICATION: 1003,
  },
};

/**
 * Firestore Collection Names
 */
export const FIRESTORE_COLLECTIONS = {
  SESSIONS: 'sessions',
  TELEMETRY: 'telemetry',
  SHARED_STATES: 'shared-states',
  USER_PROFILES: 'user-profiles',
  PRESETS: 'presets',
};

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  USE_PROD_AUTH: 'bsc.useProdAuth',
  LAST_SESSION: 'bsc.lastSession',
  USER_PREFERENCES: 'bsc.userPreferences',
  EXPANDED_TRACKS: 'bsc.expandedTracks',
};

/**
 * Telemetry Event Types
 */
export const TELEMETRY_EVENTS = {
  SESSION_CREATE: 'session_create',
  SESSION_LOAD: 'session_load',
  SESSION_PLAY: 'session_play',
  SESSION_PAUSE: 'session_pause',
  SESSION_DELETE: 'session_delete',
  MARTIGLI_ADD: 'martigli_add',
  MARTIGLI_UPDATE: 'martigli_update',
  MARTIGLI_DELETE: 'martigli_delete',
  TRACK_ADD: 'track_add',
  TRACK_UPDATE: 'track_update',
  TRACK_DELETE: 'track_delete',
  MODAL_OPEN: 'modal_open',
  MODAL_CLOSE: 'modal_close',
  SHARE_URL_COPY: 'share_url_copy',
  RDF_LINK_CLICK: 'rdf_link_click',
};

/**
 * Session Kinds/Types
 */
export const SESSION_KINDS = {
  PRESET: 'preset',
  CUSTOM: 'custom',
  COMMUNITY: 'community',
  TEMPLATE: 'template',
};

/**
 * Track Modalities
 */
export const TRACK_MODALITIES = {
  AUDIO: 'audio',
  VISUAL: 'visual',
  HAPTIC: 'haptic',
};

/**
 * Sensory Cue Types
 */
export const SENSORY_CUE_TYPES = {
  TONE: 'tone',
  BINAURAL: 'binaural',
  ISOCHRONIC: 'isochronic',
  NOISE: 'noise',
  VOICE: 'voice',
  LIGHT: 'light',
  PATTERN: 'pattern',
  VIBRATION: 'vibration',
};

/**
 * Parameter Binding Targets
 * What parameters can be modulated by Martigli oscillator
 */
export const BINDING_TARGETS = {
  AUDIO: {
    FREQUENCY: 'frequency',
    VOLUME: 'volume',
    PAN: 'pan',
    FILTER_CUTOFF: 'filterCutoff',
    FILTER_RESONANCE: 'filterResonance',
  },
  VISUAL: {
    BRIGHTNESS: 'brightness',
    HUE: 'hue',
    SATURATION: 'saturation',
    SCALE: 'scale',
    ROTATION: 'rotation',
  },
  HAPTIC: {
    INTENSITY: 'intensity',
    FREQUENCY: 'frequency',
  },
};

/**
 * Default UI Text/Copy
 */
export const UI_TEXT = {
  AUTH: {
    SIGN_IN_PROMPT: 'Sign in to save and manage your sessions',
    SIGN_OUT_CONFIRM: 'Are you sure you want to sign out?',
    EMAIL_PLACEHOLDER: 'Email address',
    PASSWORD_PLACEHOLDER: 'Password',
  },
  SESSION: {
    NO_SESSIONS: 'No sessions yet. Create your first session!',
    LOADING: 'Loading sessions...',
    CREATE_PROMPT: 'Enter a name for your new session',
    DELETE_CONFIRM: 'Delete this session? This cannot be undone.',
  },
  MARTIGLI: {
    NO_OSCILLATORS: 'No oscillators configured. Add one to begin.',
    ADD_PROMPT: 'Enter a name for this breathing pattern',
    DELETE_CONFIRM: 'Delete this oscillator?',
  },
  TRACK: {
    NO_TRACKS: 'No tracks added yet',
    ADD_AUDIO: 'Add audio track',
    ADD_VISUAL: 'Add visual track',
    ADD_HAPTIC: 'Add haptic track',
  },
  ERRORS: {
    AUTH_FAILED: 'Authentication failed. Please try again.',
    SESSION_LOAD_FAILED: 'Failed to load sessions',
    SESSION_CREATE_FAILED: 'Failed to create session',
    SESSION_DELETE_FAILED: 'Failed to delete session',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  },
};

/**
 * Validation Rules
 */
export const VALIDATION = {
  SESSION_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  OSCILLATOR_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
  },
};

/**
 * Feature Flags
 * Enable/disable features in development
 */
export const FEATURE_FLAGS = {
  ENABLE_TELEMETRY: true,
  ENABLE_ANALYTICS: true,
  ENABLE_SHORT_URLS: false, // TODO: Implement Firestore rule for shared-states
  ENABLE_QR_CODES: false, // TODO: Add QR code library
  ENABLE_HAPTIC_TRACKS: false, // TODO: Implement haptic engine
  ENABLE_ADVANCED_AUDIO: false, // TODO: Add Tone.js
  ENABLE_ADVANCED_VIDEO: false, // TODO: Add PixiJS/Three.js
};

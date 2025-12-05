// Import from new modular architecture
import { auth, db, useAuthEmulator, isLocalhost } from "./auth/firebase-init.js";
import { logInteraction } from "./auth/telemetry-manager.js";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut as authSignOut,
  onAuthChange,
  getCurrentUser,
} from "./auth/auth-manager.js";
import {
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
  collectSessionDraft as collectSessionDraftFromState,
} from "./auth/session-manager.js";
import { appState } from "./state/app-state.js";
import {
  createShareableURL,
  restoreFromURL,
  updateBrowserURL,
  copyShareableURL,
} from "./state/url-state-manager.js";
import {
  renderMartigliDashboard,
  updateMartigliWidget,
  updateMartigliWidgetTelemetry,
  describeMartigliLiveSummary,
  createMartigliDashboardWidget,
  ensureMartigliTelemetryLoop
} from "./auth/martigli-ui.js";
import {
  renderSensoryPanels,
  setupVisualizerModal,
  setMartigliState,
  refreshTrackBindingOptions,
  updateTrackVisualizers,
  createTrackVisualizer,
  createTrackBindingControls,
  describeTrackVisualizerSummary,
  renderModalTrackSections as renderTrackLists,
  closeTrackVisualizerModal,
  refreshAllTrackBindings,
  serializeTrackState
} from "./auth/track-ui.js";
import {
  renderSessionList,
  renderStructurePreview as domRenderStructurePreview,
  toggleAuthPanels,
  renderAuthState,
  setMessage as renderMessage,
  clearMessage,
  clearList
} from "./auth/ui-renderer.js";
import {
  NSO_BASE_URI,
  DASHBOARD_ONTOLOGY_LINKS,
  SESSION_CLASS_LINK,
  MARTIGLI_CONFIG,
  UI_CONFIG,
  FIRESTORE_COLLECTIONS,
} from "./constants.js";

// Keep existing imports
import { firebaseConfig } from "./firebase-config.js";
import { BSCLabKernel } from "./structures.js";
import { STRUCTURE_MANIFEST } from "./structures-loader.js";
import { initMixerUI } from "./mixer-ui.js";
import "./structures-tab.js";
import { initStructureControlPanel } from "./auth/structure-control-ui.js";

const ui = {
  state: document.getElementById("auth-state"),
  email: document.getElementById("user-email"),
  userId: document.getElementById("user-id"),
  googleSignIn: document.getElementById("google-sign-in"),
  statusSignOut: document.getElementById("status-sign-out"),
  emailForm: document.getElementById("email-form"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  emailSignUp: document.getElementById("email-sign-up"),
  messages: document.getElementById("messages"),
  authForms: document.getElementById("auth-forms"),
  authChip: document.getElementById("auth-chip"),
  dashboard: document.getElementById("panel-dashboard"),
  tabs: document.getElementById("lab-tabs"),
  sessionList: document.getElementById("session-list"),
  sessionStatus: document.getElementById("session-status"),
  sessionNavigator: document.getElementById("session-navigator"),
  authModeText: document.getElementById("auth-mode-text"),
  toggleAuthMode: document.getElementById("toggle-auth-mode"),
  modal: document.getElementById("detail-modal"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalKind: document.getElementById("modal-kind"),
  modalMeta: document.getElementById("modal-meta"),
  sessionApply: document.getElementById("session-apply"),
  sessionSave: document.getElementById("session-save"),
  sessionShareLink: document.getElementById("session-share-link"),
  snapshotDownload: document.getElementById("snapshot-download"),
  sessionShareIndicator: document.getElementById("session-share-indicator"),
  sessionFolderFilter: document.getElementById("session-folder-filter"),
  sessionDropdown: document.getElementById("session-dropdown"),
  sessionHint: document.getElementById("session-card-hint"),
  sessionLoadSelected: document.getElementById("session-load-selected"),
  sessionInfo: document.getElementById("session-info"),
  martigliDashboardPreview: document.getElementById("martigli-dashboard-preview"),
  martigliDashboardSummary: document.getElementById("martigli-dashboard-summary"),
  martigliDashboardList: document.getElementById("martigli-dashboard-list"),
  modalMartigli: document.getElementById("modal-martigli"),
  modalClose: document.getElementById("modal-close"),
  martigliPreview: document.getElementById("martigli-preview"),
  martigliCanvas: document.getElementById("martigli-canvas"),
  martigliOscillationSelect: document.getElementById("martigli-oscillation-select"),
  martigliAdd: document.getElementById("martigli-add"),
  martigliRename: document.getElementById("martigli-rename"),
  martigliDelete: document.getElementById("martigli-delete"),
  martigliOscillationStatus: document.getElementById("martigli-oscillation-status"),
  martigliAddDashboard: document.getElementById("martigli-add-dashboard"),
  structureControlDataset: document.getElementById("control-structure-dataset"),
  structureControlSequence: document.getElementById("control-structure-sequence"),
  structureControlTempo: document.getElementById("control-structure-tempo"),
  structureControlAdd: document.getElementById("structure-control-add"),
  structureControlList: document.getElementById("structure-control-list"),
  structureControlStatus: document.getElementById("structure-control-status"),
  structureControlEmpty: document.getElementById("structure-control-empty"),
  audioSensoryList: document.getElementById("audio-sensory-list"),
  audioSensoryStatus: document.getElementById("audio-sensory-status"),
  visualSensoryList: document.getElementById("visual-sensory-list"),
  visualSensoryStatus: document.getElementById("visual-sensory-status"),
  hapticSensoryList: document.getElementById("haptic-sensory-list"),
  hapticSensoryStatus: document.getElementById("haptic-sensory-status"),
  audioTrackList: document.getElementById("audio-track-list"),
  audioTrackHint: document.getElementById("audio-track-hint"),
  videoTrackList: document.getElementById("video-track-list"),
  videoTrackHint: document.getElementById("video-track-hint"),
  hapticTrackList: document.getElementById("haptic-track-list"),
  hapticTrackHint: document.getElementById("haptic-track-hint"),
  structureSection: document.getElementById("structure-section"),
  structureSummary: document.getElementById("structure-summary"),
  structureList: document.getElementById("structure-list"),
  visualizerModal: document.getElementById("visualizer-modal"),
  visualizerOverlay: document.getElementById("visualizer-overlay"),
  visualizerClose: document.getElementById("visualizer-close"),
  visualizerCanvas: document.getElementById("visualizer-canvas"),
  visualizerSummary: document.getElementById("visualizer-summary"),
  visualizerTitle: document.getElementById("visualizer-title"),
};

const summarizeSession = (session) => {
  if (!session) return "Select a session to view details.";
  const tracks = Array.isArray(session.tracks) ? session.tracks : [];
  const controls = session.controlTracks?.controls ?? [];
  const martigliCount = session.martigli?.oscillations?.length ?? 0;
  const martigliOscillations = session.martigli?.oscillations ?? [];
  const lines = [];
  lines.push(`<strong>${session.label ?? session.id}</strong>`);
  if (session.folderId || session.folder) {
    lines.push(`📁 Folder: <em>${session.folderId ?? session.folder}</em>`);
  }
  if (session.kind) {
    lines.push(`🏷️ Kind: <em>${session.kind}</em>`);
  }
  lines.push(`🎵 <strong>Tracks:</strong> ${tracks.length}`);
  if (tracks.length) {
    const audioTracks = tracks.filter((t) => t.class === "audio" || t.type === "audio");
    const videoTracks = tracks.filter((t) => t.class === "video" || t.type === "video");
    const hapticTracks = tracks.filter((t) => t.class === "haptic" || t.type === "haptic");
    const breakdown = [];
    if (audioTracks.length) breakdown.push(`${audioTracks.length} audio`);
    if (videoTracks.length) breakdown.push(`${videoTracks.length} video`);
    if (hapticTracks.length) breakdown.push(`${hapticTracks.length} haptic`);
    if (breakdown.length) {
      lines.push(`   ↳ ${breakdown.join(", ")}`);
    }
    const preview = tracks.slice(0, 3).map((t) => t.label ?? t.name ?? t.type ?? "Track").join(", ");
    if (tracks.length <= 3) {
      lines.push(`   ↳ ${preview}`);
    } else {
      lines.push(`   ↳ ${preview}, +${tracks.length - 3} more`);
    }
  }
  lines.push(`🌊 <strong>Martigli oscillations:</strong> ${martigliCount}`);
  if (martigliOscillations.length) {
    martigliOscillations.slice(0, 3).forEach((osc, idx) => {
      const label = osc.label || `Oscillation ${idx + 1}`;
      const freq = osc.frequency ? ` (${osc.frequency.toFixed(2)} Hz)` : "";
      lines.push(`   ↳ ${label}${freq}`);
    });
    if (martigliOscillations.length > 3) {
      lines.push(`   ↳ +${martigliOscillations.length - 3} more`);
    }
  }
  if (controls.length) {
    lines.push(`🎛️ <strong>Control tracks:</strong> ${controls.length}`);
  }
  return lines.map((l) => `<div style="margin: 0.15rem 0;">${l}</div>`).join("");
};

const updateSessionInfoPanel = (session) => {
  if (!ui.sessionInfo) return;
  ui.sessionInfo.innerHTML = summarizeSession(session);
};

const defaultDashboardCopy = {
  martigliPreview: ui.martigliDashboardPreview?.textContent ?? "",
  martigliDashboardSummary: ui.martigliDashboardSummary?.textContent ?? "",
  audioSensoryStatus: ui.audioSensoryStatus?.textContent ?? "",
  visualSensoryStatus: ui.visualSensoryStatus?.textContent ?? "",
  hapticSensoryStatus: ui.hapticSensoryStatus?.textContent ?? "",
  martigliOscillationStatus: ui.martigliOscillationStatus?.textContent ?? "",
};

// martigliDashboard moved to martigli-ui.js

const sensoryPanels = {
  audio: {
    label: "audio",
    list: ui.audioSensoryList,
    status: ui.audioSensoryStatus,
    defaultStatus: defaultDashboardCopy.audioSensoryStatus,
  },
  visual: {
    label: "visual",
    list: ui.visualSensoryList,
    status: ui.visualSensoryStatus,
    defaultStatus: defaultDashboardCopy.visualSensoryStatus,
  },
  haptic: {
    label: "haptic",
    list: ui.hapticSensoryList,
    status: ui.hapticSensoryStatus,
    defaultStatus: defaultDashboardCopy.hapticSensoryStatus,
  },
};

// Registries moved to track-ui.js

const setMessage = (text, type = "") => {
  renderMessage(ui.messages, text, type);
};

const kernel = new BSCLabKernel({ onInteraction: logInteraction });
kernel.init();
appState.setKernel(kernel);
initMixerUI();
initStructureControlPanel({
  kernel,
  elements: {
    datasetSelect: ui.structureControlDataset,
    sequenceSelect: ui.structureControlSequence,
    tempoInput: ui.structureControlTempo,
    addButton: ui.structureControlAdd,
    listEl: ui.structureControlList,
    statusEl: ui.structureControlStatus,
    emptyEl: ui.structureControlEmpty,
  },
});

const masterVolume = document.getElementById("master-volume");
if (masterVolume) {
  const applyVolume = (value) => {
    if (kernel.audio?.masterGain) {
      kernel.audio.masterGain.gain.value = value;
    }
  };
  masterVolume.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value) || 0;
    applyVolume(val);
  });
  applyVolume(parseFloat(masterVolume.value) || 0.8);
}

// Wire up reactive UI via state subscriptions
appState.subscribe((state) => {
  // Session dropdowns and info panel
  const sessions = state.sessions || [];
  if (ui.sessionStatus) {
    ui.sessionStatus.textContent = sessions.length
      ? `${sessions.length} session${sessions.length > 1 ? "s" : ""}`
      : state.isFetchingDashboard
        ? "Loading sessions…"
        : state.currentUser
          ? "No sessions found."
          : "Sign in to load sessions.";
  }

  const folderSelect = ui.sessionFolderFilter;
  const dropdown = ui.sessionDropdown;
  if (folderSelect && dropdown) {
    const folders = Array.from(new Set(sessions.map((s) => s.folderId || s.folder).filter(Boolean)));
    folderSelect.innerHTML = '<option value="">All folders</option>';
    folders.forEach((folder) => {
      const opt = document.createElement("option");
      opt.value = folder;
      opt.textContent = folder;
      folderSelect.appendChild(opt);
    });

    dropdown.innerHTML = '<option value="">Select a session…</option>';
    const grouped = sessions.reduce((acc, session) => {
      const key = session.folderId || session.folder || "";
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([folder, list]) => {
      if (folder) {
        const group = document.createElement("optgroup");
        group.label = folder;
        list.forEach((session) => {
          const opt = document.createElement("option");
          opt.value = session.id;
          const trackCount = Array.isArray(session.tracks) ? session.tracks.length : 0;
          const martigliCount = session.martigli?.oscillations?.length ?? 0;
          opt.textContent = `${session.label ?? session.id} (${trackCount} tracks, ${martigliCount} martigli)`;
          group.appendChild(opt);
        });
        dropdown.appendChild(group);
      } else {
        list.forEach((session) => {
          const opt = document.createElement("option");
          opt.value = session.id;
          const trackCount = Array.isArray(session.tracks) ? session.tracks.length : 0;
          const martigliCount = session.martigli?.oscillations?.length ?? 0;
          opt.textContent = `${session.label ?? session.id} (${trackCount} tracks, ${martigliCount} martigli)`;
          dropdown.appendChild(opt);
        });
      }
    });
    // Auto-select first session if none selected
    if (!dropdown.dataset.selectedId && dropdown.options.length > 1) {
      dropdown.selectedIndex = 1;
      dropdown.dataset.selectedId = dropdown.value;
      updateSessionInfoPanel((sessions || []).find((s) => s.id === dropdown.value));
    }
    // Preserve current selection if possible
    if (dropdown.dataset.selectedId) {
      dropdown.value = dropdown.dataset.selectedId;
    }
  }

  // Update info panel for selected session
  const selectedId = ui.sessionDropdown?.value ?? "";
  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;
  updateSessionInfoPanel(selectedSession);

  // Update auth UI when user changes
  renderAuthState(ui, state.currentUser);

  const isAuthenticated = !!state.currentUser;
  toggleAuthPanels(ui.authForms, ui.dashboard, isAuthenticated);
  if (ui.tabs) ui.tabs.classList.toggle(UI_CONFIG.CLASSES.HIDDEN, !isAuthenticated);
  if (ui.authChip) ui.authChip.classList.toggle(UI_CONFIG.CLASSES.HIDDEN, !isAuthenticated);

  // Update controls based on busy/user state
  refreshControls();
});

// ========================================
// Engine References (from BSCLabKernel)
// ========================================
const martigliState = kernel.martigli;
setMartigliState(martigliState);
const audioEngine = kernel.audio;
const structureStore = kernel.structures;
const rdfLinker = kernel.rdf;
const videoEngine = kernel.video;
let lastStructureRecord = null;
let activeVideoLayerId = null;
let activeModalRecord = null;
let activeModalData = null;
const videoCanvasController =
  ui.martigliCanvas && typeof videoEngine.attachCanvas === "function"
    ? videoEngine.attachCanvas(ui.martigliCanvas, { color: "#38bdf8" })
    : null;

// Binding registry moved to track-ui.js

const normalizeMartigliSnapshot = (source) => {
  if (!source) return null;
  if (Array.isArray(source.oscillations) && source.oscillations.length) {
    return { oscillations: source.oscillations, referenceId: source.referenceId ?? null };
  }
  if (Array.isArray(source)) {
    return { oscillations: source };
  }
  return { oscillations: [source] };
};

const extractMartigliParams = (record) => {
  if (record?.martigli) return record.martigli;
  return record?.voices?.find((voice) => voice?.martigli)?.martigli;
};

const normalizeTrackBindings = (bindings = []) => {
  if (!Array.isArray(bindings)) return [];
  return bindings
    .map((binding) => {
      if (!binding || typeof binding !== "object") return null;
      const type = (binding.type ?? binding.kind ?? binding.source ?? "").toString().toLowerCase();
      if (type === "martigli") {
        return {
          type: "martigli",
          oscillatorId:
            binding.oscillatorId ?? binding.referenceId ?? binding.sourceId ?? binding.id ?? null,
          target: binding.target ?? binding.param ?? "frequency",
          depth: Number(binding.depth ?? binding.amount ?? 0),
        };
      }
      return { ...binding };
    })
    .filter(Boolean);
};

const createMartigliTrackModel = (record, osc, index) => {
  if (!osc) return null;
  const recordId = record?.id ?? "record";
  const trackId = osc.id ?? `${recordId}-martigli-${index}`;
  return {
    id: trackId,
    label: osc.label ?? `Martigli ${index + 1}`,
    type: "martigli",
    modality: "martigli",
    params: {
      startPeriodSec: osc.startPeriodSec ?? osc.startPeriod,
      endPeriodSec: osc.endPeriodSec ?? osc.endPeriod,
      transitionSec: osc.transitionSec ?? osc.transition ?? 0,
      waveform: osc.waveform ?? "sine",
      amplitude: osc.amplitude ?? 1,
    },
    martigli: {
      oscillatorId: osc.id ?? null,
    },
    bindings: [],
    isMartigli: true,
    sourceIndex: -(index + 1),
    sourceRecordId: record?.id ?? null,
  };
};

const normalizeTrackModel = (track = {}, context = {}) => {
  const recordId = context.recordId ?? track.sourceRecordId ?? null;
  const index = context.index ?? track.sourceIndex ?? 0;
  const fallbackId = `${recordId ?? "record"}-track-${index}`;
  return {
    ...track,
    id: track.id ?? fallbackId,
    label: track.label ?? track.name ?? `Track ${index + 1}`,
    type: track.type ?? track.kind ?? track.modality ?? "audio",
    modality: track.modality ?? track.kind ?? "audio",
    params: { ...(track.params ?? {}) },
    bindings: normalizeTrackBindings(track.bindings),
    sourceIndex: index,
    sourceRecordId: recordId,
    isMartigli: Boolean(track.isMartigli),
  };
};

const shouldUseLiveMartigliForRecord = (record, options = {}) => {
  if (typeof options.useLiveMartigli === "boolean") {
    return options.useLiveMartigli;
  }
  const recordId = record?.id ?? record?.uid ?? null;
  if (!recordId) return false;
  if (recordId === appState.snapshot().activeSessionId) return true;
  if (recordId === activeModalRecord?.id) return true;
  if (recordId === "martigli-lab") return true;
  return false;
};

const getRecordTracks = (record, options = {}) => {
  if (!record) return [];
  const recordId = record.id ?? record.uid ?? "record";
  const rawTracks = Array.isArray(record.tracks)
    ? record.tracks
    : Array.isArray(record.voices)
      ? record.voices
      : [];
  const normalized = rawTracks.map((track, index) => normalizeTrackModel(track, { recordId, index }));
  const hasMartigliTrack = normalized.some((track) => track.type === "martigli" || track.isMartigli);
  if (hasMartigliTrack) {
    return normalized;
  }
  const useLiveMartigli = shouldUseLiveMartigliForRecord(record, options);
  const martigliSource = useLiveMartigli ? martigliState.snapshot?.() : extractMartigliParams(record);
  const snapshot = normalizeMartigliSnapshot(martigliSource);
  const martigliTracks = snapshot?.oscillations
    ? snapshot.oscillations.map((osc, index) => createMartigliTrackModel(record, osc, index)).filter(Boolean)
    : [];
  return [...martigliTracks, ...normalized];
};

// Track expansion helpers moved to track-ui.js

// ensureTrackBindingState moved to track-ui.js

// Binding preview helpers moved to track-ui.js

// refreshTrackBindingOptions moved to track-ui.js

// refreshAllTrackBindings moved to track-ui.js

// Track binding controls moved to track-ui.js

// Track visualizer logic moved to track-ui.js

// Martigli UI helpers moved to martigli-ui.js

// Telemetry constants moved to martigli-ui.js

STRUCTURE_MANIFEST.forEach((entry) => {
  rdfLinker.register(entry.id, `urn:nso:structure:${entry.id}`, { label: entry.label });
});

Object.entries(DASHBOARD_ONTOLOGY_LINKS).forEach(([recordId, links]) => {
  (links ?? []).forEach((link) => {
    rdfLinker.register(recordId, link.uri, {
      label: link.label,
      navigator: link.navigator,
      summary: link.summary,
    });
  });
});

// Track UI helpers moved to track-ui.js

const updateAuthVisibility = (user) => {
  if (ui.authForms) {
    ui.authForms.classList.toggle("hidden", Boolean(user));
  }
  if (ui.authChip) {
    ui.authChip.classList.toggle("hidden", !user);
  }
};

const refreshControls = () => {
  const state = appState.snapshot();
  const user = auth.currentUser;
  const emailSubmit = ui.emailForm.querySelector("button[type='submit']");
  updateAuthVisibility(user);
  if (ui.googleSignIn) {
    const emulatorBlocksFederated = useAuthEmulator;
    ui.googleSignIn.disabled = state.isBusy || !!user || emulatorBlocksFederated;
    ui.googleSignIn.title = emulatorBlocksFederated
      ? "Google sign-in is disabled when the Auth emulator is active."
      : "";
  }
  if (ui.statusSignOut) {
    ui.statusSignOut.disabled = state.isBusy || !user;
    ui.statusSignOut.classList.toggle("hidden", !user);
  }
  if (emailSubmit) {
    emailSubmit.disabled = state.isBusy;
  }
  if (ui.emailSignUp) {
    ui.emailSignUp.disabled = state.isBusy;
  }
};

/**
 * Set busy state and refresh UI controls
 * @param {boolean} nextBusy - Whether the app is busy (loading/saving)
 */
const setBusy = (nextBusy) => {
  appState.setBusy(nextBusy);
  refreshControls();
};

const updateAuthModeHint = () => {
  if (!ui.authModeText || !ui.toggleAuthMode) {
    return;
  }
  if (!isLocalhost) {
    ui.authModeText.textContent = "Google sign-in uses Firebase production.";
    ui.toggleAuthMode.classList.add("hidden");
    return;
  }
  ui.authModeText.textContent = useAuthEmulator
    ? "Local Auth emulator active; Google disabled."
    : "Production Auth active; Google enabled.";
  ui.toggleAuthMode.textContent = useAuthEmulator ? "Use production auth" : "Use emulator auth";
  ui.toggleAuthMode.classList.remove("hidden");
};

const setDashboardVisibility = (visible) => {
  if (!ui.dashboard) return;
  ui.dashboard.classList.toggle("hidden", !visible);
};

const resetSensoryPanels = () => {
  Object.values(sensoryPanels).forEach((panel) => {
    if (panel.list) {
      clearList(panel.list);
    }
    if (panel.status) {
      panel.status.textContent = panel.defaultStatus;
    }
  });
};

const resetDashboardContext = () => {
  appState.setActiveSession(null, null);
  resetSensoryPanels();
  if (ui.martigliDashboardPreview) {
    ui.martigliDashboardPreview.textContent = defaultDashboardCopy.martigliPreview;
  }
  if (ui.martigliDashboardSummary) {
    ui.martigliDashboardSummary.textContent = defaultDashboardCopy.martigliDashboardSummary;
  }
  if (ui.martigliOscillationStatus) {
    ui.martigliOscillationStatus.textContent = defaultDashboardCopy.martigliOscillationStatus;
  }
  updateSessionNavigatorLink();
};

const formatPanelLabel = (label = "") =>
  label.length ? label.charAt(0).toUpperCase() + label.slice(1) : "";

const updateSessionNavigatorLink = (record = null) => {
  if (!ui.sessionNavigator) return;
  const links = record ? rdfLinker.get(record.id) : [];
  const primary = links[0] ?? SESSION_CLASS_LINK;
  const href = buildNavigatorUrl(primary);
  const hasRecordLink = Boolean(record && links[0] && href);
  ui.sessionNavigator.dataset.href = href ?? "";
  ui.sessionNavigator.disabled = !href;
  ui.sessionNavigator.textContent = hasRecordLink
    ? `Open ${record.label ?? record.id ?? "Session"} in NSO`
    : "Session Class (NSO)";
  ui.sessionNavigator.title = hasRecordLink
    ? primary.summary ?? primary.label ?? primary.uri
    : "Browse the canonical Session class";
};

const getTrackCount = (entry) => {
  if (!entry) return 0;
  if (Number.isFinite(entry.trackCount)) {
    return entry.trackCount;
  }
  return getRecordTracks(entry).length;
};

const formatMetaValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number") {
    return value;
  }
  return String(value);
};

const openNavigatorWindow = (url) => {
  if (!url) return;
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

function buildNavigatorUrl(link) {
  if (!link || !link.uri) return null;
  const params = new URLSearchParams({ concept: link.uri });
  if (link.navigator) {
    params.set("ontology", link.navigator);
  }
  return `nso-navigator.html?${params.toString()}`;
}

const createNavigatorButton = (target) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost tiny navigator-link";
  button.textContent = "View in Navigator";
  const destination = typeof target === "string" ? target : buildNavigatorUrl(target);
  if (destination) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openNavigatorWindow(destination);
    });
  } else {
    button.disabled = true;
  }
  return button;
};

const createOntologySlot = (kind, id) => {
  const slot = document.createElement("div");
  slot.className = "ontology-slot";
  slot.dataset.kind = kind;
  if (id) {
    slot.dataset.recordId = id;
  }
  const links = id ? rdfLinker.get(id) : [];
  slot.innerHTML = "";
  if (links.length) {
    const primary = links[0];
    const tooltip = primary.summary ?? primary.definition ?? primary.label ?? primary.uri;
    slot.title = tooltip;
    const primaryWrap = document.createElement("div");
    primaryWrap.className = "ontology-slot-primary";
    const navigatorUrl = buildNavigatorUrl(primary);
    const anchor = document.createElement("a");
    anchor.href = navigatorUrl ?? primary.uri;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = primary.label ?? primary.uri;
    anchor.title = tooltip;
    primaryWrap.appendChild(anchor);
    if (links.length > 1) {
      const extra = document.createElement("span");
      extra.className = "muted-text";
      extra.textContent = ` +${links.length - 1} more`;
      primaryWrap.appendChild(extra);
    }
    slot.appendChild(primaryWrap);
    const navigatorButton = createNavigatorButton(primary);
    navigatorButton.textContent = "Open in Navigator";
    slot.appendChild(navigatorButton);
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "ghost tiny copy-uri";
    copyButton.textContent = "Copy URI";
    copyButton.addEventListener("click", () => {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(primary.uri).then(
          () => {
            copyButton.textContent = "Copied";
            setTimeout(() => {
              copyButton.textContent = "Copy URI";
            }, 1200);
          },
          () => window.open(primary.uri, "_blank", "noopener,noreferrer"),
        );
      } else {
        window.open(primary.uri, "_blank", "noopener,noreferrer");
      }
    });
    slot.appendChild(copyButton);
  } else {
    const emptyLabel = document.createElement("span");
    emptyLabel.textContent = "Map to NSO";
    emptyLabel.className = "muted-text";
    slot.title = "No ontology references yet";
    slot.appendChild(emptyLabel);
    slot.appendChild(createNavigatorButton("nso-navigator.html"));
  }
  return slot;
};

const createMetaGrid = (fields) => {
  const dl = document.createElement("dl");
  dl.className = "card-meta";
  fields
    .filter((field) => field)
    .forEach(({ label, value }) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = formatMetaValue(value);
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  return dl;
};

const createDashboardCard = (item, kind) => {
  const li = document.createElement("li");
  li.className = "dashboard-item";

  const head = document.createElement("div");
  head.className = "card-head";
  const title = document.createElement("h3");
  title.textContent = item.label ?? item.name ?? item.id ?? "Untitled";
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = (item.visibility ?? kind ?? "Session").toString();
  head.appendChild(title);
  head.appendChild(pill);
  li.appendChild(head);

  if (item.description) {
    const description = document.createElement("p");
    description.textContent = item.description;
    li.appendChild(description);
  }

  li.appendChild(
    createMetaGrid([
      { label: "Folder", value: item.folderId ?? item.folder ?? "—" },
      { label: "Tracks", value: getTrackCount(item) },
      { label: "Updated", value: item.updatedAt ?? item.createdAt ?? "—" },
    ]),
  );

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "primary small";
  openBtn.textContent = "Open";
  openBtn.addEventListener("click", () => openDetailModal(item, kind));
  footer.appendChild(openBtn);
  footer.appendChild(createOntologySlot(kind, item.id));
  li.appendChild(footer);

  return li;
};

const renderDashboardList = (list, statusEl, items, emptyLabel, kind) => {
  if (!list || !statusEl) return;
  clearList(list);
  if (!items.length) {
    statusEl.textContent = emptyLabel;
    return;
  }
  const noun = kind === "session" ? "session" : "preset";
  statusEl.textContent = `${items.length} ${noun}${items.length > 1 ? "s" : ""}`;
  items.forEach((item) => {
    list.appendChild(createDashboardCard(item, kind));
  });
};

/**
 * Load user's sessions from Firestore and update UI
 * Triggers reactive UI updates via appState.setSessions()
 * Logs "sessions.loaded" activity event
 */
const loadDashboardData = async () => {
  const state = appState.snapshot();
  if (state.fetchingDashboard) return;
  if (!ui.dashboard) return;

  const user = getCurrentUser();
  if (!user) {
    console.warn("No user for dashboard load");
    return;
  }

  appState.setFetchingDashboard(true);
  setDashboardVisibility(true);
  ui.sessionStatus.textContent = "Loading sessions…";

  try {
    const sessions = await fetchSessions(user.uid);

    // Update appState - subscription will re-render UI automatically
    appState.setSessions(sessions);

    // Log activity
    kernel.recordInteraction("sessions.loaded", {
      count: sessions.length,
      userId: user.uid,
    });
  } catch (err) {
    console.error("Dashboard load failed", err);
    ui.sessionStatus.textContent = "Unable to load sessions.";
    appState.setSessions([]);
  } finally {
    appState.setFetchingDashboard(false);
  }
};

const renderStructurePreview = (record) => {
  if (record) {
    lastStructureRecord = record;
  }
  domRenderStructurePreview(record, ui, structureStore, rdfLinker);
};

const ensureSessionTarget = () => {
  if (activeModalRecord?.kind === "session" && activeModalData) {
    return activeModalData;
  }
  setMessage("Open a session to apply or save neurosensory state.", "info");
  return null;
};

const applyMartigliFromRecord = (record) => {
  const martigliParams = extractMartigliParams(record);
  const snapshot = normalizeMartigliSnapshot(martigliParams);
  if (!snapshot) {
    setMessage("Session has no Martigli payload yet.", "error");
    return false;
  }
  martigliState.loadSnapshot(snapshot);
  kernel.recordInteraction("session.apply.martigli", {
    recordId: record.id ?? null,
    label: record.label ?? null,
  });
  return true;
};

const loadSessionTracks = (record, mode = "replace") => {
  const tracks = Array.isArray(record?.tracks) ? record.tracks : [];
  const manager = kernel.tracks;
  const payload = tracks.map((t) => ({ ...t }));

  if (mode === "replace") {
    manager.clear();
  }

  if (mode === "append") {
    const existingIds = new Set(manager.getAll().map((t) => t.id));
    payload.forEach((track) => {
      if (existingIds.has(track.id)) {
        track.id = `${track.id}-${Date.now().toString(36)}`;
      }
      existingIds.add(track.id);
    });
  }

  manager.load(payload);
};

const handleSessionLoadAction = async (record, mode = "replace") => {
  if (!record) return;
  if (mode === "replace" && kernel.controlTracks?.clearAll) {
    kernel.controlTracks.clearAll();
  }
  setBusy(true);
  try {
    if (record.controlTracks?.controls?.length && kernel.structures?.load) {
      await kernel.structures.load();
      kernel.controlTracks?.loadSnapshot?.(record.controlTracks, { mode: "append" });
    }

    if (record.martigli) {
      martigliState.loadSnapshot(normalizeMartigliSnapshot(record.martigli));
    }
    loadSessionTracks(record, mode);
    noteActiveSessionRecord(record);

    const verb = mode === "append" ? "added" : "loaded";
    setMessage(`Session "${record.label ?? record.id}" ${verb} into the mixer.`, "success");
    kernel.recordInteraction(`session.${verb}`, {
      sessionId: record.id ?? null,
      mode,
    });
    if (kernel.audio) {
      kernel.audio.resume();
    }
  } catch (err) {
    console.error("Session load failed", err);
    setMessage("Failed to load session.", "error");
  } finally {
    setBusy(false);
  }
};

const collectSessionDraft = (record) => {
  const reference = martigliState.getReference ? martigliState.getReference() : null;
  const martigliPayload = reference?.toJSON?.() ?? martigliState.snapshot?.().oscillations?.[0] ?? null;
  const tracks = getRecordTracks(record, { useLiveMartigli: true });
  return {
    id: record?.id ?? null,
    label: record?.label ?? "Draft Session",
    savedAt: new Date().toISOString(),
    martigli: martigliPayload,
    tracks: tracks.map((track) => serializeTrackState(track)),
    voices: record?.voices ?? record?.tracks ?? [],
  };
};

const copyToClipboard = async (text) => {
  if (!text || typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard copy failed", err);
  }
  return false;
};

const noteActiveSessionRecord = (record) => {
  appState.setActiveSession(
    record?.id ?? null,
    record?.label ?? record?.name ?? record?.id ?? null
  );
  updateSessionNavigatorLink(record ?? null);
  updateMartigliOscillationStatus(martigliState.snapshot());
};

const setActiveSessionContext = (record, kind) => {
  if (kind !== "session") return;
  noteActiveSessionRecord(record);
  renderSensoryPanelsForRecord(record, kind);
  updateMartigliPreview(martigliState.snapshot());
};

const handleSessionApply = () => {
  const record = ensureSessionTarget();
  if (!record) return;
  const martigliApplied = applyMartigliFromRecord(record);
  if (martigliApplied) {
    setActiveSessionContext(record, "session");
    setMessage("Martigli oscillations synced from session. Audio/video presets will follow once editable.", "success");
  }
};

/**
 * Save current session to Firestore
 * Collects current app state (Martigli, track bindings, etc.) and persists to database
 * Requires authenticated user and active Martigli configuration
 * Logs "session.saved" activity event
 * @returns {Promise<void>}
 */
const handleSessionSave = async () => {
  const user = getCurrentUser();
  if (!user) {
    setMessage("Sign in to save sessions.", "error");
    return;
  }

  // Collect current state directly from kernel/appState
  // If we have an active session ID, we might be updating it,
  // but for now let's treat "Save current state" as creating a snapshot/new session
  // or updating if we are explicitly editing one.

  // We'll use a dummy record to seed collectSessionDraft if no modal is open
  const currentSessionId = appState.snapshot().activeSessionId;
  const currentLabel = appState.snapshot().activeSessionLabel || `Session ${new Date().toLocaleString()}`;

  const contextRecord = activeModalData ?? {
    id: currentSessionId,
    label: currentLabel
  };

  const draft = collectSessionDraft(appState, contextRecord);

  // Ensure we capture the actual current tracks from the kernel
  // collectSessionDraft might rely on the record passed to it, let's verify.
  // Looking at collectSessionDraft implementation:
  // const tracks = getRecordTracks(record, { useLiveMartigli: true });
  // getRecordTracks likely pulls from the record. We want LIVE tracks.

  // Let's override tracks with live kernel tracks
  draft.tracks = kernel.tracks.getAll().map(t => serializeTrackState(t));

  // Save structure controls
  if (kernel.controlTracks?.snapshot) {
    draft.controlTracks = kernel.controlTracks.snapshot();
  }

  // Strip UI-only fields from bindings if present
  if (Array.isArray(draft.trackBindings)) {
    draft.trackBindings = draft.trackBindings.map(({ elements, ...rest }) => rest);
  }

  // Prompt user for session label
  const desiredLabel = typeof window !== "undefined"
    ? window.prompt("Name this session preset:", draft.label ?? currentLabel)
    : draft.label;
  if (desiredLabel === null) {
    setMessage("Save cancelled.", "info");
    return;
  }
  draft.label = (desiredLabel || "").trim() || draft.label || currentLabel;

  if (!draft.martigli) {
    // Try to get live martigli state
    const martigliSnapshot = kernel.martigli.snapshot();
    if (martigliSnapshot && martigliSnapshot.oscillations.length > 0) {
        draft.martigli = {
            oscillations: martigliSnapshot.oscillations,
            referenceId: martigliSnapshot.referenceId
        };
    } else {
        setMessage("Adjust the Martigli widget before saving a session.", "error");
        return;
    }
  }

  const sanitizeForFirestore = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const isDomNode = (typeof Element !== "undefined" && value instanceof Element) || (value && value.nodeType === 1);
    if (isDomNode) return undefined;
    if (typeof value === "function") return undefined;
    if (Array.isArray(value)) {
      const cleaned = value
        .map((item) => sanitizeForFirestore(item))
        .filter((item) => item !== undefined);
      return cleaned;
    }
    if (value && typeof value === "object") {
      const cleaned = {};
      Object.entries(value).forEach(([key, val]) => {
        const next = sanitizeForFirestore(val);
        if (next !== undefined) cleaned[key] = next;
      });
      return cleaned;
    }
    return value;
  };

  const cleanDraft = sanitizeForFirestore(draft);

  setBusy(true);
  try {
    const savedSession = await createSession(user.uid, cleanDraft);

    // Update appState with new session
    const state = appState.snapshot();
    appState.setSessions([...state.sessions, savedSession]);
    appState.setActiveSession(savedSession.id, savedSession.label);

    // Log activity
    kernel.recordInteraction("session.saved", {
      sessionId: savedSession.id,
      label: draft.label,
      userId: user.uid,
    });

    setMessage(`Session "${draft.label}" saved successfully.`, "success");

    // Optional: Copy to clipboard as backup
    const serialized = JSON.stringify(savedSession, null, 2);
    await copyToClipboard(serialized);
  } catch (err) {
    console.error("Session save failed", err);
    setMessage(`Failed to save session: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
};

// Helper to show the share indicator
const showSessionShareIndicator = (text = "State in URL") => {
  if (!ui.sessionShareIndicator) return;
  ui.sessionShareIndicator.textContent = text;
  ui.sessionShareIndicator.classList.remove("hidden");
};

const handleSessionShareLink = async () => {
  // We don't strictly need an active session ID to share the current state
  // The URL state manager serializes the current app state (tracks, martigli, etc.)

  try {
    const success = await copyShareableURL(appState);

    const state = appState.snapshot();
    kernel.recordInteraction("session.share.url", {
      sessionId: state.activeSessionId ?? "unsaved",
      label: state.activeSessionLabel ?? "Unsaved State",
      success,
    });

    if (success) {
      showSessionShareIndicator("Link copied");
      setMessage("Shareable BSCLab link copied to clipboard.", "success");
    } else {
      setMessage("Clipboard unavailable. Please try again.", "error");
    }
  } catch (err) {
    console.error("Share link failed", err);
    setMessage("Unable to generate shareable link.", "error");
  }
};

const handleSessionDelete = async (session) => {
  const user = getCurrentUser();
  const sessionId = session?.id
    ?? session?.uid
    ?? session?.sessionId
    ?? session?.docId
    ?? session?.referenceId
    ?? session?.ref?.id
    ?? session?.data?.id
    ?? null;
  if (!sessionId) {
    setMessage("Cannot delete this session because it has no ID.", "error");
    return;
  }
  const ownerId = session?.createdBy ?? session?.ownerId ?? session?.userId ?? null;
  if (!user || (ownerId && ownerId !== user.uid)) {
    setMessage("You can only delete your own sessions.", "error");
    return;
  }
  const confirmed = typeof window !== "undefined"
    ? window.confirm(`Delete session "${session.label ?? sessionId}"?`)
    : true;
  if (!confirmed) return;
  try {
    setBusy(true);
    await deleteSession(sessionId);
    const state = appState.snapshot();
    appState.setSessions(state.sessions.filter((s) => s.id !== sessionId));
    if (state.activeSessionId === sessionId) {
      appState.setActiveSession(null, null);
    }
    setMessage("Session deleted.", "success");
  } catch (err) {
    console.error("Delete failed", err);
    setMessage("Failed to delete session.", "error");
  } finally {
    setBusy(false);
  }
};

const renderModalMeta = (record, kind) => {
  if (!ui.modalMeta) return;
  ui.modalMeta.innerHTML = "";
  const fields = [
    { label: "Folder", value: record.folderId ?? record.folder ?? "—" },
    { label: "Visibility", value: record.visibility ?? "—" },
    { label: "Tracks", value: getTrackCount(record) },
    { label: "Source", value: record.source ?? kind },
    { label: "Updated", value: record.updatedAt ?? record.createdAt ?? "—" },
  ];
  fields.forEach(({ label, value }) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = formatMetaValue(value);
    ui.modalMeta.appendChild(dt);
    ui.modalMeta.appendChild(dd);
  });
};

const summariseTrackParams = (params = {}) => {
  const pickOrder = [
    "frequency",
    "base",
    "beat",
    "gain",
    "pan",
    "waveform",
    "martigliFrequency",
  ];
  const parts = pickOrder
    .map((key) => {
      if (params[key] === undefined) return null;
      return `${key}: ${params[key]}`;
    })
    .filter(Boolean);
  return parts.slice(0, 3).join(" · ") || "No parameters provided";
};

const detectTrackModality = (track) => {
  const type = (track.type ?? track.kind ?? "").toString().toLowerCase();
  if (type === "audio" || type === "video" || type === "haptics") {
    return type;
  }
  if (track.isMartigli) {
    return "audio";
  }
  return "unknown";
};

// buildTrackCard moved to track-ui.js

// Sensory panel helpers moved to track-ui.js

const renderSensoryPanelsForRecord = (record, kind) => {
  if (kind !== "session") {
    resetSensoryPanels();
    return;
  }
  const tracks = getRecordTracks(record, { useLiveMartigli: true });
  const buckets = {
    audio: [],
    visual: [],
    haptic: [],
  };
  tracks.forEach((track, index) => {
    const modality = track.isMartigli ? "audio" : detectTrackModality(track);
    const item = { track, index, record, kind };
    if (modality === "video") {
      buckets.visual.push(item);
    } else if (modality === "haptics") {
      buckets.haptic.push(item);
    } else {
      buckets.audio.push(item);
    }
  });

  renderSensoryPanels(sensoryPanels, buckets, {
    onPreview: (track, context, button) => {
      const wasActive = audioEngine.active?.button === button;
      audioEngine.toggle(track, button);
      kernel.recordInteraction("track.preview.toggle", {
        recordId: context.record?.id ?? null,
        recordKind: context.kind ?? null,
        trackId: track.id ?? context.index ?? track.label ?? null,
        presetId: track.presetId ?? null,
        state: wasActive ? "stopped" : "started",
      });
    }
  });
};

const rerenderActiveTrackViews = () => {
  const activeSession = getActiveSessionRecord();
  if (activeSession) {
    renderSensoryPanelsForRecord(activeSession, "session");
  }
  if (
    ui.modal &&
    !ui.modal.classList.contains("hidden") &&
    activeModalRecord &&
    activeModalData &&
    (activeModalRecord.kind === "session" || activeModalRecord.kind === "lab")
  ) {
    renderModalTrackSections(activeModalData, activeModalRecord.kind);
  }
};

const getActiveSessionRecord = () => {
  if (activeModalRecord?.kind === "session" && activeModalData) {
    return activeModalData;
  }
  const state = appState.snapshot();
  if (state.activeSessionId) {
    return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
  }
  return null;
};

const createMartigliLabRecord = () => ({
  id: "martigli-lab",
  label: "Martigli Lab",
  description: "Design Martigli oscillations before binding them to a session.",
  visibility: "scratch",
  folder: "Lab",
  updatedAt: new Date().toISOString(),
  tracks: [],
  martigli: martigliState.snapshot(),
});

const ensureSessionModalVisible = () => {
  const record = getActiveSessionRecord();
  if (!record && ui.modal?.classList.contains("hidden")) {
    openDetailModal(createMartigliLabRecord(), "lab");
    return true;
  }
  if (record && ui.modal?.classList.contains("hidden")) {
    openDetailModal(record, "session");
  }
  return true;
};

// renderMartigliDashboardList function added
const renderMartigliDashboardList = (snapshot) => {
  renderMartigliDashboard(ui.martigliDashboardList, snapshot, {
    onStart: (id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.startSession();
    },
    onStop: (id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.stopSession();
    },
    onStartPeriodChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setStartPeriod(val);
    },
    onEndPeriodChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setEndPeriod(val.period ?? val);
    },
    onTransitionChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setTransitionDuration(val);
    },
    onWaveformChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setWaveform(val);
    },
    onInhaleRatioChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setInhaleRatio(val);
    },
    onAmplitudeChange: (val, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.setAmplitude(val);
    },
    onAddTrajectoryPoint: (id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.addTrajectoryPoint();
    },
    onTrajectoryUpdate: (index, updates, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.updateTrajectoryPoint(index, updates);
    },
    onTrajectoryRemove: (index, id) => {
      const osc = martigliState._oscillations.get(id);
      if (osc) osc.removeTrajectoryPoint(index);
    },
    onDelete: (id) => {
      handleMartigliDelete(id);
    }
  });
};

renderMartigliDashboardList(martigliState.snapshot());

const getOscillationLabel = (snapshot, id) => {
  if (!snapshot || !snapshot.oscillations) return null;
  const osc = snapshot.oscillations.find((o) => o.id === id);
  return osc ? osc.label : null;
};

const updateMartigliOscillationStatus = (snapshot = martigliState.snapshot()) => {
  const oscillations = snapshot.oscillations ?? [];
  const count = oscillations.length;
  const plural = count === 1 ? "" : "s";
  const activeLabel = getOscillationLabel(snapshot, snapshot.referenceId) ?? "Unnamed";
  if (ui.martigliOscillationStatus) {
    ui.martigliOscillationStatus.textContent = count
      ? `${count} oscillation${plural}. Active: ${activeLabel}`
      : "No oscillations loaded yet.";
  }
  if (ui.martigliDashboardSummary) {
    ui.martigliDashboardSummary.textContent = count
      ? `${count} oscillation${plural} • Active: ${activeLabel}`
      : "No Martigli oscillations yet.";
  }
};

const addMartigliOscillation = ({ requireSession = false, autoShowModal = false } = {}) => {
  const hasSession = Boolean(getActiveSessionRecord());
  if (requireSession && !hasSession) {
    setMessage(
      "Open a session from the Sessions card before adding Martigli oscillations.",
      "info",
    );
    return null;
  }
  const snapshot = martigliState.snapshot();
  const oscillations = snapshot.oscillations ?? [];
  const reference = martigliState.getReference();
  const baseConfig = reference?.toJSON?.() ?? null;
  const {
    id: _ignoredId,
    label: baseLabel,
    sessionStart: _ignoredStart,
    sessionEnd: _ignoredEnd,
    sessionPaused: _ignoredPaused,
    ...rest
  } = baseConfig ?? {};
  const label = baseLabel
    ? `${baseLabel} Copy`
    : `Oscillation ${oscillations.length + 1}`;
  const newOsc = reference ? martigliState.addOscillator({ ...rest, label }) : martigliState.addOscillator({ label });
  if (newOsc?.id) {
    martigliState.setReference(newOsc.id);
  }
  kernel.recordInteraction("martigli.oscillation.create", {
    oscillatorId: newOsc?.id ?? null,
    sourceId: reference?.id ?? null,
    label,
  });
  setMessage(
    hasSession
      ? "New Martigli oscillation added. Use the sliders to fine-tune it."
      : "New Martigli oscillation added. Open a session to edit its parameters.",
    hasSession ? "success" : "info",
  );
  if (autoShowModal && hasSession) {
    ensureSessionModalVisible();
  }
  return newOsc;
};

const labelMartigliOscillation = (osc, index) => {
  if (!osc) return `Oscillation ${index + 1}`;
  const trimmed = typeof osc.label === "string" ? osc.label.trim() : "";
  if (trimmed) {
    return trimmed;
  }
  if (osc.id) {
    return `Oscillation ${index + 1}`;
  }
  return `Oscillation ${index + 1}`;
};

const renderMartigliOscillationSelect = (snapshot = martigliState.snapshot()) => {
  if (!ui.martigliOscillationSelect) return;
  const select = ui.martigliOscillationSelect;
  select.innerHTML = "";
  const oscillations = snapshot.oscillations ?? [];
  if (!oscillations.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No oscillations loaded";
    select.appendChild(option);
    select.disabled = true;
    if (ui.martigliRename) ui.martigliRename.disabled = true;
    if (ui.martigliDelete) ui.martigliDelete.disabled = true;
    updateMartigliOscillationStatus(snapshot);
    return;
  }
  oscillations.forEach((osc, index) => {
    const option = document.createElement("option");
    option.value = osc.id ?? `osc-${index}`;
    option.textContent = labelMartigliOscillation(osc, index);
    select.appendChild(option);
  });
  select.disabled = false;
  if (ui.martigliRename) ui.martigliRename.disabled = false;
  if (ui.martigliDelete) ui.martigliDelete.disabled = false;
  const fallbackId = snapshot.referenceId ?? oscillations[0].id ?? select.options[0].value;
  if (fallbackId) {
    select.value = fallbackId;
  }
  if (!select.value && select.options.length) {
    select.selectedIndex = 0;
  }
  updateMartigliOscillationStatus(snapshot);
};

const getSelectedOscillationId = () => {
  if (ui.martigliOscillationSelect && ui.martigliOscillationSelect.value) {
    return ui.martigliOscillationSelect.value;
  }
  const snapshot = martigliState.snapshot();
  return snapshot.referenceId ?? snapshot.oscillations?.[0]?.id ?? null;
};

// renderTrackSection moved to track-ui.js

const renderModalTrackSections = (record, kind) => {
  audioEngine.stop();
  closeTrackVisualizerModal({ reason: "tracks-rerender" });

  const useLiveMartigli = kind === "session" || kind === "lab";
  const tracks = getRecordTracks(record, { useLiveMartigli });

  renderTrackLists(tracks, record, kind, {
    audio: { list: ui.audioTrackList, hint: ui.audioTrackHint },
    video: { list: ui.videoTrackList, hint: ui.videoTrackHint },
    haptics: { list: ui.hapticTrackList, hint: ui.hapticTrackHint }
  }, {
    onPreview: (track, context, button) => {
      const wasActive = audioEngine.active?.button === button;
      audioEngine.toggle(track, button);
      kernel.recordInteraction("track.preview.toggle", {
        recordId: context.record?.id ?? null,
        recordKind: context.kind ?? null,
        trackId: track.id ?? context.index ?? track.label ?? null,
        presetId: track.presetId ?? null,
        state: wasActive ? "stopped" : "started",
      });
    }
  });
};

const formatMartigliValue = (value) => {
  if (typeof value === "object" && value !== null) {
    const parts = [];
    if ("enabled" in value) {
      parts.push(value.enabled ? "enabled" : "disabled");
    }
    if ("depth" in value) {
      parts.push(`depth ${value.depth}`);
    }
    if ("frequency" in value) {
      parts.push(`${value.frequency}Hz`);
    }
    return parts.join(" · ") || JSON.stringify(value);
  }
  return formatMetaValue(value);
};

const renderMartigliParams = (record) => {
  if (!ui.modalMartigli) return;
  ui.modalMartigli.innerHTML = "";
  const params = extractMartigliParams(record);
  if (!params) {
    const empty = document.createElement("p");
    empty.className = "muted-text";
    empty.textContent = "No Martigli data stored for this document yet.";
    ui.modalMartigli.appendChild(empty);
    return;
  }
  Object.entries(params).forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "martigli-param";
    const label = document.createElement("span");
    label.textContent = key;
    const val = document.createElement("span");
    val.textContent = formatMartigliValue(value);
    row.appendChild(label);
    row.appendChild(val);
    ui.modalMartigli.appendChild(row);
  });
};

function closeDetailModal() {
  if (!ui.modal) return;
  closeTrackVisualizerModal({ reason: "parent-modal-close" });
  audioEngine.stop();
  trackBindingRegistry.forEach((entry) => {
    entry.elements = {};
  });
  trackVisualizerRegistry.clear();
  ui.modal.classList.add("hidden");
  ui.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (activeModalRecord) {
    kernel.recordInteraction("modal.close", { ...activeModalRecord });
  }
  activeModalRecord = null;
  activeModalData = null;
  activeVideoLayerId = null;
  if (videoCanvasController?.setLayer) {
    videoCanvasController.setLayer(null);
  }
}

function openDetailModal(record, kind, options = {}) {
  if (!ui.modal) return;
  const normalizedKind = kind === "session" ? "session" : kind === "lab" ? "lab" : "preset";
  const persistSessionContext = options.persistSessionContext ?? normalizedKind === "session";
  activeModalRecord = {
    id: record.id ?? null,
    kind: normalizedKind,
    label: record.label ?? record.name ?? record.id ?? null,
  };
  activeModalData = record;
  ui.modalTitle.textContent = record.label ?? record.name ?? record.id ?? "Untitled";
  if (ui.modalKind) {
    ui.modalKind.textContent =
      normalizedKind === "session"
        ? "Session"
        : normalizedKind === "lab"
          ? "Martigli Lab"
          : "Preset";
  }
  if (ui.sessionHint) {
    ui.sessionHint.textContent =
      normalizedKind === "session"
        ? "Applying this session will update Martigli, audio, video, and haptic controls."
        : normalizedKind === "lab"
          ? "Lab mode — tweak Martigli oscillations before binding them to a session."
          : "Viewing a preset — open a session to sync all modalities.";
  }
  renderModalMeta(record, normalizedKind);
  renderModalTrackSections(record, normalizedKind);
  renderSensoryPanelsForRecord(record, normalizedKind);
  renderMartigliParams(record);
  if (normalizedKind === "session" && persistSessionContext) {
    noteActiveSessionRecord(record);
  }
  renderStructurePreview(record);
  activeVideoLayerId = record.id ?? `layer-${Date.now()}`;
  if (typeof videoEngine?.registerLayer === "function") {
    videoEngine.registerLayer(activeVideoLayerId, {
      kind: normalizedKind,
      trackCount: getTrackCount(record),
    });
  }
  if (videoCanvasController?.setLayer) {
    videoCanvasController.setLayer(activeVideoLayerId);
    videoCanvasController.refresh?.();
  }
  kernel.recordInteraction("modal.open", {
    recordId: activeModalRecord.id,
    kind: activeModalRecord.kind,
    label: activeModalRecord.label,
  });
  ui.modal.classList.remove("hidden");
  ui.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

const updateMartigliPreview = (snapshot = martigliState.snapshot()) => {
  if (!snapshot) return;
  const reference = martigliState.getReference?.() ?? null;
  const delta = snapshot.endPeriod - snapshot.startPeriod;
  const direction = delta === 0 ? "steady" : delta > 0 ? "slows" : "quickens";
  const summary = `Breath ${direction} from ${snapshot.startPeriod}s to ${snapshot.endPeriod}s on a ${snapshot.waveform} wave.`;
  if (ui.martigliPreview) {
    ui.martigliPreview.textContent = summary;
  }
  if (ui.martigliDashboardPreview) {
    const activeLabel = appState.snapshot().activeSessionLabel;
    const prefix = activeLabel ? `${activeLabel}: ` : "";
    ui.martigliDashboardPreview.textContent = `${prefix}${summary}`;
  }
};

/**
 * Update authentication state when user signs in or out
 * Triggers reactive UI updates via appState.setUser()
 * If signed in, loads user's sessions from Firestore
 * If signed out, clears state and hides dashboard
 * @param {object|null} user - Firebase user object or null if signed out
 */
const updateAuthState = (user) => {
  // Update appState - subscription will handle UI updates
  if (!user) {
    appState.setUser(null);
    appState.setSessions([]);
    setMessage("");
    setDashboardVisibility(false);
    resetDashboardContext();
    closeDetailModal();
    return;
  }

  // Set user in appState - subscription will update UI
  appState.setUser({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
  });

  // Load user's sessions
  loadDashboardData();
};

const handleError = (error) => {
  console.error(error);
  setMessage(error.message || "Something went wrong", "error");
};

onAuthChange((user) => {
  updateAuthState(user);
  if (user) {
    // setMessage(`Welcome back, ${user.email ?? "friend"}!`, "success");
  } else if (!appState.snapshot().isBusy) {
    setMessage("Signed out", "info");
  }
});

if (ui.googleSignIn) {
  ui.googleSignIn.addEventListener("click", async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  });
}

const handleSignOut = async () => {
  setBusy(true);
  try {
    await authSignOut();
    setMessage("Signed out", "info");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
};

if (ui.googleSignOut) {
  ui.googleSignOut.addEventListener("click", handleSignOut);
}
if (ui.statusSignOut) {
  ui.statusSignOut.addEventListener("click", handleSignOut);
}

ui.emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value.trim();
  if (!email || !password) {
    setMessage("Provide email and password", "error");
    return;
  }

  setBusy(true);
  try {
    await signInWithEmail(email, password);
    ui.emailForm.reset();
    setMessage("Signed in via email", "success");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

ui.emailSignUp.addEventListener("click", async () => {
  const email = ui.emailInput.value.trim();
  const password = ui.passwordInput.value.trim();
  if (!email || !password) {
    setMessage("Provide email and password to create an account", "error");
    return;
  }

  setBusy(true);
  try {
    await signUpWithEmail(email, password);
    ui.emailForm.reset();
    setMessage("Account created. Check your inbox for verification if required.", "success");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

if (useAuthEmulator) {
  setMessage("Using local Auth emulator.", "info");
}
refreshControls();
updateAuthModeHint();

if (ui.toggleAuthMode) {
  ui.toggleAuthMode.addEventListener("click", () => {
    if (useAuthEmulator) {
      window.localStorage.setItem("bsc.useProdAuth", "1");
    } else {
      window.localStorage.removeItem("bsc.useProdAuth");
    }
    window.location.reload();
  });
}

structureStore.subscribe(() => renderStructurePreview(lastStructureRecord));

if (ui.sessionApply) {
  ui.sessionApply.addEventListener("click", handleSessionApply);
}

if (ui.sessionSave) {
  ui.sessionSave.addEventListener("click", handleSessionSave);
}

if (ui.sessionShareLink) {
  ui.sessionShareLink.addEventListener("click", handleSessionShareLink);
}

const downloadSnapshot = () => {
  try {
    const snapshot = kernel.toJsonLdSnapshot();
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `bsc-snapshot-${ts}.jsonld`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/ld+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage(`Snapshot downloaded (${filename}).`, "success");
    kernel.recordInteraction("snapshot.export.jsonld", { filename, size: blob.size });
  } catch (err) {
    console.warn("Snapshot export failed", err);
    setMessage("Snapshot export failed. See console for details.", "error");
  }
};

if (ui.snapshotDownload) {
  ui.snapshotDownload.addEventListener("click", downloadSnapshot);
}

if (ui.sessionLoadSelected) {
  ui.sessionLoadSelected.addEventListener("click", () => {
    const state = appState.snapshot();
    const sessions = state.sessions || [];
    const dropdown = ui.sessionDropdown;
    const folderFilter = ui.sessionFolderFilter?.value ?? "";
    let sessionId = dropdown?.value ?? "";

    // If no explicit selection, default to first visible session
    if (!sessionId && sessions.length) {
      const filtered = folderFilter
        ? sessions.filter((s) => (s.folderId || s.folder || "") === folderFilter)
        : sessions;
      if (filtered[0]) {
        sessionId = filtered[0].id;
        if (dropdown) {
          dropdown.value = sessionId;
          dropdown.dataset.selectedId = sessionId;
        }
      }
    }

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      setMessage("Selected session not found.", "error");
      return;
    }
    handleSessionLoadAction(session, "replace");
  });
}

if (ui.sessionFolderFilter) {
  ui.sessionFolderFilter.addEventListener("change", () => {
    const state = appState.snapshot();
    const selectedFolder = ui.sessionFolderFilter.value;
    const sessions = state.sessions || [];
    if (ui.sessionDropdown) {
      const filtered = selectedFolder
        ? sessions.filter((s) => (s.folderId || s.folder || "") === selectedFolder)
        : sessions;
      ui.sessionDropdown.innerHTML = '<option value="">Select a session…</option>';
      const grouped = filtered.reduce((acc, session) => {
        const key = session.folderId || session.folder || "";
        if (!acc[key]) acc[key] = [];
        acc[key].push(session);
        return acc;
      }, {});
      Object.entries(grouped).forEach(([folder, list]) => {
        if (folder) {
          const group = document.createElement("optgroup");
          group.label = folder;
          list.forEach((session) => {
            const opt = document.createElement("option");
            opt.value = session.id;
            const trackCount = Array.isArray(session.tracks) ? session.tracks.length : 0;
            const martigliCount = session.martigli?.oscillations?.length ?? 0;
            opt.textContent = `${session.label ?? session.id} (${trackCount} tracks, ${martigliCount} martigli)`;
            group.appendChild(opt);
          });
          ui.sessionDropdown.appendChild(group);
        } else {
          list.forEach((session) => {
            const opt = document.createElement("option");
            opt.value = session.id;
            const trackCount = Array.isArray(session.tracks) ? session.tracks.length : 0;
            const martigliCount = session.martigli?.oscillations?.length ?? 0;
            opt.textContent = `${session.label ?? session.id} (${trackCount} tracks, ${martigliCount} martigli)`;
            ui.sessionDropdown.appendChild(opt);
          });
        }
      });
      // Reset selection to first available after filtering
      if (ui.sessionDropdown.options.length > 1) {
        ui.sessionDropdown.selectedIndex = 1;
        ui.sessionDropdown.dataset.selectedId = ui.sessionDropdown.value;
      } else {
        ui.sessionDropdown.selectedIndex = 0;
        ui.sessionDropdown.dataset.selectedId = "";
      }
      const newlySelected = (state.sessions || []).find((s) => s.id === ui.sessionDropdown.value);
      updateSessionInfoPanel(newlySelected);
    }
  });
}

if (ui.sessionDropdown) {
  ui.sessionDropdown.addEventListener("change", (e) => {
    const sessionId = e.target.value;
    ui.sessionDropdown.dataset.selectedId = sessionId;
    const state = appState.snapshot();
    const session = (state.sessions || []).find((s) => s.id === sessionId);
    updateSessionInfoPanel(session);
  });
}

if (ui.martigliOscillationSelect) {
  ui.martigliOscillationSelect.addEventListener("change", (event) => {
    const nextId = event.target.value;
    if (!nextId) return;
    martigliState.setReference(nextId);
    kernel.recordInteraction("martigli.oscillation.select", { oscillatorId: nextId });
  });
}

const bindMartigliAddButton = (button, options = {}) => {
  if (!button) return;
  button.addEventListener("click", () => {
    addMartigliOscillation(options);
  });
};

bindMartigliAddButton(ui.martigliAdd);
bindMartigliAddButton(ui.martigliAddDashboard, { autoShowModal: true });

const handleMartigliRename = () => {
  if (!ensureSessionModalVisible()) return;
  const oscillatorId = getSelectedOscillationId();
  if (!oscillatorId) return;
  const snapshot = martigliState.snapshot();
  const currentLabel = getOscillationLabel(snapshot, oscillatorId) ?? "Martigli Oscillation";
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    setMessage("Rename is only available in the browser UI.", "error");
    return;
  }
  const nextLabel = window.prompt("Rename oscillation", currentLabel);
  if (nextLabel === null) return;
  const trimmed = nextLabel.trim();
  if (!trimmed) {
    setMessage("Oscillation name cannot be empty.", "error");
    return;
  }
  martigliState.renameOscillation(trimmed, oscillatorId);
  kernel.recordInteraction("martigli.oscillation.rename", {
    oscillatorId,
    label: trimmed,
  });
  setMessage(`Oscillation renamed to ${trimmed}.`, "success");
};

const handleMartigliDelete = (targetId) => {
  if (!ensureSessionModalVisible()) return;
  const oscillatorId = (typeof targetId === 'string' && targetId) ? targetId : getSelectedOscillationId();
  if (!oscillatorId) return;
  const snapshot = martigliState.snapshot();
  const label = getOscillationLabel(snapshot, oscillatorId) ?? "Martigli Oscillation";
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    setMessage("Delete is only available in the browser UI.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete "${label}"? This cannot be undone.`);
  if (!confirmed) return;
  martigliState.removeOscillator(oscillatorId);
  // const afterRemoval = martigliState.snapshot();
  // if (!afterRemoval.oscillations?.length) {
  //   martigliState.addOscillator();
  // }
  kernel.recordInteraction("martigli.oscillation.delete", {
    oscillatorId,
    label,
  });
  setMessage(`Removed oscillation "${label}".`, "info");
};

if (ui.martigliRename) {
  ui.martigliRename.addEventListener("click", handleMartigliRename);
}

if (ui.martigliDelete) {
  ui.martigliDelete.addEventListener("click", handleMartigliDelete);
}

if (ui.sessionNavigator) {
  ui.sessionNavigator.addEventListener("click", () => {
    const href = ui.sessionNavigator.dataset.href;
    if (!href) return;
    openNavigatorWindow(href);
  });
}

renderMartigliDashboardList(martigliState.snapshot());
ensureMartigliTelemetryLoop(martigliState, ui.martigliDashboardList);
martigliState.subscribe((snapshot) => {
  updateMartigliPreview(snapshot);
  renderMartigliOscillationSelect(snapshot);
  updateMartigliOscillationStatus(snapshot);
  renderMartigliDashboardList(snapshot);
  refreshTrackBindingOptions(snapshot);
  refreshAllTrackBindings();
  rerenderActiveTrackViews();
});
updateMartigliPreview(martigliState.snapshot());
updateMartigliOscillationStatus(martigliState.snapshot());

const updateMartigliTelemetryForAll = () => {
  ensureMartigliTelemetryLoop(martigliState, ui.martigliDashboardList);
};

if (ui.modalOverlay) {
  ui.modalOverlay.addEventListener("click", closeDetailModal);
}

if (ui.modalClose) {
  ui.modalClose.addEventListener("click", closeDetailModal);
}

if (ui.visualizerOverlay) {
  ui.visualizerOverlay.addEventListener("click", () => closeTrackVisualizerModal({ reason: "overlay" }));
}

if (ui.visualizerClose) {
  ui.visualizerClose.addEventListener("click", () => closeTrackVisualizerModal({ reason: "button" }));
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (ui.visualizerModal && !ui.visualizerModal.classList.contains("hidden")) {
    closeTrackVisualizerModal({ reason: "escape" });
    return;
  }
  if (ui.modal && !ui.modal.classList.contains("hidden")) {
    closeDetailModal();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Do NOT stop the audio engine on visibility change.
    // The engine now handles background throttling internally.
    // audioEngine.stop();
  } else {
    // Resume context if suspended
    if (audioEngine && audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
      audioEngine.ctx.resume();
    }
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => audioEngine.stop());
}

// ========================================
// URL State Restoration (runs on page load)
// ========================================

(async () => {
  try {
    const urlState = restoreFromURL();
    if (urlState) {
      // Restore state from URL
      appState.setState(urlState.snapshot());

      // Restore Martigli state if present
      const serialized = urlState.toSerializable();
      if (serialized.martigli) {
        appState.applySerializedMartigliState(serialized);
      }

      // Restore Tracks if present
      if (serialized.tracks) {
        appState.applySerializedTracks(serialized);
      }

      // Show URL indicator
      if (ui.sessionShareIndicator) {
        ui.sessionShareIndicator.textContent = "State loaded from URL";
        ui.sessionShareIndicator.classList.remove("hidden");
      }

      // Log activity
      kernel.recordInteraction("session.url.restored", {
        hasMartigli: !!serialized.martigli,
        activeSessionId: serialized.activeSessionId || null,
      });

      console.log("✅ State restored from URL");
    }
  } catch (err) {
    console.warn("URL state restoration failed:", err);
  }
})();

// Import from new modular architecture
import { auth, db, useAuthEmulator, isLocalhost } from "./auth/firebase-init.js";
// Keep Firebase primitives for telemetry (to be refactored into telemetry module later)
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
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
  renderSessionList,
  renderAuthState,
  toggleAuthPanels,
  setMessage,
} from "./auth/ui-renderer.js";
import { createModalController } from "./auth/modal-controller.js";
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
  dashboard: document.getElementById("dashboard"),
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
  sessionShareIndicator: document.getElementById("session-share-indicator"),
  sessionHint: document.getElementById("session-card-hint"),
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

const defaultDashboardCopy = {
  martigliPreview: ui.martigliDashboardPreview?.textContent ?? "",
  martigliDashboardSummary: ui.martigliDashboardSummary?.textContent ?? "",
  audioSensoryStatus: ui.audioSensoryStatus?.textContent ?? "",
  visualSensoryStatus: ui.visualSensoryStatus?.textContent ?? "",
  hapticSensoryStatus: ui.hapticSensoryStatus?.textContent ?? "",
  martigliOscillationStatus: ui.martigliOscillationStatus?.textContent ?? "",
};

const martigliDashboard = {
  list: ui.martigliDashboardList,
  widgets: new Map(),
  emptyNotice: null,
};

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

const trackExpansionState = new Map();
const trackVisualizerRegistry = new Map();

const logInteraction = (entry) => {
  try {
    const user = auth.currentUser;
    const payload = {
      kind: entry?.kind ?? "unknown",
      payload: entry?.payload ?? {},
      ts: entry?.ts ?? Date.now(),
      recordedAt: serverTimestamp(),
      user: user
        ? {
            uid: user.uid,
            email: user.email ?? null,
          }
        : null,
      client: {
        emulator: useAuthEmulator,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
    };
    addDoc(collection(db, "telemetry"), payload).catch((err) =>
      console.warn("Telemetry write failed", err),
    );
  } catch (err) {
    console.warn("Telemetry enqueue failed", err);
  }
};

const setMessage = (text, type = "") => {
  ui.messages.textContent = text;
  ui.messages.dataset.type = type;
};

let isBusy = false;
let isFetchingDashboard = false;
const dashboardState = {
  sessions: [],
  activeSessionId: null,
  activeSessionLabel: null,
};
const kernel = new BSCLabKernel({ onInteraction: logInteraction });
kernel.init();
appState.setKernel(kernel);
const martigliState = kernel.martigli;
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

const trackBindingRegistry = new Map();
const MARTIGLI_BINDING_LIMITS = {
  baseMin: 40,
  baseMax: 1200,
  depthMin: 0,
  depthMax: 150,
};

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
  if (recordId === dashboardState.activeSessionId) return true;
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

const getSessionTrackBucket = (record) => record?.id ?? record?.uid ?? "lab";

const getTrackExpansionBucket = (sessionId) => {
  if (!trackExpansionState.has(sessionId)) {
    trackExpansionState.set(sessionId, Object.create(null));
  }
  return trackExpansionState.get(sessionId);
};

const getTrackExpansionState = (sessionId, trackId) => {
  const bucket = getTrackExpansionBucket(sessionId);
  if (typeof bucket[trackId] === "boolean") {
    return bucket[trackId];
  }
  bucket[trackId] = true;
  return true;
};

const setTrackExpansionState = (sessionId, trackId, expanded) => {
  const bucket = getTrackExpansionBucket(sessionId);
  bucket[trackId] = Boolean(expanded);
};

const ensureTrackBindingState = (track) => {
  if (!track?.id) return null;
  let entry = trackBindingRegistry.get(track.id);
  if (!entry) {
    const params = track.params ?? {};
    const baseCandidate = Number(params.frequency ?? params.base ?? 432);
    const depthCandidate = Number(params.martigliDepth ?? params.depth ?? 8);
    const snapshot = martigliState.snapshot?.() ?? { oscillations: [] };
    const defaultOscillator =
      track.bindings?.find((binding) => binding.type === "martigli")?.oscillatorId ??
      snapshot.referenceId ??
      snapshot.oscillations?.[0]?.id ??
      null;
    entry = {
      trackId: track.id,
      trackLabel: track.label ?? track.id,
      state: {
        base: Number.isFinite(baseCandidate) ? baseCandidate : 432,
        depth: Number.isFinite(depthCandidate) ? depthCandidate : 8,
        oscillatorId: defaultOscillator,
      },
      elements: {},
    };
    trackBindingRegistry.set(track.id, entry);
  } else {
    entry.trackLabel = track.label ?? entry.trackLabel;
    entry.state.base = Number.isFinite(entry.state.base) ? entry.state.base : 432;
    entry.state.depth = Number.isFinite(entry.state.depth) ? entry.state.depth : 8;
  }
  return entry;
};

const hasActiveBindingTargets = () => {
  for (const entry of trackBindingRegistry.values()) {
    if (entry.elements?.preview) {
      return true;
    }
  }
  return false;
};

const updateTrackBindingPreview = (trackId) => {
  const entry = trackBindingRegistry.get(trackId);
  if (!entry || !entry.elements?.preview) return;
  const { base, depth, oscillatorId } = entry.state;
  const baseValue = Number.isFinite(base) ? base : 0;
  const depthValue = Number.isFinite(depth) ? depth : 0;
  if (!oscillatorId) {
    entry.elements.preview.textContent = `Output ${baseValue.toFixed(1)} Hz · no Martigli binding`;
    return;
  }
  const metrics = martigliState.getRuntimeMetrics?.(oscillatorId);
  if (!metrics) {
    entry.elements.preview.textContent = `Output ${baseValue.toFixed(1)} Hz · awaiting Martigli runtime`;
    redrawTrackVisualizer(trackId);
    return;
  }
  const applied = baseValue + depthValue * (metrics.value ?? 0);
  entry.elements.preview.textContent = `Output ${applied.toFixed(1)} Hz · value ${(metrics.value ?? 0).toFixed(2)} · base ${baseValue.toFixed(1)} ± ${depthValue.toFixed(1)}`;
  redrawTrackVisualizer(trackId);
};

const refreshTrackBindingOptions = (snapshot = martigliState.snapshot?.()) => {
  const oscillations = snapshot?.oscillations ?? [];
  trackBindingRegistry.forEach((entry) => {
    const select = entry.elements?.bindingSelect;
    if (!select) return;
    const previousValue = entry.state.oscillatorId ?? "";
    select.innerHTML = "";
    if (!oscillations.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Add a Martigli oscillation";
      select.appendChild(option);
      select.disabled = true;
      entry.state.oscillatorId = null;
      if (entry.elements.preview) {
        entry.elements.preview.textContent = "Awaiting Martigli oscillator to drive modulation.";
      }
      return;
    }
    oscillations.forEach((osc, optionIndex) => {
      const option = document.createElement("option");
      option.value = osc.id ?? `osc-${optionIndex}`;
      option.textContent = osc.label ?? `Oscillation ${optionIndex + 1}`;
      select.appendChild(option);
    });
    select.disabled = false;
    const fallback = snapshot.referenceId ?? oscillations[0]?.id ?? "";
    const nextValue = oscillations.some((osc) => osc.id === previousValue) ? previousValue : fallback;
    entry.state.oscillatorId = nextValue || null;
    select.value = nextValue ?? "";
    updateTrackBindingPreview(entry.trackId);
  });
};

const refreshAllTrackBindings = () => {
  trackBindingRegistry.forEach((entry) => updateTrackBindingPreview(entry.trackId));
  refreshTrackVisualizers();
};

const createTrackBindingControls = (track) => {
  if (!track || track.isMartigli) return null;
  const modalityLabel = (track.modality ?? track.type ?? "").toLowerCase();
  if (/(video|visual|haptic|tactile)/.test(modalityLabel)) {
    return null;
  }
  const entry = ensureTrackBindingState(track);
  if (!entry) return null;
  const container = document.createElement("div");
  container.className = "track-binding";

  const label = document.createElement("p");
  label.className = "muted-text small";
  label.textContent = "Martigli modulation";
  container.appendChild(label);

  const grid = document.createElement("div");
  grid.className = "track-binding-grid";

  const createRangeField = (fieldLabel, valueFormatter, attrs, onChange) => {
    const field = document.createElement("label");
    field.className = "track-binding-field";
    const title = document.createElement("span");
    title.textContent = fieldLabel;
    const value = document.createElement("span");
    value.className = "track-binding-value";
    value.textContent = valueFormatter(entry.state[attrs.key]);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(attrs.min);
    input.max = String(attrs.max);
    input.step = String(attrs.step ?? 1);
    input.value = String(entry.state[attrs.key]);
    input.addEventListener("input", (event) => {
      const nextValue = Number(event.target.value);
      if (!Number.isFinite(nextValue)) return;
      entry.state[attrs.key] = nextValue;
      value.textContent = valueFormatter(nextValue);
      onChange(nextValue);
    });
    field.appendChild(title);
    field.appendChild(value);
    field.appendChild(input);
    return { field, value, input };
  };

  const baseRange = createRangeField(
    "Base (Hz)",
    (val) => `${Number(val ?? 0).toFixed(0)} Hz`,
    { key: "base", min: MARTIGLI_BINDING_LIMITS.baseMin, max: MARTIGLI_BINDING_LIMITS.baseMax, step: 1 },
    () => updateTrackBindingPreview(track.id),
  );
  const depthRange = createRangeField(
    "Depth",
    (val) => `${Number(val ?? 0).toFixed(1)} Hz`,
    { key: "depth", min: MARTIGLI_BINDING_LIMITS.depthMin, max: MARTIGLI_BINDING_LIMITS.depthMax, step: 0.5 },
    () => updateTrackBindingPreview(track.id),
  );

  grid.appendChild(baseRange.field);
  grid.appendChild(depthRange.field);

  const bindingField = document.createElement("label");
  bindingField.className = "track-binding-field";
  const bindingTitle = document.createElement("span");
  bindingTitle.textContent = "Binding";
  const select = document.createElement("select");
  select.addEventListener("change", (event) => {
    entry.state.oscillatorId = event.target.value || null;
    updateTrackBindingPreview(track.id);
  });
  bindingField.appendChild(bindingTitle);
  bindingField.appendChild(select);
  grid.appendChild(bindingField);

  const preview = document.createElement("p");
  preview.className = "track-binding-preview";
  preview.textContent = "Awaiting Martigli oscillator to drive modulation.";

  container.appendChild(grid);
  container.appendChild(preview);

  entry.elements = {
    preview,
    bindingSelect: select,
    baseValue: baseRange.value,
    depthValue: depthRange.value,
  };

  refreshTrackBindingOptions();
  updateTrackBindingPreview(track.id);
  return container;
};

const serializeTrackState = (track) => {
  const entry = trackBindingRegistry.get(track.id);
  const params = { ...(track.params ?? {}) };
  let bindings = [...(track.bindings ?? [])];
  if (entry?.state?.oscillatorId) {
    bindings = bindings.filter((binding) => binding.type !== "martigli");
    bindings.unshift({
      type: "martigli",
      oscillatorId: entry.state.oscillatorId,
      target: "frequency",
      depth: entry.state.depth,
      base: entry.state.base,
    });
    params.frequency = entry.state.base;
    params.martigliDepth = entry.state.depth;
  }
  return {
    id: track.id,
    label: track.label,
    type: track.type,
    modality: track.modality,
    params,
    bindings,
    isMartigli: Boolean(track.isMartigli),
    martigli: track.martigli ?? null,
  };
};

const TRACK_VISUALIZER_DEFAULT = {
  width: 320,
  height: 120,
};

let activeVisualizerTrack = null;
let activeVisualizerContext = null;

const registerTrackVisualizer = (track, canvas, options = {}) => {
  if (!track || !canvas) return;
  if (track.id) {
    trackVisualizerRegistry.set(track.id, { track, canvas, options });
  }
  drawTrackVisualizer(canvas, track, options);
};

const unregisterTrackVisualizer = (trackId) => {
  if (!trackId) return;
  trackVisualizerRegistry.delete(trackId);
};

const redrawTrackVisualizer = (trackId) => {
  if (!trackId) return;
  const entry = trackVisualizerRegistry.get(trackId);
  if (!entry) return;
  drawTrackVisualizer(entry.canvas, entry.track, entry.options);
};

const refreshTrackVisualizers = () => {
  trackVisualizerRegistry.forEach((_, trackId) => redrawTrackVisualizer(trackId));
  if (activeVisualizerTrack && ui.visualizerModal && !ui.visualizerModal.classList.contains("hidden")) {
    drawTrackVisualizer(ui.visualizerCanvas, activeVisualizerTrack, {
      width: ui.visualizerCanvas?.clientWidth || ui.visualizerCanvas?.width || 760,
      height: ui.visualizerCanvas?.clientHeight || ui.visualizerCanvas?.height || 280,
    });
    if (ui.visualizerSummary) {
      ui.visualizerSummary.textContent = describeTrackVisualizerSummary(activeVisualizerTrack, activeVisualizerContext);
    }
  }
};

const prepareVisualizerCanvas = (canvas, fallbackWidth, fallbackHeight) => {
  if (!canvas) return null;
  const width = fallbackWidth || canvas.clientWidth || TRACK_VISUALIZER_DEFAULT.width;
  const height = fallbackHeight || canvas.clientHeight || TRACK_VISUALIZER_DEFAULT.height;
  const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (ctx?.setTransform) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  return { ctx, width, height };
};

const drawTrackVisualizer = (canvas, track, options = {}) => {
  if (!canvas || !track) return;
  const dims = prepareVisualizerCanvas(canvas, options.width, options.height);
  if (!dims?.ctx) return;
  const ctx = dims.ctx;
  const width = dims.width;
  const height = dims.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = options.background ?? "rgba(2, 6, 23, 0.92)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  const gridSteps = 4;
  for (let i = 1; i < gridSteps; i += 1) {
    const x = (width / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(x, 6);
    ctx.lineTo(x, height - 6);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(6, height / 2);
  ctx.lineTo(width - 6, height / 2);
  ctx.stroke();

  const previewTrack = serializeTrackState(track);
  const params = previewTrack.params ?? {};
  const base = Number(params.frequency ?? params.base ?? params.rate ?? params.beat ?? 4);
  const depth = Number(params.martigliDepth ?? params.depth ?? 0.5);
  const gain = Number(params.gain ?? 1);
  const cycles = Math.max(2, Math.min(8, base / 8));
  const amplitude = Math.max(0.15, Math.min(0.45, gain * 0.3 + 0.2));
  const stroke = track.isMartigli
    ? "rgba(56, 189, 248, 0.95)"
    : /video|visual/.test((track.modality ?? track.type ?? "").toLowerCase())
      ? "rgba(244, 114, 182, 0.95)"
      : "rgba(248, 250, 252, 0.95)";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= width; x += 1) {
    const progress = (x / width) * Math.PI * 2 * cycles;
    const modulation = Math.sin(progress * 0.5) * (depth || 0.5) * 0.25;
    const y = height / 2 + Math.sin(progress) * (height * amplitude) - modulation * 18;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
};

const describeTrackVisualizerSummary = (track, context = {}) => {
  if (!track) return "";
  const previewTrack = serializeTrackState(track);
  const params = previewTrack.params ?? {};
  if (track.isMartigli) {
    return describeMartigliLiveSummary(track.martigli ?? params);
  }
  const base = Number(params.frequency ?? params.base ?? params.rate ?? 0);
  const depth = Number(params.martigliDepth ?? params.depth ?? 0);
  const gain = Number(params.gain ?? 0);
  const chips = [];
  if (Number.isFinite(base) && base > 0) {
    chips.push(`${base.toFixed(1)} Hz base`);
  }
  if (Number.isFinite(depth) && depth !== 0) {
    chips.push(`±${depth.toFixed(1)} depth`);
  }
  if (Number.isFinite(gain) && gain > 0) {
    chips.push(`${gain.toFixed(1)} gain`);
  }
  if (context.record?.label) {
    chips.push(`Session · ${context.record.label}`);
  }
  return chips.join(" • ") || summariseTrackParams(params);
};

const formatMartigliDuration = (value) => {
  if (!Number.isFinite(value)) return "—";
  if (value >= 120) {
    return `${(value / 60).toFixed(1)}m`;
  }
  return `${value.toFixed(1)}s`;
};

const getMartigliVisualizerMetrics = (track) => {
  const params = track.params ?? {};
  const oscillatorId = track.martigli?.oscillatorId ?? track.id ?? null;
  const runtime = oscillatorId ? martigliState.getRuntimeMetrics?.(oscillatorId) : null;
  return {
    start: runtime?.startPeriodSec ?? runtime?.startPeriod ?? params.startPeriodSec ?? params.startPeriod ?? null,
    end: runtime?.endPeriodSec ?? runtime?.endPeriod ?? params.endPeriodSec ?? params.endPeriod ?? null,
    waveform: runtime?.waveform ?? params.waveform ?? "sine",
    amplitude: Number.isFinite(runtime?.amplitude) ? runtime.amplitude : Number(params.amplitude ?? 1),
  };
};

const createMartigliMiniStats = (track) => {
  const metrics = getMartigliVisualizerMetrics(track);
  const entries = [
    { label: "Start", value: Number.isFinite(metrics.start) ? formatMartigliDuration(metrics.start) : "—" },
    { label: "End", value: Number.isFinite(metrics.end) ? formatMartigliDuration(metrics.end) : "—" },
    { label: "Wave", value: (metrics.waveform ?? "").toString().slice(0, 8).toUpperCase() || "—" },
    {
      label: "Amp",
      value: Number.isFinite(metrics.amplitude) ? `${metrics.amplitude.toFixed(2)}×` : null,
    },
  ].filter((entry) => entry.value);
  if (!entries.length) return null;
  const stats = document.createElement("div");
  stats.className = "martigli-mini-stats";
  entries.forEach((entry) => {
    const stat = document.createElement("div");
    stat.className = "martigli-mini-stat";
    const label = document.createElement("span");
    label.className = "martigli-mini-stat-label";
    label.textContent = entry.label;
    const value = document.createElement("span");
    value.className = "martigli-mini-stat-value";
    value.textContent = entry.value;
    stat.appendChild(label);
    stat.appendChild(value);
    stats.appendChild(stat);
  });
  return stats;
};

const openTrackVisualizerModal = (track, context = {}) => {
  if (!ui.visualizerModal || !ui.visualizerCanvas) return;
  activeVisualizerTrack = track;
  activeVisualizerContext = context;
  if (ui.visualizerTitle) {
    ui.visualizerTitle.textContent = track.label ?? "Track preview";
  }
  if (ui.visualizerSummary) {
    ui.visualizerSummary.textContent = describeTrackVisualizerSummary(track, context);
  }
  ui.visualizerModal.classList.remove("hidden");
  ui.visualizerModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("visualizer-open");
  drawTrackVisualizer(ui.visualizerCanvas, track, {
    width: ui.visualizerCanvas.clientWidth || ui.visualizerCanvas.width || 760,
    height: ui.visualizerCanvas.clientHeight || ui.visualizerCanvas.height || 280,
  });
  kernel.recordInteraction("track.visualizer.open", {
    trackId: track.id ?? null,
    trackLabel: track.label ?? null,
    recordId: context.record?.id ?? null,
    recordKind: context.kind ?? null,
  });
};

const closeTrackVisualizerModal = (options = {}) => {
  if (!ui.visualizerModal || ui.visualizerModal.classList.contains("hidden")) {
    activeVisualizerTrack = null;
    activeVisualizerContext = null;
    return;
  }
  ui.visualizerModal.classList.add("hidden");
  ui.visualizerModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("visualizer-open");
  if (ui.visualizerSummary) {
    ui.visualizerSummary.textContent = "";
  }
  kernel.recordInteraction("track.visualizer.close", {
    trackId: activeVisualizerTrack?.id ?? null,
    reason: options.reason ?? "user",
  });
  activeVisualizerTrack = null;
  activeVisualizerContext = null;
};

function describeMartigliLiveSummary(reference) {
  if (!reference) {
    return "Awaiting Martigli data.";
  }
  const config = reference.config ?? reference ?? {};
  const label = reference.label ?? config.label ?? "Active oscillation";
  const transition = Number(config.transitionSec ?? 0);
  const transitionText = transition > 0 ? `${Math.round(transition)}s window` : "Instant window";
  const inhaleRatio = Number.isFinite(config.inhaleRatio) ? config.inhaleRatio : 0.5;
  const inhaleText = `Inhale ${Math.round(inhaleRatio * 100)}%`;
  const amplitude = Number.isFinite(config.amplitude) ? config.amplitude : 1;
  const amplitudeText = `${amplitude.toFixed(2)}× amp`;
  return `${label} • ${[transitionText, inhaleText, amplitudeText].join(" • ")}`;
}

const MARTIGLI_TELEMETRY_INTERVAL_MS = 140;
let martigliTelemetryFrame = null;
let martigliTelemetryLastTick = 0;

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

const createTrackPreviewButton = (track, context = {}) => {
  if (!audioEngine.isSupported || !audioEngine.supportsTrack(track)) {
    return null;
  }
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost small";
  button.textContent = "Preview";
  button.addEventListener("click", () => {
    const wasActive = audioEngine.active?.button === button;
    audioEngine.toggle(track, button);
    kernel.recordInteraction("track.preview.toggle", {
      recordId: context.record?.id ?? null,
      recordKind: context.kind ?? null,
      trackId: track.id ?? context.index ?? track.label ?? null,
      presetId: track.presetId ?? null,
      state: wasActive ? "stopped" : "started",
    });
  });
  return button;
};

const createTrackVisualizer = (track, context = {}) => {
  if (!track) return null;
  const container = document.createElement("div");
  container.className = "track-visualizer";
  const label = document.createElement("p");
  label.className = "muted-text small";
  label.textContent = track.isMartigli ? "Breath envelope preview" : "Preview envelope";
  container.appendChild(label);

  if (track.isMartigli) {
    container.classList.add("track-visualizer--martigli");
    const stats = createMartigliMiniStats(track);
    if (stats) {
      container.appendChild(stats);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = TRACK_VISUALIZER_DEFAULT.width;
  canvas.height = TRACK_VISUALIZER_DEFAULT.height;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${track.label ?? "Track"} preview visualization`);
  container.appendChild(canvas);
  const expandButton = document.createElement("button");
  expandButton.type = "button";
  expandButton.className = "ghost tiny track-visualizer-expand";
  expandButton.textContent = "Fullscreen";
  expandButton.addEventListener("click", () => openTrackVisualizerModal(track, context));
  container.appendChild(expandButton);
  const canvasSize = track.isMartigli
    ? { width: 260, height: 90 }
    : { width: TRACK_VISUALIZER_DEFAULT.width, height: TRACK_VISUALIZER_DEFAULT.height };
  registerTrackVisualizer(track, canvas, canvasSize);
  return container;
};

const updateAuthVisibility = (user) => {
  if (ui.authForms) {
    ui.authForms.classList.toggle("hidden", Boolean(user));
  }
  if (ui.authChip) {
    ui.authChip.classList.toggle("hidden", !user);
  }
};

const refreshControls = () => {
  const user = auth.currentUser;
  const emailSubmit = ui.emailForm.querySelector("button[type='submit']");
  updateAuthVisibility(user);
  if (ui.googleSignIn) {
    const emulatorBlocksFederated = useAuthEmulator;
    ui.googleSignIn.disabled = isBusy || !!user || emulatorBlocksFederated;
    ui.googleSignIn.title = emulatorBlocksFederated
      ? "Google sign-in is disabled when the Auth emulator is active."
      : "";
  }
  if (ui.statusSignOut) {
    ui.statusSignOut.disabled = isBusy || !user;
    ui.statusSignOut.classList.toggle("hidden", !user);
  }
  if (emailSubmit) {
    emailSubmit.disabled = isBusy;
  }
  if (ui.emailSignUp) {
    ui.emailSignUp.disabled = isBusy;
  }
};

const setBusy = (nextBusy) => {
  isBusy = nextBusy;
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

const clearList = (list) => {
  if (!list) return;
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
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
  dashboardState.activeSessionId = null;
  dashboardState.activeSessionLabel = null;
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

updateSessionNavigatorLink();

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

const loadDashboardData = async () => {
  if (isFetchingDashboard) return;
  if (!ui.dashboard) return;

  const user = getCurrentUser();
  if (!user) {
    console.warn("No user for dashboard load");
    return;
  }

  isFetchingDashboard = true;
  setDashboardVisibility(true);
  ui.sessionStatus.textContent = "Loading sessions…";
  try {
    const sessions = await fetchSessions(user.uid);
    dashboardState.sessions = sessions;
    renderDashboardList(ui.sessionList, ui.sessionStatus, sessions, "No sessions found.", "session");
  } catch (err) {
    console.error("Dashboard load failed", err);
    ui.sessionStatus.textContent = "Unable to load sessions.";
  } finally {
    isFetchingDashboard = false;
  }
};

const renderStructurePreview = (record) => {
  if (record) {
    lastStructureRecord = record;
  }
  if (!ui.structureSection || !ui.structureSummary || !ui.structureList) {
    return;
  }
  const { datasets, error, loading } = structureStore.snapshot();
  if (loading && !datasets.length) {
    ui.structureSummary.textContent = "Loading structure preview…";
    ui.structureList.innerHTML = "";
    return;
  }
  if (error) {
    ui.structureSummary.textContent = "Unable to load structure data.";
    ui.structureList.innerHTML = "";
    return;
  }
  if (!datasets.length) {
    ui.structureSummary.textContent = "No structure payload available.";
    ui.structureList.innerHTML = "";
    return;
  }
  ui.structureSummary.textContent = `${datasets.length} structure set${datasets.length > 1 ? "s" : ""} ready.`;
  ui.structureList.innerHTML = "";
  datasets.forEach((dataset) => {
    const container = document.createElement("li");
    container.className = "structure-card";
    const heading = document.createElement("h5");
    heading.textContent = dataset.label ?? dataset.id;
    const meta = document.createElement("div");
    meta.className = "structure-meta";
    const method = document.createElement("span");
    method.textContent = dataset.source?.method ?? "Unknown method";
    const sequenceCount = document.createElement("span");
    const totalSequences = dataset.sequences?.length ?? 0;
    sequenceCount.textContent = `${totalSequences} sequence${totalSequences === 1 ? "" : "s"}`;
    meta.appendChild(method);
    meta.appendChild(sequenceCount);
    container.appendChild(heading);
    container.appendChild(meta);

    const ontologyLinks = rdfLinker.get(dataset.id);
    if (ontologyLinks.length) {
      const ontHint = document.createElement("p");
      ontHint.className = "muted-text";
      const firstLink = ontologyLinks[0];
      ontHint.textContent = `Ontology link: ${firstLink.label ?? firstLink.uri}`;
      container.appendChild(ontHint);
    }

    (dataset.sequences ?? []).slice(0, 2).forEach((sequence) => {
      const seqBlock = document.createElement("div");
      seqBlock.className = "structure-sequence";
      const seqTitle = document.createElement("p");
      seqTitle.className = "structure-sequence-title";
      seqTitle.textContent = sequence.label ?? sequence.id;
      const rows = document.createElement("p");
      rows.className = "structure-rows";
      const previewRows = (sequence.rows ?? []).slice(0, 2).map((row) => row.join(" "));
      rows.textContent = previewRows.length ? previewRows.join(" / ") : "No rows available.";
      seqBlock.appendChild(seqTitle);
      seqBlock.appendChild(rows);
      container.appendChild(seqBlock);
    });

    if ((dataset.sequences?.length ?? 0) > 2) {
      const more = document.createElement("p");
      more.className = "muted-text";
      const remaining = dataset.sequences.length - 2;
      more.textContent = `+${remaining} more sequence${remaining === 1 ? "" : "s"}`;
      container.appendChild(more);
    }

    ui.structureList.appendChild(container);
  });
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
  dashboardState.activeSessionId = record?.id ?? null;
  dashboardState.activeSessionLabel = record?.label ?? record?.name ?? record?.id ?? null;
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

const handleSessionSave = async () => {
  const contextRecord = activeModalData ?? null;
  if (!contextRecord) {
    setMessage("Open a session first.", "info");
    return;
  }
  const draft = collectSessionDraft(contextRecord);
  if (!draft.martigli) {
    setMessage("Adjust the Martigli widget before saving a session.", "error");
    return;
  }
  const serialized = JSON.stringify(draft, null, 2);
  const copied = await copyToClipboard(serialized);
  kernel.recordInteraction("session.save.snapshot", {
    recordId: draft.id,
    label: draft.label,
    copied,
  });
  if (copied) {
    setMessage("Current Martigli + track state copied to clipboard for session storage.", "success");
  } else {
    console.log("Session draft", draft);
    setMessage("Clipboard unavailable; session draft logged to console.", "info");
  }
};

const syncAppStateSnapshot = () => {
  const currentUser = auth.currentUser
    ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email ?? null,
      }
    : null;

  appState.setState({
    currentUser,
    sessions: [...dashboardState.sessions],
    activeSessionId: dashboardState.activeSessionId,
    activeSessionLabel: dashboardState.activeSessionLabel,
    isBusy,
    isFetchingDashboard,
  });

  appState.trackBindingRegistry = new Map(trackBindingRegistry);
  appState.trackExpansionState = new Map(trackExpansionState);
  appState.lastStructureRecord = lastStructureRecord;
  appState.activeVideoLayerId = activeVideoLayerId;

  return appState;
};

const showSessionShareIndicator = (text = "State in URL") => {
  if (!ui.sessionShareIndicator) return;
  ui.sessionShareIndicator.textContent = text;
  ui.sessionShareIndicator.classList.remove("hidden");
};

const handleSessionShareLink = async () => {
  if (!dashboardState.activeSessionId) {
    setMessage("Select or open a session before creating a share link.", "info");
    return;
  }

  try {
    syncAppStateSnapshot();
    const success = await copyShareableURL(appState);
    kernel.recordInteraction("session.share.url", {
      sessionId: dashboardState.activeSessionId,
      label: dashboardState.activeSessionLabel,
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

const detectTrackModality = (track = {}) => {
  const tags = Array.isArray(track.tags) ? track.tags.join(" ") : "";
  const descriptor = [track.modality, track.kind, track.channel, track.category, track.type, tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(video|visual|light|led|display)/.test(descriptor)) return "video";
  if (/(haptic|tactile|vibration|touch)/.test(descriptor)) return "haptics";
  return "audio";
};

const buildTrackCard = (track, record, kind, index) => {
  const card = document.createElement("li");
  card.className = "track-card";
  if (track.isMartigli) {
    card.classList.add("track-card--martigli");
  }

  const sessionId = getSessionTrackBucket(record);
  const trackId = track.id ?? `${sessionId}-track-${index}`;
  const expanded = getTrackExpansionState(sessionId, trackId);
  const normalizedId = trackId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const bodyId = `track-body-${normalizedId}`;

  const head = document.createElement("div");
  head.className = "track-card-head";
  const headline = document.createElement("div");
  headline.className = "track-card-headline";
  const title = document.createElement("h5");
  title.textContent = track.label ?? `Track ${index + 1}`;
  headline.appendChild(title);
  const subtitle = document.createElement("p");
  subtitle.className = "muted-text small";
  subtitle.textContent = track.isMartigli ? "Martigli modulator" : formatPanelLabel(track.modality ?? track.type);
  headline.appendChild(subtitle);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "track-card-toggle";
  toggle.dataset.state = expanded ? "expanded" : "collapsed";
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.setAttribute("aria-controls", bodyId);
  toggle.setAttribute("aria-label", expanded ? "Collapse track" : "Expand track");
  toggle.textContent = ">";
  head.appendChild(headline);
  head.appendChild(toggle);
  card.appendChild(head);

  const body = document.createElement("div");
  body.className = "track-card-body";
  body.id = bodyId;
  body.hidden = !expanded;
  body.setAttribute("aria-hidden", String(!expanded));

  const meta = document.createElement("div");
  meta.className = "track-meta";
  const typeChip = document.createElement("span");
  typeChip.textContent = track.isMartigli
    ? "Martigli modulator"
    : track.presetId
      ? `Preset · ${track.presetId}`
      : "Custom";
  meta.appendChild(typeChip);
  if (!track.isMartigli) {
    const gainValue = track.gain ?? track.params?.gain;
    if (gainValue !== undefined) {
      const gainChip = document.createElement("span");
      gainChip.textContent = `Gain ${gainValue}`;
      meta.appendChild(gainChip);
    }
  }
  body.appendChild(meta);

  const summary = document.createElement("p");
  summary.className = "muted-text";
  if (track.isMartigli) {
    const metrics = martigliState.getRuntimeMetrics?.(track.martigli?.oscillatorId ?? track.id);
    summary.textContent = metrics
      ? `Wave ${metrics.waveform} • ${metrics.period.toFixed(1)}s period · value ${metrics.value.toFixed(2)}`
      : describeMartigliLiveSummary(track.martigli ?? track.params ?? {});
  } else {
    summary.textContent = summariseTrackParams(track.params ?? {});
  }
  body.appendChild(summary);

  const actions = document.createElement("div");
  actions.className = "track-actions";
  if (track.isMartigli) {
    const hint = document.createElement("span");
    hint.className = "muted-text small";
    hint.textContent = "Feeds Martigli modulation bindings.";
    actions.appendChild(hint);
  } else {
    const previewButton = createTrackPreviewButton(track, { record, kind, index });
    if (previewButton) {
      actions.appendChild(previewButton);
    } else {
      const hint = document.createElement("span");
      hint.className = "muted-text";
      hint.textContent = "Preview unavailable for this track.";
      actions.appendChild(hint);
    }
  }
  body.appendChild(actions);

  const visualizer = createTrackVisualizer(track, { record, kind, index });
  if (visualizer) {
    body.appendChild(visualizer);
  }

  if (!track.isMartigli) {
    const bindingControls = createTrackBindingControls(track);
    if (bindingControls) {
      body.appendChild(bindingControls);
    }
  }

  if (!expanded) {
    card.classList.add("is-collapsed");
  }

  toggle.addEventListener("click", () => {
    const nextExpanded = card.classList.contains("is-collapsed");
    setTrackExpansionState(sessionId, trackId, nextExpanded);
    card.classList.toggle("is-collapsed", !nextExpanded);
    body.hidden = !nextExpanded;
    body.setAttribute("aria-hidden", String(!nextExpanded));
    toggle.dataset.state = nextExpanded ? "expanded" : "collapsed";
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    toggle.setAttribute("aria-label", nextExpanded ? "Collapse track" : "Expand track");
  });

  card.appendChild(body);
  return card;
};

const createSensoryListItem = (track, record, kind, index, panelLabel) => {
  const item = document.createElement("li");
  item.className = "sensory-item";
  const isMartigli = Boolean(track.isMartigli);
  const head = document.createElement("div");
  head.className = "sensory-item-head";
  const title = document.createElement("span");
  title.className = "sensory-item-title";
  title.textContent = track.label ?? `Track ${index + 1}`;
  const hint = document.createElement("span");
  hint.className = "muted-text small";
  hint.textContent = isMartigli
    ? "Martigli modulator"
    : track.presetId
        ? `Preset · ${track.presetId}`
        : formatPanelLabel(panelLabel);
  head.appendChild(title);
  head.appendChild(hint);
  item.appendChild(head);

  const summary = document.createElement("p");
  summary.className = "muted-text small";
  summary.textContent = isMartigli
    ? describeMartigliLiveSummary(track.martigli ?? track.params ?? {})
    : summariseTrackParams(track.params ?? {});
  item.appendChild(summary);

  if (!isMartigli) {
    const previewButton = createTrackPreviewButton(track, { record, kind, index });
    if (previewButton) {
      previewButton.classList.add("tiny");
      previewButton.classList.remove("small");
      const actions = document.createElement("div");
      actions.className = "sensory-item-actions";
      actions.appendChild(previewButton);
      item.appendChild(actions);
    }
  }

  return item;
};

const updateSensoryPanel = (panelKey, entries, record, kind) => {
  const panel = sensoryPanels[panelKey];
  if (!panel || !panel.list || !panel.status) return;
  clearList(panel.list);
  if (!entries.length) {
    panel.status.textContent = `No ${panel.label} tracks stored yet.`;
    return;
  }
  const plural = entries.length === 1 ? "" : "s";
  panel.status.textContent = `${entries.length} ${panel.label} track${plural}`;
  entries.forEach(({ track, index }) => {
    panel.list.appendChild(createSensoryListItem(track, record, kind, index, panel.label));
  });
};

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
    if (modality === "video") {
      buckets.visual.push({ track, index });
    } else if (modality === "haptics") {
      buckets.haptic.push({ track, index });
    } else {
      buckets.audio.push({ track, index });
    }
  });
  updateSensoryPanel("audio", buckets.audio, record, kind);
  updateSensoryPanel("visual", buckets.visual, record, kind);
  updateSensoryPanel("haptic", buckets.haptic, record, kind);
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
  if (dashboardState.activeSessionId) {
    return dashboardState.sessions.find((session) => session.id === dashboardState.activeSessionId) ?? null;
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

const formatMartigliDecimal = (value, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

const MARTIGLI_TELEMETRY_FIELDS = [
  { key: "value", label: "Value", format: (metrics) => formatMartigliDecimal(metrics.value, 2) },
  {
    key: "phase",
    label: "Phase",
    format: (metrics) => (Number.isFinite(metrics.phase) ? `${Math.round(metrics.phase * 100)}%` : "—"),
  },
  {
    key: "period",
    label: "Current Period",
    format: (metrics) => (Number.isFinite(metrics.period) ? `${metrics.period.toFixed(1)}s` : "—"),
  },
];

const MARTIGLI_TRAJECTORY_LIMIT = 16;

const recordMartigliInteraction = (eventName, payload = {}) => {
  kernel.recordInteraction(eventName, payload);
};

const createTelemetrySection = () => {
  const container = document.createElement("div");
  container.className = "martigli-telemetry martigli-telemetry--compact";
  const refs = {};
  MARTIGLI_TELEMETRY_FIELDS.forEach(({ key, label }) => {
    const card = document.createElement("div");
    card.className = "martigli-telemetry-card";
    const heading = document.createElement("p");
    heading.className = "martigli-telemetry-label";
    heading.textContent = label;
    const value = document.createElement("p");
    value.className = "martigli-telemetry-value";
    value.textContent = "—";
    card.appendChild(heading);
    card.appendChild(value);
    container.appendChild(card);
    refs[key] = value;
  });
  return { container, refs };
};

const createRangeLabel = (text) => {
  const label = document.createElement("label");
  const title = document.createElement("span");
  title.textContent = text;
  label.appendChild(title);
  return label;
};

const clampNumber = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

const getDevicePixelRatio = () => {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio && Number.isFinite(window.devicePixelRatio)
    ? window.devicePixelRatio
    : 1;
};

const createChartCanvas = (width = 360, height = 150) => {
  const ratio = getDevicePixelRatio();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.className = "martigli-chart-canvas";
  canvas.style.touchAction = "none";
  const ctx = canvas.getContext("2d");
  if (ctx && ratio !== 1) {
    ctx.scale(ratio, ratio);
  }
  return { canvas, ctx, width, height };
};

const MARTIGLI_WAVEFORM_PADDING = { top: 12, right: 16, bottom: 22, left: 36 };

const martigliWaveValue = (phase, osc = {}) => {
  const waveform = (osc.waveform ?? "sine").toLowerCase();
  const inhaleRatio = clampNumber(osc.inhaleRatio ?? 0.5, 0.05, 0.95);
  const phaseOffset = ((osc.phaseOffset ?? 0) % 1 + 1) % 1;
  const normalized = ((phase + phaseOffset) % 1 + 1) % 1;
  switch (waveform) {
    case "triangle":
      return normalized < 0.5 ? -1 + normalized * 4 : 3 - normalized * 4;
    case "square":
      return normalized < inhaleRatio ? 1 : -1;
    case "saw":
    case "sawtooth":
      return normalized * 2 - 1;
    case "breath":
    case "martigli": {
      if (normalized < inhaleRatio) {
        return -1 + (normalized / inhaleRatio) * 2;
      }
      const exPhase = (normalized - inhaleRatio) / (1 - inhaleRatio || 1);
      return 1 - exPhase * 2;
    }
    default:
      return Math.sin(normalized * Math.PI * 2);
  }
};

const describeWaveformValue = (value) => {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
};

const drawMartigliWaveform = (chart, osc = {}, metrics = null) => {
  if (!chart?.ctx) return;
  const ctx = chart.ctx;
  const width = chart.width;
  const height = chart.height;
  ctx.clearRect(0, 0, width, height);
  const padding = chart.padding ?? MARTIGLI_WAVEFORM_PADDING;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const midY = padding.top + innerHeight / 2;
  const amplitude = clampNumber(osc.amplitude ?? 1, 0, 1.5);
  const inhaleRatio = clampNumber(osc.inhaleRatio ?? 0.5, 0.05, 0.95);

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.fillRect(padding.left, padding.top, innerWidth, innerHeight);

  ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
  ctx.fillRect(padding.left, padding.top, innerWidth * inhaleRatio, innerHeight);
  ctx.fillStyle = "rgba(248, 113, 113, 0.09)";
  ctx.fillRect(padding.left + innerWidth * inhaleRatio, padding.top, innerWidth * (1 - inhaleRatio), innerHeight);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padding.left, midY);
  ctx.lineTo(padding.left + innerWidth, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  const sampleCount = 180;
  ctx.strokeStyle = "#5eead4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= sampleCount; i += 1) {
    const phase = i / sampleCount;
    const rawValue = martigliWaveValue(phase, osc) * amplitude;
    const x = padding.left + innerWidth * phase;
    const y = midY - rawValue * (innerHeight / 2);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const currentPhase = metrics?.phase ?? 0;
  const currentValue = Number.isFinite(metrics?.value)
    ? metrics.value
    : martigliWaveValue(currentPhase, osc) * amplitude;
  const dotX = padding.left + innerWidth * clampNumber(currentPhase, 0, 1);
  const dotY = midY - currentValue * (innerHeight / 2);
  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (chart.caption) {
    const inhalePct = Math.round(inhaleRatio * 100);
    const amplitudeText = `${(amplitude ?? 1).toFixed(2)}× amp`;
    chart.caption.textContent = `Inhale ${inhalePct}% · Value ${describeWaveformValue(currentValue)} · ${amplitudeText}`;
  }
};

const createMartigliWaveformChart = () => {
  const root = document.createElement("div");
  root.className = "martigli-chart";

  const head = document.createElement("div");
  head.className = "martigli-chart-head";
  const title = document.createElement("p");
  title.className = "martigli-chart-title";
  title.textContent = "Breathing waveform";
  const hint = document.createElement("span");
  hint.className = "martigli-chart-hint";
  hint.textContent = "Drag to rebalance inhale/exhale";
  head.appendChild(title);
  head.appendChild(hint);
  root.appendChild(head);

  const { canvas, ctx, width, height } = createChartCanvas(360, 150);
  root.appendChild(canvas);
  const caption = document.createElement("p");
  caption.className = "martigli-chart-caption";
  caption.textContent = "Inhale 50% · Value 0.00 · 1.00× amp";
  root.appendChild(caption);

  const state = {
    root,
    canvas,
    ctx,
    caption,
    width,
    height,
    padding: MARTIGLI_WAVEFORM_PADDING,
    pointer: { active: false, pointerId: null },
  };

  const updateRatioFromEvent = (event) => {
    if (!state.onRatioChange) return;
    const rect = canvas.getBoundingClientRect();
    const relative = (event.clientX - rect.left) / rect.width;
    const ratio = clampNumber(relative, 0.05, 0.95);
    state.onRatioChange(ratio);
  };

  canvas.addEventListener("pointerdown", (event) => {
    state.pointer.active = true;
    state.pointer.pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    updateRatioFromEvent(event);
  });

  const handlePointerMove = (event) => {
    if (!state.pointer.active) return;
    updateRatioFromEvent(event);
  };

  const releasePointer = (event) => {
    if (state.pointer.pointerId !== event.pointerId) return;
    state.pointer.active = false;
    state.pointer.pointerId = null;
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", (event) => {
    if (!state.pointer.active) return;
    handlePointerMove(event);
  });

  state.render = (osc, metrics) => drawMartigliWaveform(state, osc, metrics);
  return state;
};

const MARTIGLI_TIMELINE_PADDING = { top: 18, right: 32, bottom: 36, left: 58 };

const buildTimelineSeries = (osc = {}) => {
  const fallback = [
    { period: osc.startPeriodSec ?? 10, duration: 0 },
    { period: osc.endPeriodSec ?? 20, duration: osc.transitionSec ?? 0 },
  ];
  const raw = Array.isArray(osc.trajectory) && osc.trajectory.length ? osc.trajectory : fallback;
  const series = [];
  let elapsed = 0;
  raw.forEach((point, index) => {
    const period = Number(point.period ?? point.periodSec ?? osc.startPeriodSec ?? 10) || 0;
    series.push({ t: elapsed, period });
    const next = raw[index + 1];
    if (next) {
      const duration = Math.max(0, Number(next.duration ?? 0));
      elapsed += duration;
    }
  });
  return { series, totalDuration: elapsed };
};

const interpolateTimelinePeriod = (series, elapsed) => {
  if (!Array.isArray(series) || !series.length) return 0;
  if (series.length === 1) return series[0].period ?? 0;
  for (let i = 0; i < series.length - 1; i += 1) {
    const start = series[i];
    const end = series[i + 1];
    const duration = Math.max(0.0001, (end.t ?? 0) - (start.t ?? 0));
    if (elapsed <= end.t) {
      const progress = (elapsed - start.t) / duration;
      return start.period + (end.period - start.period) * clampNumber(progress, 0, 1);
    }
  }
  return series[series.length - 1].period ?? 0;
};

const computeElapsedSeconds = (osc = {}) => {
  const start = Number(osc.sessionStart);
  const paused = Boolean(osc.sessionPaused);
  if (!Number.isFinite(start) || paused) {
    return 0;
  }
  const end = Number(osc.sessionEnd);
  const now = Date.now() / 1000;
  const reference = Number.isFinite(end) ? end : now;
  return Math.max(0, reference - start);
};

const formatSeconds = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
  if (seconds >= 120) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  if (seconds >= 60) {
    const mins = (seconds / 60).toFixed(1);
    return `${mins}m`;
  }
  if (seconds >= 1) {
    return `${Math.round(seconds)}s`;
  }
  return `${seconds.toFixed(1)}s`;
};

const drawMartigliTimeline = (chart, osc = {}, metrics = null) => {
  if (!chart?.ctx) return;
  const ctx = chart.ctx;
  const { width, height } = chart;
  ctx.clearRect(0, 0, width, height);
  const padding = chart.padding ?? MARTIGLI_TIMELINE_PADDING;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const { series, totalDuration } = buildTimelineSeries(osc);
  const durationMax = Math.max(totalDuration, 60);
  const durationDomain = durationMax * 1.05;
  const periods = series.map((point) => point.period ?? 0);
  const minPeriodRaw = Math.min(...periods, osc.startPeriodSec ?? 10, osc.endPeriodSec ?? 20);
  const maxPeriodRaw = Math.max(...periods, osc.startPeriodSec ?? 10, osc.endPeriodSec ?? 20);
  const rangePad = Math.max(1, (maxPeriodRaw - minPeriodRaw || 1) * 0.2);
  const minPeriod = Math.max(0.1, minPeriodRaw - rangePad);
  const maxPeriod = maxPeriodRaw + rangePad;
  const periodRange = maxPeriod - minPeriod || 1;

  const toX = (seconds) => padding.left + clampNumber(seconds, 0, durationDomain) / durationDomain * innerWidth;
  const toY = (period) => padding.top + (1 - clampNumber((period - minPeriod) / periodRange, 0, 1)) * innerHeight;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(padding.left, padding.top, innerWidth, innerHeight);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i += 1) {
    const ratio = i / gridLines;
    const x = padding.left + ratio * innerWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + innerHeight);
    ctx.stroke();
  }
  for (let i = 0; i <= gridLines; i += 1) {
    const ratio = i / gridLines;
    const y = padding.top + ratio * innerHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + innerWidth, y);
    ctx.stroke();
  }

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(94, 234, 212, 0.9)";
  ctx.beginPath();
  series.forEach((point, index) => {
    const x = toX(point.t);
    const y = toY(point.period);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  const startHandle = series[0] ?? { t: 0, period: osc.startPeriodSec ?? 10 };
  const endHandle = series[series.length - 1] ?? { t: totalDuration, period: osc.endPeriodSec ?? 20 };
  chart.handles = {
    start: { x: toX(startHandle.t), y: toY(startHandle.period) },
    end: { x: toX(endHandle.t), y: toY(endHandle.period) },
  };
  chart.durationDomain = { max: durationDomain, plan: totalDuration };
  chart.periodDomain = { min: minPeriod, max: maxPeriod, range: periodRange };

  const drawHandle = (handle, color) => {
    if (!handle) return;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  drawHandle(chart.handles.start, "#38bdf8");
  drawHandle(chart.handles.end, "#a855f7");

  const elapsed = computeElapsedSeconds(osc);
  const progressSeconds = clampNumber(elapsed, 0, durationDomain);
  const currentPeriod = Number.isFinite(metrics?.period)
    ? metrics.period
    : interpolateTimelinePeriod(series, progressSeconds);
  const dotX = toX(progressSeconds);
  const dotY = toY(currentPeriod);
  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

};

const createMartigliTimelineChart = () => {
  const root = document.createElement("div");
  root.className = "martigli-chart";
  const head = document.createElement("div");
  head.className = "martigli-chart-head";
  const title = document.createElement("p");
  title.className = "martigli-chart-title";
  title.textContent = "Timeline trajectory";
  const hint = document.createElement("span");
  hint.className = "martigli-chart-hint";
  hint.textContent = "Drag handles to retime";
  head.appendChild(title);
  head.appendChild(hint);
  root.appendChild(head);
  const { canvas, ctx, width, height } = createChartCanvas(360, 160);
  root.appendChild(canvas);

  const state = {
    root,
    canvas,
    ctx,
    width,
    height,
    padding: MARTIGLI_TIMELINE_PADDING,
    handles: { start: null, end: null },
    durationDomain: { max: 60, plan: 0 },
    periodDomain: { min: 4, max: 20, range: 16 },
    interaction: { active: false, target: null, pointerId: null },
  };

  const detectHandle = (x, y) => {
    const threshold = 18;
    const check = (handle, target) => {
      if (!handle) return null;
      const dx = x - handle.x;
      const dy = y - handle.y;
      const dist = Math.hypot(dx, dy);
      return dist <= threshold ? target : null;
    };
    return check(state.handles.start, "start") ?? check(state.handles.end, "end");
  };

  const closestHandle = (x, y) => {
    const handles = state.handles
      ? [
          { key: "start", point: state.handles.start },
          { key: "end", point: state.handles.end },
        ].filter((entry) => Boolean(entry.point))
      : [];
    if (!handles.length) return "end";
    let best = handles[0];
    let bestDist = Number.POSITIVE_INFINITY;
    handles.forEach((entry) => {
      const dx = x - entry.point.x;
      const dy = y - entry.point.y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = entry;
      }
    });
    return best.key;
  };

  const updateFromPointer = (event) => {
    if (!state.interaction.active) return;
    const rect = canvas.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * state.width;
    const relativeY = ((event.clientY - rect.top) / rect.height) * state.height;
    const padding = state.padding ?? MARTIGLI_TIMELINE_PADDING;
    const innerWidth = Math.max(1, state.width - padding.left - padding.right);
    const innerHeight = Math.max(1, state.height - padding.top - padding.bottom);
    const clampedX = clampNumber(relativeX - padding.left, 0, innerWidth);
    const clampedY = clampNumber(relativeY - padding.top, 0, innerHeight);
    const durationMax = state.durationDomain?.max ?? 60;
    const seconds = clampNumber((clampedX / innerWidth) * durationMax, 0, durationMax);
    const period = state.periodDomain
      ? state.periodDomain.min + (1 - clampedY / innerHeight) * state.periodDomain.range
      : 10;
    if (state.interaction.target === "start" && typeof state.onStartPeriodChange === "function") {
      state.onStartPeriodChange(period);
    } else if (state.interaction.target === "end" && typeof state.onEndPeriodChange === "function") {
      state.onEndPeriodChange({ period, duration: seconds });
    }
  };

  const handlePointerDown = (event) => {
    const rect = canvas.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * state.width;
    const relativeY = ((event.clientY - rect.top) / rect.height) * state.height;
    const target = detectHandle(relativeX, relativeY) ?? closestHandle(relativeX, relativeY);
    state.interaction = { active: true, target, pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  };

  const handlePointerMove = (event) => {
    if (!state.interaction.active) return;
    updateFromPointer(event);
  };

  const handlePointerUp = (event) => {
    if (state.interaction.pointerId !== event.pointerId) return;
    state.interaction = { active: false, target: null, pointerId: null };
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", (event) => {
    if (!state.interaction.active) return;
    handlePointerMove(event);
  });

  state.render = (osc, metrics) => drawMartigliTimeline(state, osc, metrics);
  return state;
};


const createMartigliDashboardWidget = (osc) => {
  const widget = {
    oscillationId: osc.id,
  };
  const root = document.createElement("section");
  root.className = "martigli-widget";
  root.dataset.oscillationId = osc.id ?? "";

  const header = document.createElement("header");
  header.className = "martigli-widget-header";

  const heading = document.createElement("div");
  heading.className = "martigli-widget-heading";
  const eyebrow = document.createElement("p");
  eyebrow.className = "martigli-widget-eyebrow";
  eyebrow.textContent = "Martigli / Breathing";
  heading.appendChild(eyebrow);

  const titleRow = document.createElement("div");
  titleRow.className = "martigli-widget-title-row";
  const title = document.createElement("h5");
  title.textContent = osc.label ?? "Martigli Oscillation";
  titleRow.appendChild(title);

  const status = document.createElement("div");
  status.className = "martigli-widget-status";
  const indicator = document.createElement("span");
  indicator.className = "martigli-live-indicator";
  indicator.setAttribute("aria-hidden", "true");
  const statusText = document.createElement("span");
  statusText.className = "martigli-status-text";
  statusText.textContent = "Idle";
  status.appendChild(indicator);
  status.appendChild(statusText);
  titleRow.appendChild(status);
  heading.appendChild(titleRow);

  const summary = document.createElement("p");
  summary.className = "martigli-widget-summary muted-text small";
  summary.textContent = describeMartigliLiveSummary(osc);
  heading.appendChild(summary);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "martigli-widget-actions";
  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.className = "martigli-pill martigli-pill--start";
  startButton.textContent = "Start";
  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.className = "martigli-pill martigli-pill--stop";
  stopButton.textContent = "Stop";
  stopButton.disabled = true;
  buttonGroup.appendChild(startButton);
  buttonGroup.appendChild(stopButton);

  header.appendChild(heading);
  header.appendChild(buttonGroup);
  root.appendChild(header);

  const body = document.createElement("div");
  body.className = "martigli-widget-body";

  const visualColumn = document.createElement("div");
  visualColumn.className = "martigli-widget-column martigli-widget-column--visual";
  const visualizer = document.createElement("div");
  visualizer.className = "martigli-visualizer";
  const visualizerLabel = document.createElement("p");
  visualizerLabel.className = "martigli-visualizer-label";
  visualizerLabel.textContent = "Live envelope";
  const visualSurface = document.createElement("div");
  visualSurface.className = "martigli-visualizer-surface";
  const waveformChart = createMartigliWaveformChart();
  const timelineChart = createMartigliTimelineChart();
  visualSurface.appendChild(waveformChart.root);
  visualSurface.appendChild(timelineChart.root);
  visualizer.appendChild(visualizerLabel);
  visualizer.appendChild(visualSurface);
  visualColumn.appendChild(visualizer);

  const telemetry = createTelemetrySection();
  const telemetryShell = document.createElement("div");
  telemetryShell.className = "martigli-widget-telemetry";
  telemetryShell.appendChild(telemetry.container);
  visualColumn.appendChild(telemetryShell);

  const controlsColumn = document.createElement("div");
  controlsColumn.className = "martigli-widget-column martigli-widget-column--controls";

  const controlGrid = document.createElement("div");
  controlGrid.className = "martigli-control-grid";

  const startInput = document.createElement("input");
  startInput.type = "range";
  startInput.min = "4";
  startInput.max = "20";
  startInput.step = "1";
  const startLabel = createRangeLabel("Start period (s)");
  const startField = document.createElement("div");
  startField.className = "range-field";
  const startValue = document.createElement("span");
  startValue.className = "range-value";
  startValue.textContent = "0.0s";
  startField.appendChild(startInput);
  startField.appendChild(startValue);
  startLabel.appendChild(startField);

  const endInput = document.createElement("input");
  endInput.type = "range";
  endInput.min = "8";
  endInput.max = "40";
  endInput.step = "1";
  const endLabel = createRangeLabel("End period (s)");
  const endField = document.createElement("div");
  endField.className = "range-field";
  const endValue = document.createElement("span");
  endValue.className = "range-value";
  endValue.textContent = "0.0s";
  endField.appendChild(endInput);
  endField.appendChild(endValue);
  endLabel.appendChild(endField);

  const transitionInput = document.createElement("input");
  transitionInput.type = "range";
  transitionInput.min = "0";
  transitionInput.max = "600";
  transitionInput.step = "10";
  const transitionLabel = createRangeLabel("Transition window (s)");
  const transitionField = document.createElement("div");
  transitionField.className = "range-field";
  const transitionValue = document.createElement("span");
  transitionValue.className = "range-value";
  transitionValue.textContent = "0s";
  transitionField.appendChild(transitionInput);
  transitionField.appendChild(transitionValue);
  transitionLabel.appendChild(transitionField);

  const waveformSelect = document.createElement("select");
  [
    ["sine", "Sine"],
    ["triangle", "Triangle"],
    ["square", "Square"],
    ["saw", "Sawtooth"],
    ["breath", "Breath"],
  ].forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    waveformSelect.appendChild(option);
  });
  const waveformLabel = createRangeLabel("Waveform");
  waveformLabel.appendChild(waveformSelect);

  const inhaleLabel = createRangeLabel("Inhale ratio");
  const inhaleField = document.createElement("div");
  inhaleField.className = "range-field";
  const inhaleInput = document.createElement("input");
  inhaleInput.type = "range";
  inhaleInput.min = "0.1";
  inhaleInput.max = "0.9";
  inhaleInput.step = "0.05";
  const inhaleValue = document.createElement("span");
  inhaleValue.className = "range-value";
  inhaleValue.textContent = "50%";
  inhaleField.appendChild(inhaleInput);
  inhaleField.appendChild(inhaleValue);
  inhaleLabel.appendChild(inhaleField);

  const amplitudeLabel = createRangeLabel("Amplitude");
  const amplitudeField = document.createElement("div");
  amplitudeField.className = "range-field";
  const amplitudeInput = document.createElement("input");
  amplitudeInput.type = "range";
  amplitudeInput.min = "0";
  amplitudeInput.max = "1.5";
  amplitudeInput.step = "0.01";
  const amplitudeValue = document.createElement("span");
  amplitudeValue.className = "range-value";
  amplitudeValue.textContent = "1.00×";
  amplitudeField.appendChild(amplitudeInput);
  amplitudeField.appendChild(amplitudeValue);
  amplitudeLabel.appendChild(amplitudeField);

  controlGrid.appendChild(startLabel);
  controlGrid.appendChild(endLabel);
  controlGrid.appendChild(transitionLabel);
  controlGrid.appendChild(waveformLabel);
  controlGrid.appendChild(inhaleLabel);
  controlGrid.appendChild(amplitudeLabel);
  controlsColumn.appendChild(controlGrid);

  const trajectorySection = document.createElement("div");
  trajectorySection.className = "martigli-trajectory";
  const trajectoryHead = document.createElement("div");
  trajectoryHead.className = "martigli-trajectory-head";
  const trajectoryText = document.createElement("div");
  const trajectoryTitle = document.createElement("h6");
  trajectoryTitle.textContent = "Breathing Trajectory";
  const trajectoryHint = document.createElement("p");
  trajectoryHint.className = "muted-text small";
  trajectoryHint.textContent = "Stack period/duration points to sculpt the envelope.";
  trajectoryText.appendChild(trajectoryTitle);
  trajectoryText.appendChild(trajectoryHint);
  const addTrajectoryButton = document.createElement("button");
  addTrajectoryButton.type = "button";
  addTrajectoryButton.className = "martigli-pill martigli-pill--ghost";
  addTrajectoryButton.textContent = "+ Add point";
  trajectoryHead.appendChild(trajectoryText);
  trajectoryHead.appendChild(addTrajectoryButton);
  const trajectoryList = document.createElement("div");
  trajectoryList.className = "martigli-trajectory-list";
  trajectoryList.setAttribute("aria-live", "polite");
  trajectorySection.appendChild(trajectoryHead);
  trajectorySection.appendChild(trajectoryList);
  controlsColumn.appendChild(trajectorySection);

  body.appendChild(visualColumn);
  body.appendChild(controlsColumn);
  root.appendChild(body);

  widget.root = root;
  widget.indicator = indicator;
  widget.title = title;
  widget.summary = summary;
  widget.statusText = statusText;
  widget.buttons = { start: startButton, stop: stopButton };
  widget.telemetryRefs = telemetry.refs;
  widget.controls = {
    start: startInput,
    startValue,
    end: endInput,
    endValue,
    transition: transitionInput,
    transitionValue,
    waveform: waveformSelect,
    inhale: inhaleInput,
    inhaleValue,
    amplitude: amplitudeInput,
    amplitudeValue,
  };
  widget.charts = {
    waveform: waveformChart,
    timeline: timelineChart,
  };
  widget.trajectory = {
    list: trajectoryList,
    addButton: addTrajectoryButton,
  };

  if (waveformChart) {
    waveformChart.onRatioChange = (ratio) => {
      const value = Number(ratio.toFixed(3));
      if (Number.isFinite(value)) {
        martigliState.setInhaleRatio(value, widget.oscillationId);
        if (widget.controls?.inhale && document.activeElement !== widget.controls.inhale) {
          widget.controls.inhale.value = String(value);
        }
        if (widget.controls?.inhaleValue) {
          widget.controls.inhaleValue.textContent = `${Math.round(value * 100)}%`;
        }
        recordMartigliInteraction("martigli.update", {
          field: "inhaleRatio",
          value,
          oscillatorId: widget.oscillationId,
          source: "waveform-chart",
        });
      }
    };
  }

  if (timelineChart) {
    timelineChart.onStartPeriodChange = (value) => {
      if (!Number.isFinite(value)) return;
      const period = clampNumber(value, 0.1, 120);
      martigliState.setStartPeriod(period, widget.oscillationId);
      recordMartigliInteraction("martigli.update", {
        field: "startPeriod",
        value: period,
        oscillatorId: widget.oscillationId,
        source: "timeline-chart",
      });
    };
    timelineChart.onEndPeriodChange = ({ period, duration }) => {
      const updates = {};
      if (Number.isFinite(period)) {
        updates.period = clampNumber(period, 0.1, 120);
        martigliState.setEndPeriod(updates.period, widget.oscillationId);
      }
      if (Number.isFinite(duration)) {
        updates.duration = Math.max(0, duration);
        martigliState.setTransitionDuration(updates.duration, widget.oscillationId);
      }
      recordMartigliInteraction("martigli.update", {
        field: "timeline",
        oscillatorId: widget.oscillationId,
        value: updates,
        source: "timeline-chart",
      });
    };
  }

  startButton.addEventListener("click", () => {
    if (!widget.oscillationId) return;
    martigliState.startOscillation(widget.oscillationId);
    recordMartigliInteraction("martigli.session.start", { oscillatorId: widget.oscillationId });
  });
  stopButton.addEventListener("click", () => {
    if (!widget.oscillationId) return;
    martigliState.stopOscillation(widget.oscillationId);
    recordMartigliInteraction("martigli.session.stop", { oscillatorId: widget.oscillationId });
  });

  startInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setStartPeriod(value, widget.oscillationId);
    if (startValue) {
      startValue.textContent = `${value.toFixed(1)}s`;
    }
    recordMartigliInteraction("martigli.update", { field: "startPeriod", value, oscillatorId: widget.oscillationId });
  });
  endInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setEndPeriod(value, widget.oscillationId);
    if (endValue) {
      endValue.textContent = `${value.toFixed(1)}s`;
    }
    recordMartigliInteraction("martigli.update", { field: "endPeriod", value, oscillatorId: widget.oscillationId });
  });
  transitionInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setTransitionDuration(value, widget.oscillationId);
    if (transitionValue) {
      transitionValue.textContent = formatSeconds(value);
    }
    recordMartigliInteraction("martigli.update", { field: "transitionSec", value, oscillatorId: widget.oscillationId });
  });
  waveformSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    martigliState.setWaveform(value, widget.oscillationId);
    recordMartigliInteraction("martigli.update", { field: "waveform", value, oscillatorId: widget.oscillationId });
  });
  inhaleInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setInhaleRatio(value, widget.oscillationId);
    inhaleValue.textContent = `${Math.round(value * 100)}%`;
    recordMartigliInteraction("martigli.update", { field: "inhaleRatio", value, oscillatorId: widget.oscillationId });
  });
  amplitudeInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setAmplitude(value, widget.oscillationId);
    amplitudeValue.textContent = `${value.toFixed(2)}×`;
    recordMartigliInteraction("martigli.update", { field: "amplitude", value, oscillatorId: widget.oscillationId });
  });
  addTrajectoryButton.addEventListener("click", () => {
    const snapshot = martigliState.snapshot();
    const oscSnapshot = snapshot.oscillations?.find((entry) => entry.id === widget.oscillationId) ?? null;
    const lastPoint = oscSnapshot?.trajectory?.[oscSnapshot.trajectory.length - 1] ?? null;
    const nextPoint = {
      period: lastPoint?.period ?? oscSnapshot?.endPeriodSec ?? 20,
      duration: lastPoint?.duration ?? 60,
    };
    martigliState.addTrajectoryPoint(nextPoint, widget.oscillationId);
    recordMartigliInteraction("martigli.trajectory.add", {
      oscillatorId: widget.oscillationId,
      period: nextPoint.period,
      duration: nextPoint.duration,
    });
  });

  return widget;
};

const renderMartigliTrajectoryList = (widget, osc) => {
  if (!widget?.trajectory?.list) return;
  const list = widget.trajectory.list;
  clearList(list);
  const points = Array.isArray(osc.trajectory) && osc.trajectory.length ? osc.trajectory : [];
  if (!points.length) {
    const empty = document.createElement("p");
    empty.className = "muted-text small";
    empty.textContent = "No trajectory points yet.";
    list.appendChild(empty);
    if (widget.trajectory.addButton) {
      widget.trajectory.addButton.disabled = false;
    }
    return;
  }
  points.forEach((point, index) => {
    const row = document.createElement("div");
    row.className = "martigli-trajectory-row";

    const periodLabel = createRangeLabel("Period (s)");
    const periodInput = document.createElement("input");
    periodInput.type = "number";
    periodInput.min = "0.1";
    periodInput.max = "120";
    periodInput.step = "0.1";
    periodInput.value = String(point.period ?? 0);
    periodInput.addEventListener("change", (event) => {
      const value = Number(event.target.value);
      martigliState.updateTrajectoryPoint(index, { period: value }, widget.oscillationId);
      recordMartigliInteraction("martigli.trajectory.update", {
        oscillatorId: widget.oscillationId,
        field: "period",
        index,
        value,
      });
    });
    periodLabel.appendChild(periodInput);

    const durationLabel = createRangeLabel(index === 0 ? "Duration (s, auto)" : "Duration (s)");
    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.min = "0";
    durationInput.step = "1";
    durationInput.value = String(point.duration ?? 0);
    durationInput.disabled = index === 0;
    durationInput.addEventListener("change", (event) => {
      const value = Number(event.target.value);
      martigliState.updateTrajectoryPoint(index, { duration: value }, widget.oscillationId);
      recordMartigliInteraction("martigli.trajectory.update", {
        oscillatorId: widget.oscillationId,
        field: "duration",
        index,
        value,
      });
    });
    durationLabel.appendChild(durationInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "ghost tiny";
    removeButton.textContent = "Remove";
    removeButton.disabled = points.length <= 2;
    removeButton.addEventListener("click", () => {
      martigliState.removeTrajectoryPoint(index, widget.oscillationId);
      recordMartigliInteraction("martigli.trajectory.remove", {
        oscillatorId: widget.oscillationId,
        index,
      });
    });

    row.appendChild(periodLabel);
    row.appendChild(durationLabel);
    row.appendChild(removeButton);
    list.appendChild(row);
  });
  if (widget.trajectory.addButton) {
    widget.trajectory.addButton.disabled = points.length >= MARTIGLI_TRAJECTORY_LIMIT;
  }
};

const syncMartigliWidgetControls = (widget, osc) => {
  const controls = widget.controls ?? {};
  const {
    start,
    startValue,
    end,
    endValue,
    transition,
    transitionValue,
    waveform,
    inhale,
    inhaleValue,
    amplitude,
    amplitudeValue,
  } = controls;
  if (start && document.activeElement !== start) {
    start.value = String(osc.startPeriodSec ?? osc.startPeriod ?? 10);
    if (startValue) {
      const startPeriod = Number(osc.startPeriodSec ?? osc.startPeriod ?? 10);
      startValue.textContent = `${startPeriod.toFixed(1)}s`;
    }
  }
  if (end && document.activeElement !== end) {
    end.value = String(osc.endPeriodSec ?? osc.endPeriod ?? 20);
    if (endValue) {
      const endPeriod = Number(osc.endPeriodSec ?? osc.endPeriod ?? 20);
      endValue.textContent = `${endPeriod.toFixed(1)}s`;
    }
  }
  if (transition && document.activeElement !== transition) {
    transition.value = String(osc.transitionSec ?? 0);
    if (transitionValue) {
      const duration = Number(osc.transitionSec ?? 0);
      transitionValue.textContent = formatSeconds(duration);
    }
  }
  if (waveform && waveform.value !== (osc.waveform ?? "sine")) {
    waveform.value = osc.waveform ?? "sine";
  }
  if (inhale && document.activeElement !== inhale) {
    const ratio = Number.isFinite(osc.inhaleRatio) ? osc.inhaleRatio : 0.5;
    inhale.value = String(ratio);
    if (inhaleValue) {
      inhaleValue.textContent = `${Math.round(ratio * 100)}%`;
    }
  }
  if (amplitude && document.activeElement !== amplitude) {
    const amp = Number.isFinite(osc.amplitude) ? osc.amplitude : 1;
    amplitude.value = String(amp);
    if (amplitudeValue) {
      amplitudeValue.textContent = `${amp.toFixed(2)}×`;
    }
  }
};

const setMartigliWidgetRunningState = (widget, osc) => {
  const running = Boolean(!osc.sessionPaused && osc.sessionStart && !osc.sessionEnd);
  const hasHistory = Boolean(osc.sessionStart || osc.sessionEnd);
  const state = running ? "running" : hasHistory ? "stopped" : "idle";
  const label = running ? "Live" : hasHistory ? "Stopped" : "Idle";
  widget.isRunning = running;
  if (widget.buttons?.start) {
    widget.buttons.start.disabled = running;
  }
  if (widget.buttons?.stop) {
    widget.buttons.stop.disabled = !running;
  }
  if (widget.root) {
    widget.root.dataset.state = state;
  }
  if (widget.statusText) {
    widget.statusText.textContent = label;
  }
  if (widget.indicator) {
    widget.indicator.classList.toggle("active", running);
  }
  return { running, state, label };
};

const updateMartigliWidget = (widget, osc, isReference = false) => {
  widget.oscillationId = osc.id;
  widget.snapshot = osc;
  if (widget.root) {
    widget.root.dataset.oscillationId = osc.id ?? "";
    widget.root.dataset.reference = isReference ? "true" : "false";
  }
  if (widget.title) {
    widget.title.textContent = osc.label ?? "Martigli Oscillation";
  }
  const stateInfo = setMartigliWidgetRunningState(widget, osc);
  if (widget.summary) {
    const status = stateInfo?.label ?? "Idle";
    widget.summary.textContent = `${describeMartigliLiveSummary(osc)} • ${status}`;
  }
  syncMartigliWidgetControls(widget, osc);
  renderMartigliTrajectoryList(widget, osc);
  if (widget.charts?.waveform?.render) {
    widget.charts.waveform.render(osc, widget.metrics ?? null);
  }
  if (widget.charts?.timeline?.render) {
    widget.charts.timeline.render(osc, widget.metrics ?? null);
  }
};

const updateMartigliWidgetTelemetry = (widget) => {
  if (!widget?.telemetryRefs) return;
  const metrics = martigliState.getRuntimeMetrics(widget.oscillationId);
  if (!metrics) {
    widget.metrics = null;
    Object.values(widget.telemetryRefs).forEach((el) => {
      if (el) el.textContent = "—";
    });
    if (widget.indicator) {
      widget.indicator.classList.remove("active");
    }
    if (widget.charts?.waveform?.render) {
      widget.charts.waveform.render(widget.snapshot ?? {}, null);
    }
    if (widget.charts?.timeline?.render) {
      widget.charts.timeline.render(widget.snapshot ?? {}, null);
    }
    return;
  }
  widget.metrics = metrics;
  MARTIGLI_TELEMETRY_FIELDS.forEach(({ key, format }) => {
    const target = widget.telemetryRefs[key];
    if (target) {
      target.textContent = format(metrics);
    }
  });
  if (widget.indicator) {
    widget.indicator.classList.toggle("active", Boolean(widget.isRunning));
  }
  if (widget.charts?.waveform?.render) {
    widget.charts.waveform.render(widget.snapshot ?? {}, metrics);
  }
  if (widget.charts?.timeline?.render) {
    widget.charts.timeline.render(widget.snapshot ?? {}, metrics);
  }
};

const updateMartigliTelemetryForAll = () => {
  if (!martigliDashboard.widgets.size) return;
  martigliDashboard.widgets.forEach((widget) => updateMartigliWidgetTelemetry(widget));
};

const renderMartigliDashboardList = (snapshot = martigliState.snapshot()) => {
  if (!martigliDashboard.list) return;
  clearList(martigliDashboard.list);
  const seen = new Set();
  const oscillations = snapshot.oscillations ?? [];
  oscillations.forEach((osc) => {
    const oscId = osc.id ?? `osc-${Math.random().toString(36).slice(2, 8)}`;
    const normalized = { ...osc, id: oscId };
    let widget = martigliDashboard.widgets.get(oscId);
    if (!widget) {
      widget = createMartigliDashboardWidget(normalized);
      martigliDashboard.widgets.set(oscId, widget);
    }
    updateMartigliWidget(widget, normalized, snapshot.referenceId === normalized.id);
    martigliDashboard.list.appendChild(widget.root);
    seen.add(normalized.id);
  });
  Array.from(martigliDashboard.widgets.keys()).forEach((id) => {
    if (!seen.has(id)) {
      const widget = martigliDashboard.widgets.get(id);
      widget?.root?.remove();
      martigliDashboard.widgets.delete(id);
    }
  });
  if (!seen.size) {
    if (!martigliDashboard.emptyNotice) {
      const notice = document.createElement("p");
      notice.className = "muted-text small";
      notice.textContent = 'No Martigli oscillations yet. Use "Add Oscillation" to begin.';
      martigliDashboard.emptyNotice = notice;
    }
    martigliDashboard.list.appendChild(martigliDashboard.emptyNotice);
  } else if (martigliDashboard.emptyNotice?.parentNode) {
    martigliDashboard.emptyNotice.remove();
  }
  updateMartigliTelemetryForAll();
};

const ensureMartigliTelemetryLoop = () => {
  if (typeof window === "undefined" || martigliTelemetryFrame !== null) {
    return;
  }
  const loop = (timestamp) => {
    const needsWidgets = martigliDashboard.widgets.size > 0;
    const needsBindings = hasActiveBindingTargets();
    if (!document.hidden && (needsWidgets || needsBindings)) {
      if (!martigliTelemetryLastTick || timestamp - martigliTelemetryLastTick >= MARTIGLI_TELEMETRY_INTERVAL_MS) {
        if (needsWidgets) {
          updateMartigliTelemetryForAll();
        }
        if (needsBindings) {
          refreshAllTrackBindings();
        }
        martigliTelemetryLastTick = timestamp;
      }
    }
    martigliTelemetryFrame = window.requestAnimationFrame(loop);
  };
  martigliTelemetryFrame = window.requestAnimationFrame(loop);
};

const getOscillationLabel = (snapshot, id) => {
  if (!id) return null;
  const match = (snapshot.oscillations ?? []).find((osc) => osc.id === id);
  return match?.label ?? null;
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

const renderTrackSection = (entries, listEl, hintEl, record, kind, label) => {
  if (!listEl || !hintEl) return;
  clearList(listEl);
  if (!entries.length) {
    hintEl.textContent = `No ${label} tracks stored yet.`;
    return;
  }
  hintEl.textContent = `${entries.length} ${label} track${entries.length > 1 ? "s" : ""}`;
  entries.forEach(({ track, index }) => {
    listEl.appendChild(buildTrackCard(track, record, kind, index));
  });
};

const renderModalTrackSections = (record, kind) => {
  audioEngine.stop();
  closeTrackVisualizerModal({ reason: "tracks-rerender" });
  trackVisualizerRegistry.clear();
  const useLiveMartigli = kind === "session" || kind === "lab";
  const tracks = getRecordTracks(record, { useLiveMartigli });
  const buckets = {
    audio: [],
    video: [],
    haptics: [],
  };
  tracks.forEach((track, index) => {
    const payload = { track, index };
    if (track.isMartigli) {
      buckets.audio.unshift(payload);
      return;
    }
    const modality = detectTrackModality(track);
    if (modality === "video") {
      buckets.video.push(payload);
    } else if (modality === "haptics") {
      buckets.haptics.push(payload);
    } else {
      buckets.audio.push(payload);
    }
  });
  renderTrackSection(buckets.audio, ui.audioTrackList, ui.audioTrackHint, record, kind, "audio");
  renderTrackSection(buckets.video, ui.videoTrackList, ui.videoTrackHint, record, kind, "visual");
  renderTrackSection(buckets.haptics, ui.hapticTrackList, ui.hapticTrackHint, record, kind, "haptic");
  refreshTrackBindingOptions();
  refreshAllTrackBindings();
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
  videoEngine.registerLayer(activeVideoLayerId, {
    kind: normalizedKind,
    trackCount: getTrackCount(record),
  });
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
    const prefix = dashboardState.activeSessionLabel ? `${dashboardState.activeSessionLabel}: ` : "";
    ui.martigliDashboardPreview.textContent = `${prefix}${summary}`;
  }
};


const updateAuthState = (user) => {
  if (!user) {
    ui.state.textContent = "Signed out";
    ui.email.textContent = "";
    ui.userId.textContent = "";
    setMessage("");
    refreshControls();
    setDashboardVisibility(false);
    clearList(ui.sessionList);
    if (ui.sessionStatus) ui.sessionStatus.textContent = "Sign in to load sessions.";
    resetDashboardContext();
    closeDetailModal();
    return;
  }

  ui.state.textContent = "Signed in";
  ui.email.textContent = user.email ? `Email: ${user.email}` : "";
  ui.userId.textContent = `UID: ${user.uid}`;
  refreshControls();
  loadDashboardData();
};

const handleError = (error) => {
  console.error(error);
  setMessage(error.message || "Something went wrong", "error");
};

onAuthChange((user) => {
  updateAuthState(user);
  if (user) {
    setMessage(`Welcome back, ${user.email ?? "friend"}!`, "success");
  } else if (!isBusy) {
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

setMessage(useAuthEmulator ? "Using local Auth emulator." : "Ready.", "info");
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

const handleMartigliDelete = () => {
  if (!ensureSessionModalVisible()) return;
  const oscillatorId = getSelectedOscillationId();
  if (!oscillatorId) return;
  const snapshot = martigliState.snapshot();
  const label = getOscillationLabel(snapshot, oscillatorId) ?? "Martigli Oscillation";
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    setMessage("Delete is only available in the browser UI.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete "${label}"? This cannot be undone.`);
  if (!confirmed) return;
  martigliState.removeOscillation(oscillatorId);
  const afterRemoval = martigliState.snapshot();
  if (!afterRemoval.oscillations?.length) {
    martigliState.addOscillator();
  }
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
ensureMartigliTelemetryLoop();
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
    audioEngine.stop();
  } else {
    updateMartigliTelemetryForAll();
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => audioEngine.stop());
}

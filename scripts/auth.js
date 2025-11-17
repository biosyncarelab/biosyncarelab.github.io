import { firebaseConfig } from "./firebase-config.js";
import { BSCLabKernel } from "./structures.js";
import { STRUCTURE_MANIFEST } from "./structures-loader.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const useAuthEmulator = isLocalhost && !window.localStorage?.getItem("bsc.useProdAuth");

const NSO_BASE_URI = "https://biosyncare.github.io/rdf/harmonicare/SSO_Ontology.owl#";
const DASHBOARD_ONTOLOGY_LINKS = {
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

const SESSION_CLASS_LINK = {
  uri: `${NSO_BASE_URI}Session`,
  label: "Session Class",
  navigator: "harmonicare-sso",
  summary: "Canonical definition of the Session concept within the NSO / SSO ontology.",
};

const db = getFirestore(app);

if (useAuthEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
}
auth.useDeviceLanguage();

// Load analytics only on supported targets to avoid reference errors on Node-like UA.
isAnalyticsSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch((err) => console.warn("Analytics unavailable", err));

const ui = {
  state: document.getElementById("auth-state"),
  email: document.getElementById("user-email"),
  userId: document.getElementById("user-id"),
  googleSignIn: document.getElementById("google-sign-in"),
  googleSignOut: document.getElementById("google-sign-out"),
  statusSignOut: document.getElementById("status-sign-out"),
  emailForm: document.getElementById("email-form"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  emailSignUp: document.getElementById("email-sign-up"),
  messages: document.getElementById("messages"),
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
  sessionHint: document.getElementById("session-card-hint"),
  martigliDashboardPreview: document.getElementById("martigli-dashboard-preview"),
  modalMartigli: document.getElementById("modal-martigli"),
  modalClose: document.getElementById("modal-close"),
  martigliStart: document.getElementById("martigli-start"),
  martigliEnd: document.getElementById("martigli-end"),
  martigliWaveform: document.getElementById("martigli-waveform"),
  martigliPreview: document.getElementById("martigli-preview"),
  martigliCanvas: document.getElementById("martigli-canvas"),
  martigliOscillationSelect: document.getElementById("martigli-oscillation-select"),
  martigliAdd: document.getElementById("martigli-add"),
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
};

const defaultDashboardCopy = {
  martigliPreview: ui.martigliDashboardPreview?.textContent ?? "",
  audioSensoryStatus: ui.audioSensoryStatus?.textContent ?? "",
  visualSensoryStatus: ui.visualSensoryStatus?.textContent ?? "",
  hapticSensoryStatus: ui.hapticSensoryStatus?.textContent ?? "",
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

const refreshControls = () => {
  const user = auth.currentUser;
  const emailSubmit = ui.emailForm.querySelector("button[type='submit']");
  if (user) {
    document.body.classList.add("auth-hidden");
  } else {
    document.body.classList.remove("auth-hidden");
  }
  if (ui.googleSignIn) {
    const emulatorBlocksFederated = useAuthEmulator;
    ui.googleSignIn.disabled = isBusy || !!user || emulatorBlocksFederated;
    ui.googleSignIn.title = emulatorBlocksFederated
      ? "Google sign-in is disabled when the Auth emulator is active."
      : "";
  }
  if (ui.googleSignOut) {
    ui.googleSignOut.disabled = isBusy || !user;
    ui.googleSignOut.classList.toggle("hidden", !!user);
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

const getTrackCount = (entry) =>
  entry.trackCount ?? entry.voices?.length ?? entry.tracks?.length ?? 0;

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
  isFetchingDashboard = true;
  setDashboardVisibility(true);
  ui.sessionStatus.textContent = "Loading sessions…";
  try {
    const sessionSnap = await getDocs(collection(db, "sessions"));
    const sessions = sessionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
  return {
    id: record?.id ?? null,
    label: record?.label ?? "Draft Session",
    savedAt: new Date().toISOString(),
    martigli: martigliPayload,
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

const setActiveSessionContext = (record, kind) => {
  if (kind !== "session") return;
  dashboardState.activeSessionId = record.id ?? null;
  dashboardState.activeSessionLabel = record.label ?? record.name ?? record.id ?? null;
  renderSensoryPanelsForRecord(record, kind);
  updateMartigliPreview(martigliState.snapshot());
  updateSessionNavigatorLink(record);
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
  const title = document.createElement("h5");
  title.textContent = track.label ?? `Track ${index + 1}`;
  const meta = document.createElement("div");
  meta.className = "track-meta";
  const presetChip = document.createElement("span");
  presetChip.textContent = track.presetId ? `Preset · ${track.presetId}` : "Custom";
  const gainChip = document.createElement("span");
  const gainValue = track.gain ?? track.params?.gain;
  if (gainValue !== undefined) {
    gainChip.textContent = `Gain ${gainValue}`;
    meta.appendChild(gainChip);
  }
  meta.appendChild(presetChip);
  const summary = document.createElement("p");
  summary.className = "muted-text";
  summary.textContent = summariseTrackParams(track.params ?? {});
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(summary);
  const actions = document.createElement("div");
  actions.className = "track-actions";
  const previewButton = createTrackPreviewButton(track, { record, kind, index });
  if (previewButton) {
    actions.appendChild(previewButton);
  } else {
    const hint = document.createElement("span");
    hint.className = "muted-text";
    hint.textContent = "Preview unavailable for this track.";
    actions.appendChild(hint);
  }
  card.appendChild(actions);
  return card;
};

const createSensoryListItem = (track, record, kind, index, panelLabel) => {
  const item = document.createElement("li");
  item.className = "sensory-item";
  const head = document.createElement("div");
  head.className = "sensory-item-head";
  const title = document.createElement("span");
  title.className = "sensory-item-title";
  title.textContent = track.label ?? `Track ${index + 1}`;
  const hint = document.createElement("span");
  hint.className = "muted-text small";
  hint.textContent = track.presetId
    ? `Preset · ${track.presetId}`
    : formatPanelLabel(panelLabel);
  head.appendChild(title);
  head.appendChild(hint);
  item.appendChild(head);

  const summary = document.createElement("p");
  summary.className = "muted-text small";
  summary.textContent = summariseTrackParams(track.params ?? {});
  item.appendChild(summary);

  const previewButton = createTrackPreviewButton(track, { record, kind, index });
  if (previewButton) {
    previewButton.classList.add("tiny");
    previewButton.classList.remove("small");
    const actions = document.createElement("div");
    actions.className = "sensory-item-actions";
    actions.appendChild(previewButton);
    item.appendChild(actions);
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
  const tracks = record.voices ?? record.tracks ?? [];
  const buckets = {
    audio: [],
    visual: [],
    haptic: [],
  };
  tracks.forEach((track, index) => {
    const modality = detectTrackModality(track);
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
    return;
  }
  oscillations.forEach((osc, index) => {
    const option = document.createElement("option");
    option.value = osc.id ?? `osc-${index}`;
    option.textContent = labelMartigliOscillation(osc, index);
    select.appendChild(option);
  });
  select.disabled = false;
  const fallbackId = snapshot.referenceId ?? oscillations[0].id ?? select.options[0].value;
  if (fallbackId) {
    select.value = fallbackId;
  }
  if (!select.value && select.options.length) {
    select.selectedIndex = 0;
  }
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
  const tracks = record.voices ?? record.tracks ?? [];
  const buckets = {
    audio: [],
    video: [],
    haptics: [],
  };
  tracks.forEach((track, index) => {
    const modality = detectTrackModality(track);
    if (modality === "video") {
      buckets.video.push({ track, index });
    } else if (modality === "haptics") {
      buckets.haptics.push({ track, index });
    } else {
      buckets.audio.push({ track, index });
    }
  });
  renderTrackSection(buckets.audio, ui.audioTrackList, ui.audioTrackHint, record, kind, "audio");
  renderTrackSection(buckets.video, ui.videoTrackList, ui.videoTrackHint, record, kind, "visual");
  renderTrackSection(buckets.haptics, ui.hapticTrackList, ui.hapticTrackHint, record, kind, "haptic");
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

const extractMartigliParams = (record) => {
  if (record?.martigli) return record.martigli;
  return record?.voices?.find((voice) => voice?.martigli)?.martigli;
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
  audioEngine.stop();
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

function openDetailModal(record, kind) {
  if (!ui.modal) return;
  const normalizedKind = kind === "session" ? "session" : "preset";
  activeModalRecord = {
    id: record.id ?? null,
    kind: normalizedKind,
    label: record.label ?? record.name ?? record.id ?? null,
  };
  activeModalData = record;
  ui.modalTitle.textContent = record.label ?? record.name ?? record.id ?? "Untitled";
  ui.modalKind.textContent = normalizedKind === "session" ? "Session" : "Preset";
  if (ui.sessionHint) {
    ui.sessionHint.textContent =
      normalizedKind === "session"
        ? "Applying this session will update Martigli, audio, video, and haptic controls."
        : "Viewing a preset — open a session to sync all modalities.";
  }
  renderModalMeta(record, normalizedKind);
  renderModalTrackSections(record, normalizedKind);
  renderSensoryPanelsForRecord(record, normalizedKind);
  renderMartigliParams(record);
  if (normalizedKind === "session") {
    updateSessionNavigatorLink(record);
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
  const delta = snapshot.endPeriod - snapshot.startPeriod;
  const direction = delta === 0 ? "steady" : delta > 0 ? "slows" : "quickens";
  const summary = `Breath ${direction} from ${snapshot.startPeriod}s to ${snapshot.endPeriod}s on a ${snapshot.waveform} wave.`;
  if (ui.martigliPreview) {
    ui.martigliPreview.textContent = summary;
  }
  if (ui.martigliDashboardPreview) {
    if (dashboardState.activeSessionId) {
      const prefix = dashboardState.activeSessionLabel
        ? `${dashboardState.activeSessionLabel}: `
        : "";
      ui.martigliDashboardPreview.textContent = `${prefix}${summary}`;
    } else {
      ui.martigliDashboardPreview.textContent = defaultDashboardCopy.martigliPreview;
    }
  }
};

const syncMartigliInputs = (snapshot = martigliState.snapshot()) => {
  if (!snapshot) return;
  if (ui.martigliStart && document.activeElement !== ui.martigliStart) {
    ui.martigliStart.value = String(snapshot.startPeriod);
  }
  if (ui.martigliEnd && document.activeElement !== ui.martigliEnd) {
    ui.martigliEnd.value = String(snapshot.endPeriod);
  }
  if (ui.martigliWaveform && ui.martigliWaveform.value !== snapshot.waveform) {
    ui.martigliWaveform.value = snapshot.waveform;
  }
};

const bindMartigliWidget = () => {
  if (!ui.martigliStart || !ui.martigliEnd || !ui.martigliWaveform) return;
  ui.martigliStart.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setStartPeriod(value);
    kernel.recordInteraction("martigli.update", { field: "startPeriod", value });
  });
  ui.martigliEnd.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    martigliState.setEndPeriod(value);
    kernel.recordInteraction("martigli.update", { field: "endPeriod", value });
  });
  ui.martigliWaveform.addEventListener("change", (event) => {
    const value = event.target.value;
    martigliState.setWaveform(value);
    kernel.recordInteraction("martigli.update", { field: "waveform", value });
  });
  syncMartigliInputs();
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

onAuthStateChanged(auth, (user) => {
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
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
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
    await signOut(auth);
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
    await signInWithEmailAndPassword(auth, email, password);
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
    await createUserWithEmailAndPassword(auth, email, password);
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

if (ui.martigliOscillationSelect) {
  ui.martigliOscillationSelect.addEventListener("change", (event) => {
    const nextId = event.target.value;
    if (!nextId) return;
    martigliState.setReference(nextId);
    kernel.recordInteraction("martigli.oscillation.select", { oscillatorId: nextId });
  });
}

if (ui.martigliAdd) {
  ui.martigliAdd.addEventListener("click", () => {
    const snapshot = martigliState.snapshot();
    const reference = martigliState.getReference();
    const base = reference?.toJSON?.() ?? {};
    const { id: _ignoredId, ...rest } = base;
    const label = reference?.label
      ? `${reference.label} Copy`
      : `Oscillation ${snapshot.oscillations.length + 1}`;
    const newOsc = martigliState.addOscillator({ ...rest, label });
    if (newOsc?.id) {
      martigliState.setReference(newOsc.id);
    }
    kernel.recordInteraction("martigli.oscillation.create", {
      oscillatorId: newOsc?.id ?? null,
      sourceId: reference?.id ?? null,
      label,
    });
    setMessage("New Martigli oscillation added. Adjust the sliders to customize it.", "success");
  });
}

if (ui.sessionNavigator) {
  ui.sessionNavigator.addEventListener("click", () => {
    const href = ui.sessionNavigator.dataset.href;
    if (!href) return;
    openNavigatorWindow(href);
  });
}

bindMartigliWidget();
martigliState.subscribe((snapshot) => {
  syncMartigliInputs(snapshot);
  updateMartigliPreview(snapshot);
  renderMartigliOscillationSelect(snapshot);
});
updateMartigliPreview(martigliState.snapshot());

if (ui.modalOverlay) {
  ui.modalOverlay.addEventListener("click", closeDetailModal);
}

if (ui.modalClose) {
  ui.modalClose.addEventListener("click", closeDetailModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && ui.modal && !ui.modal.classList.contains("hidden")) {
    closeDetailModal();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    audioEngine.stop();
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => audioEngine.stop());
}

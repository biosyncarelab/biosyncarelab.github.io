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
  emailForm: document.getElementById("email-form"),
  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  emailSignUp: document.getElementById("email-sign-up"),
  messages: document.getElementById("messages"),
  dashboard: document.getElementById("dashboard"),
  sessionList: document.getElementById("session-list"),
  presetList: document.getElementById("preset-list"),
  sessionStatus: document.getElementById("session-status"),
  presetStatus: document.getElementById("preset-status"),
  authModeText: document.getElementById("auth-mode-text"),
  toggleAuthMode: document.getElementById("toggle-auth-mode"),
  modal: document.getElementById("detail-modal"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalKind: document.getElementById("modal-kind"),
  modalMeta: document.getElementById("modal-meta"),
  modalTracks: document.getElementById("modal-tracks"),
  modalTrackHint: document.getElementById("modal-track-hint"),
  modalMartigli: document.getElementById("modal-martigli"),
  modalClose: document.getElementById("modal-close"),
  martigliStart: document.getElementById("martigli-start"),
  martigliEnd: document.getElementById("martigli-end"),
  martigliWaveform: document.getElementById("martigli-waveform"),
  martigliPreview: document.getElementById("martigli-preview"),
  martigliCanvas: document.getElementById("martigli-canvas"),
  structureSection: document.getElementById("structure-section"),
  structureSummary: document.getElementById("structure-summary"),
  structureList: document.getElementById("structure-list"),
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
  presets: [],
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
  if (ui.googleSignIn) {
    const emulatorBlocksFederated = useAuthEmulator;
    ui.googleSignIn.disabled = isBusy || !!user || emulatorBlocksFederated;
    ui.googleSignIn.title = emulatorBlocksFederated
      ? "Google sign-in is disabled when the Auth emulator is active."
      : "";
  }
  if (ui.googleSignOut) {
    ui.googleSignOut.disabled = isBusy || !user;
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

const buildNavigatorUrl = (link) => {
  if (!link || !link.uri) return null;
  const params = new URLSearchParams({ concept: link.uri });
  if (link.navigator) {
    params.set("ontology", link.navigator);
  }
  return `nso-navigator.html?${params.toString()}`;
};

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
  ui.presetStatus.textContent = "Loading presets…";
  try {
    const [sessionSnap, presetSnap] = await Promise.all([
      getDocs(collection(db, "sessions")),
      getDocs(collection(db, "presets")),
    ]);
    const sessions = sessionSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const presets = presetSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    dashboardState.sessions = sessions;
    dashboardState.presets = presets;
    renderDashboardList(ui.sessionList, ui.sessionStatus, sessions, "No sessions found.", "session");
    renderDashboardList(ui.presetList, ui.presetStatus, presets, "No presets found.", "preset");
  } catch (err) {
    console.error("Dashboard load failed", err);
    ui.sessionStatus.textContent = "Unable to load sessions.";
    ui.presetStatus.textContent = "Unable to load presets.";
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

const renderTrackList = (record, kind) => {
  if (!ui.modalTracks || !ui.modalTrackHint) return;
  audioEngine.stop();
  clearList(ui.modalTracks);
  const tracks = record.voices ?? record.tracks ?? [];
  if (!tracks.length) {
    ui.modalTrackHint.textContent = "No tracks stored yet.";
    return;
  }
  ui.modalTrackHint.textContent = `${tracks.length} track${tracks.length > 1 ? "s" : ""}`;
  tracks.forEach((track, index) => {
    const card = document.createElement("li");
    card.className = "track-card";
    const title = document.createElement("h5");
    title.textContent = track.label ?? `Track ${index + 1}`;
    const meta = document.createElement("div");
    meta.className = "track-meta";
    const presetChip = document.createElement("span");
    presetChip.textContent = track.presetId ? `Preset · ${track.presetId}` : "Custom";
    const gainChip = document.createElement("span");
    if (track.gain !== undefined) {
      gainChip.textContent = `Gain ${track.gain}`;
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
      hint.textContent = "Audio preview unavailable for this track.";
      actions.appendChild(hint);
    }
    card.appendChild(actions);
    ui.modalTracks.appendChild(card);
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
  ui.modalTitle.textContent = record.label ?? record.name ?? record.id ?? "Untitled";
  ui.modalKind.textContent = normalizedKind === "session" ? "Session" : "Preset";
  renderModalMeta(record, normalizedKind);
  renderTrackList(record, normalizedKind);
  renderMartigliParams(record);
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
  if (!ui.martigliPreview || !snapshot) return;
  const delta = snapshot.endPeriod - snapshot.startPeriod;
  const direction = delta === 0 ? "steady" : delta > 0 ? "slows" : "quickens";
  ui.martigliPreview.textContent = `Breath ${direction} from ${snapshot.startPeriod}s to ${snapshot.endPeriod}s on a ${snapshot.waveform} wave.`;
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
    clearList(ui.presetList);
    if (ui.sessionStatus) ui.sessionStatus.textContent = "Sign in to load sessions.";
    if (ui.presetStatus) ui.presetStatus.textContent = "Sign in to load presets.";
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

ui.googleSignOut.addEventListener("click", async () => {
  setBusy(true);
  try {
    await signOut(auth);
    setMessage("Signed out", "info");
  } catch (err) {
    handleError(err);
  } finally {
    setBusy(false);
  }
});

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

bindMartigliWidget();
martigliState.subscribe((snapshot) => {
  syncMartigliInputs(snapshot);
  updateMartigliPreview(snapshot);
});

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

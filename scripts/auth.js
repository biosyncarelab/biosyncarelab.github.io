import { firebaseConfig } from "./firebase-config.js";
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
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const isLocalhost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
const useAuthEmulator = isLocalhost && !window.localStorage?.getItem("bsc.useProdAuth");

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
const martigliState = {
  startPeriod: 10,
  endPeriod: 20,
  waveform: "sine",
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

const createOntologySlot = (kind, id) => {
  const slot = document.createElement("div");
  slot.className = "ontology-slot";
  slot.dataset.kind = kind;
  if (id) {
    slot.dataset.recordId = id;
  }
  slot.textContent = "Ontology link placeholder";
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

const renderTrackList = (record) => {
  if (!ui.modalTracks || !ui.modalTrackHint) return;
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
  ui.modal.classList.add("hidden");
  ui.modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openDetailModal(record, kind) {
  if (!ui.modal) return;
  ui.modalTitle.textContent = record.label ?? record.name ?? record.id ?? "Untitled";
  ui.modalKind.textContent = kind === "session" ? "Session" : "Preset";
  renderModalMeta(record, kind);
  renderTrackList(record);
  renderMartigliParams(record);
  ui.modal.classList.remove("hidden");
  ui.modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

const updateMartigliPreview = () => {
  if (!ui.martigliPreview) return;
  const delta = martigliState.endPeriod - martigliState.startPeriod;
  const direction = delta === 0 ? "steady" : delta > 0 ? "slows" : "quickens";
  ui.martigliPreview.textContent = `Breath ${direction} from ${martigliState.startPeriod}s to ${martigliState.endPeriod}s on a ${martigliState.waveform} wave.`;
};

const bindMartigliWidget = () => {
  if (!ui.martigliStart || !ui.martigliEnd || !ui.martigliWaveform) return;
  ui.martigliStart.addEventListener("input", (event) => {
    martigliState.startPeriod = Number(event.target.value);
    if (martigliState.startPeriod > martigliState.endPeriod) {
      martigliState.endPeriod = martigliState.startPeriod;
      ui.martigliEnd.value = String(martigliState.endPeriod);
    }
    updateMartigliPreview();
  });
  ui.martigliEnd.addEventListener("input", (event) => {
    martigliState.endPeriod = Number(event.target.value);
    if (martigliState.endPeriod < martigliState.startPeriod) {
      martigliState.startPeriod = martigliState.endPeriod;
      ui.martigliStart.value = String(martigliState.startPeriod);
    }
    updateMartigliPreview();
  });
  ui.martigliWaveform.addEventListener("change", (event) => {
    martigliState.waveform = event.target.value;
    updateMartigliPreview();
  });
  updateMartigliPreview();
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

bindMartigliWidget();

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

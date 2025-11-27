/**
 * UI Renderer Module
 * Pure rendering functions - no data fetching, no side effects
 * Takes data and DOM elements, returns rendered UI
 */

import { UI_CONFIG, UI_TEXT } from '../constants.js';

/**
 * Clear a list element
 * @param {HTMLElement} listEl
 */
export function clearList(listEl) {
  if (!listEl) return;
  listEl.innerHTML = '';
}

/**
 * Set message in message area
 * @param {HTMLElement} messageEl
 * @param {string} text
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
export function setMessage(messageEl, text, type = 'info') {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.type = type;
}

/**
 * Clear message
 * @param {HTMLElement} messageEl
 */
export function clearMessage(messageEl) {
  if (!messageEl) return;
  messageEl.textContent = '';
  messageEl.dataset.type = '';
}

/**
 * Render authentication state in UI
 * @param {HTMLElement} elements - UI elements { state, email, userId }
 * @param {object|null} user - Firebase user object
 */
export function renderAuthState(elements, user) {
  if (!elements) return;

  if (user) {
    if (elements.state) elements.state.textContent = 'Signed in';
    if (elements.email) elements.email.textContent = user.email ?? 'N/A';
    if (elements.userId) elements.userId.textContent = user.uid ?? 'N/A';
  } else {
    if (elements.state) elements.state.textContent = 'Signed out';
    if (elements.email) elements.email.textContent = '—';
    if (elements.userId) elements.userId.textContent = '—';
  }
}

/**
 * Toggle visibility of authentication panels
 * @param {HTMLElement} authPanel - Auth forms panel
 * @param {HTMLElement} dashboardPanel - Dashboard panel
 * @param {boolean} isAuthenticated
 */
export function toggleAuthPanels(authPanel, dashboardPanel, isAuthenticated) {
  if (authPanel) {
    authPanel.classList.toggle(UI_CONFIG.CLASSES.HIDDEN, isAuthenticated);
  }
  if (dashboardPanel) {
    dashboardPanel.classList.toggle(UI_CONFIG.CLASSES.HIDDEN, !isAuthenticated);
  }
}

const formatMetaValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "number") {
    return value;
  }
  return String(value);
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
      if (typeof window !== "undefined") {
        window.open(destination, "_blank", "noopener,noreferrer");
      }
    });
  } else {
    button.disabled = true;
  }
  return button;
};

const createOntologySlot = (kind, id, rdfLinker) => {
  const slot = document.createElement("div");
  slot.className = "ontology-slot";
  slot.dataset.kind = kind;
  if (id) {
    slot.dataset.recordId = id;
  }
  const links = id && rdfLinker ? rdfLinker.get(id) : [];
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

const getTrackCount = (entry) => {
  if (!entry) return 0;
  if (Number.isFinite(entry.trackCount)) {
    return entry.trackCount;
  }
  // Fallback if tracks array is present
  if (Array.isArray(entry.tracks)) return entry.tracks.length;
  if (Array.isArray(entry.voices)) return entry.voices.length;
  return 0;
};

const summarizeTracks = (tracks = []) => {
  const counts = { audio: 0, visual: 0, haptic: 0, other: 0 };
  tracks.forEach((t) => {
    const key = (t.modality ?? t.type ?? "other").toLowerCase();
    if (counts[key] !== undefined) counts[key] += 1;
    else counts.other += 1;
  });
  return counts;
};

const createDashboardCard = (item, kind, callbacks = {}, rdfLinker) => {
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

  const detail = document.createElement("div");
  detail.className = "session-detail hidden";
  const tracks = Array.isArray(item.tracks) ? item.tracks : [];
  const counts = summarizeTracks(tracks);
  const martigliCount = item.martigli?.oscillations?.length ?? 0;
  const detailList = document.createElement("ul");
  detailList.className = "session-detail-list";
  const trackLabels = tracks.slice(0, 4).map((t) => t.label ?? t.name ?? t.class ?? t.type ?? "Track");
  if (trackLabels.length) {
    const liTracks = document.createElement("li");
    liTracks.textContent = `Tracks: ${trackLabels.join(", ")}${tracks.length > 4 ? `, +${tracks.length - 4} more` : ""}`;
    detailList.appendChild(liTracks);
  }
  const liCounts = document.createElement("li");
  liCounts.textContent = `Types — Audio: ${counts.audio}, Visual: ${counts.visual}, Haptic: ${counts.haptic}`;
  detailList.appendChild(liCounts);
  const liMartigli = document.createElement("li");
  liMartigli.textContent = `Martigli oscillations: ${martigliCount}`;
  detailList.appendChild(liMartigli);
  detail.appendChild(detailList);
  li.appendChild(detail);

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.className = "primary small";
  loadBtn.textContent = "Load";
  loadBtn.addEventListener("click", () => callbacks.onLoad?.(item, kind));
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "ghost small";
  addBtn.textContent = "Add";
  addBtn.addEventListener("click", () => callbacks.onAdd?.(item, kind));
  const detailBtn = document.createElement("button");
  detailBtn.type = "button";
  detailBtn.className = "ghost small";
  detailBtn.textContent = "Details";
  detailBtn.addEventListener("click", () => {
    detail.classList.toggle("hidden");
    detailBtn.textContent = detail.classList.contains("hidden") ? "Details" : "Hide details";
  });
  footer.appendChild(loadBtn);
  footer.appendChild(addBtn);
  footer.appendChild(detailBtn);
  footer.appendChild(createOntologySlot(kind, item.id, rdfLinker));
  li.appendChild(footer);

  return li;
};

/**
 * Render session list (Rich Dashboard Version)
 * @param {HTMLElement} listEl - Container element
 * @param {HTMLElement} statusEl - Status text element
 * @param {Array} sessions - Array of session objects
 * @param {Function} onSessionClick - Callback when session is clicked
 * @param {object} rdfLinker - RDF Linker instance
 */
export function renderSessionList(listEl, statusEl, sessions, callbacks = {}, rdfLinker) {
  if (!listEl || !statusEl) return;

  clearList(listEl);

  if (!sessions || sessions.length === 0) {
    statusEl.textContent = UI_TEXT.SESSION.NO_SESSIONS;
    return;
  }

  statusEl.textContent = `${sessions.length} session${sessions.length > 1 ? 's' : ''}`;

  sessions.forEach(session => {
    const card = createDashboardCard(session, 'session', callbacks, rdfLinker);
    listEl.appendChild(card);
  });
}

/**
 * Create a session card element (Simple Version - Deprecated/Fallback)
 * @param {object} session - Session data
 * @param {Function} onSessionClick - Click handler
 * @returns {HTMLElement}
 */
export function createSessionCard(session, onSessionClick) {
  const li = document.createElement('li');
  li.className = 'session-card';

  const heading = document.createElement('h4');
  heading.textContent = session.label || 'Untitled Session';

  const meta = document.createElement('p');
  meta.className = 'session-meta';
  meta.textContent = session.kind || 'custom';

  const openBtn = document.createElement('button');
  openBtn.className = `${UI_CONFIG.CLASSES.GHOST} ${UI_CONFIG.CLASSES.SMALL}`;
  openBtn.textContent = 'Open';
  openBtn.onclick = () => onSessionClick && onSessionClick(session);

  li.appendChild(heading);
  li.appendChild(meta);
  li.appendChild(openBtn);

  return li;
}

export function renderStructurePreview(record, elements, structureStore, rdfLinker) {
  if (!elements.structureSection || !elements.structureSummary || !elements.structureList) {
    return;
  }
  const { datasets, error, loading } = structureStore.snapshot();
  if (loading && !datasets.length) {
    elements.structureSummary.textContent = "Loading structure preview…";
    elements.structureList.innerHTML = "";
    return;
  }
  if (error) {
    elements.structureSummary.textContent = "Unable to load structure data.";
    elements.structureList.innerHTML = "";
    return;
  }
  if (!datasets.length) {
    elements.structureSummary.textContent = "No structure payload available.";
    elements.structureList.innerHTML = "";
    return;
  }
  elements.structureSummary.textContent = `${datasets.length} structure set${datasets.length > 1 ? "s" : ""} ready.`;
  elements.structureList.innerHTML = "";
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

    const ontologyLinks = rdfLinker ? rdfLinker.get(dataset.id) : [];
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

    elements.structureList.appendChild(container);
  });
};

/**
 * Render Martigli oscillator list in dashboard
 * @param {HTMLElement} listEl - Container element
 * @param {Array} oscillations - Array of oscillator objects
 * @param {Function} onOscillatorClick - Click handler
 */
export function renderMartigliDashboardList(listEl, oscillations, onOscillatorClick) {
  if (!listEl) return;

  clearList(listEl);

  if (!oscillations || oscillations.length === 0) {
    const notice = document.createElement('p');
    notice.className = 'empty-notice';
    notice.textContent = UI_TEXT.MARTIGLI.NO_OSCILLATORS;
    listEl.appendChild(notice);
    return;
  }

  oscillations.forEach(osc => {
    const widget = createMartigliWidget(osc, onOscillatorClick);
    listEl.appendChild(widget);
  });
}

/**
 * Create a Martigli oscillator widget
 * @param {object} oscillator - Oscillator data
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement}
 */
export function createMartigliWidget(oscillator, onClick) {
  const widget = document.createElement('li');
  widget.className = 'martigli-widget';
  widget.dataset.oscillatorId = oscillator.id;

  const heading = document.createElement('h5');
  heading.textContent = oscillator.id || 'Unnamed';

  const details = document.createElement('p');
  details.className = 'martigli-details';
  details.textContent = `${oscillator.startPeriod}s → ${oscillator.endPeriod}s (${oscillator.transitionSeconds}s transition)`;

  const viewBtn = document.createElement('button');
  viewBtn.className = `${UI_CONFIG.CLASSES.GHOST} ${UI_CONFIG.CLASSES.TINY}`;
  viewBtn.textContent = 'View';
  viewBtn.onclick = () => onClick && onClick(oscillator);

  widget.appendChild(heading);
  widget.appendChild(details);
  widget.appendChild(viewBtn);

  return widget;
}

/**
 * Render track section (audio/visual/haptic)
 * @param {HTMLElement} listEl - Track list element
 * @param {HTMLElement} statusEl - Status element
 * @param {Array} tracks - Array of track objects
 * @param {string} modality - 'audio', 'visual', 'haptic'
 * @param {Function} onTrackClick - Click handler
 */
export function renderTrackSection(listEl, statusEl, tracks, modality, onTrackClick) {
  if (!listEl || !statusEl) return;

  clearList(listEl);

  if (!tracks || tracks.length === 0) {
    statusEl.textContent = UI_TEXT.TRACK.NO_TRACKS;
    return;
  }

  statusEl.textContent = `${tracks.length} ${modality} track${tracks.length > 1 ? 's' : ''}`;

  tracks.forEach(track => {
    const trackEl = createTrackElement(track, modality, onTrackClick);
    listEl.appendChild(trackEl);
  });
}

/**
 * Create a track element
 * @param {object} track - Track data
 * @param {string} modality - Track modality
 * @param {Function} onClick - Click handler
 * @returns {HTMLElement}
 */
export function createTrackElement(track, modality, onClick) {
  const li = document.createElement('li');
  li.className = `track-item ${modality}-track`;
  li.dataset.trackId = track.id;

  const label = document.createElement('span');
  label.className = 'track-label';
  label.textContent = track.label || `${modality} track`;

  const controls = document.createElement('div');
  controls.className = 'track-controls';

  const playBtn = document.createElement('button');
  playBtn.className = `${UI_CONFIG.CLASSES.GHOST} ${UI_CONFIG.CLASSES.TINY}`;
  playBtn.textContent = 'Play';
  playBtn.onclick = () => onClick && onClick(track, 'play');

  const editBtn = document.createElement('button');
  editBtn.className = `${UI_CONFIG.CLASSES.GHOST} ${UI_CONFIG.CLASSES.TINY}`;
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => onClick && onClick(track, 'edit');

  controls.appendChild(playBtn);
  controls.appendChild(editBtn);

  li.appendChild(label);
  li.appendChild(controls);

  return li;
}

/**
 * Render modal metadata
 * @param {HTMLElement} metaEl - Metadata container
 * @param {object} record - Session/preset record
 */
export function renderModalMeta(metaEl, record) {
  if (!metaEl) return;

  metaEl.innerHTML = '';

  const fields = [
    { label: 'Folder', value: record.folderId ?? record.folder ?? '—' },
    { label: 'Kind', value: record.kind ?? '—' },
    { label: 'ID', value: record.id ?? '—' },
  ];

  fields.forEach(field => {
    const row = document.createElement('div');
    row.className = 'meta-row';

    const labelEl = document.createElement('strong');
    labelEl.textContent = `${field.label}: `;

    const valueEl = document.createElement('span');
    valueEl.textContent = field.value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);

    metaEl.appendChild(row);
  });
}

/**
 * Render RDF ontology links
 * @param {HTMLElement} containerEl - Container element
 * @param {Array} links - Array of RDF link objects
 * @param {Function} onLinkClick - Click handler
 */
export function renderRDFLinks(containerEl, links, onLinkClick) {
  if (!containerEl) return;

  containerEl.innerHTML = '';

  if (!links || links.length === 0) {
    return;
  }

  const linkList = document.createElement('ul');
  linkList.className = 'rdf-link-list';

  links.forEach(link => {
    const li = document.createElement('li');
    li.className = 'rdf-link-item';

    const anchor = document.createElement('a');
    anchor.href = '#';
    anchor.textContent = link.label || link.uri;
    anchor.title = link.summary || '';
    anchor.onclick = (e) => {
      e.preventDefault();
      onLinkClick && onLinkClick(link);
    };

    li.appendChild(anchor);

    if (link.summary) {
      const summary = document.createElement('p');
      summary.className = 'rdf-link-summary';
      summary.textContent = link.summary;
      li.appendChild(summary);
    }

    linkList.appendChild(li);
  });

  containerEl.appendChild(linkList);
}

/**
 * Toggle element visibility
 * @param {HTMLElement} element
 * @param {boolean} visible
 */
export function toggleVisibility(element, visible) {
  if (!element) return;
  element.classList.toggle(UI_CONFIG.CLASSES.HIDDEN, !visible);
}

/**
 * Set element as busy/loading
 * @param {HTMLElement} element
 * @param {boolean} busy
 */
export function setBusy(element, busy) {
  if (!element) return;
  element.classList.toggle(UI_CONFIG.CLASSES.DISABLED, busy);
  element.disabled = busy;
}

/**
 * Create a button element
 * @param {object} config - { label, variant, size, onClick }
 * @returns {HTMLElement}
 */
export function createButton({ label, variant = 'ghost', size = 'small', onClick }) {
  const button = document.createElement('button');
  button.className = `${variant} ${size}`;
  button.textContent = label;

  if (onClick) {
    button.onclick = onClick;
  }

  return button;
}

/**
 * Create an empty state message
 * @param {string} message
 * @returns {HTMLElement}
 */
export function createEmptyState(message) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.textContent = message;
  return el;
}

/**
 * Render loading indicator
 * @param {HTMLElement} containerEl
 */
export function showLoading(containerEl) {
  if (!containerEl) return;

  containerEl.innerHTML = '';

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.setAttribute('aria-label', 'Loading');

  containerEl.appendChild(spinner);
}

/**
 * Show error message in container
 * @param {HTMLElement} containerEl
 * @param {string} message
 */
export function showError(containerEl, message) {
  if (!containerEl) return;

  containerEl.innerHTML = '';

  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.textContent = message;

  containerEl.appendChild(errorEl);
}

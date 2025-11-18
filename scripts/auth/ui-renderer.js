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

/**
 * Render session list
 * @param {HTMLElement} listEl - Container element
 * @param {HTMLElement} statusEl - Status text element
 * @param {Array} sessions - Array of session objects
 * @param {Function} onSessionClick - Callback when session is clicked
 */
export function renderSessionList(listEl, statusEl, sessions, onSessionClick) {
  if (!listEl || !statusEl) return;

  clearList(listEl);

  if (!sessions || sessions.length === 0) {
    statusEl.textContent = UI_TEXT.SESSION.NO_SESSIONS;
    return;
  }

  statusEl.textContent = `${sessions.length} session${sessions.length > 1 ? 's' : ''}`;

  sessions.forEach(session => {
    const card = createSessionCard(session, onSessionClick);
    listEl.appendChild(card);
  });
}

/**
 * Create a session card element
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

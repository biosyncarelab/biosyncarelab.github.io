import { describeMartigliLiveSummary } from './martigli-ui.js';

let martigliState = null;

export const setMartigliState = (state) => {
  martigliState = state;
};

const TRACK_VISUALIZER_DEFAULT = {
  width: 320,
  height: 120,
};

const MARTIGLI_BINDING_LIMITS = {
  baseMin: 40,
  baseMax: 1200,
  depthMin: 0,
  depthMax: 150,
};

// State registries
const trackBindingRegistry = new Map();
const trackVisualizerRegistry = new Map();
let activeVisualizerTrack = null;
let activeVisualizerContext = null;

// Visualizer UI State
let visualizerUI = {
  overlay: null,
  modal: null,
  content: null,
  close: null
};

// Helper to serialize track state for preview
export const serializeTrackState = (track) => {
  const base = typeof track.toJSON === "function" ? track.toJSON() : {
    id: track.id,
    label: track.label,
    type: track.type,
    modality: track.modality,
    enabled: track.enabled,
  };

  return {
    ...base,
    class: track.constructor?.name ?? base.class ?? null,
    modality: track.modality ?? base.modality ?? base.type ?? null,
    isMartigli: Boolean(track.isMartigli ?? base.isMartigli),
    martigli: track.martigli ?? base.martigli ?? null,
  };
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

export const drawTrackVisualizer = (canvas, track, options = {}) => {
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

export const registerTrackVisualizer = (track, canvas, options = {}) => {
  if (!track || !canvas) return;
  if (track.id) {
    trackVisualizerRegistry.set(track.id, { track, canvas, options });
  }
  drawTrackVisualizer(canvas, track, options);
};

export const unregisterTrackVisualizer = (trackId) => {
  if (!trackId) return;
  trackVisualizerRegistry.delete(trackId);
};

export const redrawTrackVisualizer = (trackId) => {
  if (!trackId) return;
  const entry = trackVisualizerRegistry.get(trackId);
  if (!entry) return;
  drawTrackVisualizer(entry.canvas, entry.track, entry.options);
};

export const refreshTrackVisualizers = (activeModalElements = null) => {
  trackVisualizerRegistry.forEach((_, trackId) => redrawTrackVisualizer(trackId));

  // Handle modal visualizer if active
  if (activeVisualizerTrack && activeModalElements?.visualizerModal && !activeModalElements.visualizerModal.classList.contains("hidden")) {
    drawTrackVisualizer(activeModalElements.visualizerCanvas, activeVisualizerTrack, {
      width: activeModalElements.visualizerCanvas?.clientWidth || activeModalElements.visualizerCanvas?.width || 760,
      height: activeModalElements.visualizerCanvas?.clientHeight || activeModalElements.visualizerCanvas?.height || 280,
    });
    if (activeModalElements.visualizerSummary) {
      activeModalElements.visualizerSummary.textContent = describeTrackVisualizerSummary(activeVisualizerTrack, activeVisualizerContext);
    }
  }
};

export const clearTrackVisualizers = () => {
  trackVisualizerRegistry.clear();
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

export const updateTrackBindingPreview = (trackId) => {
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

export const refreshTrackBindingOptions = (snapshot = martigliState?.snapshot?.()) => {
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

export const refreshAllTrackBindings = () => {
  trackBindingRegistry.forEach((entry) => updateTrackBindingPreview(entry.trackId));
  refreshTrackVisualizers();
};

export const hasActiveBindingTargets = () => {
  for (const entry of trackBindingRegistry.values()) {
    if (entry.elements?.preview) {
      return true;
    }
  }
  return false;
};

export const clearTrackBindings = () => {
  trackBindingRegistry.forEach((entry) => {
    entry.elements = {};
  });
};

export const createTrackBindingControls = (track) => {
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

const formatPanelLabel = (label = "") =>
  label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

const createTrackPreviewButton = (track, context = {}, callbacks = {}) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ghost small";
  button.textContent = "Preview";
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    callbacks.onPreview?.(track, context, button);
  });
  return button;
};

const createSensoryListItem = (track, record, kind, index, panelLabel, callbacks = {}) => {
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
    const previewButton = createTrackPreviewButton(track, { record, kind, index }, callbacks);
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

export const renderSensoryPanels = (panels, buckets, callbacks = {}) => {
  ['audio', 'visual', 'haptic'].forEach(key => {
    const panel = panels[key];
    const items = buckets[key] || [];
    if (!panel || !panel.list || !panel.status) return;

    panel.list.innerHTML = '';

    if (!items.length) {
      panel.status.textContent = `No ${panel.label} tracks stored yet.`;
      return;
    }

    const plural = items.length === 1 ? "" : "s";
    panel.status.textContent = `${items.length} ${panel.label} track${plural}`;

    items.forEach(({ track, index, record, kind }) => {
       panel.list.appendChild(createSensoryListItem(track, record, kind, index, panel.label, callbacks));
    });
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

export const detectTrackModality = (track = {}) => {
  const tags = Array.isArray(track.tags) ? track.tags.join(" ") : "";
  const descriptor = [track.modality, track.kind, track.channel, track.category, track.type, tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/(video|visual|light|led|display)/.test(descriptor)) return "video";
  if (/(haptic|tactile|vibration|touch)/.test(descriptor)) return "haptics";
  return "audio";
};

const trackExpansionState = new Map();

export const getTrackExpansionState = (sessionId, trackId) => {
  const sessionMap = trackExpansionState.get(sessionId);
  return sessionMap?.get(trackId) ?? false;
};

export const setTrackExpansionState = (sessionId, trackId, expanded) => {
  if (!trackExpansionState.has(sessionId)) {
    trackExpansionState.set(sessionId, new Map());
  }
  trackExpansionState.get(sessionId).set(trackId, expanded);
};

export const getSessionTrackBucket = (record) => record?.id ?? record?.uid ?? "lab";

export const buildTrackCard = (track, record, kind, index, callbacks = {}) => {
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
    const metrics = martigliState?.getRuntimeMetrics?.(track.martigli?.oscillatorId ?? track.id);
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
    const previewButton = createTrackPreviewButton(track, { record, kind, index }, callbacks);
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

  const visualizer = createTrackVisualizer(track, { record, kind, index }, callbacks);
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

const renderTrackSection = (items, list, hint, record, kind, type, callbacks) => {
  if (!list) return;
  list.innerHTML = "";
  if (!items || !items.length) {
    if (hint) hint.textContent = "No tracks";
    return;
  }
  if (hint) hint.textContent = `${items.length} track${items.length === 1 ? "" : "s"}`;

  items.forEach(({ track, index }) => {
    const card = buildTrackCard(track, record, kind, index, callbacks);
    list.appendChild(card);
  });
};

export const renderModalTrackSections = (tracks, record, kind, containers, callbacks = {}) => {
  trackVisualizerRegistry.clear();

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

  if (containers.audio) {
    renderTrackSection(buckets.audio, containers.audio.list, containers.audio.hint, record, kind, "audio", callbacks);
  }
  if (containers.video) {
    renderTrackSection(buckets.video, containers.video.list, containers.video.hint, record, kind, "visual", callbacks);
  }
  if (containers.haptics) {
    renderTrackSection(buckets.haptics, containers.haptics.list, containers.haptics.hint, record, kind, "haptic", callbacks);
  }

  refreshTrackBindingOptions();
  refreshAllTrackBindings();
};

// Visualizer UI
export const setupVisualizerModal = (elements) => {
  visualizerUI = { ...elements };
};

export const closeTrackVisualizerModal = ({ reason } = {}) => {
  if (visualizerUI.overlay) visualizerUI.overlay.classList.add("hidden");
  if (visualizerUI.modal) visualizerUI.modal.classList.add("hidden");

  activeVisualizerTrack = null;
  activeVisualizerContext = null;

  if (visualizerUI.content) {
    visualizerUI.content.innerHTML = "";
  }
};

export const describeTrackVisualizerSummary = (track, context) => {
  if (!track) return "No track selected.";
  return `${track.label || "Track"} (${track.modality || "unknown"})`;
};

export const createTrackVisualizer = (track, context, callbacks) => {
  const container = document.createElement("div");
  container.className = "track-visualizer-container";

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 120;
  canvas.style.width = "100%";
  canvas.style.height = "120px";
  canvas.style.backgroundColor = "#111";

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.fillText("Visualizer Preview", 10, 20);
    ctx.fillText(track.label, 10, 40);
  }

  container.appendChild(canvas);
  return container;
};

export const updateTrackVisualizers = () => {
  // Placeholder for animation loop
};

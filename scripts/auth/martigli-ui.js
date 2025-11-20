import { appState } from '../state/app-state.js';
import { UI_CONFIG } from '../constants.js';

// We need to handle dependencies.
// In auth.js, martigliState comes from kernel.martigli.
// We should probably pass state/kernel to these functions or use the singleton appState if it has access.
// For now, let's make these functions accept the state or callbacks.

const MARTIGLI_WAVEFORM_PADDING = { top: 12, right: 16, bottom: 22, left: 36 };
const MARTIGLI_TIMELINE_PADDING = { top: 18, right: 32, bottom: 36, left: 58 };
const MARTIGLI_TRAJECTORY_LIMIT = 16;

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

export const drawMartigliWaveform = (chart, osc = {}, metrics = null) => {
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

export const createMartigliWaveformChart = (callbacks = {}) => {
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
    onRatioChange: callbacks.onRatioChange
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

export const drawMartigliTimeline = (chart, osc = {}, metrics = null) => {
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

export const createMartigliTimelineChart = (callbacks = {}) => {
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
    onStartPeriodChange: callbacks.onStartPeriodChange,
    onEndPeriodChange: callbacks.onEndPeriodChange
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

export const describeMartigliLiveSummary = (reference) => {
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
};

const createRangeLabel = (text) => {
  const label = document.createElement("label");
  const title = document.createElement("span");
  title.textContent = text;
  label.appendChild(title);
  return label;
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

export const createMartigliDashboardWidget = (osc, callbacks = {}) => {
  const widget = {
    oscillationId: osc.id,
  };
  const root = document.createElement("section");
  root.className = "martigli-widget";
  root.dataset.oscillationId = osc.id ?? "";
  root.widget = widget; // Attach widget reference for telemetry updates

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

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "martigli-pill martigli-pill--delete";
  deleteButton.textContent = "Delete";
  deleteButton.title = "Delete oscillation";

  buttonGroup.appendChild(startButton);
  buttonGroup.appendChild(stopButton);
  buttonGroup.appendChild(deleteButton);

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

  const waveformChart = createMartigliWaveformChart({
    onRatioChange: (ratio) => callbacks.onInhaleRatioChange?.(ratio, widget.oscillationId)
  });

  const timelineChart = createMartigliTimelineChart({
    onStartPeriodChange: (val) => callbacks.onStartPeriodChange?.(val, widget.oscillationId),
    onEndPeriodChange: (val) => callbacks.onEndPeriodChange?.(val, widget.oscillationId)
  });

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

  // Bind events
  startButton.addEventListener("click", () => callbacks.onStart?.(widget.oscillationId));
  stopButton.addEventListener("click", () => callbacks.onStop?.(widget.oscillationId));

  deleteButton.addEventListener("click", () => {
    callbacks.onDelete?.(widget.oscillationId);
  });

  return widget;
};

export const updateMartigliWidget = (widget, osc) => {
  if (!widget || !osc) return;

  // Update text
  if (widget.title) widget.title.textContent = osc.label ?? "Martigli Oscillation";
  if (widget.summary) widget.summary.textContent = describeMartigliLiveSummary(osc);

  // Update status
  const isActive = Boolean(osc.sessionActive);
  if (widget.indicator) {
    widget.indicator.classList.toggle("active", isActive);
  }
  if (widget.statusText) {
    widget.statusText.textContent = isActive ? "Active" : "Idle";
  }

  // Update buttons
  if (widget.buttons) {
    if (widget.buttons.start) widget.buttons.start.disabled = isActive;
    if (widget.buttons.stop) widget.buttons.stop.disabled = !isActive;
  }

  // Update controls
  const controls = widget.controls;
  if (controls) {
    if (controls.start) controls.start.value = osc.startPeriodSec ?? 10;
    if (controls.startValue) controls.startValue.textContent = `${(osc.startPeriodSec ?? 10).toFixed(1)}s`;

    if (controls.end) controls.end.value = osc.endPeriodSec ?? 20;
    if (controls.endValue) controls.endValue.textContent = `${(osc.endPeriodSec ?? 20).toFixed(1)}s`;

    if (controls.transition) controls.transition.value = osc.transitionSec ?? 0;
    if (controls.transitionValue) controls.transitionValue.textContent = `${Math.round(osc.transitionSec ?? 0)}s`;

    if (controls.waveform) controls.waveform.value = osc.waveform ?? "sine";

    if (controls.inhale) controls.inhale.value = osc.inhaleRatio ?? 0.5;
    if (controls.inhaleValue) controls.inhaleValue.textContent = `${Math.round((osc.inhaleRatio ?? 0.5) * 100)}%`;

    if (controls.amplitude) controls.amplitude.value = osc.amplitude ?? 1;
    if (controls.amplitudeValue) controls.amplitudeValue.textContent = `${(osc.amplitude ?? 1).toFixed(2)}×`;
  }

  // Update charts
  if (widget.charts) {
    if (widget.charts.waveform) widget.charts.waveform.render(osc, null);
    if (widget.charts.timeline) widget.charts.timeline.render(osc, null);
  }
};

export const updateMartigliWidgetTelemetry = (widget, metrics) => {
  if (!widget || !metrics) return;

  // Update telemetry text
  const refs = widget.telemetryRefs;
  if (refs) {
    if (refs.value) refs.value.textContent = formatMartigliDecimal(metrics.value, 2);
    if (refs.phase) refs.phase.textContent = Number.isFinite(metrics.phase) ? `${Math.round(metrics.phase * 100)}%` : "—";
    if (refs.period) refs.period.textContent = Number.isFinite(metrics.period) ? `${metrics.period.toFixed(1)}s` : "—";
  }

  // Update charts with live metrics
  if (widget.charts) {
    // We need the oscillation object to render the chart correctly.
    // Ideally we should have access to it.
    // For now, we assume the chart state has what it needs or we pass null for osc if not available.
    // Actually, the chart render function expects (osc, metrics).
    // We might need to store the latest osc on the widget.
    // Let's assume the chart state has a reference or we can get it.
    // But wait, the chart render function is: state.render = (osc, metrics) => drawMartigliWaveform(state, osc, metrics);
    // So we need 'osc'.
    // We can attach the latest osc to the widget in updateMartigliWidget.
  }
};

export const renderMartigliDashboard = (container, snapshot, callbacks) => {
  if (!container) return;
  container.innerHTML = "";

  const oscillations = snapshot.oscillations || [];
  if (oscillations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted-text";
    empty.textContent = "No oscillations found.";
    container.appendChild(empty);
    return;
  }

  oscillations.forEach(osc => {
    const widget = createMartigliDashboardWidget(osc, callbacks);
    updateMartigliWidget(widget, osc);
    container.appendChild(widget.root);
  });
};

export const ensureMartigliTelemetryLoop = (martigliState, container) => {
  if (typeof window === "undefined") return;

  const loop = () => {
    if (!container) return;

    // Find all widgets in the container
    const widgetRoots = container.querySelectorAll(".martigli-widget");
    widgetRoots.forEach(root => {
      const widget = root.widget;
      if (!widget) return;

      const oscId = widget.oscillationId;
      const osc = martigliState._oscillations.get(oscId);
      if (osc) {
        // We should probably update the widget visual state too if it changed
        // But that might be too heavy for every frame.
        // Let's just update telemetry and charts.

        const metrics = osc.runtimeMetrics();
        updateMartigliWidgetTelemetry(widget, metrics);

        if (widget.charts) {
          if (widget.charts.waveform) widget.charts.waveform.render(osc, metrics);
          if (widget.charts.timeline) widget.charts.timeline.render(osc, metrics);
        }
      }
    });

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

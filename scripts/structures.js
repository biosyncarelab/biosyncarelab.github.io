import { loadStructureCatalog, STRUCTURE_MANIFEST } from "./structures-loader.js";

const noop = () => {};
const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};
const TWO_PI = Math.PI * 2;

const DEFAULT_MARTIGLI_CONFIG = {
  label: "Primary Martigli",
  startPeriodSec: 10,
  endPeriodSec: 20,
  transitionSec: 120,
  waveform: "sine",
  inhaleRatio: 0.5,
  amplitude: 1,
  startOffsetSec: 0,
  phaseOffset: 0,
  fadeOutSec: 20,
  prestartValue: 0,
  conceptUri: null,
  trajectory: null,
  sessionPaused: false,
};

const nowSeconds = () => {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function" &&
    typeof performance.timeOrigin === "number"
  ) {
    return (performance.timeOrigin + performance.now()) / 1000;
  }
  return Date.now() / 1000;
};

const createMartigliId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `martigli-${crypto.randomUUID()}`;
  }
  return `martigli-${Math.random().toString(36).slice(2, 10)}`;
};

export class MartigliOscillator {
  constructor(config = {}) {
    const rawConfig = config ?? {};
    const merged = { ...DEFAULT_MARTIGLI_CONFIG, ...rawConfig };
    const providedId = rawConfig.id ?? rawConfig.referenceId ?? null;
    this.id = providedId ?? createMartigliId();
    this.label = merged.label ?? "Martigli";
    this.metadata = {
      conceptUri: merged.conceptUri ?? null,
      notes: merged.notes ?? null,
    };
    this.config = {
      startPeriodSec: clamp(merged.startPeriodSec, 0.1, 120),
      endPeriodSec: clamp(merged.endPeriodSec, 0.1, 120),
      transitionSec: Math.max(0, merged.transitionSec ?? 0),
      waveform: merged.waveform ?? "sine",
      inhaleRatio: clamp(merged.inhaleRatio ?? 0.5, 0.05, 0.95),
      amplitude: clamp(merged.amplitude ?? 1, 0, 1),
      startOffsetSec: merged.startOffsetSec ?? 0,
      phaseOffset: ((merged.phaseOffset ?? 0) % 1 + 1) % 1,
      fadeOutSec: Math.max(0, merged.fadeOutSec ?? 0),
      prestartValue: clamp(merged.prestartValue ?? 0, -1, 1),
    };
    this.trajectory = this._normalizeTrajectory(merged.trajectory);
    if (!this.trajectory.length) {
      this.trajectory = this._defaultTrajectory();
    } else {
      this._syncConfigFromTrajectory();
    }
    if (this.config.startPeriodSec > this.config.endPeriodSec) {
      this.config.endPeriodSec = this.config.startPeriodSec;
    }
    const startTime = merged.sessionStart ?? null;
    const endTime = merged.sessionEnd ?? null;
    let paused = Boolean(merged.sessionPaused ?? false);
    if (merged.sessionPaused === undefined && (!startTime || endTime !== null)) {
      paused = true;
    }
    this.session = {
      startTime,
      endTime,
      paused,
    };
    this._phase = 0;
    this._lastTime = null;
    this._lastPeriod = this.config.startPeriodSec;
    this._anchor = merged.anchorTime ?? nowSeconds();
    this._segments = [];
    this._finalPeriod = this.config.endPeriodSec;
    this._totalTrajectoryDuration = this.config.transitionSec;
    this._rebuildTrajectorySegments();
  }

  get sessionActive() {
    return !this.session.paused;
  }

  toJSON() {
    return {
      id: this.id,
      label: this.label,
      conceptUri: this.metadata.conceptUri,
      startPeriodSec: this.config.startPeriodSec,
      endPeriodSec: this.config.endPeriodSec,
      transitionSec: this.config.transitionSec,
      waveform: this.config.waveform,
      inhaleRatio: this.config.inhaleRatio,
      amplitude: this.config.amplitude,
      startOffsetSec: this.config.startOffsetSec,
      phaseOffset: this.config.phaseOffset,
      fadeOutSec: this.config.fadeOutSec,
      sessionStart: this.session.startTime,
      sessionEnd: this.session.endTime,
      sessionPaused: this.session.paused,
      trajectory: this.getTrajectory(),
    };
  }

  setConceptUri(uri) {
    this.metadata.conceptUri = uri ?? null;
  }

  bindSessionWindow({ startTime = null, endTime = null, fadeOutSec = null } = {}) {
    if (startTime === null) {
      this.session.startTime = null;
    } else if (typeof startTime === "number") {
      this.session.startTime = startTime;
      this.session.paused = false;
    } else if (startTime instanceof Date) {
      this.session.startTime = startTime.getTime() / 1000;
      this.session.paused = false;
    }
    if (endTime === null) {
      this.session.endTime = null;
    } else if (typeof endTime === "number") {
      this.session.endTime = endTime;
    } else if (endTime instanceof Date) {
      this.session.endTime = endTime.getTime() / 1000;
    }
    if (fadeOutSec !== null && fadeOutSec !== undefined) {
      this.config.fadeOutSec = Math.max(0, fadeOutSec);
    }
  }

  startSession(now = nowSeconds()) {
    this.session.paused = false;
    this.session.startTime = now;
    this.session.endTime = null;
    this._anchor = now;
    this._phase = 0;
    this._lastTime = null;
  }

  stopSession(now = nowSeconds()) {
    this.session.paused = true;
    this.session.endTime = now;
    this.session.startTime = null;
    this._phase = 0;
    this._lastTime = null;
  }

  setStartPeriod(value) {
    this.config.startPeriodSec = clamp(value, 0.1, 120);
    this._syncSimpleTrajectory();
    this._rebuildTrajectorySegments();
  }

  setEndPeriod(value) {
    this.config.endPeriodSec = clamp(value, 0.1, 120);
    this._syncSimpleTrajectory();
    this._rebuildTrajectorySegments();
  }

  setTransitionDuration(value) {
    this.config.transitionSec = Math.max(0, value ?? 0);
    this._syncSimpleTrajectory();
    this._rebuildTrajectorySegments();
  }

  setWaveform(value) {
    if (!value) return;
    this.config.waveform = value;
  }

  setInhaleRatio(value) {
    this.config.inhaleRatio = clamp(value, 0.05, 0.95);
  }

  setAmplitude(value) {
    this.config.amplitude = clamp(value, 0, 1.5);
  }

  setOffsets({ startOffsetSec, phaseOffset }) {
    if (Number.isFinite(startOffsetSec)) {
      this.config.startOffsetSec = startOffsetSec;
    }
    if (Number.isFinite(phaseOffset)) {
      this.config.phaseOffset = ((phaseOffset % 1) + 1) % 1;
    }
  }

  valueAt(timeSec = nowSeconds()) {
    if (this.session.paused) {
      return this.config.prestartValue;
    }
    const startTime = (this.session.startTime ?? this._anchor) + this.config.startOffsetSec;
    const elapsed = timeSec - startTime;
    if (elapsed < 0) {
      return this.config.prestartValue;
    }
    const period = this._periodAt(elapsed);
    if (!period || period <= 0) {
      return 0;
    }
    const dt = this._lastTime === null ? 0 : timeSec - this._lastTime;
    const avgPeriod = this._lastPeriod ? (this._lastPeriod + period) / 2 : period;
    if (dt >= 0 && avgPeriod > 0) {
      this._phase = (this._phase + (dt / avgPeriod)) % 1;
    } else if (dt < 0) {
      this._phase = 0;
    }
    this._lastTime = timeSec;
    this._lastPeriod = period;
    const envelope = this._sessionEnvelope(timeSec, startTime);
    const shaped = this._shapeValue(this._phase);
    return shaped * this.config.amplitude * envelope;
  }

  runtimeMetrics(timeSec = nowSeconds()) {
    const value = this.valueAt(timeSec);
    const period = this._lastPeriod ?? this.getStartPeriod();
    const frequencyHz = period > 0 ? 1 / period : 0;
    const breathsPerMinute = frequencyHz * 60;
    return {
      id: this.id,
      label: this.label,
      waveform: this.config.waveform,
      startPeriodSec: this.getStartPeriod(),
      endPeriodSec: this.getEndPeriod(),
      transitionSec: this._totalTrajectoryDuration ?? this.config.transitionSec,
      inhaleRatio: this.config.inhaleRatio,
      amplitude: this.config.amplitude,
      value,
      phase: Number.isFinite(this._phase) ? ((this._phase % 1) + 1) % 1 : 0,
      period,
      frequencyHz,
      breathsPerMinute,
      trend: this._trendLabel(),
      running: !this.session.paused,
    };
  }

  getStartPeriod() {
    return this.trajectory[0]?.period ?? this.config.startPeriodSec ?? DEFAULT_MARTIGLI_CONFIG.startPeriodSec;
  }

  getEndPeriod() {
    return this.trajectory[this.trajectory.length - 1]?.period ?? this.config.endPeriodSec ?? DEFAULT_MARTIGLI_CONFIG.endPeriodSec;
  }

  getTrajectory() {
    return this.trajectory.map((point) => ({ period: point.period, duration: point.duration }));
  }

  setTrajectory(points = []) {
    this.trajectory = this._normalizeTrajectory(points);
    if (!this.trajectory.length) {
      this.trajectory = this._defaultTrajectory();
    }
    this._syncConfigFromTrajectory();
    this._rebuildTrajectorySegments();
  }

  addTrajectoryPoint(point = {}) {
    const last = this.trajectory[this.trajectory.length - 1] ?? { period: this.config.endPeriodSec, duration: 0 };
    const next = {
      period: clamp(Number.isFinite(point.period) ? point.period : last.period, 0.1, 120),
      duration: Math.max(0, Number(point.duration ?? 60)),
    };
    this.trajectory.push(next);
    this._syncConfigFromTrajectory();
    this._rebuildTrajectorySegments();
  }

  updateTrajectoryPoint(index, updates = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= this.trajectory.length) {
      return;
    }
    const target = this.trajectory[index];
    if (!target) return;
    if (updates.period !== undefined && Number.isFinite(updates.period)) {
      target.period = clamp(updates.period, 0.1, 120);
    }
    if (updates.duration !== undefined && Number.isFinite(updates.duration)) {
      target.duration = Math.max(0, updates.duration);
    }
    this._syncConfigFromTrajectory();
    this._rebuildTrajectorySegments();
  }

  removeTrajectoryPoint(index) {
    if (this.trajectory.length <= 2) return;
    if (!Number.isInteger(index) || index < 0 || index >= this.trajectory.length) {
      return;
    }
    this.trajectory.splice(index, 1);
    this._syncConfigFromTrajectory();
    this._rebuildTrajectorySegments();
  }

  _periodAt(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      return this.getStartPeriod();
    }
    if (!this._segments?.length) {
      return this.getEndPeriod();
    }
    let accumulated = 0;
    for (let i = 0; i < this._segments.length; i += 1) {
      const segment = this._segments[i];
      const segmentEnd = accumulated + segment.duration;
      if (segment.duration <= 0) {
        accumulated = segmentEnd;
        continue;
      }
      if (elapsed <= segmentEnd) {
        const progress = (elapsed - accumulated) / segment.duration;
        const clamped = clamp(progress, 0, 1);
        return segment.from + (segment.to - segment.from) * clamped;
      }
      accumulated = segmentEnd;
    }
    return this._finalPeriod ?? this.getEndPeriod();
  }

  _sessionEnvelope(timeSec, startTime) {
    if (this.session.startTime && timeSec < startTime) {
      return 0;
    }
    if (this.session.endTime) {
      if (timeSec >= this.session.endTime) {
        if (!this.config.fadeOutSec) {
          return 0;
        }
        const delta = timeSec - this.session.endTime;
        if (delta >= this.config.fadeOutSec) {
          return 0;
        }
        return 1 - delta / this.config.fadeOutSec;
      }
    }
    return 1;
  }

  _shapeValue(phase) {
    const wf = (this.config.waveform ?? "sine").toLowerCase();
    const normalizedPhase = ((phase + this.config.phaseOffset) % 1 + 1) % 1;
    switch (wf) {
      case "triangle":
        return normalizedPhase < 0.5
          ? -1 + normalizedPhase * 4
          : 3 - normalizedPhase * 4;
      case "square":
        return normalizedPhase < this.config.inhaleRatio ? 1 : -1;
      case "saw":
      case "sawtooth":
        return normalizedPhase * 2 - 1;
      case "breath":
      case "martigli": {
        const inhale = this.config.inhaleRatio;
        if (normalizedPhase < inhale) {
          return -1 + (normalizedPhase / inhale) * 2;
        }
        const exPhase = (normalizedPhase - inhale) / (1 - inhale || 1);
        return 1 - exPhase * 2;
      }
      default:
        return Math.sin(normalizedPhase * TWO_PI);
    }
  }

  _trendLabel() {
    if (this.config.endPeriodSec === this.config.startPeriodSec) {
      return "steady";
    }
    return this.config.endPeriodSec > this.config.startPeriodSec ? "slows" : "quickens";
  }

  _defaultTrajectory() {
    return [
      { period: this.config.startPeriodSec, duration: 0 },
      { period: this.config.endPeriodSec, duration: this.config.transitionSec },
    ];
  }

  _normalizeTrajectory(points) {
    if (!Array.isArray(points)) return [];
    return points
      .map((point) => ({
        period: clamp(Number(point?.period) || this.config.startPeriodSec, 0.1, 120),
        duration: Math.max(0, Number(point?.duration) || 0),
      }))
      .filter(Boolean);
  }

  _syncConfigFromTrajectory() {
    if (!this.trajectory.length) return;
    this.config.startPeriodSec = this.trajectory[0]?.period ?? this.config.startPeriodSec;
    const last = this.trajectory[this.trajectory.length - 1];
    this.config.endPeriodSec = last?.period ?? this.config.endPeriodSec;
    const totalDuration = this.trajectory.reduce(
      (acc, point, index) => (index === 0 ? acc : acc + (point.duration ?? 0)),
      0,
    );
    this._totalTrajectoryDuration = totalDuration;
    if (this.trajectory.length === 2) {
      this.config.transitionSec = this.trajectory[1]?.duration ?? this.config.transitionSec;
    } else {
      this.config.transitionSec = totalDuration;
    }
  }

  _isSimpleTrajectory() {
    return this.trajectory.length === 2;
  }

  _syncSimpleTrajectory() {
    if (!this._isSimpleTrajectory()) return;
    this.trajectory[0].period = this.config.startPeriodSec;
    this.trajectory[1].period = this.config.endPeriodSec;
    this.trajectory[1].duration = this.config.transitionSec;
  }

  _rebuildTrajectorySegments() {
    this.trajectory = this._normalizeTrajectory(this.trajectory);
    if (!this.trajectory.length) {
      this.trajectory = this._defaultTrajectory();
    }
    this._segments = [];
    let accumulated = 0;
    for (let i = 0; i < this.trajectory.length - 1; i += 1) {
      const current = this.trajectory[i];
      const next = this.trajectory[i + 1];
      const duration = Math.max(0, next.duration ?? 0);
      this._segments.push({
        start: accumulated,
        duration,
        from: current.period,
        to: next.period,
      });
      accumulated += duration;
    }
    const last = this.trajectory[this.trajectory.length - 1];
    this._finalPeriod = last?.period ?? this.config.endPeriodSec;
    this._totalTrajectoryDuration = accumulated;
  }
}

export class StructureStore {
  constructor(options = {}) {
    this.manifest = options.manifest ?? STRUCTURE_MANIFEST;
    this.catalog = new Map();
    this.error = null;
    this.loading = false;
    this._promise = null;
    this.subscribers = new Set();
  }

  async load() {
    if (this.catalog.size || this.loading) {
      return this._promise ?? this.catalog;
    }
    this.loading = true;
    this._promise = loadStructureCatalog(this.manifest).then(
      (catalog) => {
        this.catalog = catalog;
        this.error = null;
        return catalog;
      },
      (err) => {
        this.error = err;
        throw err;
      },
    );
    try {
      return await this._promise;
    } finally {
      this.loading = false;
      this._promise = null;
      this._notify();
    }
  }

  snapshot() {
    return {
      catalog: this.catalog,
      datasets: Array.from(this.catalog.values()),
      error: this.error,
      loading: this.loading,
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return noop;
    this.subscribers.add(listener);
    listener(this.snapshot());
    return () => this.subscribers.delete(listener);
  }

  _notify() {
    const snap = this.snapshot();
    this.subscribers.forEach((listener) => {
      try {
        listener(snap);
      } catch (err) {
        console.warn("StructureStore listener failed", err);
      }
    });
  }

  listDatasets() {
    return Array.from(this.catalog.values());
  }

  getDataset(id) {
    return this.catalog.get(id) ?? null;
  }

  getSequence(datasetId, sequenceId) {
    const dataset = this.getDataset(datasetId);
    return dataset?.sequences?.find((sequence) => sequence.id === sequenceId) ?? null;
  }
}

export class MartigliState {
  constructor(initial = {}) {
    this.listeners = new Set();
    this._oscillations = new Map();
    this.referenceId = null;
    const seeds = Array.isArray(initial.oscillations) && initial.oscillations.length
      ? initial.oscillations
      : [initial];
    seeds.filter(Boolean).forEach((config) => this.addOscillator(config));
    // if (!this._oscillations.size) {
    //   this.addOscillator();
    // }
    if (initial.referenceId && this._oscillations.has(initial.referenceId)) {
      this.referenceId = initial.referenceId;
    }
  }

  loadSnapshot(snapshot = {}) {
    const configs = this._normalizeOscillationConfigs(snapshot);
    if (!configs.length) return;
    this._oscillations.clear();
    this.referenceId = null;
    configs.forEach((config) => {
      const oscillator = new MartigliOscillator(config);
      this._oscillations.set(oscillator.id, oscillator);
      if (!this.referenceId) {
        this.referenceId = oscillator.id;
      }
    });
    const preferredId = snapshot.referenceId ?? configs[0]?.id ?? null;
    if (preferredId && this._oscillations.has(preferredId)) {
      this.referenceId = preferredId;
    }
    this._emit();
  }

  _normalizeOscillationConfigs(source = {}) {
    if (!source) return [];
    if (Array.isArray(source)) {
      return source;
    }
    if (Array.isArray(source.oscillations) && source.oscillations.length) {
      return source.oscillations;
    }
    const single = {
      startPeriodSec: source.startPeriodSec ?? source.startPeriod ?? source.start ?? null,
      endPeriodSec: source.endPeriodSec ?? source.endPeriod ?? source.end ?? null,
      transitionSec: source.transitionSec ?? source.transition ?? null,
      waveform: source.waveform,
      inhaleRatio: source.inhaleRatio,
      amplitude: source.amplitude,
      startOffsetSec: source.startOffsetSec,
      phaseOffset: source.phaseOffset,
      fadeOutSec: source.fadeOutSec,
      conceptUri: source.conceptUri,
      id: source.id ?? source.referenceId ?? null,
      sessionStart: source.sessionStart ?? null,
      sessionEnd: source.sessionEnd ?? null,
    };
    const hasValue = Object.values(single).some((value) => value !== undefined && value !== null);
    return hasValue ? [single] : [];
  }

  addOscillator(config = {}) {
    const oscillator = new MartigliOscillator(config);
    this._oscillations.set(oscillator.id, oscillator);
    if (!this.referenceId) {
      this.referenceId = oscillator.id;
    }
    this._emit();
    return oscillator;
  }

  removeOscillator(id) {
    if (!id || !this._oscillations.has(id)) return;
    this._oscillations.delete(id);
    if (this.referenceId === id) {
      this.referenceId = this._oscillations.keys().next().value ?? null;
    }
    this._emit();
  }

  setReference(id) {
    if (id && this._oscillations.has(id)) {
      this.referenceId = id;
      this._emit();
    }
  }

  getReference() {
    if (!this.referenceId) return null;
    return this._oscillations.get(this.referenceId) ?? null;
  }

  bindSessionWindow(windowConfig = {}) {
    this._oscillations.forEach((osc) => osc.bindSessionWindow(windowConfig));
    this._emit();
  }

  valueAt(timeSec = nowSeconds(), id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    return osc ? osc.valueAt(timeSec) : 0;
  }

  snapshot() {
    const reference = this.getReference();
    return {
      referenceId: this.referenceId,
      startPeriod: reference?.config.startPeriodSec ?? DEFAULT_MARTIGLI_CONFIG.startPeriodSec,
      endPeriod: reference?.config.endPeriodSec ?? DEFAULT_MARTIGLI_CONFIG.endPeriodSec,
      waveform: reference?.config.waveform ?? DEFAULT_MARTIGLI_CONFIG.waveform,
      oscillations: Array.from(this._oscillations.values()).map((osc) => osc.toJSON()),
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return noop;
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  _emit() {
    const snap = this.snapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snap);
      } catch (err) {
        console.warn("Martigli listener failed", err);
      }
    });
  }

  setStartPeriod(value, id = this.referenceId) {
    if (!Number.isFinite(value)) return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setStartPeriod(value);
    if (osc.config.startPeriodSec > osc.config.endPeriodSec) {
      osc.setEndPeriod(osc.config.startPeriodSec);
    }
    this._emit();
  }

  setEndPeriod(value, id = this.referenceId) {
    if (!Number.isFinite(value)) return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setEndPeriod(value);
    if (osc.config.endPeriodSec < osc.config.startPeriodSec) {
      osc.setStartPeriod(osc.config.endPeriodSec);
    }
    this._emit();
  }

  setWaveform(value, id = this.referenceId) {
    if (!value) return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setWaveform(value);
    this._emit();
  }

  setTransitionDuration(value, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setTransitionDuration(value);
    this._emit();
  }

  setInhaleRatio(value, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setInhaleRatio(value);
    this._emit();
  }

  setAmplitude(value, id = this.referenceId) {
    if (!Number.isFinite(value)) return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setAmplitude(value);
    this._emit();
  }

  setConceptUri(uri, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setConceptUri(uri);
    this._emit();
  }

  setSessionWindow(windowConfig = {}, id = this.referenceId) {
    if (!windowConfig || typeof windowConfig !== "object") return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.bindSessionWindow(windowConfig);
    if (typeof windowConfig.paused === "boolean") {
      osc.session.paused = windowConfig.paused;
    }
    this._emit();
  }

  startOscillation(id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.startSession();
    this._emit();
  }

  stopOscillation(id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.stopSession();
    this._emit();
  }

  setTrajectory(points = [], id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.setTrajectory(points);
    this._emit();
  }

  addTrajectoryPoint(point = {}, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.addTrajectoryPoint(point);
    this._emit();
  }

  updateTrajectoryPoint(index, updates = {}, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.updateTrajectoryPoint(index, updates);
    this._emit();
  }

  removeTrajectoryPoint(index, id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.removeTrajectoryPoint(index);
    this._emit();
  }

  renameOscillation(label, id = this.referenceId) {
    const trimmed = typeof label === "string" ? label.trim() : "";
    if (!trimmed) return;
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return;
    osc.label = trimmed;
    this._emit();
  }

  getRuntimeMetrics(id = this.referenceId) {
    const osc = id ? this._oscillations.get(id) : null;
    if (!osc) return null;
    return osc.runtimeMetrics();
  }
}

export class AudioEngine {
  constructor({ martigli } = {}) {
    this.martigli = martigli ?? null;
    this.ctx = null;
    this.active = null;
    this._ctxEpoch = null;
    this._workletPromise = null;
    this._workletNode = null;
    this._workletSink = null;
    this._pendingMartigli = null;
    this._latestMartigliSnapshot = null;
    this._bindMartigliState();
  }

  get isSupported() {
    return Boolean(this._getAudioContextCtor());
  }

  supportsTrack(track) {
    return Boolean(this._inferMode(track));
  }

  toggle(track, button) {
    if (!button) return;
    if (this.active?.button === button) {
      this.stop();
      return;
    }
    const ctx = this._ensureContext();
    if (!ctx) {
      button.disabled = true;
      button.textContent = "Audio unsupported";
      return;
    }
    const mode = this._inferMode(track);
    if (!mode) {
      button.disabled = true;
      button.textContent = "No preview";
      return;
    }
    this.stop();
    const stopFn = mode === "binaural" ? this._startBinaural(ctx, track) : this._startSine(ctx, track);
    this.active = { stop: stopFn, button };
    button.textContent = "Stop";
  }

  stop() {
    if (this.active?.stop) {
      try {
        this.active.stop();
      } catch (err) {
        console.warn("Audio stop error", err);
      }
    }
    if (this.active?.button) {
      this.active.button.textContent = "Preview";
    }
    this.active = null;
  }

  _getAudioContextCtor() {
    if (typeof window === "undefined") return null;
    return window.AudioContext || window.webkitAudioContext || null;
  }

  _ensureContext() {
    const Ctor = this._getAudioContextCtor();
    if (!Ctor) return null;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this._updateContextEpoch();
      if (this.ctx.audioWorklet) {
        this._ensureWorklet(this.ctx);
      }
      this._postMartigliSnapshot();
    } else {
      this._updateContextEpoch();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (this.ctx?.audioWorklet) {
      this._ensureWorklet(this.ctx);
    }
    return this.ctx;
  }

  _updateContextEpoch() {
    if (!this.ctx) return;
    const ctxTime = typeof this.ctx.currentTime === "number" ? this.ctx.currentTime : 0;
    const epoch = nowSeconds() - ctxTime;
    if (Number.isFinite(epoch)) {
      this._ctxEpoch = epoch;
    }
  }

  _ensureWorklet(ctx) {
    if (!ctx?.audioWorklet || this._workletNode) {
      return this._workletPromise ?? Promise.resolve(this._workletNode);
    }
    if (this._workletPromise) {
      return this._workletPromise;
    }
    this._workletPromise = ctx.audioWorklet
      .addModule("scripts/martigli.worklet.js")
      .then(() => {
        const node = new AudioWorkletNode(ctx, "martigli-processor", {
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        const sink = ctx.createGain();
        sink.gain.value = 0;
        node.connect(sink).connect(ctx.destination);
        this._workletNode = node;
        this._workletSink = sink;
        if (this._pendingMartigli) {
          this._sendMartigliPayload(this._pendingMartigli);
        } else {
          this._postMartigliSnapshot();
        }
        return node;
      })
      .catch((err) => {
        console.warn("Martigli worklet init failed", err);
        this._workletNode = null;
        this._workletSink = null;
        this._workletPromise = null;
        return null;
      });
    return this._workletPromise;
  }

  _bindMartigliState() {
    if (!this.martigli?.subscribe) return;
    this._latestMartigliSnapshot = this.martigli.snapshot?.() ?? null;
    this.martigli.subscribe((snapshot) => {
      this._latestMartigliSnapshot = snapshot;
      this._postMartigliSnapshot(snapshot);
    });
  }

  _postMartigliSnapshot(snapshot = this._latestMartigliSnapshot) {
    if (!snapshot && this.martigli?.snapshot) {
      snapshot = this.martigli.snapshot();
      this._latestMartigliSnapshot = snapshot;
    }
    const payload = this._normalizeMartigliPayload(snapshot);
    if (!payload) return;
    this._pendingMartigli = payload;
    if (this._workletNode) {
      this._sendMartigliPayload(payload);
    }
  }

  _normalizeMartigliPayload(snapshot) {
    const reference = this.martigli?.getReference?.();
    const base = reference?.toJSON?.() ?? snapshot?.oscillations?.[0] ?? null;
    if (!base) return null;
    const payload = {
      startPeriodSec: base.startPeriodSec,
      endPeriodSec: base.endPeriodSec,
      transitionSec: base.transitionSec,
      waveform: base.waveform,
      inhaleRatio: base.inhaleRatio,
      amplitude: base.amplitude,
      startOffsetSec: base.startOffsetSec,
      phaseOffset: base.phaseOffset,
      fadeOutSec: base.fadeOutSec,
      conceptUri: base.conceptUri ?? null,
      oscillatorId: base.id ?? null,
      paused: Boolean(base.sessionPaused),
    };
    const sessionStart = this._contextTimeFromAbsolute(base.sessionStart);
    const sessionEnd = this._contextTimeFromAbsolute(base.sessionEnd);
    if (sessionStart !== undefined) {
      payload.sessionStart = sessionStart;
    }
    if (sessionEnd !== undefined) {
      payload.sessionEnd = sessionEnd;
    }
    return payload;
  }

  _contextTimeFromAbsolute(value) {
    if (!Number.isFinite(value) || this._ctxEpoch === null) {
      return undefined;
    }
    const ctxTime = value - this._ctxEpoch;
    if (!Number.isFinite(ctxTime)) {
      return undefined;
    }
    return Math.max(ctxTime, 0);
  }

  _sendMartigliPayload(payload) {
    if (!payload || !this._workletNode) return;
    try {
      this._workletNode.port.postMessage({ type: "martigli:update", payload });
    } catch (err) {
      console.warn("Martigli worklet post failed", err);
    }
  }

  _inferMode(track) {
    if (!track) return null;
    const preset = (track.presetId ?? track.kind ?? "").toLowerCase();
    if (preset.includes("binaural")) return "binaural";
    if (preset.includes("sine")) return "sine";
    if (track.params?.leftFrequency && track.params?.rightFrequency) return "binaural";
    if (track.params?.frequency ?? track.params?.base) return "sine";
    return null;
  }

  _startSine(ctx, track) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const frequency = Number(track.params?.frequency ?? track.params?.base ?? 440);
    const gainValue = Number(track.params?.gain ?? track.gain ?? 0.2);
    osc.type = this.martigli?.waveform ?? "sine";
    osc.frequency.value = Number.isFinite(frequency) ? frequency : 440;
    const clampedGain = Math.min(Math.max(Number.isFinite(gainValue) ? gainValue : 0.2, 0), 1);
    gainNode.gain.value = clampedGain;
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    return () => {
      try {
        osc.stop();
      } catch (_) {
        /* oscillator already stopped */
      }
      osc.disconnect();
      gainNode.disconnect();
    };
  }

  _startBinaural(ctx, track) {
    const leftOsc = ctx.createOscillator();
    const rightOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    rightOsc.type = "sine";
    const base = Number(track.params?.base ?? track.params?.frequency ?? 200);
    const beat = Number(track.params?.beat ?? track.params?.martigliFrequency ?? 10);
    const leftFrequency = Number(track.params?.leftFrequency ?? base - beat / 2);
    const rightFrequency = Number(track.params?.rightFrequency ?? base + beat / 2);
    leftOsc.frequency.value = Number.isFinite(leftFrequency) ? leftFrequency : 200;
    rightOsc.frequency.value = Number.isFinite(rightFrequency) ? rightFrequency : 210;
    const merger = ctx.createChannelMerger(2);
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();
    const gainValue = Number(track.params?.gain ?? track.gain ?? 0.25);
    const clamped = Math.min(Math.max(Number.isFinite(gainValue) ? gainValue : 0.25, 0), 1);
    leftGain.gain.value = clamped;
    rightGain.gain.value = clamped;
    leftOsc.connect(leftGain).connect(merger, 0, 0);
    rightOsc.connect(rightGain).connect(merger, 0, 1);
    merger.connect(ctx.destination);
    leftOsc.start();
    rightOsc.start();
    return () => {
      [leftOsc, rightOsc].forEach((osc) => {
        try {
          osc.stop();
        } catch (_) {
          /* oscillator already stopped */
        }
        osc.disconnect();
      });
      leftGain.disconnect();
      rightGain.disconnect();
      merger.disconnect();
    };
  }
}

export class VideoEngine {
  constructor({ martigli } = {}) {
    this.martigli = martigli ?? null;
    this.layers = new Map();
    this.targets = new Set();
    this._raf = null;
  }

  registerLayer(id, config = {}) {
    if (!id) return;
    const entry = { ...config, updatedAt: Date.now() };
    if (!entry.color) {
      entry.color = this._colorForKey(id);
    }
    this.layers.set(id, entry);
  }

  getLayer(id) {
    return this.layers.get(id) ?? null;
  }

  attachCanvas(canvas, options = {}) {
    if (!canvas?.getContext) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const target = {
      canvas,
      context: ctx,
      layerId: options.layerId ?? null,
      color: options.color ?? "#38bdf8",
      background: options.background ?? "#020617",
    };
    this.targets.add(target);
    this._ensureLoop();
    return {
      setLayer: (layerId) => {
        target.layerId = layerId;
      },
      refresh: () => {
        this.renderFrame(this._now());
      },
      detach: () => {
        this.targets.delete(target);
        this._maybeStopLoop();
      },
    };
  }

  renderFrame(timestamp = this._now()) {
    if (!this.targets.size) return;
    const state = this._martigliSnapshot();
    const avgPeriod = Math.max((state.startPeriod + state.endPeriod) / 2, 0.1);
    const drift = state.endPeriod - state.startPeriod;
    const breathPhase = (timestamp / 1000) * (1 / Math.max(avgPeriod, 0.1));
    const breath = (Math.sin(breathPhase * Math.PI * 2) + 1) / 2;

    this.targets.forEach((target) => {
      const ctx = target.context;
      if (!ctx) return;
      const layer = target.layerId ? this.getLayer(target.layerId) : null;
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = target.background;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i += 1) {
        const x = (width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let i = 1; i < 4; i += 1) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const amplitude = (0.25 + 0.5 * breath) * (height / 2);
      const color = layer?.color ?? target.color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 1) {
        const t = x / width;
        const localPeriod = state.startPeriod + drift * t;
        const freq = 1 / Math.max(localPeriod, 0.2);
        const phase = breathPhase * Math.PI * 2 + t * 6 * Math.PI;
        const value = this._waveValue(state.waveform, phase * freq * avgPeriod);
        const y = height / 2 + value * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
      ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont";
      ctx.fillText(
        `${state.waveform} · ${state.startPeriod}s → ${state.endPeriod}s`,
        12,
        height - 12,
      );
      if (layer) {
        ctx.fillText(
          `${layer.kind ?? "Layer"} · ${layer.trackCount ?? 0} tracks`,
          12,
          20,
        );
      }
    });
  }

  _ensureLoop() {
    if (typeof window === "undefined" || this._raf) return;
    const tick = (timestamp) => {
      if (!this.targets.size) {
        this._raf = null;
        return;
      }
      this.renderFrame(timestamp);
      this._raf = window.requestAnimationFrame(tick);
    };
    this._raf = window.requestAnimationFrame(tick);
  }

  _maybeStopLoop() {
    if (typeof window === "undefined" || !this._raf || this.targets.size) return;
    window.cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _martigliSnapshot() {
    if (this.martigli && typeof this.martigli.snapshot === "function") {
      return this.martigli.snapshot();
    }
    return { startPeriod: 8, endPeriod: 12, waveform: "sine" };
  }

  _waveValue(type, phase) {
    switch ((type ?? "sine").toLowerCase()) {
      case "square":
        return Math.sign(Math.sin(phase)) || 1;
      case "triangle":
        return (2 / Math.PI) * Math.asin(Math.sin(phase));
      case "saw":
      case "sawtooth": {
        const wrapped = phase / (Math.PI * 2);
        return 2 * (wrapped - Math.floor(wrapped + 0.5));
      }
      default:
        return Math.sin(phase);
    }
  }

  _colorForKey(key) {
    const palette = ["#38bdf8", "#c084fc", "#f472b6", "#22d3ee"];
    if (!key) return palette[0];
    const hash = Array.from(String(key)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[hash % palette.length];
  }

  _now() {
    if (typeof performance !== "undefined" && performance.now) {
      return performance.now();
    }
    return Date.now();
  }
}

export class RDFLinker {
  constructor(initial = {}) {
    this.links = new Map(Object.entries(initial));
  }

  register(recordId, conceptUri, metadata = {}) {
    if (!recordId || !conceptUri) return;
    const current = this.links.get(recordId) ?? [];
    this.links.set(recordId, [...current, { uri: conceptUri, ...metadata }]);
  }

  get(recordId) {
    return this.links.get(recordId) ?? [];
  }

  toJSON() {
    return Array.from(this.links.entries()).reduce((acc, [recordId, entries]) => {
      acc[recordId] = entries;
      return acc;
    }, {});
  }
}

export class BSCLabKernel {
  constructor(options = {}) {
    this.structures = options.structuresStore ?? new StructureStore(options.structures ?? {});
    this.martigli = options.martigliState ?? new MartigliState(options.martigli);
    this.audio = options.audioEngine ?? new AudioEngine({ martigli: this.martigli });
    this.video = options.videoEngine ?? new VideoEngine({ martigli: this.martigli });
    this.rdf = options.rdfLinker ?? new RDFLinker(options.rdfLinks);
    this.onInteraction = typeof options.onInteraction === "function" ? options.onInteraction : null;
  }

  async init() {
    try {
      await this.structures.load();
    } catch (err) {
      console.warn("Kernel structure load failed", err);
    }
    return this;
  }

  recordInteraction(kind, payload = {}) {
    if (!this.onInteraction) return;
    try {
      this.onInteraction({ kind, payload, ts: Date.now() });
    } catch (err) {
      console.warn("Interaction logger failed", err);
    }
  }
}

export async function createKernel(options = {}) {
  const kernel = new BSCLabKernel(options);
  await kernel.init();
  return kernel;
}

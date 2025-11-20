import { loadStructureCatalog, STRUCTURE_MANIFEST, datasetToJsonLd } from "./structures-loader.js";
import { Track, TrackParameter } from "./tracks/Track.js";
import { TrackManager } from "./tracks/TrackManager.js";
import { AudioTrack, BinauralBeatTrack, IsochronicTrack, SineTrack } from "./tracks/AudioTrack.js";
import { VisualTrack, GeometryVisualTrack, ParticleVisualTrack } from "./tracks/VisualTrack.js";
import { HapticTrack, VibrationTrack } from "./tracks/HapticTrack.js";
import { AudioEngine } from "./engines/AudioEngine.js";
import { VideoEngine } from "./engines/VideoEngine.js";
import { HapticEngine } from "./engines/HapticEngine.js";

export {
  Track, TrackParameter,
  TrackManager,
  AudioTrack, BinauralBeatTrack, IsochronicTrack, SineTrack,
  VisualTrack, GeometryVisualTrack, ParticleVisualTrack,
  HapticTrack, VibrationTrack,
  AudioEngine, VideoEngine, HapticEngine
};

const noop = () => {};
const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};
const TWO_PI = Math.PI * 2;
const ID_BASE = "https://biosyncarelab.github.io/id";
const CONTEXT_URL = "https://biosyncarelab.github.io/context/structures.jsonld";

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

  get startPeriodSec() { return this.config.startPeriodSec; }
  get endPeriodSec() { return this.config.endPeriodSec; }
  get transitionSec() { return this.config.transitionSec; }
  get waveform() { return this.config.waveform; }
  get inhaleRatio() { return this.config.inhaleRatio; }
  get amplitude() { return this.config.amplitude; }
  get startOffsetSec() { return this.config.startOffsetSec; }
  get phaseOffset() { return this.config.phaseOffset; }
  get fadeOutSec() { return this.config.fadeOutSec; }

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

  toRDF() {
    const id = this.id;
    const label = this.label || "Martigli Oscillation";
    const waveform = this.config.waveform || "sine";
    const waveformClass = `bsc:${waveform.charAt(0).toUpperCase() + waveform.slice(1)}Wave`;

    return `
@prefix bsc: <https://biosyncarelab.github.io/ont#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

<https://biosyncarelab.github.io/id/${id}> a bsc:MartigliOscillation ;
  rdfs:label "${label}" ;
  bsc:waveform <https://biosyncarelab.github.io/ont#${waveformClass.replace('bsc:', '')}> ;
  bsc:amplitude "${this.config.amplitude}"^^xsd:decimal ;
  bsc:inhaleRatio "${this.config.inhaleRatio}"^^xsd:decimal ;
  bsc:startPeriod "${this.config.startPeriodSec}"^^xsd:decimal ;
  bsc:endPeriod "${this.config.endPeriodSec}"^^xsd:decimal ;
  bsc:transitionDuration "${this.config.transitionSec}"^^xsd:decimal ;
  bsc:phaseOffset "${this.config.phaseOffset}"^^xsd:decimal ;
  bsc:startOffset "${this.config.startOffsetSec}"^^xsd:decimal .
`.trim();
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
    this._lastPeriod = null;
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
    const normalizedPhase = ((phase + (this.config.phaseOffset || 0)) % 1 + 1) % 1;
    const inhale = this.config.inhaleRatio ?? 0.5;

    switch (wf) {
      case "triangle":
      case "breath":
      case "martigli": {
        if (normalizedPhase < inhale) {
          return -1 + (normalizedPhase / inhale) * 2;
        }
        const exPhase = (normalizedPhase - inhale) / (1 - inhale || 1);
        return 1 - exPhase * 2;
      }
      case "square":
        return normalizedPhase < inhale ? 1 : -1;
      case "saw":
      case "sawtooth":
        return normalizedPhase * 2 - 1;
      case "sine":
      default: {
        if (normalizedPhase < inhale) {
          return -Math.cos(Math.PI * (normalizedPhase / inhale));
        }
        const exPhase = (normalizedPhase - inhale) / (1 - inhale || 1);
        return Math.cos(Math.PI * exPhase);
      }
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

  getOscillator(id) {
    if (!id) return null;
    return this._oscillations.get(id) ?? null;
  }

  listOscillations() {
    return Array.from(this._oscillations.values());
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

const waveformClassFor = (waveform = "sine") => {
  const wf = waveform.toLowerCase();
  switch (wf) {
    case "triangle":
    case "breath":
    case "martigli":
      return "bsc:TriangleWave";
    case "square":
      return "bsc:SquareWave";
    case "saw":
    case "sawtooth":
      return "bsc:SawWave";
    case "sine":
    default:
      return "bsc:SineWave";
  }
};

const trackTypeClass = (trackType = "") => {
  const t = (trackType || "").toLowerCase();
  if (t === "audio") return "bsc:AudioTrack";
  if (t === "visual") return "bsc:VisualTrack";
  if (t === "haptic") return "bsc:HapticTrack";
  return "bsc:Track";
};

const martigliToJsonLd = (osc, rdfLinker) => {
  const trajectory = osc.getTrajectory();
  const asUri = (id) => `${ID_BASE}/martigli/${encodeURIComponent(id)}`;
  const links = rdfLinker?.get(osc.id) ?? [];
  return {
    "@id": asUri(osc.id),
    "@type": "bsc:MartigliOscillation",
    label: osc.label,
    waveform: waveformClassFor(osc.config.waveform),
    startPeriod: osc.config.startPeriodSec,
    endPeriod: osc.config.endPeriodSec,
    transitionDuration: osc.config.transitionSec,
    inhaleRatio: osc.config.inhaleRatio,
    amplitude: osc.config.amplitude,
    phaseOffset: osc.config.phaseOffset,
    startOffset: osc.config.startOffsetSec,
    trajectory,
    sessionStart: osc.session.startTime ?? null,
    sessionEnd: osc.session.endTime ?? null,
    sessionPaused: osc.session.paused ?? null,
    conceptLinks: links.length ? links : undefined,
  };
};

const parameterToJsonLd = (trackId, name, param, rdfLinker) => {
  const paramId = `${ID_BASE}/track/${encodeURIComponent(trackId)}/param/${encodeURIComponent(name)}`;
  const modulatorId = param?._modulator?.id
    ? `${ID_BASE}/martigli/${encodeURIComponent(param._modulator.id)}`
    : null;
  const links = rdfLinker?.get(`${trackId}#${name}`) ?? [];
  return {
    "@id": paramId,
    "@type": "bsc:Parameter",
    parameterName: name,
    baseValue: param?.base,
    depth: param?.depth,
    modulator: modulatorId,
    conceptLinks: links.length ? links : undefined,
  };
};

const trackToJsonLd = (track, rdfLinker) => {
  const params = Array.from(track.parameters.entries()).map(([name, param]) =>
    parameterToJsonLd(track.id, name, param, rdfLinker),
  );
  const links = rdfLinker?.get(track.id) ?? [];
  return {
    "@id": `${ID_BASE}/track/${encodeURIComponent(track.id)}`,
    "@type": trackTypeClass(track.type),
    label: track.label,
    enabled: track.enabled,
    parameters: params,
    conceptLinks: links.length ? links : undefined,
  };
};



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
    this.tracks = options.trackManager ?? new TrackManager(this);
    this.audio = options.audioEngine ?? new AudioEngine(this);
    this.video = options.videoEngine ?? new VideoEngine(this);
    this.haptic = options.hapticEngine ?? new HapticEngine(this);
    this.rdf = options.rdfLinker ?? new RDFLinker(options.rdfLinks);
    this.onInteraction = typeof options.onInteraction === "function" ? options.onInteraction : null;
  }

  async init() {
    try {
      await this.structures.load();
      if (this.audio && typeof this.audio.init === 'function') {
        await this.audio.init();
      }
      if (this.haptic && typeof this.haptic.start === 'function') {
        this.haptic.start();
      }
      // Video engine initializes on canvas attachment
    } catch (err) {
      console.warn("Kernel structure load failed", err);
    }
    return this;
  }

  toJsonLdSnapshot() {
    const structures = Array.from(this.structures.catalog.entries()).map(
      ([datasetId, data]) => datasetToJsonLd(data, { datasetId, contextUrl: CONTEXT_URL }),
    );
    const martigli = this.martigli.listOscillations().map((osc) => martigliToJsonLd(osc, this.rdf));
    const tracks = this.tracks.getAll().map((track) => trackToJsonLd(track, this.rdf));
    return {
      "@context": CONTEXT_URL,
      structures,
      martigli,
      tracks,
    };
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

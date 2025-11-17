import { loadStructureCatalog, STRUCTURE_MANIFEST } from "./structures-loader.js";

const noop = () => {};

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
    this.startPeriod = initial.startPeriod ?? 10;
    this.endPeriod = initial.endPeriod ?? 20;
    this.waveform = initial.waveform ?? "sine";
    this.listeners = new Set();
  }

  snapshot() {
    return {
      startPeriod: this.startPeriod,
      endPeriod: this.endPeriod,
      waveform: this.waveform,
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

  setStartPeriod(value) {
    if (!Number.isFinite(value)) return;
    this.startPeriod = value;
    if (this.startPeriod > this.endPeriod) {
      this.endPeriod = this.startPeriod;
    }
    this._emit();
  }

  setEndPeriod(value) {
    if (!Number.isFinite(value)) return;
    this.endPeriod = value;
    if (this.endPeriod < this.startPeriod) {
      this.startPeriod = this.endPeriod;
    }
    this._emit();
  }

  setWaveform(value) {
    if (!value) return;
    this.waveform = value;
    this._emit();
  }
}

export class AudioEngine {
  constructor({ martigli } = {}) {
    this.martigli = martigli ?? null;
    this.ctx = null;
    this.active = null;
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
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
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

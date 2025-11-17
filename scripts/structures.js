import { loadStructures } from "./structures-loader.js";

const noop = () => {};

export class StructureStore {
  constructor(url) {
    this.url = url;
    this.data = null;
    this.error = null;
    this.loading = false;
    this._promise = null;
    this.subscribers = new Set();
  }

  async load() {
    if (this.data || this.loading) {
      return this._promise ?? this.data;
    }
    this.loading = true;
    this._promise = loadStructures(this.url).then(
      (payload) => {
        this.data = payload;
        this.error = null;
        return payload;
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
      data: this.data,
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

  getSequence(id) {
    return this.data?.sequences?.find((sequence) => sequence.id === id) ?? null;
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
  }

  registerLayer(id, config = {}) {
    if (!id) return;
    this.layers.set(id, { ...config, updatedAt: Date.now() });
  }

  getLayer(id) {
    return this.layers.get(id) ?? null;
  }

  renderFrame(targets = []) {
    // Placeholder: hook Martigli value into visual renderers (Canvas/Pixi/etc.)
    targets.forEach((target) => {
      if (!target?.context) return;
      const ctx = target.context;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = target.color ?? "#38bdf8";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
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
    this.structures = options.structuresStore ?? new StructureStore(options.structuresUrl);
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

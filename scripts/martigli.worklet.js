const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min ?? 0;
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

class MartigliProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.state = {
      startPeriodSec: 10,
      endPeriodSec: 20,
      transitionSec: 120,
      waveform: "sine",
      inhaleRatio: 0.5,
      amplitude: 1,
      startOffsetSec: 0,
      phaseOffset: 0,
      fadeOutSec: 0,
      sessionStart: null,
      sessionEnd: null,
      paused: true,
    };
    this.phase = 0;
    this.lastPeriod = this.state.startPeriodSec;
    this.anchor = currentTime;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === "martigli:update" && data.payload) {
        this._applyUpdate(data.payload);
      }
    };
  }

  static get parameterDescriptors() {
    return [];
  }

  _applyUpdate(payload) {
    this.state.startPeriodSec = clamp(payload.startPeriodSec ?? this.state.startPeriodSec, 0.1, 120);
    this.state.endPeriodSec = clamp(payload.endPeriodSec ?? this.state.endPeriodSec, 0.1, 120);
    this.state.transitionSec = Math.max(0, payload.transitionSec ?? this.state.transitionSec);
    this.state.waveform = payload.waveform ?? this.state.waveform;
    this.state.inhaleRatio = clamp(payload.inhaleRatio ?? this.state.inhaleRatio, 0.05, 0.95);
    this.state.amplitude = clamp(payload.amplitude ?? this.state.amplitude, 0, 1.5);
    this.state.startOffsetSec = payload.startOffsetSec ?? this.state.startOffsetSec;
    this.state.phaseOffset = payload.phaseOffset ?? this.state.phaseOffset;
    this.state.fadeOutSec = Math.max(0, payload.fadeOutSec ?? this.state.fadeOutSec);
    this.state.sessionStart = payload.sessionStart ?? null;
    this.state.sessionEnd = payload.sessionEnd ?? null;
    if (payload.paused !== undefined) {
      this.state.paused = Boolean(payload.paused);
    }
  }

  _periodAt(elapsed) {
    if (elapsed <= 0) {
      return this.state.startPeriodSec;
    }
    if (!this.state.transitionSec) {
      return this.state.endPeriodSec;
    }
    const progress = clamp(elapsed / this.state.transitionSec, 0, 1);
    return this.state.startPeriodSec + progress * (this.state.endPeriodSec - this.state.startPeriodSec);
  }

  _shape(phase) {
    const shifted = ((phase + (this.state.phaseOffset || 0)) % 1 + 1) % 1;
    switch ((this.state.waveform || "sine").toLowerCase()) {
      case "triangle":
        return shifted < 0.5 ? -1 + shifted * 4 : 3 - shifted * 4;
      case "square":
        return shifted < this.state.inhaleRatio ? 1 : -1;
      case "saw":
      case "sawtooth":
        return shifted * 2 - 1;
      case "breath":
      case "martigli": {
        const inhale = this.state.inhaleRatio;
        if (shifted < inhale) {
          return -1 + (shifted / inhale) * 2;
        }
        const exPhase = (shifted - inhale) / (1 - inhale || 1);
        return 1 - exPhase * 2;
      }
      default:
        return Math.sin(shifted * Math.PI * 2);
    }
  }

  _envelope(time) {
    if (this.state.sessionStart !== null && time < this.state.sessionStart + this.state.startOffsetSec) {
      return 0;
    }
    if (this.state.sessionEnd !== null && time >= this.state.sessionEnd) {
      if (!this.state.fadeOutSec) {
        return 0;
      }
      const elapsed = time - this.state.sessionEnd;
      if (elapsed >= this.state.fadeOutSec) {
        return 0;
      }
      return 1 - elapsed / this.state.fadeOutSec;
    }
    return 1;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) {
      return true;
    }
    const channel = output[0];
    if (this.state.paused) {
      for (let i = 0; i < channel.length; i += 1) {
        channel[i] = 0;
      }
      return true;
    }
    for (let i = 0; i < channel.length; i += 1) {
      const absoluteTime = currentTime + i / sampleRate;
      const startTime = (this.state.sessionStart ?? this.anchor) + this.state.startOffsetSec;
      const elapsed = absoluteTime - startTime;
      if (elapsed < 0) {
        channel[i] = 0;
        continue;
      }
      const period = this._periodAt(elapsed);
      const dt = 1 / sampleRate;
      const avgPeriod = (this.lastPeriod + period) / 2 || period || 0.1;
      this.phase = (this.phase + dt / avgPeriod) % 1;
      this.lastPeriod = period;
      const envelope = this._envelope(absoluteTime);
      channel[i] = this._shape(this.phase) * this.state.amplitude * envelope;
    }
    return true;
  }
}

registerProcessor("martigli-processor", MartigliProcessor);

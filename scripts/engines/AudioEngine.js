/**
 * Audio Engine
 * Orchestrates audio playback using pluggable backends (Web Audio, Tone.js, etc.)
 */

export class AudioEngine {
  constructor(kernel) {
    this.kernel = kernel;
    this.ctx = null;
    this.backend = 'webaudio'; // Default
    this.nodes = new Map(); // Track ID -> AudioNode(s)
    this.masterGain = null;
    this.isRunning = false;
  }

  async init() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.isRunning) {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Create a Blob worker to drive the loop even in background tabs
    // This prevents audio modulation from freezing when the tab is hidden
    const blob = new Blob([`
      let interval = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            self.postMessage('tick');
          }, 33); // ~30fps
        } else if (e.data === 'stop') {
          if (interval) clearInterval(interval);
          interval = null;
        }
      };
    `], { type: 'application/javascript' });

    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onmessage = () => this._tick();
    this.worker.postMessage('start');
  }

  stop() {
    this.isRunning = false;
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
  }

  _tick() {
    if (!this.isRunning) return;

    // Use absolute time for parameter modulation to match MartigliOscillator
    let time;
    if (typeof performance !== "undefined" && typeof performance.now === "function" && typeof performance.timeOrigin === "number") {
      time = (performance.timeOrigin + performance.now()) / 1000;
    } else {
      time = Date.now() / 1000;
    }

    this.update(time);
  }

  /**
   * Applies automation to an AudioParam, handling both foreground (smooth pursuit)
   * and background (scheduled trajectory) modes.
   * @param {AudioParam} audioParam - The Web Audio param to automate
   * @param {Function} valueFn - Function (time) => value
   * @param {number} currentTime - Current absolute time
   */
  _applyParamAutomation(audioParam, valueFn, currentTime) {
    if (!audioParam) return;
    const ctxTime = this.ctx.currentTime;

    if (document.hidden) {
      // Background mode: Schedule trajectory ahead to survive throttling
      // Throttle scheduling to ~2Hz to avoid event spam
      const now = Date.now();
      if (audioParam._lastBackgroundUpdate && (now - audioParam._lastBackgroundUpdate < 500)) {
        return;
      }
      audioParam._lastBackgroundUpdate = now;

      try {
        // Cancel future events and anchor current value
        audioParam.cancelScheduledValues(ctxTime);
        audioParam.setValueAtTime(audioParam.value, ctxTime);

        const lookahead = 2.0; // Schedule 2 seconds ahead
        const step = 0.1;      // 100ms resolution

        for (let t = step; t <= lookahead; t += step) {
          const val = valueFn(currentTime + t);
          if (isFinite(val)) {
            audioParam.linearRampToValueAtTime(val, ctxTime + t);
          }
        }
      } catch (e) {
        console.warn("Automation error", e);
      }
    } else {
      // Foreground mode: Smooth pursuit for responsiveness
      const val = valueFn(currentTime);
      if (isFinite(val)) {
        audioParam.setTargetAtTime(val, ctxTime, 0.05);
      }
    }
  }

  /**
   * Update loop called by the kernel or animation frame
   * @param {number} time - Current time in seconds
   */
  update(time) {
    if (!this.ctx) return;

    const audioTracks = this.kernel.tracks.getByType('audio');
    const activeIds = new Set(audioTracks.map(t => t.id));

    // Garbage collection: Remove nodes for tracks that no longer exist
    for (const [id, nodes] of this.nodes.entries()) {
      if (!activeIds.has(id)) {
        this._fadeOutAndStop(id, nodes);
      }
    }

    audioTracks.forEach(track => {
      if (!track.enabled) {
        // If track exists but is disabled, fade out if not already fading
        if (this.nodes.has(track.id)) {
           // We treat disabled tracks as "to be stopped"
           // But we need to keep the map entry if we want to resume later?
           // For now, let's just stop them.
           this._fadeOutAndStop(track.id, this.nodes.get(track.id));
        }
        return;
      }

      // Ensure track resources exist
      if (!this.nodes.has(track.id)) {
        this._initTrack(track);
      }

      // Update parameters
      this._updateTrackParams(track, time);
    });
  }

  _fadeOutAndStop(id, nodes) {
    if (nodes.isFadingOut) return;
    nodes.isFadingOut = true;

    const now = this.ctx.currentTime;
    // Ramp gain down
    try {
      nodes.output.gain.cancelScheduledValues(now);
      nodes.output.gain.setValueAtTime(nodes.output.gain.value, now);
      nodes.output.gain.linearRampToValueAtTime(0, now + 0.1);

      setTimeout(() => {
        this._stopNodes(nodes);
        this.nodes.delete(id);
      }, 150);
    } catch (e) {
      // If context is closed or nodes invalid
      this.nodes.delete(id);
    }
  }

  _stopNodes(nodes) {
    try {
      nodes.output.disconnect();
      if (nodes.osc) nodes.osc.stop();
      if (nodes.lfo) nodes.lfo.stop();
      if (nodes.leftOsc) nodes.leftOsc.stop();
      if (nodes.rightOsc) nodes.rightOsc.stop();
    } catch (e) { /* ignore */ }
  }

  _initTrack(track) {
    if (this.backend === 'webaudio') {
      this._initWebAudioTrack(track);
    }
    // Future: Tone.js implementation
  }

  _stopTrack(track) {
    // Legacy method, now handled by _fadeOutAndStop
    const nodes = this.nodes.get(track.id);
    if (nodes) {
      this._fadeOutAndStop(track.id, nodes);
    }
  }

  _initWebAudioTrack(track) {
    // Basic implementation for Sine, Binaural, Isochronic
    // This is a simplified factory. In a real app, we might have separate classes for these nodes.

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);

    // Fade in
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(track.getParameter('gain')?.base ?? 0.5, now + 0.5);

    const nodes = { output: gain };

    // Common Pan Node
    const panner = this.ctx.createStereoPanner();
    panner.connect(gain);
    nodes.panner = panner;
    // Input to the chain is now 'panner' instead of 'gain'

    if (track.constructor.name === 'SineTrack') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.connect(panner);
      osc.start();
      nodes.osc = osc;
    } else if (track.constructor.name === 'BinauralBeatTrack') {
      // Binaural requires stereo separation
      const merger = this.ctx.createChannelMerger(2);
      merger.connect(panner); // Connect merger to main panner for global pan

      const leftOsc = this.ctx.createOscillator();
      const rightOsc = this.ctx.createOscillator();
      const leftPan = this.ctx.createStereoPanner();
      const rightPan = this.ctx.createStereoPanner();

      leftPan.pan.value = -1;
      rightPan.pan.value = 1;

      leftOsc.connect(leftPan).connect(merger, 0, 0);
      rightOsc.connect(rightPan).connect(merger, 0, 1);

      leftOsc.start();
      rightOsc.start();

      nodes.leftOsc = leftOsc;
      nodes.rightOsc = rightOsc;
    } else if (track.constructor.name === 'IsochronicTrack') {
      // Isochronic: Tone -> Pulse Gain -> Panner -> Output
      const pulseGain = this.ctx.createGain();
      pulseGain.gain.value = 0.5; // Base gain for modulation
      pulseGain.connect(panner);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; // Carrier
      osc.connect(pulseGain);
      osc.start();

      // LFO for pulsing
      // To support duty cycle, we can use a Pulse Width Modulation technique or a WaveShaper
      // Simple approach: Sawtooth LFO -> WaveShaper (Threshold) -> Gain

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sawtooth'; // Sawtooth is good for PWM

      // WaveShaper to convert Sawtooth to Pulse with variable width
      const shaper = this.ctx.createWaveShaper();
      // Curve will be calculated in update based on duty cycle
      shaper.curve = new Float32Array([0, 1]); // Placeholder

      lfo.connect(shaper).connect(pulseGain.gain);
      lfo.start();

      nodes.osc = osc;
      nodes.lfo = lfo;
      nodes.shaper = shaper;
      nodes.pulseGain = pulseGain;
    }

    this.nodes.set(track.id, nodes);
  }

  _updateTrackParams(track, time) {
    const nodes = this.nodes.get(track.id);
    if (!nodes || nodes.isFadingOut) return;

    // Generic Gain
    this._applyParamAutomation(
      nodes.output.gain,
      (t) => track.getParameter('gain')?.getValue(t) ?? 0.5,
      time
    );

    // Generic Pan
    this._applyParamAutomation(
      nodes.panner.pan,
      (t) => track.getParameter('pan')?.getValue(t) ?? 0,
      time
    );

    if (track.constructor.name === 'SineTrack') {
      this._applyParamAutomation(
        nodes.osc.frequency,
        (t) => track.getParameter('frequency')?.getValue(t) ?? 440,
        time
      );
    } else if (track.constructor.name === 'BinauralBeatTrack') {
      const carrierParam = track.getParameter('carrier');
      const beatParam = track.getParameter('beat');
      const waveType = track.getParameter('waveType')?.base ?? 'sine';

      this._applyParamAutomation(
        nodes.leftOsc.frequency,
        (t) => carrierParam?.getValue(t) ?? 200,
        time
      );

      this._applyParamAutomation(
        nodes.rightOsc.frequency,
        (t) => (carrierParam?.getValue(t) ?? 200) + (beatParam?.getValue(t) ?? 10),
        time
      );

      if (nodes.leftOsc.type !== waveType) {
        nodes.leftOsc.type = waveType;
        nodes.rightOsc.type = waveType;
      }
    } else if (track.constructor.name === 'IsochronicTrack') {
      const waveform = track.getParameter('waveform')?.base ?? 'sine';

      this._applyParamAutomation(
        nodes.osc.frequency,
        (t) => track.getParameter('frequency')?.getValue(t) ?? 200,
        time
      );

      if (nodes.osc.type !== waveform) nodes.osc.type = waveform;

      this._applyParamAutomation(
        nodes.lfo.frequency,
        (t) => track.getParameter('pulseRate')?.getValue(t) ?? 10,
        time
      );

      // Update WaveShaper curve for Duty Cycle (PWM)
      const dutyCycle = track.getParameter('dutyCycle')?.getValue(time) ?? 0.5;

      if (Math.abs((nodes.lastDuty ?? -1) - dutyCycle) > 0.01) {
        nodes.lastDuty = dutyCycle;
        const curve = new Float32Array(256);
        const threshold = 1 - (2 * dutyCycle);
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * 2 - 1;
          curve[i] = x > threshold ? 1 : 0;
        }
        nodes.shaper.curve = curve;
      }
    }
  }

}

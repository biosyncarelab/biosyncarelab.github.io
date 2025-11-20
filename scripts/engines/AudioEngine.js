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
    this._loop();
  }

  stop() {
    this.isRunning = false;
  }

  _loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this._loop());

    const time = this.ctx ? this.ctx.currentTime : Date.now() / 1000;
    this.update(time);
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
    const gainVal = track.getParameter('gain')?.getValue(time) ?? 0.5;
    nodes.output.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.05);

    // Generic Pan
    const panVal = track.getParameter('pan')?.getValue(time) ?? 0;
    // console.log(`Track ${track.id} Pan: ${panVal}`); // Debug
    nodes.panner.pan.setTargetAtTime(panVal, this.ctx.currentTime, 0.05);

    if (track.constructor.name === 'SineTrack') {
      const freq = track.getParameter('frequency')?.getValue(time) ?? 440;
      nodes.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    } else if (track.constructor.name === 'BinauralBeatTrack') {
      const carrier = track.getParameter('carrier')?.getValue(time) ?? 200;
      const beat = track.getParameter('beat')?.getValue(time) ?? 10;
      const waveType = track.getParameter('waveType')?.base ?? 'sine';

      nodes.leftOsc.frequency.setTargetAtTime(carrier, this.ctx.currentTime, 0.05);
      nodes.rightOsc.frequency.setTargetAtTime(carrier + beat, this.ctx.currentTime, 0.05);

      if (nodes.leftOsc.type !== waveType) {
        // console.log(`Changing waveType to ${waveType}`); // Debug
        nodes.leftOsc.type = waveType;
        nodes.rightOsc.type = waveType;
      }
    } else if (track.constructor.name === 'IsochronicTrack') {
      const freq = track.getParameter('frequency')?.getValue(time) ?? 200;
      const rate = track.getParameter('pulseRate')?.getValue(time) ?? 10;
      const dutyCycle = track.getParameter('dutyCycle')?.getValue(time) ?? 0.5;
      const waveform = track.getParameter('waveform')?.base ?? 'sine';

      nodes.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      if (nodes.osc.type !== waveform) nodes.osc.type = waveform;

      nodes.lfo.frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.05);

      // Update WaveShaper curve for Duty Cycle (PWM)
      // Sawtooth goes -1 to 1. We want output 0 or 1 based on threshold.
      // Threshold = 1 - 2 * dutyCycle (approx)
      // If duty is 0.5, threshold is 0. Saw > 0 -> 1, Saw < 0 -> 0.
      // We need to update the curve only if duty cycle changes significantly to save CPU
      // For now, let's just update it.

      if (Math.abs((nodes.lastDuty ?? -1) - dutyCycle) > 0.01) {
        nodes.lastDuty = dutyCycle;
        const curve = new Float32Array(256);
        const threshold = 1 - (2 * dutyCycle);
        for (let i = 0; i < 256; i++) {
          // Input x is -1 to 1
          const x = (i / 255) * 2 - 1;
          curve[i] = x > threshold ? 1 : 0; // Simple square pulse
          // For softer "ADSR" like feel, we could smooth this transition
        }
        nodes.shaper.curve = curve;
      }
    }
  }
  _initTrack(track) {
    if (this.backend === 'webaudio') {
      this._initWebAudioTrack(track);
    }
    // Future: Tone.js implementation
  }

  _stopTrack(track) {
    const nodes = this.nodes.get(track.id);
    if (nodes) {
      try {
        nodes.output.disconnect();
        if (nodes.osc) nodes.osc.stop();
      } catch (e) { /* ignore */ }
      this.nodes.delete(track.id);
    }
  }

  _initWebAudioTrack(track) {
    // Basic implementation for Sine, Binaural, Isochronic
    // This is a simplified factory. In a real app, we might have separate classes for these nodes.

    const gain = this.ctx.createGain();
    gain.connect(this.masterGain);

    const nodes = { output: gain };

    if (track.constructor.name === 'SineTrack') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.connect(gain);
      osc.start();
      nodes.osc = osc;
    } else if (track.constructor.name === 'BinauralBeatTrack') {
      // Binaural requires stereo separation
      const merger = this.ctx.createChannelMerger(2);
      merger.connect(gain);

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
      // Isochronic: Tone -> Pulse Gain -> Output
      const pulseGain = this.ctx.createGain();
      pulseGain.gain.value = 0.5; // Base gain for modulation
      pulseGain.connect(gain);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; // Carrier
      osc.connect(pulseGain);
      osc.start();

      // LFO for pulsing (Square wave for sharp on/off)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'square';

      // LFO Gain to scale modulation depth (0 to 1 range)
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.5;

      lfo.connect(lfoGain).connect(pulseGain.gain);
      lfo.start();

      nodes.osc = osc;
      nodes.lfo = lfo;
      nodes.pulseGain = pulseGain;
    }

    this.nodes.set(track.id, nodes);
  }

  _updateTrackParams(track, time) {
    const nodes = this.nodes.get(track.id);
    if (!nodes) return;

    // Generic Gain
    const gainVal = track.getParameter('gain')?.getValue(time) ?? 0.5;
    nodes.output.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.05);

    if (track.constructor.name === 'SineTrack') {
      const freq = track.getParameter('frequency')?.getValue(time) ?? 440;
      nodes.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    } else if (track.constructor.name === 'BinauralBeatTrack') {
      const carrier = track.getParameter('carrier')?.getValue(time) ?? 200;
      const beat = track.getParameter('beat')?.getValue(time) ?? 10;

      nodes.leftOsc.frequency.setTargetAtTime(carrier, this.ctx.currentTime, 0.05);
      nodes.rightOsc.frequency.setTargetAtTime(carrier + beat, this.ctx.currentTime, 0.05);
    } else if (track.constructor.name === 'IsochronicTrack') {
      const freq = track.getParameter('frequency')?.getValue(time) ?? 200;
      const rate = track.getParameter('pulseRate')?.getValue(time) ?? 10;
      // Duty cycle not fully implemented in this simple LFO model, defaulting to 50%

      nodes.osc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      nodes.lfo.frequency.setTargetAtTime(rate, this.ctx.currentTime, 0.05);
    }
  }
}

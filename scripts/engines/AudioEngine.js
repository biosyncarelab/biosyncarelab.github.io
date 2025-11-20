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

    audioTracks.forEach(track => {
      if (!track.enabled) {
        this._stopTrack(track);
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

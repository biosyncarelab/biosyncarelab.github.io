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
    }
  }
}

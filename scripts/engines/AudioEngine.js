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

    // DEBUG: Monitor loop frequency and background state
    const now = Date.now();
    if (!this._lastTickTime) this._lastTickTime = now;
    const delta = now - this._lastTickTime;
    this._lastTickTime = now;

    if (document.hidden && Math.random() < 0.05) { // Log 5% of ticks in background to avoid spam
        console.log(`[AudioEngine] Background Tick | Delta: ${delta}ms | Hidden: ${document.hidden}`);
    }

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
      // DEBUG: Log automation attempts in background
      // console.log(`[AudioEngine] Automating param in background. Time: ${currentTime.toFixed(2)}`);

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

      // Stop all active isochronic voices
      if (nodes.activeVoices) {
        nodes.activeVoices.forEach(voice => {
          try {
            voice.osc.stop();
            voice.gain.disconnect();
          } catch (e) { /* ignore */ }
        });
        nodes.activeVoices = [];
      }

      if (nodes.panner) nodes.panner.disconnect();
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
      // Isochronic: Polyphonic ADSR pulses (allows overlap for granular synthesis)
      // Each pulse creates its own oscillator + gain pair for true polyphony
      nodes.panner = panner; // Store reference for pulse creation
      nodes.lastPulseTime = 0; // Track when last pulse was triggered
      nodes.activeVoices = []; // Track active pulse voices for cleanup
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
      const frequency = track.getParameter('frequency')?.getValue(time) ?? 200;

      // Get ADSR and pulse parameters
      const pulseRate = track.getParameter('pulseRate')?.getValue(time) ?? 10;
      const dutyCycle = track.getParameter('dutyCycle')?.getValue(time) ?? 0.5;
      const attackTime = (track.getParameter('attackTime')?.getValue(time) ?? 10) / 1000; // Convert to seconds
      const decayTime = (track.getParameter('decayTime')?.getValue(time) ?? 20) / 1000;
      const sustainLevel = track.getParameter('sustainLevel')?.getValue(time) ?? 0.7;
      const releaseTime = (track.getParameter('releaseTime')?.getValue(time) ?? 50) / 1000;

      const pulseInterval = 1 / pulseRate; // seconds between pulses
      const pulseDuration = pulseInterval * dutyCycle;

      // Check if it's time to trigger a new pulse
      const ctxTime = this.ctx.currentTime;
      if (!nodes.lastPulseTime) nodes.lastPulseTime = ctxTime;

      const timeSinceLastPulse = ctxTime - nodes.lastPulseTime;
      if (timeSinceLastPulse >= pulseInterval) {
        // Trigger new polyphonic pulse voice
        const startTime = ctxTime;
        const peakTime = startTime + attackTime;
        const sustainStartTime = peakTime + decayTime;
        const sustainDuration = Math.max(0, pulseDuration - attackTime - decayTime - releaseTime);
        const releaseStartTime = sustainStartTime + sustainDuration;
        const endTime = releaseStartTime + releaseTime;

        try {
          // Create new oscillator + gain for this pulse (polyphonic)
          const osc = this.ctx.createOscillator();
          osc.type = waveform;
          osc.frequency.value = frequency;

          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(nodes.panner);

          // Schedule ADSR envelope
          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.exponentialRampToValueAtTime(1.0, peakTime);

          if (decayTime > 0) {
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, sustainLevel), sustainStartTime);
          }

          if (sustainDuration > 0) {
            gain.gain.setValueAtTime(Math.max(0.001, sustainLevel), releaseStartTime);
          }

          gain.gain.exponentialRampToValueAtTime(0.001, endTime);

          // Start oscillator and schedule cleanup
          osc.start(startTime);
          osc.stop(endTime + 0.1); // Stop slightly after release for safety

          // Track voice for cleanup
          const voice = { osc, gain, endTime };
          nodes.activeVoices.push(voice);

          // Schedule cleanup
          setTimeout(() => {
            try {
              gain.disconnect();
              const index = nodes.activeVoices.indexOf(voice);
              if (index > -1) nodes.activeVoices.splice(index, 1);
            } catch (e) { /* ignore */ }
          }, (endTime - ctxTime + 0.2) * 1000);

          // Update last pulse time
          nodes.lastPulseTime = ctxTime;
        } catch (e) {
          console.warn('[AudioEngine] Pulse voice creation error:', e);
        }
      }
    }
  }

}

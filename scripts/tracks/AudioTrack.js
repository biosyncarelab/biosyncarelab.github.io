import { Track } from './Track.js';

export class AudioTrack extends Track {
  constructor(id, label) {
    super(id, 'audio', label);

    // Standard audio parameters
    this.addParameter('gain', 0.5, { min: 0, max: 1 });
    this.addParameter('pan', 0, { min: -1, max: 1 }); // -1 left, 1 right
  }
}

export class BinauralBeatTrack extends AudioTrack {
  constructor(id, label) {
    super(id, label ?? 'Binaural Beat');

    // Binaural specific parameters
    this.addParameter('carrier', 200, { min: 20, max: 1000 }); // Carrier frequency (Hz)
    this.addParameter('beat', 10, { min: 0.1, max: 40 });     // Beat frequency (Hz)
    this.addParameter('waveType', 'sine', { options: ['sine', 'square', 'sawtooth', 'triangle'] });
  }
}

export class IsochronicTrack extends AudioTrack {
  constructor(id, label) {
    super(id, label ?? 'Isochronic Tone');

    this.addParameter('frequency', 200, { min: 20, max: 1000 });
    this.addParameter('pulseRate', 10, { min: 0.1, max: 40 });
    this.addParameter('waveform', 'sine', { options: ['sine', 'square', 'sawtooth', 'triangle'] });
    // Duty cycle: 0.1 (sharp pulse) to 0.9 (almost continuous)
    this.addParameter('dutyCycle', 0.5, { min: 0.05, max: 0.95 });

    // ADSR envelope parameters (in milliseconds, except sustain which is 0-1)
    this.addParameter('attackTime', 10, { min: 1, max: 200 });
    this.addParameter('decayTime', 20, { min: 0, max: 500 });
    this.addParameter('sustainLevel', 0.7, { min: 0, max: 1 });
    this.addParameter('releaseTime', 50, { min: 10, max: 1000 });
  }
}

export class SineTrack extends AudioTrack {
  constructor(id, label) {
    super(id, label ?? 'Sine Wave');
    this.addParameter('frequency', 440, { min: 20, max: 20000 });
  }
}

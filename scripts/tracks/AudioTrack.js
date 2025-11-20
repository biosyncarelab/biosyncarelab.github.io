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
    this.addParameter('waveType', 0); // 0: Sine, 1: Triangle, 2: Saw, 3: Square (mapped in renderer)
  }
}

export class IsochronicTrack extends AudioTrack {
  constructor(id, label) {
    super(id, label ?? 'Isochronic Tone');

    this.addParameter('frequency', 200, { min: 20, max: 1000 });
    this.addParameter('pulseRate', 10, { min: 0.1, max: 40 });
    this.addParameter('dutyCycle', 0.5, { min: 0.1, max: 0.9 });
  }
}

export class SineTrack extends AudioTrack {
  constructor(id, label) {
    super(id, label ?? 'Sine Wave');
    this.addParameter('frequency', 440, { min: 20, max: 20000 });
  }
}

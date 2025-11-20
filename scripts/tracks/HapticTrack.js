import { Track } from './Track.js';

export class HapticTrack extends Track {
  constructor(id, label) {
    super(id, 'haptic', label);

    this.addParameter('intensity', 0.5, { min: 0, max: 1 });
  }
}

export class VibrationTrack extends HapticTrack {
  constructor(id, label) {
    super(id, label ?? 'Vibration');

    this.addParameter('frequency', 100, { min: 0, max: 500 }); // Low freq vibration
    this.addParameter('pattern', 0); // 0: Continuous, 1: Pulse
  }
}

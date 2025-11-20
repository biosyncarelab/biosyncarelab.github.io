
export class HapticEngine {
  constructor(kernel) {
    this.kernel = kernel;
    this.isRunning = false;
    this.interval = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    // Vibrate API is not continuous, so we need a loop to re-trigger or manage patterns
    // But navigator.vibrate takes a pattern.
    // For simple continuous vibration, we might need to loop.
    this._loop();
  }

  stop() {
    this.isRunning = false;
    if (this.interval) clearTimeout(this.interval);
    if (navigator.vibrate) navigator.vibrate(0);
  }

  _loop() {
    if (!this.isRunning) return;

    // Simple update loop (e.g. 10Hz)
    this.update();
    this.interval = setTimeout(() => this._loop(), 100);
  }

  update() {
    if (!navigator.vibrate) return;

    const tracks = this.kernel.tracks.getByType('haptic');
    let active = false;

    tracks.forEach(track => {
      if (!track.enabled) return;

      // For now, just support simple vibration if any track is active
      // We can't easily mix haptic signals like audio.
      // We'll take the max intensity.

      // VibrationTrack usually has 'intensity' or 'pattern'
      // Let's check HapticTrack.js parameters.
      // Assuming 'strength' or similar.
      active = true;
    });

    if (active) {
      // Vibrate for 100ms
      navigator.vibrate(100);
    } else {
      navigator.vibrate(0);
    }
  }
}

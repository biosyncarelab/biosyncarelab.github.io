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
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;

    const tracks = this.kernel.tracks.getByType('haptic');
    let active = false;
    let maxIntensity = 0;

    tracks.forEach(track => {
      if (!track.enabled) return;
      active = true;
      // Get intensity if available
      const intensity = track.getParameter('intensity')?.base ?? 0.5;
      if (intensity > maxIntensity) maxIntensity = intensity;
    });

    if (active) {
      // Vibrate for 100ms
      // Note: On many mobile browsers, vibrate is ignored if the user hasn't interacted with the page recently.
      // Also, intensity is not supported by the standard vibrate API (it's just on/off or pattern).
      // We can simulate intensity by pulsing? e.g. [10, 10] vs [50, 0]
      // For now, just continuous vibration.
      try {
          navigator.vibrate(200); 
      } catch (e) {
          // Ignore errors
      }
    } else {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  }
}

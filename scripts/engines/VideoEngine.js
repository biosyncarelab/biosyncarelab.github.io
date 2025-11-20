/**
 * Video Engine
 * Orchestrates visual rendering using pluggable backends (Canvas, Pixi, Three.js)
 */

export class VideoEngine {
  constructor(kernel) {
    this.kernel = kernel;
    this.canvas = null;
    this.ctx = null;
    this.backend = 'canvas'; // Default
    this.isRunning = false;
  }

  attach(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.start();
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

    const time = Date.now() / 1000; // Simple time for now
    this.render(time);
  }

  render(time) {
    if (!this.ctx || !this.canvas) return;

    // Clear
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const visualTracks = this.kernel.tracks.getByType('visual');

    visualTracks.forEach(track => {
      if (!track.enabled) return;

      if (this.backend === 'canvas') {
        this._renderCanvasTrack(track, time);
      }
    });
  }

  _renderCanvasTrack(track, time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const opacity = track.getParameter('opacity')?.getValue(time) ?? 1;
    const scale = track.getParameter('scale')?.getValue(time) ?? 1;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(w/2, h/2);
    ctx.scale(scale, scale);

    if (track.constructor.name === 'GeometryVisualTrack') {
      const sides = Math.round(track.getParameter('sides')?.getValue(time) ?? 3);
      const hue = track.getParameter('hue')?.getValue(time) ?? 200;
      const rotationSpeed = track.getParameter('rotationSpeed')?.getValue(time) ?? 0;

      ctx.rotate(time * rotationSpeed);
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 5;

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const r = 100;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (track.constructor.name === 'ParticleVisualTrack') {
      // Simple particle demo
      const count = track.getParameter('count')?.getValue(time) ?? 10;
      const spread = track.getParameter('spread')?.getValue(time) ?? 0.5;

      ctx.fillStyle = '#fff';
      for (let i = 0; i < count; i++) {
        const angle = i * 137.5; // Golden angle
        const r = i * spread * 2;
        const x = Math.cos(angle + time) * r;
        const y = Math.sin(angle + time) * r;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

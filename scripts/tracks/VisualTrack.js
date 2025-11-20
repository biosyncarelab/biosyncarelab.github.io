import { Track } from './Track.js';

export class VisualTrack extends Track {
  constructor(id, label) {
    super(id, 'visual', label);

    this.addParameter('opacity', 1, { min: 0, max: 1 });
    this.addParameter('scale', 1, { min: 0, max: 10 });
  }
}

export class GeometryVisualTrack extends VisualTrack {
  constructor(id, label) {
    super(id, label ?? 'Geometry');

    this.addParameter('sides', 3, { min: 3, max: 12 });
    this.addParameter('rotationSpeed', 0.1, { min: -5, max: 5 });
    this.addParameter('hue', 200, { min: 0, max: 360 });
    this.addParameter('saturation', 100, { min: 0, max: 100 });
    this.addParameter('lightness', 50, { min: 0, max: 100 });
  }
}

export class ParticleVisualTrack extends VisualTrack {
  constructor(id, label) {
    super(id, label ?? 'Particles');

    this.addParameter('count', 100, { min: 0, max: 1000 });
    this.addParameter('speed', 1, { min: 0, max: 10 });
    this.addParameter('spread', 0.5, { min: 0, max: 1 });
  }
}

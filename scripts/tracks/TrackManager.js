import { Track } from './Track.js';
import { BinauralBeatTrack, IsochronicTrack, SineTrack } from './AudioTrack.js';
import { GeometryVisualTrack, ParticleVisualTrack } from './VisualTrack.js';
import { VibrationTrack } from './HapticTrack.js';

const TRACK_CLASSES = {
  'BinauralBeatTrack': BinauralBeatTrack,
  'IsochronicTrack': IsochronicTrack,
  'SineTrack': SineTrack,
  'GeometryVisualTrack': GeometryVisualTrack,
  'ParticleVisualTrack': ParticleVisualTrack,
  'VibrationTrack': VibrationTrack,
  'Track': Track
};

export class TrackManager {
  constructor(kernel) {
    this.kernel = kernel;
    this.tracks = new Map();
    this.listeners = new Set();
  }

  addTrack(track) {
    if (!(track instanceof Track)) {
      throw new Error("Invalid track object");
    }
    this.tracks.set(track.id, track);
    this._notifyListeners('add', track);
    this.kernel.recordInteraction('track.add', { id: track.id, type: track.type, label: track.label });
    return track;
  }

  removeTrack(trackId) {
    const track = this.tracks.get(trackId);
    if (track) {
      this.tracks.delete(trackId);
      this._notifyListeners('remove', track);
      this.kernel.recordInteraction('track.remove', { id: trackId });
      return true;
    }
    return false;
  }

  getTrack(trackId) {
    return this.tracks.get(trackId);
  }

  getAll() {
    return Array.from(this.tracks.values());
  }

  getByType(type) {
    return this.getAll().filter(t => t.type === type);
  }

  clear() {
    this.tracks.clear();
    this._notifyListeners('clear');
  }

  /**
   * Serialize all tracks
   */
  toJSON() {
    return this.getAll().map(t => ({
      ...t.toJSON(),
      // We need to store the specific class name or type to re-instantiate correctly
      // For now, we rely on the 'type' field and a factory in the future
      class: t.constructor.name
    }));
  }

  /**
   * Load tracks from JSON
   * @param {Array} data - Array of track data objects
   * @param {Function} factory - Optional custom factory
   */
  load(data, factory) {
    this.clear();
    if (!Array.isArray(data)) return;

    data.forEach(trackData => {
      try {
        let track;
        if (factory) {
          track = factory(trackData);
        } else {
          const ClassRef = TRACK_CLASSES[trackData.class] || Track;
          track = new ClassRef(trackData.id, trackData.label);
        }

        if (track) {
          // Hydrate parameters and bindings
          // We pass the kernel as context so tracks can find modulators (Martigli oscillators)
          const context = {
            resolveModulator: (id) => {
              const osc = this.kernel.martigli.getOscillator(id);
              if (!osc) {
                console.warn(`[TrackManager] Could not resolve modulator ID: ${id}. Available:`, this.kernel.martigli.listOscillations().map(o => o.id));
              }
              return osc;
            }
          };
          track.fromJSON(trackData, context);
          this.addTrack(track);
        }
      } catch (err) {
        console.error("Failed to load track:", trackData, err);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(event, payload) {
    this.listeners.forEach(fn => fn(event, payload));
  }
}

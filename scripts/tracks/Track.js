/**
 * Track Architecture
 * Defines the base classes for all Audio, Visual, and Haptic tracks.
 * Implements the core modulation logic: final = base + depth * modulator
 */

export class TrackParameter {
  constructor(name, defaultValue, options = {}) {
    this.name = name;
    this._base = defaultValue;
    this._depth = options.depth ?? 0;
    this._modulator = null; // Reference to a MartigliOscillator or similar
    this.min = options.min ?? -Infinity;
    this.max = options.max ?? Infinity;
    this.options = options.options ?? null; // For dropdowns: ['sine', 'square']
  }

  get base() { return this._base; }
  set base(val) { this._base = val; }

  get depth() { return this._depth; }
  set depth(val) { this._depth = val; }

  /**
   * Bind a modulator to this parameter
   * @param {object} modulator - Object with a getValue(time) or similar method
   */
  bind(modulator) {
    this._modulator = modulator;
  }

  unbind() {
    this._modulator = null;
  }

  /**
   * Calculate the instantaneous value
   * @param {number} time - Current time in seconds
   * @returns {number} The modulated value
   */
  getValue(time) {
    let val = this._base;

    if (this._modulator) {
      // Assume modulator has a valueAt(time) or we use its current state
      // For MartigliOscillator, we might need to access its last computed value
      // or pass the time to it.
      // If the modulator is a MartigliOscillator, it might have a `valueAt(time)` method
      // or we might rely on the kernel to update it.

      // For now, let's assume the modulator provides a normalized value [-1, 1] or [0, 1]
      // We'll check for common interfaces
      let modValue = 0;
      if (typeof this._modulator.valueAt === 'function') {
        modValue = this._modulator.valueAt(time);
      } else if (typeof this._modulator.getValue === 'function') {
        modValue = this._modulator.getValue(time);
      } else if (Number.isFinite(this._modulator.value)) {
        modValue = this._modulator.value;
      }

      val += modValue * this._depth;
    }

    // Clamp
    if (val < this.min) val = this.min;
    if (val > this.max) val = this.max;

    return val;
  }

  toJSON() {
    return {
      base: this._base,
      depth: this._depth,
      modulatorId: this._modulator?.id ?? null
    };
  }
}

export class Track {
  constructor(id, type, label) {
    this.id = id ?? crypto.randomUUID();
    this.type = type; // 'audio', 'visual', 'haptic'
    this.label = label ?? 'Untitled Track';
    this.enabled = true;
    this.parameters = new Map();
  }

  addParameter(name, defaultValue, options) {
    const param = new TrackParameter(name, defaultValue, options);
    this.parameters.set(name, param);
    return param;
  }

  getParameter(name) {
    return this.parameters.get(name);
  }

  /**
   * Set a parameter's base value
   */
  set(name, value) {
    const param = this.parameters.get(name);
    if (param) param.base = value;
  }

  /**
   * Bind a modulator to a parameter
   */
  modulate(name, modulator, depth) {
    const param = this.parameters.get(name);
    if (param) {
      param.bind(modulator);
      if (depth !== undefined) param.depth = depth;
    }
  }

  toJSON() {
    const params = {};
    for (const [name, param] of this.parameters) {
      params[name] = param.toJSON();
    }
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      enabled: this.enabled,
      parameters: params
    };
  }

  /**
   * Rehydrate state from JSON
   */
  fromJSON(data, context) {
    this.label = data.label ?? this.label;
    this.enabled = data.enabled ?? true;

    if (data.parameters) {
      for (const [name, paramData] of Object.entries(data.parameters)) {
        const param = this.parameters.get(name);
        if (param) {
          param.base = paramData.base;
          param.depth = paramData.depth;
          // Re-binding requires looking up the modulator in the context (e.g. Kernel)
          if (paramData.modulatorId && context?.resolveModulator) {
            const modulator = context.resolveModulator(paramData.modulatorId);
            if (modulator) {
              param.bind(modulator);
            } else {
              console.warn(`[Track] Failed to resolve modulator ${paramData.modulatorId} for param ${name}`);
            }
          }
        }
      }
    }
  }
}

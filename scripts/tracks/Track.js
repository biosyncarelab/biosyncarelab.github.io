/**
 * Track Architecture
 * Defines the base classes for all Audio, Visual, and Haptic tracks.
 * Implements the core modulation logic: final = base + Σ(depthᵢ * modᵢ)
 */

const createSlotId = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `mod-${Math.random().toString(36).slice(2, 9)}`;

export class TrackParameter {
  constructor(name, defaultValue, options = {}) {
    this.name = name;
    this._base = defaultValue;
    this.min = options.min ?? -Infinity;
    this.max = options.max ?? Infinity;
    this.options = options.options ?? null; // For dropdowns: ['sine', 'square']
    this.modulations = [];

    const initialDepth = options.depth ?? 0;
    if (initialDepth !== 0) {
      this.createModulationSlot({
        type: options.modulatorType ?? 'martigli',
        label: options.modulatorLabel ?? 'Modulator',
        depth: initialDepth,
      });
    }
  }

  get base() { return this._base; }
  set base(val) { this._base = val; }

  get primaryModulation() {
    return this.modulations[0] ?? null;
  }

  get depth() {
    return this.primaryModulation?.depth ?? 0;
  }

  set depth(val) {
    const slot = this.ensurePrimaryModulation();
    slot.depth = val;
  }

  ensurePrimaryModulation() {
    if (!this.primaryModulation) {
      const slot = this.createModulationSlot({ type: 'martigli', label: 'Modulation', depth: 0 });
      // Force as first entry
      this.modulations = [slot, ...this.modulations.filter((entry) => entry !== slot)];
    }
    return this.primaryModulation;
  }

  createModulationSlot({ type = 'martigli', label = 'Modulation', depth = 0, modulator = null, modulatorId = null, slotId = null, enabled = true } = {}) {
    const entry = {
      slotId: slotId ?? createSlotId(),
      type,
      label,
      depth,
      enabled: enabled !== false,
      modulatorId: modulator?.id ?? modulatorId ?? null,
      source: modulator ?? null,
    };
    this.modulations.push(entry);
    return entry;
  }

  getModulation(slotId) {
    if (!slotId) return null;
    return this.modulations.find((entry) => entry.slotId === slotId) ?? null;
  }

  attachModulator(slotId, modulator, options = {}) {
    if (!modulator) return null;
    let entry = slotId ? this.getModulation(slotId) : this.primaryModulation;
    if (!entry) {
      entry = this.createModulationSlot({
        type: options.type ?? 'martigli',
        label: options.label ?? modulator.label ?? 'Modulator',
        depth: typeof options.depth === 'number' ? options.depth : 0,
        enabled: options.enabled !== false,
      });
      this.modulations = [entry, ...this.modulations.filter((e) => e !== entry)];
    }
    entry.source = modulator;
    entry.modulatorId = modulator.id ?? entry.modulatorId ?? createSlotId();
    if (options.label) entry.label = options.label;
    if (options.type) entry.type = options.type;
    if (typeof options.enabled === 'boolean') entry.enabled = options.enabled;
    if (typeof options.depth === 'number') entry.depth = options.depth;
    return entry;
  }

  /**
   * Bind a modulator to this parameter
   * @param {object} modulator - Object with a getValue/time or valueAt method
   * @param {object} options - { slotId, depth, label, type }
   */
  bind(modulator, options = {}) {
    return this.attachModulator(options.slotId, modulator, options);
  }

  setModulationDepth(slotId, depth) {
    const entry = slotId ? this.getModulation(slotId) : this.primaryModulation;
    if (entry) entry.depth = depth;
  }

  setModulationEnabled(slotId, enabled) {
    const entry = slotId ? this.getModulation(slotId) : this.primaryModulation;
    if (entry) entry.enabled = enabled;
  }

  unbind(slotId = null) {
    if (!this.modulations.length) return;
    if (!slotId) {
      this.modulations = [];
      return;
    }
    this.modulations = this.modulations.filter((entry) => entry.slotId !== slotId);
  }

  /**
   * Calculate the instantaneous value
   * @param {number} time - Current time in seconds
   * @returns {number} The modulated value
   */
  getValue(time) {
    let val = this._base;

    this.modulations.forEach((entry) => {
      if (!entry?.source || entry.depth === 0 || entry.enabled === false) return;
      let modValue = 0;
      if (typeof entry.source.valueAt === 'function') {
        modValue = entry.source.valueAt(time);
      } else if (typeof entry.source.getValue === 'function') {
        modValue = entry.source.getValue(time);
      } else if (Number.isFinite(entry.source.value)) {
        modValue = entry.source.value;
      }
      val += modValue * entry.depth;
    });

    // Clamp
    if (val < this.min) val = this.min;
    if (val > this.max) val = this.max;

    return val;
  }

  toJSON() {
    const primary = this.primaryModulation;
    return {
      base: this._base,
      depth: primary?.depth ?? 0,
      modulatorId: primary?.modulatorId ?? null,
      modulations: this.modulations.map(({ slotId, type, depth, modulatorId, label, enabled }) => ({
        slotId,
        type,
        depth,
        modulatorId: modulatorId ?? null,
        label,
        enabled: enabled !== false,
      })),
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
          if (Array.isArray(paramData.modulations) && paramData.modulations.length) {
            param.modulations = [];
            paramData.modulations.forEach((entry, index) => {
              const slot = param.createModulationSlot({
                slotId: entry.slotId,
                type: entry.type ?? 'martigli',
                label: entry.label ?? `Modulator ${index + 1}`,
                depth: entry.depth ?? 0,
                enabled: entry.enabled !== false,
                modulatorId: entry.modulatorId ?? null,
              });
              if (entry.modulatorId && context?.resolveModulator) {
                const resolved = context.resolveModulator(entry.modulatorId);
                if (resolved) {
                  param.attachModulator(slot.slotId, resolved, { depth: slot.depth, type: slot.type, label: slot.label, enabled: slot.enabled });
                } else {
                  console.warn(`[Track] Failed to resolve modulator ${entry.modulatorId} for param ${name}`);
                }
              }
            });
          } else {
            param.modulations = [];
            if (typeof paramData.depth === 'number' && paramData.depth !== 0) {
              const slot = param.createModulationSlot({
                type: 'martigli',
                label: paramData.modulatorLabel ?? 'Modulation',
                depth: paramData.depth,
                modulatorId: paramData.modulatorId ?? null,
              });
              if (paramData.modulatorId && context?.resolveModulator) {
                const resolved = context.resolveModulator(paramData.modulatorId);
                if (resolved) {
                  param.attachModulator(slot.slotId, resolved, { depth: slot.depth });
                }
              }
            }
          }
        }
      }
    }
  }
}

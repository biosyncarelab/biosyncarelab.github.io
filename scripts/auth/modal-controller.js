/**
 * Modal Controller
 * Manages modal dialog lifecycle and state
 * Handles opening, closing, and modal content management
 */

import { UI_CONFIG } from '../constants.js';

/**
 * Modal Controller Class
 * Manages modal state and operations
 */
export class ModalController {
  constructor(modalElements) {
    this.modal = modalElements.modal;
    this.overlay = modalElements.overlay;
    this.closeButton = modalElements.closeButton;
    this.titleElement = modalElements.title;
    this.kindElement = modalElements.kind;
    this.metaElement = modalElements.meta;

    this.isOpen = false;
    this.activeRecord = null;
    this.activeData = null;
    this.onCloseCallbacks = [];

    this._setupEventListeners();
  }

  /**
   * Setup event listeners for modal controls
   * @private
   */
  _setupEventListeners() {
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close('overlay-click'));
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close('close-button'));
    }

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close('escape-key');
      }
    });
  }

  /**
   * Open modal with content
   * @param {object} record - Record data (session, preset, etc.)
   * @param {string} kind - 'session', 'preset', 'lab'
   * @param {object} options - Additional options
   */
  open(record, kind = 'session', options = {}) {
    if (!this.modal) return;

    this.activeRecord = {
      id: record.id ?? null,
      kind,
      label: record.label ?? record.name ?? record.id ?? 'Untitled',
    };

    this.activeData = record;
    this.isOpen = true;

    // Set title
    if (this.titleElement) {
      this.titleElement.textContent = record.label ?? record.name ?? record.id ?? 'Untitled';
    }

    // Set kind badge
    if (this.kindElement) {
      const kindLabels = {
        session: 'Session',
        preset: 'Preset',
        lab: 'Martigli Lab',
      };
      this.kindElement.textContent = kindLabels[kind] || kind;
    }

    // Show modal
    this.modal.classList.remove(UI_CONFIG.CLASSES.HIDDEN);
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Focus management
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (firstFocusable) {
      firstFocusable.focus();
    }

    return this;
  }

  /**
   * Close modal
   * @param {string} reason - Reason for closing (for telemetry)
   */
  close(reason = 'unknown') {
    if (!this.modal || !this.isOpen) return;

    // Call close callbacks
    this.onCloseCallbacks.forEach(callback => {
      try {
        callback({ record: this.activeRecord, reason });
      } catch (err) {
        console.error('Modal close callback error:', err);
      }
    });

    // Hide modal
    this.modal.classList.add(UI_CONFIG.CLASSES.HIDDEN);
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // Clear state
    this.isOpen = false;
    this.activeRecord = null;
    this.activeData = null;

    return this;
  }

  /**
   * Register a callback for when modal closes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onClose(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.onCloseCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.onCloseCallbacks.indexOf(callback);
      if (index > -1) {
        this.onCloseCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current modal state
   * @returns {object}
   */
  getState() {
    return {
      isOpen: this.isOpen,
      activeRecord: this.activeRecord,
      activeData: this.activeData,
    };
  }

  /**
   * Update modal content
   * @param {object} updates - Content updates
   */
  updateContent(updates) {
    if (updates.title && this.titleElement) {
      this.titleElement.textContent = updates.title;
    }

    if (updates.kind && this.kindElement) {
      this.kindElement.textContent = updates.kind;
    }

    return this;
  }

  /**
   * Check if modal is currently open
   * @returns {boolean}
   */
  isModalOpen() {
    return this.isOpen;
  }

  /**
   * Get active modal data
   * @returns {object|null}
   */
  getActiveData() {
    return this.activeData;
  }

  /**
   * Get active modal record
   * @returns {object|null}
   */
  getActiveRecord() {
    return this.activeRecord;
  }
}

/**
 * Visualizer Modal Controller
 * Manages the visualizer modal (for expanded canvas view)
 */
export class VisualizerModalController {
  constructor(modalElements) {
    this.modal = modalElements.modal;
    this.overlay = modalElements.overlay;
    this.closeButton = modalElements.closeButton;
    this.canvas = modalElements.canvas;
    this.titleElement = modalElements.title;
    this.summaryElement = modalElements.summary;

    this.isOpen = false;
    this.onCloseCallbacks = [];

    this._setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close('overlay-click'));
    }

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close('close-button'));
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close('escape-key');
      }
    });
  }

  /**
   * Open visualizer modal
   * @param {object} options - { title, summary, canvasConfig }
   */
  open(options = {}) {
    if (!this.modal) return;

    this.isOpen = true;

    if (this.titleElement && options.title) {
      this.titleElement.textContent = options.title;
    }

    if (this.summaryElement && options.summary) {
      this.summaryElement.textContent = options.summary;
    }

    this.modal.classList.remove(UI_CONFIG.CLASSES.HIDDEN);
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('visualizer-open');

    return this;
  }

  /**
   * Close visualizer modal
   * @param {string} reason
   */
  close(reason = 'unknown') {
    if (!this.modal || !this.isOpen) return;

    this.onCloseCallbacks.forEach(callback => {
      try {
        callback({ reason });
      } catch (err) {
        console.error('Visualizer close callback error:', err);
      }
    });

    this.modal.classList.add(UI_CONFIG.CLASSES.HIDDEN);
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('visualizer-open');

    this.isOpen = false;

    return this;
  }

  /**
   * Register close callback
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onClose(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    this.onCloseCallbacks.push(callback);

    return () => {
      const index = this.onCloseCallbacks.indexOf(callback);
      if (index > -1) {
        this.onCloseCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get canvas element for rendering
   * @returns {HTMLCanvasElement|null}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Check if visualizer is open
   * @returns {boolean}
   */
  isVisualizerOpen() {
    return this.isOpen;
  }
}

/**
 * Create modal controller instance
 * @param {object} elements - Modal DOM elements
 * @returns {ModalController}
 */
export function createModalController(elements) {
  return new ModalController(elements);
}

/**
 * Create visualizer modal controller instance
 * @param {object} elements - Visualizer modal DOM elements
 * @returns {VisualizerModalController}
 */
export function createVisualizerModalController(elements) {
  return new VisualizerModalController(elements);
}

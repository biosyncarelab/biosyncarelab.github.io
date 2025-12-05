import { loadStructures, STRUCTURE_MANIFEST } from './structures-loader.js';
import { stateManager, setPath, getPath, subscribePath, getShareableURL } from './state-manager.js';

/**
 * Create a shareable URL for a specific structure
 * @param {string} sequenceId - Sequence identifier (e.g., "plain_changes_3" or "mirror-sweep-6")
 * @param {string} category - Category ('curated' or 'comprehensive')
 * @param {string} structureId - For curated: manifest ID (e.g., "symmetry-lines"), for comprehensive: same as sequenceId
 * @returns {string} Shareable URL
 */
function createStructureShareLink(sequenceId, category = 'comprehensive', structureId = null) {
  const state = stateManager.getState();

  // For curated structures, we need both structureId (manifest) and sequenceId (sequence within file)
  // For comprehensive structures, structureId = sequenceId (they're the same)
  const shareState = {
    ...state,
    activeTab: 'structures',
    structures: {
      category: category,
      structureId: category === 'curated' ? structureId : sequenceId,
      sequenceId: category === 'curated' ? sequenceId : null,
      playbackPosition: 0,
      isPlaying: false,
    },
    // Clear other state to keep URL minimal
    session: null,
    nso: {
      currentConcept: null,
      viewMode: 'graph',
      searchQuery: null,
    },
    tracks: {
      audio: [],
      visual: [],
      haptic: [],
      martigli: [],
    },
  };
  return getShareableURL(shareState);
}

/**
 * Copy shareable URL to clipboard and show feedback
 * @param {string} url - URL to copy
 * @param {HTMLElement} button - Button element for feedback
 */
async function copyShareLink(url, button) {
  try {
    await navigator.clipboard.writeText(url);
    const originalHTML = button.innerHTML;
    button.innerHTML = '✓ Copied!';
    button.classList.add('success-feedback');
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('success-feedback');
    }, 2000);
    return true;
  } catch (err) {
    console.error('Failed to copy URL:', err);
    const originalHTML = button.innerHTML;
    button.innerHTML = '✗ Failed';
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 2000);
    return false;
  }
}

/**
 * Create a session from a usage example
 * This builds tracks based on RDF metadata and switches to Dashboard
 * @param {Object} exampleData - Data from the usage example button
 */
function createSessionFromExample(exampleData) {
  const { structureId, category, sequenceId, example, structureName } = exampleData;

  console.log('Creating session from example:', {
    structure: structureName,
    category: example.category,
    scenario: example.scenario || example.label
  });

  // Parse track mapping to determine what tracks to create
  const trackMapping = example.trackMapping || example.trackMapping || '';
  const exampleCategory = example.category || 'mixed';
  const breathing = example.breathing || example.breathingPattern || '';

  // Build session tracks based on example category and track mapping
  const tracks = {
    audio: [],
    visual: [],
    haptic: [],
    martigli: []
  };

  // Generate track ID
  let trackIdCounter = Date.now();
  const generateTrackId = () => `track_${trackIdCounter++}`;

  // Create audio tracks for audio or mixed examples
  if (exampleCategory === 'audio' || exampleCategory === 'mixed') {
    // Parse track mapping to extract audio configuration
    const hasFrequencySweep = /frequency|sweep|tone/i.test(trackMapping);
    const hasBinaural = /binaural/i.test(trackMapping);
    const hasIsochronic = /isochronic|pulse/i.test(trackMapping);

    if (hasFrequencySweep || hasBinaural || hasIsochronic || exampleCategory === 'audio' || exampleCategory === 'mixed') {
      // Determine track type based on RDF patterns or intelligent defaults
      let trackType, params;

      if (hasBinaural) {
        // Explicitly mentioned binaural in RDF
        trackType = 'BinauralBeatTrack';
        params = {
          frequency: 432,
          gain: 0.3,
          beat: 8, // 8 Hz alpha waves
          waveform: 'sine'
        };
      } else if (hasIsochronic) {
        // Explicitly mentioned isochronic in RDF
        trackType = 'IsochronicTrack';
        params = {
          frequency: 432,
          gain: 0.3,
          pulseRate: 10, // 10 Hz
          dutyCycle: 0.5,
          waveform: 'sine',
          attackTime: 10,    // 10ms attack
          decayTime: 20,     // 20ms decay
          sustainLevel: 0.7, // 70% sustain
          releaseTime: 50    // 50ms release
        };
      } else if (exampleCategory === 'mixed') {
        // Mixed examples default to binaural beats (audiovisual entrainment)
        trackType = 'BinauralBeatTrack';
        params = {
          frequency: 432,
          gain: 0.3,
          beat: 10, // 10 Hz alpha waves for mixed stimulation
          waveform: 'sine'
        };
      } else {
        // Pure audio examples default to isochronic tones
        trackType = 'IsochronicTrack';
        params = {
          frequency: 528, // 528 Hz "love frequency"
          gain: 0.3,
          pulseRate: 4, // 4 Hz theta waves
          dutyCycle: 0.5,
          waveform: 'sine',
          attackTime: 10,    // 10ms attack
          decayTime: 20,     // 20ms decay
          sustainLevel: 0.7, // 70% sustain
          releaseTime: 50    // 50ms release
        };
      }

      tracks.audio.push({
        id: generateTrackId(),
        label: `${structureName} - ${trackType.replace('Track', '')}`,
        type: trackType,
        modality: 'audio',
        params: params,
        bindings: [],
        metadata: {
          structureId,
          category,
          exampleUri: example.uri
        }
      });
    }
  }

  // Create visual tracks for visual or mixed examples
  if (exampleCategory === 'visual' || exampleCategory === 'mixed') {
    const hasGeometry = /geometry|shape|pattern/i.test(trackMapping);
    const hasParticles = /particle|dot|point/i.test(trackMapping);

    if (hasGeometry || hasParticles || exampleCategory === 'visual') {
      tracks.visual.push({
        id: generateTrackId(),
        label: `${structureName} - Visual`,
        type: hasParticles ? 'ParticleVisualTrack' : 'GeometryVisualTrack',
        modality: 'visual',
        params: {
          color: '#38bdf8',
          intensity: 0.7
        },
        bindings: [],
        metadata: {
          structureId,
          category,
          exampleUri: example.uri
        }
      });
    }
  }

  // Create martigli/breathing track if breathing pattern is specified
  if (breathing && breathing !== 'N/A') {
    // Parse breathing pattern: "4-count inhale on rows 1-4, 4-count exhale on rows 5-8"
    const inhaleMatch = breathing.match(/(\d+)-count\s+inhale/i);
    const exhaleMatch = breathing.match(/(\d+)-count\s+exhale/i);

    if (inhaleMatch) {
      const inhaleCount = parseInt(inhaleMatch[1]);
      const exhaleCount = exhaleMatch ? parseInt(exhaleMatch[1]) : inhaleCount;

      tracks.martigli.push({
        id: generateTrackId(),
        label: `${structureName} - Breathing`,
        type: 'MartigliTrack',
        modality: 'breathing',
        isMartigli: true,
        params: {
          waveform: 'sine',
          period: (inhaleCount + exhaleCount) * 1000, // Convert to milliseconds
          inhaleRatio: inhaleCount / (inhaleCount + exhaleCount)
        },
        metadata: {
          structureId,
          category,
          breathingPattern: breathing,
          exampleUri: example.uri
        }
      });
    }
  }

  // Update state with structure info and tracks
  const newState = {
    activeTab: 'dashboard',
    structures: {
      category: category,
      structureId: category === 'curated' ? structureId : sequenceId || structureId,
      sequenceId: category === 'curated' ? sequenceId : null,
      playbackPosition: 0,
      isPlaying: false
    },
    tracks: tracks,
    session: {
      name: `${structureName} - ${example.scenario || example.label}`,
      description: example.outcome || '',
      structureId: structureId,
      exampleUri: example.uri,
      timestamp: new Date().toISOString()
    }
  };

  // Update state manager
  stateManager.setState(newState);

  // Switch to dashboard
  switchTab('dashboard');

  // Render tracks to dashboard
  renderTracksToDashboard(tracks, structureName);

  // Show success message
  console.log('✅ Session created from usage example:', {
    tracks: {
      audio: tracks.audio.length,
      visual: tracks.visual.length,
      haptic: tracks.haptic.length,
      martigli: tracks.martigli.length
    },
    structure: structureName
  });
}

/**
 * Render tracks to dashboard panels
 * @param {Object} tracks - Tracks object with audio, visual, haptic, martigli arrays
 * @param {string} structureName - Name of the structure for display
 */
function renderTracksToDashboard(tracks, structureName) {
  // Get dashboard UI elements
  const audioList = document.getElementById('audio-sensory-list');
  const audioStatus = document.getElementById('audio-sensory-status');
  const visualList = document.getElementById('visual-sensory-list');
  const visualStatus = document.getElementById('visual-sensory-status');
  const hapticList = document.getElementById('haptic-sensory-list');
  const hapticStatus = document.getElementById('haptic-sensory-status');
  const martigliList = document.getElementById('martigli-dashboard-list');
  const martigliSummary = document.getElementById('martigli-dashboard-summary');

  // Helper to create track item with preview button
  const createTrackItem = (track) => {
    const li = document.createElement('li');
    li.className = 'sensory-item';
    li.style.cssText = `
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';

    const label = document.createElement('div');
    label.style.cssText = 'font-weight: 600; margin-bottom: 0.25rem; color: var(--text);';
    label.textContent = track.label;

    const type = document.createElement('div');
    type.style.cssText = 'font-size: 0.8rem; color: var(--muted); margin-bottom: 0.5rem;';
    type.textContent = `Type: ${track.type}`;

    const params = document.createElement('div');
    params.style.cssText = 'font-size: 0.75rem; color: var(--muted);';
    const paramStrings = Object.entries(track.params || {})
      .filter(([key, val]) => val !== undefined)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
    params.textContent = paramStrings || 'No parameters';

    info.appendChild(label);
    info.appendChild(type);
    info.appendChild(params);

    // Add preview button for audio tracks
    const actions = document.createElement('div');
    actions.className = 'sensory-item-actions';
    actions.style.cssText = 'display: flex; gap: 0.5rem;';

    const previewBtn = document.createElement('button');
    previewBtn.className = 'ghost tiny preview-track-btn';
    previewBtn.textContent = 'Preview';
    previewBtn.dataset.trackId = track.id;
    previewBtn.dataset.trackData = JSON.stringify(track);

    actions.appendChild(previewBtn);

    li.appendChild(info);
    li.appendChild(actions);

    return li;
  };

  // Render audio tracks
  if (audioList) {
    audioList.innerHTML = '';
    if (tracks.audio.length > 0) {
      tracks.audio.forEach(track => {
        audioList.appendChild(createTrackItem(track));
      });
      if (audioStatus) {
        audioStatus.textContent = `${tracks.audio.length} audio track(s) from ${structureName}`;
      }
    } else {
      audioList.innerHTML = '<li class="muted-text" style="padding: 0.5rem;">No audio tracks in this example</li>';
      if (audioStatus) {
        audioStatus.textContent = 'No audio tracks';
      }
    }
  }

  // Render visual tracks
  if (visualList) {
    visualList.innerHTML = '';
    if (tracks.visual.length > 0) {
      tracks.visual.forEach(track => {
        visualList.appendChild(createTrackItem(track));
      });
      if (visualStatus) {
        visualStatus.textContent = `${tracks.visual.length} visual track(s) from ${structureName}`;
      }
    } else {
      visualList.innerHTML = '<li class="muted-text" style="padding: 0.5rem;">No visual tracks in this example</li>';
      if (visualStatus) {
        visualStatus.textContent = 'No visual tracks';
      }
    }
  }

  // Render haptic tracks
  if (hapticList) {
    hapticList.innerHTML = '';
    if (tracks.haptic.length > 0) {
      tracks.haptic.forEach(track => {
        hapticList.appendChild(createTrackItem(track));
      });
      if (hapticStatus) {
        hapticStatus.textContent = `${tracks.haptic.length} haptic track(s) from ${structureName}`;
      }
    } else {
      hapticList.innerHTML = '<li class="muted-text" style="padding: 0.5rem;">No haptic tracks in this example</li>';
      if (hapticStatus) {
        hapticStatus.textContent = 'No haptic tracks';
      }
    }
  }

  // Render martigli/breathing tracks
  if (martigliList) {
    martigliList.innerHTML = '';
    if (tracks.martigli.length > 0) {
      tracks.martigli.forEach(track => {
        const div = document.createElement('div');
        div.className = 'martigli-item';
        div.style.cssText = `
          padding: 0.75rem;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: 4px;
          margin-bottom: 0.5rem;
        `;

        const label = document.createElement('div');
        label.style.cssText = 'font-weight: 600; margin-bottom: 0.25rem; color: #38bdf8;';
        label.textContent = track.label;

        const params = document.createElement('div');
        params.style.cssText = 'font-size: 0.75rem; color: var(--muted);';
        const period = track.params?.period ? `${track.params.period}ms` : 'N/A';
        const ratio = track.params?.inhaleRatio ? `${(track.params.inhaleRatio * 100).toFixed(0)}%` : 'N/A';
        params.textContent = `Period: ${period} | Inhale: ${ratio} | Waveform: ${track.params?.waveform || 'N/A'}`;

        div.appendChild(label);
        div.appendChild(params);
        martigliList.appendChild(div);
      });
      if (martigliSummary) {
        martigliSummary.textContent = `${tracks.martigli.length} breathing track(s) from ${structureName}`;
      }
    } else if (martigliSummary) {
      martigliSummary.textContent = 'No breathing tracks in this example';
    }
  }

  // Add event listeners for preview buttons
  document.querySelectorAll('.preview-track-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const track = JSON.parse(button.dataset.trackData);

      // Toggle button state
      const isActive = button.classList.contains('active');

      if (isActive) {
        // Stop audio
        button.classList.remove('active');
        button.textContent = 'Preview';
        stopAudioPreview();
      } else {
        // Start audio - deactivate other buttons first
        document.querySelectorAll('.preview-track-btn.active').forEach(btn => {
          btn.classList.remove('active');
          btn.textContent = 'Preview';
        });

        button.classList.add('active');
        button.textContent = 'Stop';
        playAudioPreview(track);
      }
    });
  });

  console.log('✅ Tracks rendered to dashboard with preview functionality');
}

// Simple audio preview using Web Audio API
let audioContext = null;
let currentOscillator = null;
let currentGainNode = null;

function playAudioPreview(track) {
  stopAudioPreview(); // Stop any existing audio

  // Initialize audio context if needed
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Resume audio context (required for user interaction)
  audioContext.resume();

  const params = track.params || {};
  const frequency = parseFloat(params.frequency || params.base || 432);
  const gain = parseFloat(params.gain || 0.3);
  const waveform = params.waveform || 'sine';

  // Create main gain node
  currentGainNode = audioContext.createGain();
  currentGainNode.gain.value = gain;
  currentGainNode.connect(audioContext.destination);

  // Handle different track types
  if (track.type === 'BinauralBeatTrack') {
    // Binaural beat: two oscillators with slight frequency difference
    const beat = parseFloat(params.beat || 8); // Default to 8 Hz alpha waves

    // Left channel (base frequency)
    currentOscillator = audioContext.createOscillator();
    currentOscillator.frequency.value = frequency;
    currentOscillator.type = waveform;

    // Right channel (base frequency + beat)
    const oscillator2 = audioContext.createOscillator();
    oscillator2.frequency.value = frequency + beat;
    oscillator2.type = waveform;

    // Pan left and right
    const pannerL = audioContext.createStereoPanner();
    pannerL.pan.value = -1; // Full left

    const pannerR = audioContext.createStereoPanner();
    pannerR.pan.value = 1; // Full right

    currentOscillator.connect(pannerL);
    pannerL.connect(currentGainNode);

    oscillator2.connect(pannerR);
    pannerR.connect(currentGainNode);

    currentOscillator.start();
    oscillator2.start();

    // Store reference to stop later
    currentOscillator.secondOscillator = oscillator2;
    currentOscillator.pannerL = pannerL;
    currentOscillator.pannerR = pannerR;

    console.log(`▶ Playing binaural beat: ${track.label} (${frequency} Hz ± ${beat} Hz, ${waveform} wave)`);

  } else if (track.type === 'IsochronicTrack') {
    // Isochronic tone: rhythmic pulses with ADSR envelopes
    const pulseRate = parseFloat(params.pulseRate || 10); // Default to 10 Hz
    const dutyCycle = parseFloat(params.dutyCycle || 0.5);

    // ADSR parameters for each pulse (in milliseconds)
    const attackTime = parseFloat(params.attackTime || 10);
    const decayTime = parseFloat(params.decayTime || 20);
    const sustainLevel = parseFloat(params.sustainLevel || 0.7);
    const releaseTime = parseFloat(params.releaseTime || 50);

    // Create main oscillator (continuous)
    currentOscillator = audioContext.createOscillator();
    currentOscillator.frequency.value = frequency;
    currentOscillator.type = waveform;
    currentOscillator.connect(currentGainNode);
    currentOscillator.start();

    // Calculate timing for pulses
    const pulseInterval = 1000 / pulseRate; // ms per pulse
    const pulseDuration = pulseInterval * dutyCycle; // Duration of each pulse

    // Store pulse data for cleanup
    currentOscillator.pulseIntervalId = null;
    currentOscillator.pulseRate = pulseRate;

    // Function to trigger a single pulse with ADSR
    const triggerPulse = () => {
      const now = audioContext.currentTime;

      // Convert ms to seconds
      const attackSec = attackTime / 1000;
      const decaySec = decayTime / 1000;
      const releaseSec = releaseTime / 1000;
      const pulseDurationSec = pulseDuration / 1000;

      // Calculate sustain duration
      const minPulseDuration = attackSec + decaySec + releaseSec;
      const actualPulseDuration = Math.max(pulseDurationSec, minPulseDuration);
      const sustainDuration = actualPulseDuration - attackSec - decaySec - releaseSec;

      const peakGain = gain;
      const sustainGain = Math.max(0.001, peakGain * sustainLevel);

      // Cancel any existing scheduled changes
      currentGainNode.gain.cancelScheduledValues(now);

      // Apply ADSR envelope
      currentGainNode.gain.setValueAtTime(0.001, now);
      currentGainNode.gain.exponentialRampToValueAtTime(peakGain, now + attackSec);
      currentGainNode.gain.exponentialRampToValueAtTime(sustainGain, now + attackSec + decaySec);
      currentGainNode.gain.setValueAtTime(sustainGain, now + attackSec + decaySec + sustainDuration);
      currentGainNode.gain.exponentialRampToValueAtTime(0.001, now + actualPulseDuration);
    };

    // Start pulsing
    triggerPulse(); // First pulse immediately
    currentOscillator.pulseIntervalId = setInterval(triggerPulse, pulseInterval);

    console.log(`▶ Playing isochronic tone: ${track.label} (${frequency} Hz, ${pulseRate} Hz pulses, ADSR: ${attackTime}/${decayTime}/${sustainLevel}/${releaseTime})`);

  } else {
    // Simple sine/square/sawtooth wave
    currentOscillator = audioContext.createOscillator();
    currentOscillator.frequency.value = frequency;
    currentOscillator.type = waveform;

    currentOscillator.connect(currentGainNode);
    currentOscillator.start();

    console.log(`▶ Playing audio: ${track.label} (${frequency} Hz, ${waveform} wave)`);
  }
}

function stopAudioPreview() {
  if (currentOscillator) {
    try {
      currentOscillator.stop();

      // Stop second oscillator (binaural beat)
      if (currentOscillator.secondOscillator) {
        currentOscillator.secondOscillator.stop();
        currentOscillator.secondOscillator = null;
      }

      // Stop pulse interval (isochronic tone)
      if (currentOscillator.pulseIntervalId) {
        clearInterval(currentOscillator.pulseIntervalId);
        currentOscillator.pulseIntervalId = null;
      }

      // Stop LFO (legacy - no longer used for isochronic)
      if (currentOscillator.lfo) {
        currentOscillator.lfo.stop();
        currentOscillator.lfo = null;
      }

      // Disconnect panners (binaural beat)
      if (currentOscillator.pannerL) {
        currentOscillator.pannerL.disconnect();
        currentOscillator.pannerL = null;
      }
      if (currentOscillator.pannerR) {
        currentOscillator.pannerR.disconnect();
        currentOscillator.pannerR = null;
      }

      // Disconnect LFO gain (isochronic tone)
      if (currentOscillator.lfoGain) {
        currentOscillator.lfoGain.disconnect();
        currentOscillator.lfoGain = null;
      }
    } catch (e) {
      // Oscillator may already be stopped
      console.warn('Error stopping audio:', e);
    }
    currentOscillator = null;
  }

  if (currentGainNode) {
    try {
      currentGainNode.disconnect();
    } catch (e) {
      // May already be disconnected
    }
    currentGainNode = null;
  }
}

// ============================================================
// Structure Playback - Music Sequencer
// ============================================================

/**
 * StructurePlayer - Manages playback of structures as musical sequences
 */
class StructurePlayer {
  constructor(sequence, sequenceId, options = {}) {
    this.sequence = sequence;
    this.sequenceId = sequenceId;
    this.rows = sequence.rowsZeroBased || sequence.rows || [];
    this.tempo = options.tempo || 120; // BPM
    this.currentRow = 0;
    this.isPlaying = false;
    this.intervalId = null;
    this.oscillators = new Map(); // bell -> oscillator
    this.gainNodes = new Map(); // bell -> gain node

    // Initialize audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Synthesis parameters
    this.baseFrequency = options.baseFrequency || 261.63; // C4
    this.numberOfOctaves = options.numberOfOctaves || 1;
    this.maxBells = 10; // Support up to 10 bells
    this.waveform = options.waveform || 'sine';
    this.overlap = options.overlap || 0; // 0 to 1 (percentage of note duration to overlap)

    // ADSR envelope parameters (in milliseconds and 0-1 for sustain level)
    this.attackTime = options.attackTime || 10;
    this.decayTime = options.decayTime || 50;
    this.sustainLevel = options.sustainLevel || 0.7;
    this.releaseTime = options.releaseTime || 100;
  }

  /**
   * Calculate frequency for a bell using exponential scale
   */
  getFrequency(bellNumber) {
    // f_n = f_0 * 2^((n * octaves) / (2 * bells))
    const exponent = (bellNumber * this.numberOfOctaves) / (2 * this.maxBells);
    return this.baseFrequency * Math.pow(2, exponent);
  }

  /**
   * Update synthesis parameters
   */
  updateSynthParams(params) {
    if (params.baseFrequency !== undefined) this.baseFrequency = params.baseFrequency;
    if (params.numberOfOctaves !== undefined) this.numberOfOctaves = params.numberOfOctaves;
    if (params.waveform !== undefined) this.waveform = params.waveform;
    if (params.overlap !== undefined) this.overlap = params.overlap;
    if (params.attackTime !== undefined) this.attackTime = params.attackTime;
    if (params.decayTime !== undefined) this.decayTime = params.decayTime;
    if (params.sustainLevel !== undefined) this.sustainLevel = params.sustainLevel;
    if (params.releaseTime !== undefined) this.releaseTime = params.releaseTime;
  }

  /**
   * Start playback from current position
   */
  start() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    audioContext.resume();

    // Play first row immediately
    this.playRow(this.currentRow);

    // Schedule next row
    this.scheduleNextRow();
  }

  /**
   * Schedule the next row to play
   */
  scheduleNextRow() {
    if (!this.isPlaying) return;

    // Calculate interval between rows (milliseconds per beat)
    const msPerBeat = 60000 / this.tempo;

    this.intervalId = setTimeout(() => {
      this.currentRow++;

      if (this.currentRow >= this.rows.length) {
        // Check if sequence loops
        if (this.sequence.loop) {
          this.currentRow = 0;
        } else {
          this.stop();
          return;
        }
      }

      this.playRow(this.currentRow);
      this.scheduleNextRow();
    }, msPerBeat);
  }

  /**
   * Stop playback and cleanup
   */
  stop() {
    this.isPlaying = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    // Stop all oscillators
    this.stopAllNotes();

    // Reset to beginning
    this.currentRow = 0;
  }

  /**
   * Set tempo (BPM) - changes speed without restarting
   */
  setTempo(tempo) {
    this.tempo = tempo;
    // The new tempo will take effect on the next scheduled row
  }

  /**
   * Play a single row as a sequence (one bell at a time)
   */
  playRow(rowIndex) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) return;

    const row = this.rows[rowIndex];

    // Trigger UI update immediately
    this.onRowChange?.(rowIndex);

    // Calculate timing for each bell in the row
    const msPerBeat = 60000 / this.tempo;
    const msPerBell = msPerBeat / row.length;

    // Play each bell in sequence
    row.forEach((bellValue, position) => {
      setTimeout(() => {
        if (this.isPlaying) {
          this.playNote(bellValue, position);
        }
      }, position * msPerBell);
    });
  }

  /**
   * Play a single note (one bell)
   */
  playNote(bellValue, position) {
    // Get frequency using exponential scale
    const frequency = this.getFrequency(bellValue);

    // Calculate note duration based on tempo and overlap
    const msPerBeat = 60000 / this.tempo;
    const msPerBell = msPerBeat / this.rows[this.currentRow].length;
    const noteDuration = msPerBell * (1 + this.overlap); // Extend based on overlap
    const noteDurationSec = noteDuration / 1000;

    // Create oscillator for this bell
    const oscillator = audioContext.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.value = frequency;

    // Create gain node with ADSR envelope
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    // Convert milliseconds to seconds
    const attackSec = this.attackTime / 1000;
    const decaySec = this.decayTime / 1000;
    const releaseSec = this.releaseTime / 1000;

    // Calculate sustain duration (what's left after attack and decay, before release)
    const minNoteDuration = attackSec + decaySec + releaseSec;
    const actualNoteDuration = Math.max(noteDurationSec, minNoteDuration);
    const sustainDuration = actualNoteDuration - attackSec - decaySec - releaseSec;

    // Peak amplitude (at end of attack)
    const peakGain = 0.3;

    // Apply ADSR envelope with exponential curves for more natural sound
    gainNode.gain.setValueAtTime(0.001, now); // Start near zero (can't be exactly zero for exponential)

    // Attack: exponential rise to peak
    gainNode.gain.exponentialRampToValueAtTime(peakGain, now + attackSec);

    // Decay: exponential fall to sustain level
    const sustainGain = Math.max(0.001, peakGain * this.sustainLevel); // Ensure > 0 for exponential
    gainNode.gain.exponentialRampToValueAtTime(sustainGain, now + attackSec + decaySec);

    // Sustain: hold at sustain level
    gainNode.gain.setValueAtTime(sustainGain, now + attackSec + decaySec + sustainDuration);

    // Release: exponential fall to zero
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + actualNoteDuration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start and stop oscillator
    oscillator.start(now);
    oscillator.stop(now + actualNoteDuration);

    // Store references
    this.oscillators.set(position, oscillator);
    this.gainNodes.set(position, gainNode);

    // Clean up after note ends
    setTimeout(() => {
      this.oscillators.delete(position);
      this.gainNodes.delete(position);
    }, actualNoteDuration * 1000 + 100);
  }

  /**
   * Stop all currently playing notes
   */
  stopAllNotes() {
    this.oscillators.forEach((oscillator, position) => {
      try {
        oscillator.stop();
      } catch (e) {
        // May already be stopped
      }
    });

    this.gainNodes.forEach((gainNode, position) => {
      try {
        gainNode.disconnect();
      } catch (e) {
        // May already be disconnected
      }
    });

    this.oscillators.clear();
    this.gainNodes.clear();
  }
}

// Global player instance
let currentPlayer = null;

/**
 * Start structure playback
 */
function startStructurePlayback(sequenceId) {
  // Stop any existing playback
  if (currentPlayer) {
    currentPlayer.stop();
    currentPlayer = null;
  }

  // Find the sequence
  let sequence = null;
  if (currentData) {
    if (currentData.sequences) {
      sequence = currentData.sequences.find(seq => seq.id === sequenceId);
    }
  }

  if (!sequence) {
    console.error('Sequence not found:', sequenceId);
    return;
  }

  // Get synthesis parameters from controls
  const tempoSlider = document.querySelector(`.tempo-slider[data-sequence-id="${sequenceId}"]`);
  const baseFreqInput = document.querySelector(`.base-freq-input[data-sequence-id="${sequenceId}"]`);
  const octaveSpanInput = document.querySelector(`.octave-span-input[data-sequence-id="${sequenceId}"]`);
  const waveformSelect = document.querySelector(`.waveform-select[data-sequence-id="${sequenceId}"]`);
  const overlapSlider = document.querySelector(`.overlap-slider[data-sequence-id="${sequenceId}"]`);
  const attackSlider = document.querySelector(`.attack-slider[data-sequence-id="${sequenceId}"]`);
  const decaySlider = document.querySelector(`.decay-slider[data-sequence-id="${sequenceId}"]`);
  const sustainSlider = document.querySelector(`.sustain-slider[data-sequence-id="${sequenceId}"]`);
  const releaseSlider = document.querySelector(`.release-slider[data-sequence-id="${sequenceId}"]`);

  const options = {
    tempo: tempoSlider ? parseInt(tempoSlider.value) : 120,
    baseFrequency: baseFreqInput ? parseFloat(baseFreqInput.value) : 261.63,
    numberOfOctaves: octaveSpanInput ? parseFloat(octaveSpanInput.value) : 1,
    waveform: waveformSelect ? waveformSelect.value : 'sine',
    overlap: overlapSlider ? parseFloat(overlapSlider.value) : 0,
    attackTime: attackSlider ? parseFloat(attackSlider.value) : 10,
    decayTime: decaySlider ? parseFloat(decaySlider.value) : 50,
    sustainLevel: sustainSlider ? parseFloat(sustainSlider.value) : 0.7,
    releaseTime: releaseSlider ? parseFloat(releaseSlider.value) : 100
  };

  // Create player
  currentPlayer = new StructurePlayer(sequence, sequenceId, options);

  // Set up row change callback for UI updates
  currentPlayer.onRowChange = (rowIndex) => {
    updatePlaybackUI(sequenceId, rowIndex);
  };

  // Update button states
  const playBtn = document.querySelector(`.play-structure-btn[data-sequence-id="${sequenceId}"]`);
  const stopBtn = document.querySelector(`.stop-structure-btn[data-sequence-id="${sequenceId}"]`);

  if (playBtn) playBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-block';

  // Start playback
  currentPlayer.start();

  console.log(`▶ Playing structure: ${sequence.label || sequenceId} at ${options.tempo} BPM`);
}

/**
 * Stop structure playback
 */
function stopStructurePlayback(sequenceId) {
  if (currentPlayer && currentPlayer.sequenceId === sequenceId) {
    currentPlayer.stop();
    currentPlayer = null;
  }

  // Update button states
  const playBtn = document.querySelector(`.play-structure-btn[data-sequence-id="${sequenceId}"]`);
  const stopBtn = document.querySelector(`.stop-structure-btn[data-sequence-id="${sequenceId}"]`);

  if (playBtn) playBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';

  // Clear row highlighting
  document.querySelectorAll('.row-line.playing').forEach(row => {
    row.classList.remove('playing');
  });

  // Reset position display
  const positionDisplay = document.querySelector(`.playback-position[data-sequence-id="${sequenceId}"]`);
  if (positionDisplay) {
    // Get total rows from the sequence
    let totalRows = 0;
    if (currentData && currentData.sequences) {
      const sequence = currentData.sequences.find(seq => seq.id === sequenceId);
      if (sequence) {
        const rows = sequence.rowsZeroBased || sequence.rows || [];
        totalRows = rows.length;
      }
    }
    positionDisplay.textContent = `Row: 0 / ${totalRows}`;
  }

  console.log('⏹ Stopped playback');
}

/**
 * Update playback UI (row highlighting and position)
 */
function updatePlaybackUI(sequenceId, rowIndex) {
  // Remove previous highlighting
  document.querySelectorAll('.row-line.playing').forEach(row => {
    row.classList.remove('playing');
  });

  // Highlight current row - no scrolling to avoid blocking user
  const rowElements = document.querySelectorAll('.row-line');
  if (rowElements[rowIndex]) {
    rowElements[rowIndex].classList.add('playing');
  }

  // Update position display for this specific sequence
  const positionDisplay = document.querySelector(`.playback-position[data-sequence-id="${sequenceId}"]`);
  if (positionDisplay && currentPlayer) {
    positionDisplay.textContent = `Row: ${rowIndex} / ${currentPlayer.rows.length}`;
  }
}

/**
 * Update tempo for current playback
 */
function updateTempo(sequenceId, tempo) {
  // Update display
  const tempoValue = document.querySelector(`.tempo-value[data-sequence-id="${sequenceId}"]`);
  if (tempoValue) {
    tempoValue.textContent = `${tempo} BPM`;
  }

  // Update player if playing this sequence
  if (currentPlayer && currentPlayer.sequenceId === sequenceId) {
    currentPlayer.setTempo(tempo);
  }
}

/**
 * Update synthesis parameters for current playback
 */
function updateSynthParams(sequenceId) {
  if (!currentPlayer || currentPlayer.sequenceId !== sequenceId) return;

  const baseFreqInput = document.querySelector(`.base-freq-input[data-sequence-id="${sequenceId}"]`);
  const octaveSpanInput = document.querySelector(`.octave-span-input[data-sequence-id="${sequenceId}"]`);
  const waveformSelect = document.querySelector(`.waveform-select[data-sequence-id="${sequenceId}"]`);
  const overlapSlider = document.querySelector(`.overlap-slider[data-sequence-id="${sequenceId}"]`);
  const attackSlider = document.querySelector(`.attack-slider[data-sequence-id="${sequenceId}"]`);
  const decaySlider = document.querySelector(`.decay-slider[data-sequence-id="${sequenceId}"]`);
  const sustainSlider = document.querySelector(`.sustain-slider[data-sequence-id="${sequenceId}"]`);
  const releaseSlider = document.querySelector(`.release-slider[data-sequence-id="${sequenceId}"]`);

  currentPlayer.updateSynthParams({
    baseFrequency: baseFreqInput ? parseFloat(baseFreqInput.value) : undefined,
    numberOfOctaves: octaveSpanInput ? parseFloat(octaveSpanInput.value) : undefined,
    waveform: waveformSelect ? waveformSelect.value : undefined,
    overlap: overlapSlider ? parseFloat(overlapSlider.value) : undefined,
    attackTime: attackSlider ? parseFloat(attackSlider.value) : undefined,
    decayTime: decaySlider ? parseFloat(decaySlider.value) : undefined,
    sustainLevel: sustainSlider ? parseFloat(sustainSlider.value) : undefined,
    releaseTime: releaseSlider ? parseFloat(releaseSlider.value) : undefined
  });
}

// Tab switching logic
const tabButtons = {
  dashboard: document.getElementById('tab-dashboard'),
  structures: document.getElementById('tab-structures'),
  nso: document.getElementById('tab-nso'),
  docs: document.getElementById('tab-docs')
};

const tabPanels = {
  dashboard: document.getElementById('panel-dashboard'),
  structures: document.getElementById('panel-structures'),
  nso: document.getElementById('panel-nso'),
  docs: document.getElementById('panel-docs')
};

const labTabs = document.getElementById('lab-tabs');

function switchTab(tabName) {
  // Update state
  setPath('activeTab', tabName);

  // Update tab buttons
  Object.entries(tabButtons).forEach(([name, button]) => {
    if (!button) return;
    const isActive = name === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', isActive.toString());
  });

  // Update tab panels
  Object.entries(tabPanels).forEach(([name, panel]) => {
    if (!panel) return;
    const isActive = name === tabName;
    panel.classList.toggle('hidden', !isActive);
  });

  // Trigger resize to ensure charts/graphs render correctly
  window.dispatchEvent(new Event('resize'));
}

// Set up tab click handlers
Object.entries(tabButtons).forEach(([name, button]) => {
  if (button) {
    button.addEventListener('click', () => switchTab(name));
  }
});

// Structure Visualizer Logic
let currentData = null;

const categorySelect = document.getElementById('structure-category');
const structureSelectGroup = document.getElementById('structure-select-group');
const structureSelect = document.getElementById('structure-select');
const statsContainer = document.getElementById('stats-container');
const sequenceContainer = document.getElementById('sequence-container');
const additionalDataContainer = document.getElementById('additional-data-container');

// Event delegation for share buttons, playback controls, and example buttons
if (sequenceContainer) {
  sequenceContainer.addEventListener('click', (e) => {
    const shareBtn = e.target.closest('.share-structure-btn');
    if (shareBtn) {
      const shareUrl = shareBtn.getAttribute('data-share-url');
      copyShareLink(shareUrl, shareBtn);
    }

    // Handle "Try This Example" buttons
    const tryBtn = e.target.closest('.try-example-btn');
    if (tryBtn) {
      const exampleDataStr = tryBtn.getAttribute('data-example');
      if (exampleDataStr) {
        try {
          const exampleData = JSON.parse(exampleDataStr);
          createSessionFromExample(exampleData);
        } catch (err) {
          console.error('Failed to parse example data:', err);
        }
      }
    }

    // Handle play structure buttons
    const playBtn = e.target.closest('.play-structure-btn');
    if (playBtn) {
      const sequenceId = playBtn.getAttribute('data-sequence-id');
      if (sequenceId) {
        startStructurePlayback(sequenceId);
      }
    }

    // Handle stop structure buttons
    const stopBtn = e.target.closest('.stop-structure-btn');
    if (stopBtn) {
      const sequenceId = stopBtn.getAttribute('data-sequence-id');
      if (sequenceId) {
        stopStructurePlayback(sequenceId);
      }
    }
  });

  // Event delegation for tempo slider and synthesis controls
  sequenceContainer.addEventListener('input', (e) => {
    const sequenceId = e.target.getAttribute('data-sequence-id');
    if (!sequenceId) return;

    if (e.target.classList.contains('tempo-slider')) {
      const tempo = parseInt(e.target.value);
      updateTempo(sequenceId, tempo);
    } else if (e.target.classList.contains('overlap-slider')) {
      const overlap = parseFloat(e.target.value);
      const overlapValue = document.querySelector(`.overlap-value[data-sequence-id="${sequenceId}"]`);
      if (overlapValue) {
        overlapValue.textContent = `${Math.round(overlap * 100)}%`;
      }
      updateSynthParams(sequenceId);
    } else if (e.target.classList.contains('attack-slider')) {
      const attack = parseFloat(e.target.value);
      const attackValue = document.querySelector(`.attack-value[data-sequence-id="${sequenceId}"]`);
      if (attackValue) {
        attackValue.textContent = `${attack}ms`;
      }
      updateSynthParams(sequenceId);
    } else if (e.target.classList.contains('decay-slider')) {
      const decay = parseFloat(e.target.value);
      const decayValue = document.querySelector(`.decay-value[data-sequence-id="${sequenceId}"]`);
      if (decayValue) {
        decayValue.textContent = `${decay}ms`;
      }
      updateSynthParams(sequenceId);
    } else if (e.target.classList.contains('sustain-slider')) {
      const sustain = parseFloat(e.target.value);
      const sustainValue = document.querySelector(`.sustain-value[data-sequence-id="${sequenceId}"]`);
      if (sustainValue) {
        sustainValue.textContent = `${Math.round(sustain * 100)}%`;
      }
      updateSynthParams(sequenceId);
    } else if (e.target.classList.contains('release-slider')) {
      const release = parseFloat(e.target.value);
      const releaseValue = document.querySelector(`.release-value[data-sequence-id="${sequenceId}"]`);
      if (releaseValue) {
        releaseValue.textContent = `${release}ms`;
      }
      updateSynthParams(sequenceId);
    } else if (e.target.classList.contains('base-freq-input') ||
               e.target.classList.contains('octave-span-input')) {
      updateSynthParams(sequenceId);
    }
  });

  // Event delegation for waveform select
  sequenceContainer.addEventListener('change', (e) => {
    const sequenceId = e.target.getAttribute('data-sequence-id');
    if (!sequenceId) return;

    if (e.target.classList.contains('waveform-select')) {
      updateSynthParams(sequenceId);
    }
  });
}

// Color classes for visualization
const COLORS = [
  'cell-0', 'cell-1', 'cell-2', 'cell-3', 'cell-4',
  'cell-5', 'cell-6', 'cell-7', 'cell-8', 'cell-9'
];

if (categorySelect) {
  categorySelect.addEventListener('change', async (e) => {
    const category = e.target.value;

    // Update state
    setPath('structures.category', category);
    setPath('structures.structureId', null);
    setPath('structures.sequenceId', null);

    structureSelect.innerHTML = '<option value="">Choose a structure...</option>';
    structureSelectGroup.style.display = 'none';
    clearVisualization();

    if (!category) return;

    if (category === 'curated') {
      // Load curated structures
      const curatedManifest = STRUCTURE_MANIFEST.filter(
        entry => entry.id !== 'music-structures-comprehensive'
      );
      structureSelect.innerHTML = '<option value="">Choose a structure...</option>';
      curatedManifest.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.label;
        structureSelect.appendChild(option);
      });
      structureSelectGroup.style.display = 'block';
      structureSelect.disabled = false;
    } else if (category === 'comprehensive') {
      // Load comprehensive structures
      try {
        const data = await loadStructures('data/structures/music-structures-comprehensive.json');
        currentData = data;

        structureSelect.innerHTML = '<option value="">Choose a structure...</option>';

        if (data.sequences && data.sequences.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = 'Change-Ringing Sequences';
          data.sequences.forEach(seq => {
            const option = document.createElement('option');
            option.value = 'seq:' + seq.id;
            option.textContent = `${seq.label} (${seq.orderDimension} bells, ${seq.rows?.length || 0} rows)`;
            optgroup.appendChild(option);
          });
          structureSelect.appendChild(optgroup);
        }

        structureSelectGroup.style.display = 'block';
        structureSelect.disabled = false;
      } catch (err) {
        console.error('Failed to load comprehensive structures:', err);
        alert('Failed to load comprehensive structures. See console for details.');
      }
    }
  });
}

if (structureSelect) {
  structureSelect.addEventListener('change', async (e) => {
    const value = e.target.value;
    if (!value) {
      setPath('structures.structureId', null);
      setPath('structures.sequenceId', null);
      clearVisualization();
      return;
    }

    const category = categorySelect.value;

    if (category === 'curated') {
      // Load the specific curated structure
      const entry = STRUCTURE_MANIFEST.find(m => m.id === value);
      if (!entry) return;

      // Update state
      setPath('structures.structureId', value);

      try {
        const data = await loadStructures(entry.url, entry);
        currentData = data;
        visualizeCuratedStructure(data);
      } catch (err) {
        console.error('Failed to load structure:', err);
      }
    } else if (category === 'comprehensive') {
      if (value.startsWith('seq:')) {
        const seqId = value.replace('seq:', '');
        const sequence = currentData.sequences.find(s => s.id === seqId);
        if (sequence) {
          // Update state
          setPath('structures.sequenceId', seqId);
          visualizeSequence(sequence, currentData);
        }
      }
    }
  });
}

function clearVisualization() {
  if (statsContainer) statsContainer.innerHTML = '';
  if (sequenceContainer) sequenceContainer.innerHTML = '';
  if (additionalDataContainer) additionalDataContainer.innerHTML = '';
}

function visualizeCuratedStructure(data) {
  // Show stats
  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Structure ID</div>
        <div class="stat-value">${data.id || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Sequences</div>
        <div class="stat-value">${data.sequences?.length || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Source</div>
        <div class="stat-value">${data.source?.library || 'N/A'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Generated</div>
        <div class="stat-value">${data.source?.generated ? new Date(data.source.generated).toLocaleDateString() : 'N/A'}</div>
      </div>
    </div>
  `;

  // Show explanation if available
  if (data.explanation) {
    statsContainer.innerHTML += renderExplanation(data.explanation);
  }

  // Show all sequences
  let html = '';
  data.sequences.forEach((seq, idx) => {
    html += renderSequenceSection(seq, idx);
  });
  sequenceContainer.innerHTML = html;
}

function visualizeSequence(sequence, fullData) {
  // Show stats
  const stats = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Sequence ID</div>
        <div class="stat-value">${sequence.id}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Stage (Bells)</div>
        <div class="stat-value">${sequence.orderDimension}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Rows</div>
        <div class="stat-value">${sequence.rows?.length || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Loop</div>
        <div class="stat-value">${sequence.loop ? 'Yes' : 'No'}</div>
      </div>
    </div>
  `;
  statsContainer.innerHTML = stats;

  // Show sequence
  sequenceContainer.innerHTML = renderSequenceSection(sequence, 0);

  // Show additional data
  if (fullData) {
    let additionalHTML = '<details class="additional-data">';
    additionalHTML += '<summary>Additional Data (Permutation Families, Symmetry Structures)</summary>';
    additionalHTML += '<div class="data-section">';

    if (fullData.permutationFamilies) {
      additionalHTML += `<h4>Permutation Families (${fullData.permutationFamilies.length})</h4>`;
      additionalHTML += '<pre>' + JSON.stringify(fullData.permutationFamilies.slice(0, 5), null, 2) + '</pre>';
    }

    if (fullData.symmetryStructures) {
      additionalHTML += `<h4>Symmetry Structures (${fullData.symmetryStructures.length})</h4>`;
      additionalHTML += '<pre>' + JSON.stringify(fullData.symmetryStructures, null, 2) + '</pre>';
    }

    if (fullData.symmetricGroups) {
      additionalHTML += `<h4>Symmetric Groups (${fullData.symmetricGroups.length})</h4>`;
      const groupsSummary = fullData.symmetricGroups.map(g => ({
        stage: g.stage,
        order: g.order,
        parityCounts: g.parityCounts
      }));
      additionalHTML += '<pre>' + JSON.stringify(groupsSummary, null, 2) + '</pre>';
    }

    additionalHTML += '</div></details>';
    additionalDataContainer.innerHTML = additionalHTML;
  }
}

function renderExplanation(explanation) {
  let html = '<div class="explanation-container">';
  html += '<h3>📖 About This Structure</h3>';

  if (explanation.overview) {
    html += `<p><strong>Overview:</strong> ${explanation.overview}</p>`;
  }

  if (explanation.mechanism) {
    html += `<p><strong>How It Works:</strong> ${explanation.mechanism}</p>`;
  }

  if (explanation.properties && explanation.properties.length > 0) {
    html += '<p><strong>Key Properties:</strong></p>';
    html += '<ul>';
    explanation.properties.forEach(prop => {
      html += `<li>${prop}</li>`;
    });
    html += '</ul>';
  }

  if (explanation.applications) {
    html += `<p><strong>Applications:</strong> ${explanation.applications}</p>`;
  }

  if (explanation.references && explanation.references.length > 0) {
    html += '<p><strong>References:</strong></p>';
    html += '<ul style="font-size: 0.9rem; color: var(--muted);">';
    explanation.references.forEach(ref => {
      html += `<li>${ref}</li>`;
    });
    html += '</ul>';
  }

  html += '</div>';
  return html;
}

function renderSequenceSection(sequence, index) {
  const rows = sequence.rowsZeroBased || sequence.rows || [];
  const dimension = sequence.orderDimension;

  let html = '<div class="sequence-container">';
  html += '<div class="sequence-header">';
  html += '<div class="sequence-title-row">';
  html += `<h3>${sequence.label || sequence.id}`;

  // Add RDF indicator badge if structure has RDF metadata
  if (sequence._rdfEnriched) {
    html += ` <span class="rdf-badge" title="Enriched with RDF semantic data">🔗 RDF</span>`;
  }
  html += '</h3>';

  // Add share button
  const category = getPath('structures.category') || 'comprehensive';
  const currentStructureId = getPath('structures.structureId'); // For curated: manifest ID (e.g., "symmetry-lines")
  const shareUrl = createStructureShareLink(sequence.id, category, currentStructureId);
  html += `<button class="share-structure-btn" data-share-url="${shareUrl}" title="Copy shareable link">📋 Share</button>`;
  html += '</div>';

  // Add playback controls with sequence-specific identifiers
  html += `<div class="playback-controls" data-sequence-id="${sequence.id}">`;
  html += `<button class="play-structure-btn" data-sequence-id="${sequence.id}" title="Play structure as music">▶ Play</button>`;
  html += `<button class="stop-structure-btn" data-sequence-id="${sequence.id}" title="Stop playback" style="display:none;">⏹ Stop</button>`;
  html += '<label class="tempo-control">';
  html += `Tempo: <input type="range" class="tempo-slider" data-sequence-id="${sequence.id}" min="30" max="300" value="120" step="5" />`;
  html += `<span class="tempo-value" data-sequence-id="${sequence.id}">120 BPM</span>`;
  html += '</label>';
  html += `<span class="playback-position" data-sequence-id="${sequence.id}" style="margin-left: 1rem; color: var(--muted); font-size: 0.85rem;">Row: 0 / ${rows.length}</span>`;
  html += '</div>';

  // Add synthesis controls
  html += `<details class="synth-controls" data-sequence-id="${sequence.id}">`;
  html += '<summary>⚙️ Synthesis Controls</summary>';
  html += '<div class="synth-controls-grid">';

  // Frequency controls
  html += '<div class="synth-control-group">';
  html += '<label>Base Frequency (Hz):</label>';
  html += `<input type="number" class="base-freq-input" data-sequence-id="${sequence.id}" value="261.63" min="100" max="880" step="0.01" />`;
  html += '</div>';

  html += '<div class="synth-control-group">';
  html += '<label>Octave Span:</label>';
  html += `<input type="number" class="octave-span-input" data-sequence-id="${sequence.id}" value="1" min="0.5" max="3" step="0.25" />`;
  html += '</div>';

  // Waveform controls
  html += '<div class="synth-control-group">';
  html += '<label>Waveform:</label>';
  html += `<select class="waveform-select" data-sequence-id="${sequence.id}">`;
  html += '<option value="sine">Sine</option>';
  html += '<option value="triangle">Triangle</option>';
  html += '<option value="sawtooth">Sawtooth</option>';
  html += '<option value="square">Square</option>';
  html += '</select>';
  html += '</div>';

  // Note overlap control
  html += '<div class="synth-control-group">';
  html += '<label>Note Overlap:</label>';
  html += `<input type="range" class="overlap-slider" data-sequence-id="${sequence.id}" min="0" max="1" value="0" step="0.1" />`;
  html += `<span class="overlap-value" data-sequence-id="${sequence.id}">0%</span>`;
  html += '</div>';

  // ADSR Envelope Controls
  html += '<div class="synth-control-group synth-control-separator">';
  html += '<label>Attack (ms):</label>';
  html += `<input type="range" class="attack-slider" data-sequence-id="${sequence.id}" min="1" max="200" value="10" step="1" />`;
  html += `<span class="attack-value" data-sequence-id="${sequence.id}">10ms</span>`;
  html += '</div>';

  html += '<div class="synth-control-group">';
  html += '<label>Decay (ms):</label>';
  html += `<input type="range" class="decay-slider" data-sequence-id="${sequence.id}" min="0" max="500" value="50" step="10" />`;
  html += `<span class="decay-value" data-sequence-id="${sequence.id}">50ms</span>`;
  html += '</div>';

  html += '<div class="synth-control-group">';
  html += '<label>Sustain Level:</label>';
  html += `<input type="range" class="sustain-slider" data-sequence-id="${sequence.id}" min="0" max="1" value="0.7" step="0.05" />`;
  html += `<span class="sustain-value" data-sequence-id="${sequence.id}">70%</span>`;
  html += '</div>';

  html += '<div class="synth-control-group">';
  html += '<label>Release (ms):</label>';
  html += `<input type="range" class="release-slider" data-sequence-id="${sequence.id}" min="10" max="1000" value="100" step="10" />`;
  html += `<span class="release-value" data-sequence-id="${sequence.id}">100ms</span>`;
  html += '</div>';

  html += '</div>'; // synth-controls-grid
  html += '</details>';

  html += '</div>';

  // Show RDF definition if available (priority over other explanations)
  if (sequence.rdfMetadata?.definition) {
    html += `<div class="sequence-explanation rdf-definition">`;
    html += `<strong>Definition:</strong> ${sequence.rdfMetadata.definition}`;
    html += '</div>';

    if (sequence.rdfMetadata.scopeNote) {
      html += `<div class="sequence-explanation rdf-scope-note">`;
      html += `<em>${sequence.rdfMetadata.scopeNote}</em>`;
      html += '</div>';
    }
  } else if (sequence.explanation) {
    html += `<div class="sequence-explanation">${sequence.explanation}</div>`;
  } else if (sequence.metadata?.comment) {
    html += `<div class="sequence-explanation">${sequence.metadata.comment}</div>`;
  } else if (sequence.metadata) {
    // Show basic metadata if no comment
    const metaText = `Stage: ${sequence.metadata.stage || 'N/A'}, Rows: ${sequence.metadata.rows || 'N/A'}`;
    html += `<div class="sequence-explanation muted-text">${metaText}</div>`;
  }

  // Show usage examples if available
  if (sequence.usageExamples && sequence.usageExamples.length > 0) {
    html += '<div class="usage-examples">';
    html += '<h4 style="margin: 1.5rem 0 1rem 0; color: var(--text);">💡 Usage Examples</h4>';

    sequence.usageExamples.forEach((example, idx) => {
      html += '<div class="usage-example">';

      // Add category badge if from RDF
      const categoryBadge = example.category ?
        `<span class="usage-category usage-category-${example.category}">${example.category}</span>` : '';

      html += `<div class="usage-example-header">`;
      html += `<strong>${idx + 1}. ${example.scenario || example.label}</strong> ${categoryBadge}`;
      html += `</div>`;

      html += '<dl class="usage-example-details">';
      html += `<dt>Breathing:</dt><dd>${example.breathing || example.breathingPattern || 'N/A'}</dd>`;
      html += `<dt>Track Mapping:</dt><dd>${example.trackMapping || 'N/A'}</dd>`;
      html += `<dt>Outcome:</dt><dd>${example.outcome || 'N/A'}</dd>`;
      html += '</dl>';

      // Add footer with "Try This Example" button and RDF link
      html += `<div class="usage-example-footer">`;

      // Try This Example button - stores all data needed for session creation
      // Get category and sequenceId from state (for curated structures)
      const currentCategory = getPath('structures.category') || 'comprehensive';
      const currentSequenceId = getPath('structures.sequenceId');

      const exampleData = JSON.stringify({
        structureId: sequence.id,
        category: currentCategory,
        sequenceId: currentSequenceId,
        example: example,
        structureName: sequence.label || sequence.name || sequence.id
      }).replace(/"/g, '&quot;');

      html += `<button class="try-example-btn" data-example="${exampleData}" title="Create session from this example">▶ Try This Example</button>`;

      // RDF URI link if available
      if (example.uri) {
        html += `<a href="${example.uri}" class="rdf-link" target="_blank" title="View in RDF ontology">🔗 Ontology</a>`;
      }

      html += `</div>`;

      html += '</div>';
    });
    html += '</div>';
  }

  if (rows.length === 0) {
    html += '<div class="empty-state">No sequence data available</div>';
  } else {
    html += '<div class="sequence-viz">';

    rows.forEach((row, rowIdx) => {
      html += '<div class="row-line">';
      html += `<span class="row-index">${rowIdx}</span>`;
      html += '<div class="row-cells">';

      row.forEach(val => {
        const colorClass = COLORS[val % COLORS.length];
        html += `<span class="cell ${colorClass}">${val}</span>`;
      });

      html += '</div></div>';
    });

    html += '</div>';

    // Add legend
    html += '<div class="legend">';
    html += '<div class="legend-title">Element Colors (0-based)</div>';
    html += '<div class="legend-items">';
    for (let i = 0; i < Math.min(dimension, 10); i++) {
      const colorClass = COLORS[i];
      html += `<div class="legend-item">`;
      html += `<span class="legend-color ${colorClass}"></span>`;
      html += `<span>Element ${i}</span>`;
      html += `</div>`;
    }
    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

// Show empty state initially
if (sequenceContainer) {
  sequenceContainer.innerHTML = '<div class="empty-state">Select a category and structure to visualize</div>';
}

/**
 * Restore state from URL on page load
 */
async function restoreStateFromURL() {
  const state = stateManager.getState();

  // Switch to active tab if specified
  if (state.activeTab && tabButtons[state.activeTab]) {
    switchTab(state.activeTab);
  }

  // Restore structure selection if in structures tab
  if (state.activeTab === 'structures' && state.structures) {
    const { category, structureId, sequenceId } = state.structures;

    // Explicitly switch to structures tab FIRST before any async operations
    switchTab('structures');

    if (category && categorySelect) {
      // Set category
      categorySelect.value = category;

      // Trigger category change to load structure options
      if (category === 'curated') {
        const curatedManifest = STRUCTURE_MANIFEST.filter(
          entry => entry.id !== 'music-structures-comprehensive'
        );
        structureSelect.innerHTML = '<option value="">Choose a structure...</option>';
        curatedManifest.forEach(entry => {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = entry.label;
          structureSelect.appendChild(option);
        });
        structureSelectGroup.style.display = 'block';
        structureSelect.disabled = false;

        // Load the specific structure if specified
        if (structureId) {
          const entry = STRUCTURE_MANIFEST.find(m => m.id === structureId);
          if (entry) {
            try {
              const data = await loadStructures(entry.url, entry);
              currentData = data;

              // If sequenceId specified, show that specific sequence
              if (sequenceId && data.sequences) {
                const sequence = data.sequences.find(seq => seq.id === sequenceId);
                if (sequence) {
                  visualizeSequence(sequence, data);
                } else {
                  visualizeCuratedStructure(data);
                }
              } else {
                visualizeCuratedStructure(data);
              }

              // Set select value after loading
              structureSelect.value = structureId;
            } catch (err) {
              console.error('Failed to restore structure:', err);
            }
          }
        }
      } else if (category === 'comprehensive') {
        try {
          const data = await loadStructures('data/structures/music-structures-comprehensive.json', {
            rdfUrl: 'rdf/modules/music-structures.ttl'
          });
          currentData = data;

          structureSelect.innerHTML = '<option value="">Choose a structure...</option>';

          if (data.sequences && data.sequences.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Change-Ringing Sequences';
            data.sequences.forEach(seq => {
              const option = document.createElement('option');
              option.value = 'seq:' + seq.id;
              option.textContent = `${seq.label} (${seq.orderDimension} bells, ${seq.rows?.length || 0} rows)`;
              optgroup.appendChild(option);
            });
            structureSelect.appendChild(optgroup);
          }

          structureSelectGroup.style.display = 'block';
          structureSelect.disabled = false;

          // Load the specific structure if specified
          if (structureId) {
            const sequence = data.sequences?.find(seq => seq.id === structureId);
            if (sequence) {
              visualizeSequence(sequence);
              // Set select value after loading
              structureSelect.value = 'seq:' + structureId;
            }
          }
        } catch (err) {
          console.error('Failed to restore comprehensive structures:', err);
        }
      }
    }
  }
}

// Restore state on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreStateFromURL);
} else {
  // DOM already loaded
  restoreStateFromURL();
}

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
    // Common patterns: "bells 1-3 map to frequency sweeps", "Structure drives timing"
    const hasFrequencySweep = /frequency|sweep|tone/i.test(trackMapping);
    const hasBinaural = /binaural/i.test(trackMapping);

    if (hasFrequencySweep || hasBinaural) {
      tracks.audio.push({
        id: generateTrackId(),
        label: `${structureName} - Audio`,
        type: hasBinaural ? 'BinauralBeatTrack' : 'SineTrack',
        modality: 'audio',
        params: {
          frequency: 432, // Base frequency in Hz
          gain: 0.3,
          beat: hasBinaural ? 8 : undefined
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

  // Helper to create track item
  const createTrackItem = (track) => {
    const li = document.createElement('li');
    li.className = 'sensory-item';
    li.style.cssText = `
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    `;

    const label = document.createElement('div');
    label.style.cssText = 'font-weight: 600; margin-bottom: 0.25rem; color: var(--text);';
    label.textContent = track.label;

    const type = document.createElement('div');
    type.style.cssText = 'font-size: 0.8rem; color: var(--muted); margin-bottom: 0.5rem;';
    type.textContent = `Type: ${track.type}`;

    const params = document.createElement('div');
    params.style.cssText = 'font-size: 0.75rem; color: var(--muted);';
    const paramStrings = Object.entries(track.params || {})
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
    params.textContent = paramStrings || 'No parameters';

    li.appendChild(label);
    li.appendChild(type);
    li.appendChild(params);

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

  console.log('✅ Tracks rendered to dashboard');
}

// Tab switching logic
const tabButtons = {
  dashboard: document.getElementById('tab-dashboard'),
  structures: document.getElementById('tab-structures'),
  nso: document.getElementById('tab-nso')
};

const tabPanels = {
  dashboard: document.getElementById('panel-dashboard'),
  structures: document.getElementById('panel-structures'),
  nso: document.getElementById('panel-nso')
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

// Event delegation for share buttons
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
      const exampleData = JSON.stringify({
        structureId: sequence.id,
        category: structureData.category || 'comprehensive',
        sequenceId: structureData.sequenceId || null,
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

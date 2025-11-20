import { appState } from "./state/app-state.js";
import { BinauralBeatTrack, IsochronicTrack, SineTrack } from "./tracks/AudioTrack.js";
import { GeometryVisualTrack, ParticleVisualTrack } from "./tracks/VisualTrack.js";
import { VibrationTrack } from "./tracks/HapticTrack.js";

export function initMixerUI() {
  const audioAddBtn = document.getElementById('audio-add-track');
  const audioTypeSelect = document.getElementById('audio-track-type');
  const audioResumeBtn = document.getElementById('audio-resume');
  const audioList = document.getElementById('audio-sensory-list');

  const visualAddBtn = document.getElementById('visual-add-track');
  const visualTypeSelect = document.getElementById('visual-track-type');
  const visualList = document.getElementById('visual-sensory-list');

  const hapticAddBtn = document.getElementById('haptic-add-track');
  const hapticTypeSelect = document.getElementById('haptic-track-type');
  const hapticList = document.getElementById('haptic-sensory-list');

  const kernel = appState._kernel;
  if (!kernel) {
    console.warn("Kernel not initialized");
    return;
  }

  const createTrack = (type, id) => {
    switch (type) {
      case 'BinauralBeatTrack': return new BinauralBeatTrack(id, 'Binaural Beat');
      case 'IsochronicTrack': return new IsochronicTrack(id, 'Isochronic Tone');
      case 'SineTrack': return new SineTrack(id, 'Sine Wave');
      case 'GeometryVisualTrack': return new GeometryVisualTrack(id, 'Geometry');
      case 'ParticleVisualTrack': return new ParticleVisualTrack(id, 'Particles');
      case 'VibrationTrack': return new VibrationTrack(id, 'Vibration');
      default: return null;
    }
  };

  const handleAdd = (selectEl) => {
    const type = selectEl.value;
    const id = `track-${Date.now()}`;
    const track = createTrack(type, id);
    if (track) {
      kernel.tracks.addTrack(track);
      if (track.type === 'audio') kernel.audio.resume();
    }
  };

  if (audioAddBtn) audioAddBtn.addEventListener('click', () => handleAdd(audioTypeSelect));
  if (visualAddBtn) visualAddBtn.addEventListener('click', () => handleAdd(visualTypeSelect));
  if (hapticAddBtn) hapticAddBtn.addEventListener('click', () => handleAdd(hapticTypeSelect));

  if (audioResumeBtn) {
    audioResumeBtn.addEventListener('click', () => {
      kernel.audio.resume();
    });
  }

  // Subscribe to track changes
  const updateLists = () => {
    const tracks = kernel.tracks.getAll();
    if (audioList) renderTrackList(tracks.filter(t => t.type === 'audio'), audioList, kernel);
    if (visualList) renderTrackList(tracks.filter(t => t.type === 'visual'), visualList, kernel);
    if (hapticList) renderTrackList(tracks.filter(t => t.type === 'haptic'), hapticList, kernel);
  };

  if (kernel.tracks) {
    kernel.tracks.subscribe(updateLists);
    updateLists();
  }
}

function renderTrackList(tracks, container, kernel) {
  container.innerHTML = '';

  tracks.forEach(track => {
    const li = document.createElement('li');
    li.className = 'track-item';
    li.style.padding = '0.5rem';
    li.style.borderBottom = '1px solid var(--surface-border)';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '0.75rem';

    const label = document.createElement('span');
    label.textContent = track.label;
    label.style.fontWeight = '600';
    label.style.fontSize = '0.9rem';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '0.25rem';

    const muteBtn = document.createElement('button');
    muteBtn.className = 'ghost tiny';
    muteBtn.textContent = track.enabled ? 'Mute' : 'Unmute';
    muteBtn.title = track.enabled ? 'Mute track' : 'Unmute track';
    muteBtn.onclick = () => {
      track.enabled = !track.enabled;
      muteBtn.textContent = track.enabled ? 'Mute' : 'Unmute';
    };

    const removeBtn = document.createElement('button');
    removeBtn.className = 'ghost tiny';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove track';
    removeBtn.style.color = 'var(--text-error)';
    removeBtn.style.fontSize = '1.2rem';
    removeBtn.style.lineHeight = '1';
    removeBtn.style.padding = '0 0.25rem';
    removeBtn.onclick = () => {
      kernel.tracks.removeTrack(track.id);
    };

    actions.appendChild(muteBtn);
    actions.appendChild(removeBtn);

    header.appendChild(label);
    header.appendChild(actions);
    li.appendChild(header);

    // Parameters
    const paramsDiv = document.createElement('div');
    paramsDiv.style.display = 'grid';
    paramsDiv.style.gap = '0.5rem';
    paramsDiv.style.fontSize = '0.8rem';

    track.parameters.forEach(param => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '60px 1fr 35px';
      row.style.alignItems = 'center';
      row.style.gap = '0.5rem';

      const pLabel = document.createElement('label');
      pLabel.textContent = param.name;
      pLabel.style.color = 'var(--text-muted)';
      pLabel.style.overflow = 'hidden';
      pLabel.style.textOverflow = 'ellipsis';

      const input = document.createElement('input');
      input.type = 'range';
      input.min = param.min !== -Infinity ? param.min : 0;
      input.max = param.max !== Infinity ? param.max : 1000;
      input.step = (param.max - param.min) > 100 ? 1 : 0.1;
      input.value = param.base;
      input.style.width = '100%';
      input.style.cursor = 'pointer';

      const valDisplay = document.createElement('span');
      valDisplay.textContent = param.base < 10 ? param.base.toFixed(1) : Math.round(param.base);
      valDisplay.style.textAlign = 'right';
      valDisplay.style.fontVariantNumeric = 'tabular-nums';

      input.oninput = (e) => {
        const val = parseFloat(e.target.value);
        param.base = val;
        valDisplay.textContent = val < 10 ? val.toFixed(1) : Math.round(val);
      };

      row.appendChild(pLabel);
      row.appendChild(input);
      row.appendChild(valDisplay);
      paramsDiv.appendChild(row);
    });

    li.appendChild(paramsDiv);
    container.appendChild(li);
  });
}

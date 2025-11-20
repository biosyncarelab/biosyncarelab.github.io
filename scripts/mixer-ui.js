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

  // RDF Tooltip Logic
  const tooltip = document.getElementById('rdf-tooltip');
  const tooltipTerm = document.getElementById('rdf-tooltip-term');

  document.addEventListener('mouseover', (e) => {
    if (e.target.dataset.rdfTerm) {
      const term = e.target.dataset.rdfTerm;
      tooltipTerm.textContent = term;
      tooltip.classList.remove('hidden');

      const rect = e.target.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top}px`;
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.dataset.rdfTerm) {
      tooltip.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.dataset.rdfTerm) {
      const term = e.target.dataset.rdfTerm;
      if (window.biosyncare && window.biosyncare.navigateToConcept) {
        window.biosyncare.navigateToConcept(term);
      }
    }
  });
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
    label.style.cursor = 'help';
    label.dataset.rdfTerm = track.label; // For tooltip/navigation

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
      row.style.gridTemplateColumns = '60px 1fr 35px 24px'; // Added column for modulation
      row.style.alignItems = 'center';
      row.style.gap = '0.5rem';

      const pLabel = document.createElement('label');
      pLabel.textContent = param.name;
      pLabel.style.color = 'var(--text-muted)';
      pLabel.style.overflow = 'hidden';
      pLabel.style.textOverflow = 'ellipsis';
      pLabel.style.cursor = 'help';
      pLabel.dataset.rdfTerm = param.name; // For tooltip/navigation

      let input;
      if (param.options && Array.isArray(param.options)) {
        input = document.createElement('select');
        input.style.width = '100%';
        input.style.cursor = 'pointer';
        input.style.fontSize = '0.8rem';
        input.style.padding = '0.1rem';

        param.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          option.selected = opt === param.base;
          input.appendChild(option);
        });

        input.onchange = (e) => {
          param.base = e.target.value;
          // No value display update needed for select
        };
      } else {
        input = document.createElement('input');
        input.type = 'range';
        input.min = param.min !== -Infinity ? param.min : 0;
        input.max = param.max !== Infinity ? param.max : 1000;
        input.step = (param.max - param.min) > 100 ? 1 : 0.1;
        input.value = param.base;
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        input.oninput = (e) => {
          const val = parseFloat(e.target.value);
          param.base = val;
          valDisplay.textContent = val < 10 ? val.toFixed(1) : Math.round(val);
        };
      }

      const valDisplay = document.createElement('span');
      if (!param.options) {
        valDisplay.textContent = param.base < 10 ? param.base.toFixed(1) : Math.round(param.base);
      }
      valDisplay.style.textAlign = 'right';
      valDisplay.style.fontVariantNumeric = 'tabular-nums';

      // Martigli Modulation Button
      const modBtn = document.createElement('button');
      modBtn.className = 'ghost tiny';
      modBtn.innerHTML = '≈'; // Wave icon
      modBtn.title = 'Modulate with Martigli';
      modBtn.style.padding = '0';
      modBtn.style.width = '24px';
      modBtn.style.height = '24px';
      modBtn.style.opacity = param._modulator ? '1' : '0.3';
      modBtn.style.color = param._modulator ? 'var(--primary)' : 'var(--muted)';

      modBtn.onclick = () => {
        if (param._modulator) {
          param.unbind();
          modBtn.style.opacity = '0.3';
          modBtn.style.color = 'var(--muted)';
        } else {
          // Connect to actual Martigli instance
          if (kernel.martigli) {
            // Try to get the primary oscillator
            const oscId = kernel.martigli.referenceId;
            const osc = oscId ? kernel.martigli._oscillations.get(oscId) : null;

            if (osc) {
              // MartigliOscillator has a valueAt(time) method?
              // Let's check structures.js MartigliOscillator class.
              // It has runtimeMetrics() which returns { value, ... }
              // But for modulation we need a continuous signal.
              // Let's assume we can bind the oscillator object itself if TrackParameter supports it.
              // TrackParameter.getValue calls modulator.valueAt(time) or .getValue(time) or .value.

              // We need to ensure MartigliOscillator has one of these.
              // If not, we can wrap it.
              const modulator = {
                getValue: (time) => {
                  // Calculate value on the fly or use last computed
                  // MartigliOscillator logic is complex (trajectory based).
                  // It might be better to use the last computed value from the kernel loop if available.
                  // But kernel loop updates martigli state.
                  // Let's use a simple wrapper that asks the oscillator for its value at 'time'.
                  return osc.valueAt(time);
                }
              };

              // Check if valueAt exists, if not we might need to implement it in MartigliOscillator
              if (typeof osc.valueAt === 'function') {
                 param.bind(osc);
              } else {
                 // Fallback: bind to a proxy that returns 0 for now until implemented
                 console.warn("MartigliOscillator.valueAt not implemented");
                 param.bind({ getValue: () => 0 });
              }

              modBtn.style.opacity = '1';
              modBtn.style.color = 'var(--primary)';
            } else {
              console.warn("No active Martigli oscillator found");
            }
          }

        }
      };

      row.appendChild(pLabel);
      row.appendChild(input);
      row.appendChild(valDisplay);
      row.appendChild(modBtn);
      paramsDiv.appendChild(row);
    });

    // Visual Preview
    if (track.type === 'visual') {
        const previewContainer = document.createElement('div');
        previewContainer.style.marginTop = '0.5rem';
        previewContainer.style.height = '100px';
        previewContainer.style.background = '#000';
        previewContainer.style.borderRadius = '4px';
        previewContainer.style.overflow = 'hidden';
        previewContainer.style.position = 'relative';

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 100;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        previewContainer.appendChild(canvas);

        // Fullscreen button overlay
        const fsBtn = document.createElement('button');
        fsBtn.className = 'ghost tiny';
        fsBtn.innerHTML = '⛶';
        fsBtn.style.position = 'absolute';
        fsBtn.style.top = '4px';
        fsBtn.style.right = '4px';
        fsBtn.style.background = 'rgba(0,0,0,0.5)';
        fsBtn.onclick = () => {
            if (canvas.requestFullscreen) canvas.requestFullscreen();
        };
        previewContainer.appendChild(fsBtn);

        li.appendChild(previewContainer);

        // Start a simple render loop for this preview
        // Note: This creates a loop per track. Efficient enough for a few tracks.
        const ctx = canvas.getContext('2d');
        const renderPreview = () => {
            if (!document.body.contains(canvas)) return; // Stop if removed
            requestAnimationFrame(renderPreview);

            // Clear
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Use VideoEngine logic or simplified logic
            // We can try to reuse VideoEngine's render logic if we can access it
            // But VideoEngine is attached to the kernel.
            // Let's manually render for now based on track type to ensure it works immediately
            const time = Date.now() / 1000;

            ctx.save();
            // Center
            ctx.translate(canvas.width/2, canvas.height/2);
            // Scale down slightly for preview
            ctx.scale(0.5, 0.5);

            const opacity = track.getParameter('opacity')?.getValue(time) ?? 1;
            const scale = track.getParameter('scale')?.getValue(time) ?? 1;
            ctx.globalAlpha = opacity;
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
                    const r = 50; // Smaller radius for preview
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            } else if (track.constructor.name === 'ParticleVisualTrack') {
                const count = track.getParameter('count')?.getValue(time) ?? 10;
                const spread = track.getParameter('spread')?.getValue(time) ?? 0.5;

                ctx.fillStyle = '#fff';
                for (let i = 0; i < count; i++) {
                    const angle = i * 137.5;
                    const r = i * spread * 2; // Adjusted for preview
                    const x = Math.cos(angle + time) * r;
                    const y = Math.sin(angle + time) * r;
                    ctx.fillRect(x, y, 2, 2);
                }
            }

            ctx.restore();
        };
        requestAnimationFrame(renderPreview);
    }

    li.appendChild(paramsDiv);
    container.appendChild(li);
  });
}

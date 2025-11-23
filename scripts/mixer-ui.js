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

  // Resume audio context on visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && kernel.audio) {
      kernel.audio.resume();
    }
  });

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
    // Use Play/Stop metaphor as requested
    muteBtn.textContent = track.enabled ? 'Stop' : 'Play';
    muteBtn.title = track.enabled ? 'Stop track' : 'Play track';
    muteBtn.onclick = () => {
      track.enabled = !track.enabled;
      muteBtn.textContent = track.enabled ? 'Stop' : 'Play';
      muteBtn.title = track.enabled ? 'Stop track' : 'Play track';

      // Ensure audio engine is running when user interacts
      if (kernel.audio && kernel.audio.ctx && kernel.audio.ctx.state === 'suspended') {
        kernel.audio.resume();
      }
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
      row.style.gridTemplateColumns = '60px 1fr 24px 60px 24px'; // Added column for fine-tune button
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
      let valControl;
      let fineBtn;

      if (param.options && Array.isArray(param.options)) {
        input = document.createElement('select');
        input.className = 'track-param-select';
        input.style.width = '100%';
        input.style.cursor = 'pointer';
        input.style.fontSize = '0.9rem';
        input.style.padding = '4px 6px';
        input.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
        input.style.color = '#f8fafc';
        input.style.border = '1px solid rgba(148, 163, 184, 0.4)';
        input.style.borderRadius = '4px';
        input.style.height = '28px';
        input.style.outline = 'none';
        input.style.gridColumn = '2 / 5';

        param.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          option.selected = opt === param.base;
          option.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
          option.style.color = '#f8fafc';
          input.appendChild(option);
        });

        input.onchange = (e) => {
          param.base = e.target.value;
        };

        fineBtn = document.createElement('span'); // Placeholder
        fineBtn.style.display = 'none';
        valControl = document.createElement('span'); // Placeholder for grid alignment
        valControl.style.display = 'none';
      } else {
        const originalMin = param.min !== -Infinity ? param.min : 0;
        const originalMax = param.max !== Infinity ? param.max : 1000;

        const range = originalMax - originalMin;
        const normalStep = range > 100 ? 1 : 0.1;
        const fineStep = normalStep / 10;

        // Fine-tune Button
        fineBtn = document.createElement('button');
        fineBtn.className = 'ghost tiny';
        fineBtn.innerHTML = '🔍';
        fineBtn.title = 'Fine Tune Mode';
        fineBtn.style.padding = '0';
        fineBtn.style.width = '24px';
        fineBtn.style.height = '24px';
        fineBtn.style.opacity = '0.5';

        let isZoomed = false;

        // Number input for direct typing
        valControl = document.createElement('input');
        valControl.type = 'number';
        valControl.min = originalMin;
        valControl.max = originalMax;
        valControl.step = fineStep;
        valControl.value = param.base < 10 ? param.base.toFixed(2) : Math.round(param.base);
        valControl.style.width = '100%';
        valControl.style.textAlign = 'right';
        valControl.style.border = '1px solid var(--border)';
        valControl.style.borderRadius = '4px';
        valControl.style.padding = '2px';
        valControl.style.fontSize = '0.8rem';
        valControl.style.background = 'transparent';
        valControl.style.color = 'var(--text)';

        // Create Knob
        const knob = createKnob(param, originalMin, originalMax, normalStep, (val) => {
            param.base = val;
            valControl.value = val < 10 ? val.toFixed(2) : Math.round(val);
        });

        input = knob.element; // Assign to input so it gets appended

        fineBtn.onclick = () => {
            isZoomed = !isZoomed;
            fineBtn.style.opacity = isZoomed ? '1' : '0.5';
            fineBtn.style.color = isZoomed ? 'var(--primary)' : 'var(--text)';

            if (isZoomed) {
                const currentVal = knob.getValue();
                const zoomRange = (originalMax - originalMin) * 0.1; // 10% window
                const newMin = Math.max(originalMin, currentVal - zoomRange / 2);
                const newMax = Math.min(originalMax, currentVal + zoomRange / 2);

                knob.setRange(newMin, newMax, (newMax - newMin) / 100);
                input.title = `Fine Tune: ${newMin.toFixed(1)} - ${newMax.toFixed(1)}`;
            } else {
                knob.setRange(originalMin, originalMax, normalStep);
                input.title = 'Drag up/down to adjust';
            }
            // Ensure value is synced
            knob.setValue(param.base);
        };

        valControl.onchange = (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            if (val < parseFloat(originalMin)) val = parseFloat(originalMin);
            if (val > parseFloat(originalMax)) val = parseFloat(originalMax);

            param.base = val;
            knob.setValue(val);
            valControl.value = val;

            // If zoomed, re-center zoom around new typed value?
            if (isZoomed) {
                 // Re-trigger zoom logic to center around new value
                 fineBtn.onclick(); // Toggle off
                 fineBtn.onclick(); // Toggle on (re-centers)
            }
        };
      }

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

      // Container for modulation controls (hidden by default)
      const modControls = document.createElement('div');
      modControls.className = 'mod-controls';
      modControls.style.gridColumn = '1 / -1';
      modControls.style.display = param._modulator ? 'grid' : 'none';
      modControls.style.gridTemplateColumns = 'auto 1fr auto';
      modControls.style.gap = '0.5rem';
      modControls.style.padding = '0.5rem';
      modControls.style.background = 'rgba(0,0,0,0.2)';
      modControls.style.borderRadius = '4px';
      modControls.style.marginTop = '0.25rem';
      modControls.style.fontSize = '0.75rem';

      // Depth Slider
      const depthLabel = document.createElement('span');
      depthLabel.textContent = 'Depth:';

      const depthInput = document.createElement('input');
      depthInput.type = 'range';
      depthInput.min = 0;
      depthInput.max = (param.max - param.min) / 2; // Heuristic for depth range
      if (depthInput.max === Infinity) depthInput.max = 100;
      depthInput.step = depthInput.max / 100;
      depthInput.value = param.depth;
      depthInput.style.width = '100%';

      const depthVal = document.createElement('span');
      depthVal.textContent = param.depth.toFixed(1);

      depthInput.oninput = (e) => {
        const val = parseFloat(e.target.value);
        param.depth = val;
        depthVal.textContent = val.toFixed(1);
      };

      modControls.appendChild(depthLabel);
      modControls.appendChild(depthInput);
      modControls.appendChild(depthVal);

      modBtn.onclick = () => {
        if (param._modulator) {
          param.unbind();
          modBtn.style.opacity = '0.3';
          modBtn.style.color = 'var(--muted)';
          modControls.style.display = 'none';
        } else {
          // Connect to actual Martigli instance
          if (kernel.martigli) {
            const oscId = kernel.martigli.referenceId;
            const osc = oscId ? kernel.martigli._oscillations.get(oscId) : null;

            if (osc) {
              const modulator = {
                id: oscId, // Ensure ID is captured for serialization
                getValue: (time) => {
                  // AudioEngine now passes absolute time, so we can use it directly
                  return typeof osc.valueAt === 'function' ? osc.valueAt(time) : 0;
                }
              };

              param.bind(modulator);
              // Set default depth if 0
              if (param.depth === 0) {
                  param.depth = (param.max - param.min) * 0.1; // 10% default depth
                  if (!isFinite(param.depth)) param.depth = 10;
                  depthInput.value = param.depth;
                  depthVal.textContent = param.depth.toFixed(1);
              }

              modBtn.style.opacity = '1';
              modBtn.style.color = 'var(--primary)';
              modControls.style.display = 'grid';
            } else {
              console.warn("No active Martigli oscillator found");
              modBtn.style.color = 'var(--text-error)';
              setTimeout(() => modBtn.style.color = 'var(--muted)', 1000);
            }
          }
        }
      };

      row.appendChild(pLabel);
      row.appendChild(input);
      row.appendChild(fineBtn);
      row.appendChild(valControl);
      row.appendChild(modBtn);
      paramsDiv.appendChild(row);
      paramsDiv.appendChild(modControls);
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

    // Haptic Preview (Visual Indicator)
    if (track.type === 'haptic') {
        const hapticPreview = document.createElement('div');
        hapticPreview.style.marginTop = '0.5rem';
        hapticPreview.style.height = '40px';
        hapticPreview.style.background = 'rgba(255,255,255,0.1)';
        hapticPreview.style.borderRadius = '4px';
        hapticPreview.style.display = 'flex';
        hapticPreview.style.alignItems = 'center';
        hapticPreview.style.justifyContent = 'center';
        hapticPreview.style.color = 'var(--muted)';
        hapticPreview.style.fontSize = '0.8rem';
        hapticPreview.innerHTML = '<span style="display:inline-block">📳 Haptic Feedback Active</span>';

        // Animation loop to shake the icon
        const icon = hapticPreview.querySelector('span');
        const animateHaptic = () => {
            if (!document.body.contains(hapticPreview)) return;
            requestAnimationFrame(animateHaptic);
            if (track.enabled) {
                const time = Date.now() / 100;
                // Simple shake effect
                const offset = Math.sin(time * 20) * 2;
                icon.style.transform = `translateX(${offset}px)`;
                icon.style.color = 'var(--primary)';
                hapticPreview.style.border = '1px solid var(--primary)';
            } else {
                icon.style.transform = 'none';
                icon.style.color = 'var(--muted)';
                hapticPreview.style.border = 'none';
            }
        };
        requestAnimationFrame(animateHaptic);

        li.appendChild(hapticPreview);
    }

    li.appendChild(paramsDiv);
    container.appendChild(li);
  });
}

// Helper functions for Knob SVG generation
function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function createKnob(param, min, max, step, onInput) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    container.title = 'Drag up/down to adjust';

    // SVG generation
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'knob-svg');
    svg.setAttribute('viewBox', '0 0 40 40');

    // Background track (270 degrees: 135 to 405)
    const trackPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trackPath.setAttribute('class', 'knob-track');
    trackPath.setAttribute('d', describeArc(20, 20, 16, 135, 405));

    // Value path
    const valuePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    valuePath.setAttribute('class', 'knob-value');

    svg.appendChild(trackPath);
    svg.appendChild(valuePath);
    container.appendChild(svg);

    let currentMin = min;
    let currentMax = max;
    let currentStep = step;
    let value = param.base;

    const updateVisuals = () => {
        const range = currentMax - currentMin;
        // Clamp value for display
        const displayVal = Math.max(currentMin, Math.min(currentMax, value));
        const pct = range === 0 ? 0 : Math.max(0, Math.min(1, (displayVal - currentMin) / range));
        const endAngle = 135 + (270 * pct);

        // If start == end, arc is invalid, handle that
        if (Math.abs(endAngle - 135) < 0.1) {
             valuePath.setAttribute('d', '');
        } else {
             valuePath.setAttribute('d', describeArc(20, 20, 16, 135, endAngle));
        }
    };

    // Drag Logic
    let startY;
    let startVal;

    const handleDragStart = (e) => {
        startY = e.clientY || e.touches[0].clientY;
        startVal = value;
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDrag, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        container.classList.add('active');
    };

    const handleDrag = (e) => {
        e.preventDefault(); // Prevent scrolling on touch
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientY === undefined) return;

        const deltaY = startY - clientY; // Up is positive
        const range = currentMax - currentMin;

        // Sensitivity: full range in 200px?
        const pxRange = 200;
        const deltaVal = (deltaY / pxRange) * range;

        let newVal = startVal + deltaVal;
        newVal = Math.max(currentMin, Math.min(currentMax, newVal));

        // Quantize to step
        if (currentStep) {
            newVal = Math.round(newVal / currentStep) * currentStep;
        }

        value = newVal;
        updateVisuals();
        onInput(value);
    };

    const handleDragEnd = () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('touchend', handleDragEnd);
        container.classList.remove('active');
    };

    container.addEventListener('mousedown', handleDragStart);
    container.addEventListener('touchstart', handleDragStart, { passive: false });

    updateVisuals();

    return {
        element: container,
        getValue: () => value,
        setValue: (v) => { value = v; updateVisuals(); },
        setRange: (newMin, newMax, newStep) => {
            currentMin = newMin;
            currentMax = newMax;
            currentStep = newStep;
            updateVisuals();
        }
    };
}

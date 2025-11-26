import { appState } from "./state/app-state.js";
import { RDF_LINKS } from "./state/rdf-link-map.js";
import { BinauralBeatTrack, IsochronicTrack, SineTrack } from "./tracks/AudioTrack.js";
import { GeometryVisualTrack, ParticleVisualTrack } from "./tracks/VisualTrack.js";
import { VibrationTrack } from "./tracks/HapticTrack.js";

const getTrackConcept = (track) => {
  if (!track) return null;
  const name = track.constructor?.name;
  return name ? RDF_LINKS.tracks?.[name] ?? null : null;
};

const getParameterConcept = (paramName) => {
  if (!paramName) return null;
  return RDF_LINKS.parameters?.[paramName] ?? null;
};

const setRdfMetadata = (element, concept) => {
  if (!element) return;
  if (concept) {
    const label = concept.label || '';
    element.dataset.rdfLabel = label;
    element.dataset.rdfTerm = label;
    if (concept.uri) {
      element.dataset.rdfUri = concept.uri;
    } else {
      delete element.dataset.rdfUri;
    }
  } else {
    delete element.dataset.rdfLabel;
    delete element.dataset.rdfTerm;
    delete element.dataset.rdfUri;
  }
};

const getRdfDataset = (target) => {
  let node = target;
  while (node) {
    if (node.nodeType === 1 && node.dataset) {
      const label = node.dataset.rdfLabel || node.dataset.rdfTerm;
      const uri = node.dataset.rdfUri;
      if (label || uri) {
        return { label, uri, element: node };
      }
    }
    node = node.parentElement || node.parentNode;
  }
  return null;
};

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

  if (kernel.martigli?.subscribe) {
    kernel.martigli.subscribe(() => updateLists());
  }

  if (kernel.controlTracks?.subscribe) {
    kernel.controlTracks.subscribe(() => updateLists());
  }

  // RDF Tooltip Logic
  const tooltip = document.getElementById('rdf-tooltip');
  const tooltipTerm = document.getElementById('rdf-tooltip-term');

  const hideTooltip = () => {
    if (!tooltip.classList.contains('hidden')) {
      tooltip.classList.add('hidden');
    }
  };

  document.addEventListener('mouseover', (e) => {
    const rdfInfo = getRdfDataset(e.target);
    if (!rdfInfo) return;

    tooltipTerm.textContent = rdfInfo.label || rdfInfo.uri || '';
    tooltip.classList.remove('hidden');

    const rect = rdfInfo.element?.getBoundingClientRect();
    if (rect) {
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.top}px`;
    }
  });

  document.addEventListener('mouseout', (e) => {
    const currentInfo = getRdfDataset(e.target);
    if (!currentInfo) return;

    const relatedInfo = getRdfDataset(e.relatedTarget);
    if (relatedInfo && relatedInfo.element === currentInfo.element) {
      return; // Still within the same annotated element
    }
    hideTooltip();
  });

  document.addEventListener('click', (e) => {
    const rdfSafeTarget = e.target.closest('.knob-container, .knob-value-input, .track-modulation-select, .track-param-select, .fine-tune-btn, .add-modulator-btn, .remove-modulator-btn, .track-item-actions button');
    if (rdfSafeTarget) return;
    const rdfInfo = getRdfDataset(e.target);
    if (!rdfInfo) return;

    if (window.biosyncare && typeof window.biosyncare.navigateToConcept === 'function') {
      window.biosyncare.navigateToConcept({
        label: rdfInfo.label,
        uri: rdfInfo.uri,
      });
    }
  });
}

function renderTrackList(tracks, container, kernel) {
  container.innerHTML = '';
  const martigliOscillations = kernel.martigli?.listOscillations?.() ?? [];
  const structureControls = kernel.controlTracks?.listControls?.() ?? [];

  const getAvailableModulators = () => ([
    ...martigliOscillations.map((osc) => ({
      id: osc.id,
      label: osc.label || osc.id,
      type: 'martigli',
      source: osc,
    })),
    ...structureControls.map((control) => ({
      id: control.id,
      label: control.label || control.sequenceLabel || control.id,
      type: 'structure',
      source: control,
    })),
  ]);

  tracks.forEach(track => {
    const li = document.createElement('li');
    li.className = 'track-item';

    const header = document.createElement('div');
    header.className = 'track-item-header';

    const label = document.createElement('span');
    label.className = 'track-item-label';
    label.textContent = track.label;
    label.style.cursor = 'help';
    setRdfMetadata(label, getTrackConcept(track));

    const actions = document.createElement('div');
    actions.className = 'track-item-actions';

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

    const paramsDiv = document.createElement('div');
    paramsDiv.className = 'track-param-list';

    track.parameters.forEach(param => {
      const row = document.createElement('div');
      row.className = 'track-param-row';

      const paramConcept = getParameterConcept(param.name);

      const pLabel = document.createElement('label');
      pLabel.textContent = param.name;
      pLabel.className = 'track-param-label';
      pLabel.style.cursor = 'help';
      if (paramConcept) setRdfMetadata(pLabel, paramConcept);

      let input;
      let valControl;
      let fineBtn = null;
      let knobStack = null;

      if (param.options && Array.isArray(param.options)) {
        input = document.createElement('select');
        input.className = 'track-param-select';

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

      } else {
        const originalMin = param.min !== -Infinity ? param.min : 0;
        const originalMax = param.max !== Infinity ? param.max : 1000;

        const range = originalMax - originalMin;
        const normalStep = range > 100 ? 1 : 0.1;
        const fineStep = normalStep / 10;

        // Fine-tune Button
        fineBtn = document.createElement('button');
        fineBtn.className = 'ghost tiny fine-tune-btn';
        fineBtn.type = 'button';
        fineBtn.innerHTML = '🔍';
        fineBtn.title = 'Fine Tune Mode';

        let isZoomed = false;

        // Number input for direct typing
        valControl = document.createElement('input');
        valControl.type = 'number';
        valControl.min = originalMin;
        valControl.max = originalMax;
        valControl.step = fineStep;
        valControl.value = param.base < 10 ? param.base.toFixed(2) : Math.round(param.base);
        valControl.className = 'knob-value-input';

        // Create Knob
        const knob = createKnob(param, originalMin, originalMax, normalStep, (val) => {
            param.base = val;
            valControl.value = val < 10 ? val.toFixed(2) : Math.round(val);
        });

        input = knob.element;

        knobStack = document.createElement('div');
        knobStack.className = 'knob-stack';
        knobStack.appendChild(input);

        const knobValueField = document.createElement('div');
        knobValueField.className = 'knob-value-field';
        knobValueField.appendChild(valControl);
        knobStack.appendChild(knobValueField);

        fineBtn.onclick = () => {
            isZoomed = !isZoomed;
          fineBtn.classList.toggle('active', isZoomed);

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

      const headerRow = document.createElement('div');
      headerRow.className = 'track-param-header';
      headerRow.appendChild(pLabel);
      if (fineBtn) {
        headerRow.appendChild(fineBtn);
      }

      const controlsRow = document.createElement('div');
      controlsRow.className = 'track-param-body';

      if (knobStack) {
        controlsRow.classList.add('has-knob');
        controlsRow.appendChild(knobStack);
      } else if (input) {
        controlsRow.appendChild(input);
      }

      const rawDepthRange = (Number.isFinite(param.max) && Number.isFinite(param.min))
        ? Math.abs(param.max - param.min) / 2
        : 100;
      const depthMax = (!Number.isFinite(rawDepthRange) || rawDepthRange <= 0) ? 100 : rawDepthRange;
      const depthStep = depthMax / 100 || 1;

      const modMini = document.createElement('div');
      modMini.className = 'track-mod-mini';

      const modMiniHead = document.createElement('div');
      modMiniHead.className = 'track-mod-mini-head';
      const modMiniLabel = document.createElement('span');
      modMiniLabel.textContent = 'MOD';
      modMiniHead.appendChild(modMiniLabel);

      const addModBtn = document.createElement('button');
      addModBtn.type = 'button';
      addModBtn.className = 'ghost tiny add-mod-mini-btn';
      addModBtn.textContent = '+';
      modMiniHead.appendChild(addModBtn);
      modMini.appendChild(modMiniHead);

      const modSlotList = document.createElement('div');
      modSlotList.className = 'track-mod-mini-slots';
      modMini.appendChild(modSlotList);
      controlsRow.appendChild(modMini);

      const renderModSlot = (slot) => {
        const slotRow = document.createElement('div');
        slotRow.className = 'track-mod-mini-slot';
        slotRow.dataset.slotId = slot.slotId;
        if (slot.type) {
          slotRow.dataset.modType = slot.type;
        }

        const syncState = () => {
          const isActive = !!slot.modulatorId && slot.depth > 0 && slot.enabled !== false;
          slotRow.classList.toggle('active', isActive);
          slotRow.classList.toggle('disabled', slot.enabled === false);
        };

        const modSelect = document.createElement('select');
        modSelect.className = 'track-mod-mini-select';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        const available = getAvailableModulators();
        placeholder.textContent = available.length ? 'Select…' : 'No modulators yet';
        modSelect.appendChild(placeholder);

        available.forEach((entry) => {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = entry.type === 'structure'
            ? `Structure · ${entry.label}`
            : `Martigli · ${entry.label}`;
          if (slot.modulatorId === entry.id) option.selected = true;
          modSelect.appendChild(option);
        });
        modSelect.disabled = !available.length;
        modSelect.onchange = (e) => {
          const targetId = e.target.value;
          if (!targetId) {
            slot.source = null;
            slot.modulatorId = null;
            delete slot.type;
            syncState();
            return;
          }
          const picked = available.find((entry) => entry.id === targetId);
          if (picked) {
            slotRow.dataset.modType = picked.type;
            param.attachModulator(slot.slotId, picked.source, {
              type: picked.type,
              label: picked.type === 'structure' ? `Structure · ${picked.label}` : picked.label,
            });
            syncState();
          }
        };

        const miniControls = document.createElement('div');
        miniControls.className = 'track-mod-mini-controls';

        const depthStack = document.createElement('div');
        depthStack.className = 'knob-stack knob-stack--mini';

        let depthInput;
        const depthKnob = createKnob({ base: slot.depth }, 0, depthMax, depthStep, (value) => {
          const nextVal = Math.max(0, value);
          param.setModulationDepth(slot.slotId, nextVal);
          slot.depth = nextVal;
          if (depthInput) depthInput.value = nextVal.toFixed(2);
          syncState();
        });
        depthKnob.element.classList.add('mod-depth-knob');

        const depthInputWrapper = document.createElement('div');
        depthInputWrapper.className = 'knob-value-field';
        depthInput = document.createElement('input');
        depthInput.type = 'number';
        depthInput.className = 'knob-value-input';
        depthInput.step = depthStep;
        depthInput.min = 0;
        depthInput.max = depthMax;
        depthInput.value = slot.depth.toFixed(2);
        depthInput.onchange = (e) => {
          let nextVal = parseFloat(e.target.value);
          if (!Number.isFinite(nextVal)) nextVal = 0;
          if (nextVal < 0) nextVal = 0;
          if (nextVal > depthMax) nextVal = depthMax;
          param.setModulationDepth(slot.slotId, nextVal);
          slot.depth = nextVal;
          depthKnob.setValue(nextVal);
          depthInput.value = nextVal.toFixed(2);
          syncState();
        };
        depthInputWrapper.appendChild(depthInput);

        depthStack.appendChild(depthKnob.element);
        depthStack.appendChild(depthInputWrapper);

        const modFineBtn = document.createElement('button');
        modFineBtn.type = 'button';
        modFineBtn.className = 'ghost tiny fine-tune-btn';
        modFineBtn.innerHTML = '🔍';
        modFineBtn.title = 'Fine Tune Mode';

        let isZoomed = false;
        const applyDepthZoom = () => {
          const currentVal = depthKnob.getValue();
          const windowSize = Math.max(depthMax * 0.2, depthStep * 20);
          const newMin = Math.max(0, currentVal - windowSize / 2);
          const newMax = Math.min(depthMax, currentVal + windowSize / 2);
          const zoomStep = Math.max((newMax - newMin) / 100, depthStep / 5);
          depthKnob.setRange(newMin, newMax, zoomStep);
          depthKnob.element.title = `Fine Tune: ${newMin.toFixed(2)} - ${newMax.toFixed(2)}`;
        };

        const resetDepthZoom = () => {
          depthKnob.setRange(0, depthMax, depthStep);
          depthKnob.element.title = 'Drag up/down to adjust';
        };

        modFineBtn.onclick = () => {
          isZoomed = !isZoomed;
          modFineBtn.classList.toggle('active', isZoomed);
          if (isZoomed) {
            applyDepthZoom();
          } else {
            resetDepthZoom();
          }
          depthKnob.setValue(slot.depth);
        };

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'ghost tiny remove-mod-mini-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove modulator';
        removeBtn.onclick = () => {
          param.unbind(slot.slotId);
          refreshModSlots();
        };

        miniControls.appendChild(depthStack);
        const toggleWrap = document.createElement('label');
        toggleWrap.className = 'mod-toggle';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = slot.enabled !== false;
        const toggleLabel = document.createElement('span');
        toggleLabel.textContent = toggle.checked ? 'On' : 'Off';
        const applyEnabled = (isOn) => {
          slot.enabled = isOn;
          param.setModulationEnabled(slot.slotId, isOn);
          depthInput.disabled = !isOn;
          depthKnob.element.classList.toggle('disabled', !isOn);
          toggle.checked = isOn;
          toggleLabel.textContent = isOn ? 'On' : 'Off';
          syncState();
        };
        toggle.onchange = (e) => applyEnabled(e.target.checked);
        applyEnabled(toggle.checked);
        toggleWrap.appendChild(toggle);
        toggleWrap.appendChild(toggleLabel);
        miniControls.appendChild(toggleWrap);
        miniControls.appendChild(modFineBtn);
        miniControls.appendChild(removeBtn);

        slotRow.appendChild(modSelect);
        slotRow.appendChild(miniControls);
        syncState();
        return slotRow;
      };

      const refreshModSlots = () => {
        modSlotList.innerHTML = '';
        const available = getAvailableModulators();
        addModBtn.disabled = !available.length;
        addModBtn.title = addModBtn.disabled ? 'No modulators available' : 'Add modulator';

        if (!Array.isArray(param.modulations) || !param.modulations.length) {
          const empty = document.createElement('span');
          empty.className = 'track-mod-mini-empty';
          empty.textContent = available.length ? 'Add mod' : 'No modulators yet';
          modSlotList.appendChild(empty);
          return;
        }

        param.modulations.forEach((slot) => {
          modSlotList.appendChild(renderModSlot(slot));
        });
      };

      addModBtn.onclick = () => {
        const available = getAvailableModulators();
        const next = available[0];
        const slot = param.createModulationSlot({
          type: next?.type ?? 'martigli',
          label: next
            ? `${next.type === 'structure' ? 'Structure · ' : 'Martigli · '}${next.label}`
            : 'Martigli',
          depth: 0,
          modulator: next?.source ?? null,
          modulatorId: next?.id ?? null,
        });
        if (next?.source) {
          param.attachModulator(slot.slotId, next.source, { type: next.type, label: next.label });
        }
        refreshModSlots();
      };

      refreshModSlots();

      row.appendChild(headerRow);
      row.appendChild(controlsRow);
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

const nowSeconds = () => {
  if (typeof performance !== "undefined" && performance.now) {
    return (performance.timeOrigin + performance.now()) / 1000;
  }
  return Date.now() / 1000;
};

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const clamp01 = (value) => clamp(value ?? 0, 0, 1);

const sampleControl = (control, timeSec) => {
  if (!control) {
    return { value: 0, rowIndex: 0, bellIndex: 0, stepCount: 0, rowLength: 1, running: false };
  }
  if (typeof control.sample === "function") {
    return control.sample(timeSec);
  }
  if (typeof control.valueAt === "function") {
    return {
      value: control.valueAt(timeSec),
      rowIndex: 0,
      bellIndex: 0,
      stepCount: control.rows?.length ?? 0,
      rowLength: control.orderDimension ?? control.rows?.[0]?.length ?? 1,
      running: control.running ?? false,
    };
  }
  return { value: 0, rowIndex: 0, bellIndex: 0, stepCount: 0, rowLength: 1, running: false };
};

export function initStructureControlPanel(options = {}) {
  const kernel = options.kernel ?? null;
  const elements = options.elements ?? {};
  const store = kernel?.structures ?? null;
  const controlState = kernel?.controlTracks ?? null;

  if (!kernel || !store || !controlState) {
    console.warn("[StructureControlUI] Kernel or control state missing");
    return;
  }

  const datasetSelect = elements.datasetSelect ?? null;
  const sequenceSelect = elements.sequenceSelect ?? null;
  const tempoInput = elements.tempoInput ?? null;
  const addButton = elements.addButton ?? null;
  const listEl = elements.listEl ?? null;
  const statusEl = elements.statusEl ?? null;
  const emptyEl = elements.emptyEl ?? null;

  if (!datasetSelect || !sequenceSelect || !tempoInput || !addButton || !listEl) {
    console.warn("[StructureControlUI] Required DOM nodes missing");
    return;
  }

  let latestDatasetId = datasetSelect.value || null;
  const previewRefs = new Map();
  let rafId = null;

  const setStatus = (text = "") => {
    if (statusEl) statusEl.textContent = text;
  };

  const updateAddState = () => {
    addButton.disabled = !datasetSelect.value || !sequenceSelect.value;
  };

  const renderDatasets = (datasets = []) => {
    datasetSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = datasets.length ? "Select dataset…" : "Loading datasets…";
    datasetSelect.appendChild(placeholder);

    datasets.forEach((dataset) => {
      const opt = document.createElement("option");
      opt.value = dataset.id ?? dataset.datasetId ?? dataset.label ?? "";
      opt.textContent = dataset.label ?? dataset.id ?? "Dataset";
      opt.selected = opt.value === latestDatasetId;
      datasetSelect.appendChild(opt);
    });

    if (!datasetSelect.value && datasets[0]) {
      datasetSelect.value = datasets[0].id ?? datasets[0].datasetId ?? "";
    }
    latestDatasetId = datasetSelect.value || null;
    renderSequences(latestDatasetId);
    updateAddState();
  };

  const renderSequences = (datasetId) => {
    sequenceSelect.innerHTML = "";
    sequenceSelect.disabled = !datasetId;
    if (!datasetId) {
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose a dataset first";
      sequenceSelect.appendChild(placeholder);
      return;
    }

    const dataset = store.getDataset?.(datasetId);
    const sequences = dataset?.sequences ?? [];
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = sequences.length ? "Select sequence…" : "No sequences found";
    sequenceSelect.appendChild(placeholder);

    sequences.forEach((seq) => {
      const opt = document.createElement("option");
      opt.value = seq.id ?? seq.sequenceId ?? "";
      opt.textContent = seq.label ?? seq.id ?? "Sequence";
      sequenceSelect.appendChild(opt);
    });

    sequenceSelect.value = "";
    updateAddState();
  };

  const handleAdd = () => {
    const datasetId = datasetSelect.value;
    const sequenceId = sequenceSelect.value;
    const dataset = store.getDataset?.(datasetId);
    const sequence = dataset?.sequences?.find((seq) => seq.id === sequenceId);
    const datasetLabel = dataset?.label ?? datasetId ?? "Dataset";
    const sequenceLabel = sequence?.label ?? sequenceId ?? "Sequence";
    const tempo = clamp(Number.parseFloat(tempoInput.value) || 60, 10, 360);

    if (!datasetId || !sequenceId) {
      setStatus("Select a dataset and sequence first.");
      return;
    }

    try {
      controlState.addControl({
        datasetId,
        sequenceId,
        tempo,
        label: `${datasetLabel} · ${sequenceLabel}`,
      });
      setStatus(`Created control from “${sequenceLabel}” at ${tempo} BPM.`);
      tempoInput.value = tempo;
    } catch (err) {
      console.warn("Failed to add structure control", err);
      setStatus(err.message || "Could not add control track.");
    }
  };

  const updatePreview = () => {
    const controls = controlState.listControls?.() ?? [];
    if (!controls.length) {
      previewRefs.clear();
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      return;
    }

    const now = nowSeconds();
    controls.forEach((control) => {
      const ref = previewRefs.get(control.id);
      if (!ref) return;
      const sample = sampleControl(control, now);
      const normalized = clamp01(sample.value);
      ref.bar.style.width = `${Math.round(normalized * 100)}%`;
      ref.value.textContent = normalized.toFixed(2);
      if (ref.stateChip) {
        ref.stateChip.textContent = control.running ? "Running" : "Stopped";
        ref.stateChip.classList.toggle("chip-live", control.running);
        ref.stateChip.classList.toggle("chip-idle", !control.running);
      }
      if (ref.step) {
        if (sample.stepCount) {
          ref.step.textContent = `Row ${sample.rowIndex + 1}/${sample.stepCount} · Bell ${sample.bellIndex + 1}/${sample.rowLength}`;
        } else {
          ref.step.textContent = control.running ? "Running" : "Idle";
        }
      }
    });

    rafId = requestAnimationFrame(updatePreview);
  };

  const ensurePreviewLoop = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(updatePreview);
    }
  };

  const renderControls = () => {
    const controls = controlState.listControls?.() ?? [];
    listEl.innerHTML = "";
    previewRefs.clear();

    if (!controls.length) {
      if (emptyEl) emptyEl.classList.remove("hidden");
      ensurePreviewLoop();
      return;
    }

    if (emptyEl) emptyEl.classList.add("hidden");

    controls.forEach((control) => {
      const li = document.createElement("li");
      li.className = "control-track-item";
      li.dataset.controlId = control.id;
      if (control.running) {
        li.classList.add("running");
      }

      const head = document.createElement("div");
      head.className = "control-track-head";
      const titleStack = document.createElement("div");
      titleStack.className = "control-track-title";
      const badge = document.createElement("span");
      badge.className = "control-track-badge";
      badge.textContent = "Structure mod";
      const name = document.createElement("span");
      name.className = "control-track-name";
      name.textContent = control.label ?? control.sequenceLabel ?? "Structure control";
      titleStack.appendChild(badge);
      titleStack.appendChild(name);
      head.appendChild(titleStack);

      const stateChip = document.createElement("span");
      stateChip.className = `control-track-chip ${control.running ? "chip-live" : "chip-idle"}`;
      stateChip.textContent = control.running ? "Running" : "Stopped";
      head.appendChild(stateChip);

      const meta = document.createElement("p");
      meta.className = "control-track-meta muted-text small";
      meta.textContent = `${control.datasetLabel ?? control.datasetId} • ${control.sequenceLabel ?? control.sequenceId}`;

      const row = document.createElement("div");
      row.className = "control-track-actions";

      const tempoWrap = document.createElement("label");
      tempoWrap.className = "control-tempo-field";
      tempoWrap.textContent = "Tempo";
      const tempoField = document.createElement("input");
      tempoField.type = "number";
      tempoField.min = "10";
      tempoField.max = "360";
      tempoField.step = "1";
      tempoField.value = control.tempo ?? 60;
      tempoField.onchange = (e) => {
        const val = clamp(Number.parseFloat(e.target.value) || 60, 10, 360);
        controlState.setTempo(control.id, val);
        tempoField.value = val;
        setStatus(`Set ${control.label ?? "control"} tempo to ${val} BPM.`);
      };
      const tempoSuffix = document.createElement("span");
      tempoSuffix.className = "control-tempo-suffix";
      tempoSuffix.textContent = "BPM";
      tempoWrap.appendChild(tempoField);
      tempoWrap.appendChild(tempoSuffix);

      const buttonRow = document.createElement("div");
      buttonRow.className = "control-button-row";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "ghost tiny";
      toggle.textContent = control.running ? "Stop" : "Start";
      toggle.onclick = () => {
        if (control.running) {
          controlState.stopControl(control.id);
          setStatus(`Stopped ${control.label ?? "control"}.`);
        } else {
          controlState.startControl(control.id);
          setStatus(`Started ${control.label ?? "control"}.`);
        }
      };

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost tiny";
      remove.textContent = "Remove";
      remove.onclick = () => {
        controlState.removeControl(control.id);
        setStatus(`Removed ${control.label ?? "control"}.`);
      };

      buttonRow.appendChild(toggle);
      buttonRow.appendChild(remove);

      row.appendChild(tempoWrap);
      row.appendChild(buttonRow);

      const preview = document.createElement("div");
      preview.className = "control-track-preview";
      const meter = document.createElement("div");
      meter.className = "control-meter";
      const meterFill = document.createElement("div");
      meterFill.className = "control-meter-fill";
      meter.appendChild(meterFill);
      const previewMeta = document.createElement("div");
      previewMeta.className = "control-preview-meta";
      const valueText = document.createElement("span");
      valueText.className = "control-preview-value";
      valueText.textContent = "0.00";
      const stepText = document.createElement("span");
      stepText.className = "control-preview-step";
      stepText.textContent = control.running ? "Running" : "Idle";
      previewMeta.appendChild(valueText);
      previewMeta.appendChild(stepText);
      preview.appendChild(meter);
      preview.appendChild(previewMeta);

      previewRefs.set(control.id, {
        bar: meterFill,
        value: valueText,
        step: stepText,
        stateChip,
      });

      li.appendChild(head);
      li.appendChild(meta);
      li.appendChild(row);
      li.appendChild(preview);
      listEl.appendChild(li);
    });

    ensurePreviewLoop();
  };

  datasetSelect.addEventListener("change", (e) => {
    latestDatasetId = e.target.value || null;
    renderSequences(latestDatasetId);
  });
  sequenceSelect.addEventListener("change", updateAddState);
  addButton.addEventListener("click", handleAdd);

  if (tempoInput && !tempoInput.value) {
    tempoInput.value = 60;
  }

  renderSequences(latestDatasetId);
  updateAddState();

  store.subscribe?.((snapshot) => {
    if (snapshot?.error) {
      setStatus("Failed to load structure datasets.");
      return;
    }
    const datasets = snapshot?.datasets ?? [];
    renderDatasets(datasets);
    if (snapshot?.loading) {
      setStatus("Loading structure datasets…");
    } else if (datasets.length) {
      setStatus("");
    }
  });
  setStatus("Loading structure datasets…");
  store.load?.().then(() => setStatus("")).catch((err) => {
    console.warn("Structure dataset load failed", err);
    setStatus("Could not load structure datasets.");
  });

  controlState.subscribe?.(() => renderControls());
  renderControls();
}

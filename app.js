/**
 * SONUS — Minimalist Study Sound & Frequency Environment
 * 17 Presets, Tactile Glassmorphism Controls, 10-Band Parametric EQ, and Live Reactive Visuals.
 */

// --- Frequency Bands (10 Bands) ---
const BANDS = [
  { label: "60 Hz", freq: 60, binMin: 0, binMax: 2 },
  { label: "125 Hz", freq: 125, binMin: 1, binMax: 3 },
  { label: "250 Hz", freq: 250, binMin: 2, binMax: 6 },
  { label: "500 Hz", freq: 500, binMin: 5, binMax: 10 },
  { label: "1 kHz", freq: 1000, binMin: 10, binMax: 20 },
  { label: "2 kHz", freq: 2000, binMin: 20, binMax: 40 },
  { label: "4 kHz", freq: 4000, binMin: 40, binMax: 80 },
  { label: "8 kHz", freq: 8000, binMin: 80, binMax: 140 },
  { label: "12 kHz", freq: 12000, binMin: 130, binMax: 190 },
  { label: "16 kHz", freq: 16000, binMin: 180, binMax: 240 }
];

// --- 17 Curated Presets ---
const PRESETS = [
  // Noise Colors
  { name: "Brown", desc: "deep / grounding", noise: "brown", category: "colors", values: [-9, -8, -7, -5, -3, -1, 1, 2, 3, 3] },
  { name: "Pink", desc: "balanced / warm", noise: "pink", category: "colors", values: [5, 4, 3, 2, 1, 0, -1, -2, -3, -4] },
  { name: "White", desc: "clear / neutral", noise: "white", category: "colors", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Grey", desc: "soft / even", noise: "pink", category: "colors", values: [-3, -2, -1, 0, 1, 2, 2, 1, 0, -1] },
  { name: "Infra", desc: "low / slow", noise: "brown", category: "colors", values: [7, 7, 6, 4, 2, 0, -2, -4, -6, -8] },
  { name: "Ultra", desc: "high / airy", noise: "white", category: "colors", values: [-7, -5, -3, -1, 0, 2, 4, 6, 7, 8] },

  // Frequency Anchors
  { name: "Around 60Hz", desc: "low anchor", noise: "brown", category: "anchors", values: [10, 7, 3, 0, -2, -4, -5, -5, -5, -5] },
  { name: "125Hz", desc: "soft pulse", noise: "brown", category: "anchors", values: [2, 9, 4, 0, -2, -3, -4, -4, -4, -4] },
  { name: "250Hz", desc: "body / hum", noise: "pink", category: "anchors", values: [-1, 2, 10, 4, 0, -2, -4, -4, -4, -4] },
  { name: "500Hz", desc: "mid anchor", noise: "pink", category: "anchors", values: [-2, -1, 2, 10, 2, -1, -3, -4, -4, -4] },
  { name: "1kHz", desc: "presence", noise: "white", category: "anchors", values: [-3, -2, -1, 3, 10, 3, -2, -4, -4, -4] },
  { name: "2kHz", desc: "bright focus", noise: "white", category: "anchors", values: [-4, -3, -2, 0, 3, 10, 4, -1, -3, -4] },
  { name: "4kHz", desc: "definition", noise: "white", category: "anchors", values: [-4, -3, -2, -1, 2, 4, 10, 3, -1, -3] },
  { name: "8kHz", desc: "high clarity", noise: "white", category: "anchors", values: [-4, -3, -2, -1, 1, 3, 5, 10, 4, 0] },

  // Focus Sculpt / Special
  { name: "Speech Blocker", desc: "mask / hush", noise: "white", category: "special", values: [4, 4, 3, 2, -2, -4, -2, 2, 4, 5] },
  { name: "Ear Massage", desc: "moving / calm", noise: "pink", category: "special", values: [5, 2, -2, 5, -1, -3, 5, -1, -3, 4] },
  { name: "℗ Surprise!", desc: "let it wander", noise: "brown", category: "special", values: [3, -4, 6, -5, 7, -6, 5, -4, 6, -5] }
];

// --- State Variables ---
let currentNoiseType = "white";
let activePresetIndex = 2; // White Noise default
let currentCategory = "all";
let eqValues = [...PRESETS[activePresetIndex].values];
let isPlaying = false;
let isMuted = false;
let masterVolume = 0.65;

let draggingIndex = null;
let audio = null;
let analyserData = null;

// --- DOM Elements ---
const clockDisplay = document.getElementById("clockDisplay");

const muteToggleBtn = document.getElementById("muteToggleBtn");
const masterVolumeInput = document.getElementById("masterVolume");
const volumeProgress = document.getElementById("volumeProgress");
const volumeValue = document.getElementById("volumeValue");

const currentPresetName = document.getElementById("currentPresetName");
const presetsActiveMode = document.getElementById("presetsActiveMode");
const flatResetBtn = document.getElementById("flatResetBtn");

const eqPlotWrap = document.getElementById("eqPlotWrap");
const eqBackdropCanvas = document.getElementById("eqBackdropCanvas");
const eqPathFill = document.getElementById("eqPathFill");
const eqPathGlow = document.getElementById("eqPathGlow");
const eqPathCore = document.getElementById("eqPathCore");
const eqNodesLayer = document.getElementById("eqNodesLayer");
const eqFrequencyAxis = document.getElementById("eqFrequencyAxis");
const dragTooltip = document.getElementById("dragTooltip");
const tooltipBand = document.getElementById("tooltipBand");
const tooltipVal = document.getElementById("tooltipVal");

const mainFocusBtn = document.getElementById("mainFocusBtn");
const playSvgPath = document.getElementById("playSvgPath");
const btnCaption = document.getElementById("btnCaption");
const presetPillGrid = document.getElementById("presetPillGrid");

// --- Initialize UI Nodes and Axis ---
function initNodesAndAxis() {
  eqNodesLayer.innerHTML = "";
  eqFrequencyAxis.innerHTML = "";

  BANDS.forEach((band, i) => {
    // Interactive handle element
    const handle = document.createElement("div");
    handle.className = "eq-handle";
    handle.dataset.index = i;
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", `${band.label} gain`);
    handle.setAttribute("aria-valuemin", "-12");
    handle.setAttribute("aria-valuemax", "12");
    handle.setAttribute("aria-valuenow", eqValues[i]);
    handle.innerHTML = `
      <div class="handle-ring"></div>
    `;
    eqNodesLayer.appendChild(handle);

    // Axis label
    const axisLabel = document.createElement("button");
    axisLabel.className = "axis-band-label";
    axisLabel.dataset.index = i;
    axisLabel.type = "button";
    axisLabel.textContent = band.label.replace(" ", "");
    axisLabel.title = `Click to toggle ${band.label}`;
    axisLabel.addEventListener("click", () => {
      eqValues[i] = eqValues[i] === 0 ? 4 : 0;
      updatePresetTitle("Custom Curve", "hand shaped");
      renderCurve();
      updateAudioFilters();
    });
    eqFrequencyAxis.appendChild(axisLabel);
  });
}

// --- Render Glass Presets Grid (All 17 Presets Visible) ---
function renderPresetsGrid() {
  presetPillGrid.innerHTML = "";

  PRESETS.forEach((preset, i) => {
    const pill = document.createElement("button");
    pill.className = `preset-pill glass-btn ${i === activePresetIndex ? "active" : ""}`;
    pill.dataset.index = i;
    pill.type = "button";
    pill.innerHTML = `
      <span class="preset-pill-name">${preset.name}</span>
      <span class="preset-pill-desc">${preset.desc}</span>
    `;
    pill.addEventListener("click", () => applyPreset(i));
    presetPillGrid.appendChild(pill);
  });
}

// --- Catmull-Rom Spline to Smooth Cubic Bézier ---
function catmullRomToBezier(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// --- Render Equalizer Curve and Place Handles ---
function renderCurve() {
  const svgWidth = 1000;
  const svgHeight = 360;
  const marginX = 55;
  const plotWidth = svgWidth - marginX * 2;
  const centerY = svgHeight / 2;
  const maxAmp = centerY - 32;

  // Calculate coordinates for the 10 bands
  const points = eqValues.map((val, i) => {
    const x = marginX + (i / (BANDS.length - 1)) * plotWidth;
    const y = centerY - (val / 12) * maxAmp;
    return [x, y];
  });

  // Smooth spline path spanning the entire plot width
  const edgeLeft = [0, points[0][1]];
  const edgeRight = [svgWidth, points[points.length - 1][1]];
  const splinePoints = [edgeLeft, ...points, edgeRight];

  const curveD = catmullRomToBezier(splinePoints);
  eqPathGlow.setAttribute("d", curveD);
  eqPathCore.setAttribute("d", curveD);

  // Fill path beneath curve
  const fillD = `${curveD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  eqPathFill.setAttribute("d", fillD);

  // Position HTML handles
  const handles = eqNodesLayer.querySelectorAll(".eq-handle");
  const axisLabels = eqFrequencyAxis.querySelectorAll(".axis-band-label");

  points.forEach(([x, y], i) => {
    const handle = handles[i];
    if (handle) {
      handle.style.left = `${(x / svgWidth) * 100}%`;
      handle.style.top = `${(y / svgHeight) * 100}%`;
      handle.setAttribute("aria-valuenow", eqValues[i]);
    }

    const axisLabel = axisLabels[i];
    if (axisLabel) {
      axisLabel.classList.toggle("active", Math.abs(eqValues[i]) >= 3 || draggingIndex === i);
    }
  });
}

// --- Smooth Visual Curve Transition Engine ---
let curveAnimationId = null;

function cancelCurveAnimation() {
  if (curveAnimationId !== null) {
    cancelAnimationFrame(curveAnimationId);
    curveAnimationId = null;
  }
  if (eqPlotWrap) {
    eqPlotWrap.classList.remove("is-morphing");
  }
}

function animateCurveTransition(targetValues, durationMs = 450) {
  cancelCurveAnimation();

  if (eqPlotWrap) {
    eqPlotWrap.classList.add("is-morphing");
  }

  const startValues = [...eqValues];
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);

    // Smooth cubic ease-out: starts responsive, eases gently into place
    const eased = 1 - Math.pow(1 - progress, 3);

    eqValues = startValues.map((start, i) => {
      return start + (targetValues[i] - start) * eased;
    });

    renderCurve();

    if (progress < 1) {
      curveAnimationId = requestAnimationFrame(step);
    } else {
      eqValues = [...targetValues];
      renderCurve();
      curveAnimationId = null;
      if (eqPlotWrap) {
        eqPlotWrap.classList.remove("is-morphing");
      }
    }
  }

  curveAnimationId = requestAnimationFrame(step);
}

// --- Apply Preset ---
function applyPreset(index) {
  activePresetIndex = index;
  const preset = PRESETS[index];

  if (currentPresetName) currentPresetName.textContent = preset.name;
  if (presetsActiveMode) presetsActiveMode.textContent = preset.desc;

  // Crossfade noise generator buffer type (450ms fade)
  setNoiseType(preset.noise, 0.45);

  // Smoothly ramp audio biquad equalizer filters (450ms fade)
  rampAudioFilters(preset.values, 0.45);

  // Smoothly animate the visual curve line and control nodes (450ms fade)
  animateCurveTransition(preset.values, 450);

  // Update active state in glass buttons
  document.querySelectorAll(".preset-pill").forEach(pill => {
    pill.classList.toggle("active", Number(pill.dataset.index) === index);
  });
}

function updatePresetTitle(customTitle, subTitle = "hand shaped") {
  activePresetIndex = -1;
  if (currentPresetName) currentPresetName.textContent = customTitle;
  if (presetsActiveMode) presetsActiveMode.textContent = subTitle;
  document.querySelectorAll(".preset-pill").forEach(pill => pill.classList.remove("active"));
}

// --- High-Fidelity Audio Synthesis Engine ---
function createNoiseBuffer(context, type) {
  const bufferSize = context.sampleRate * 4;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "brown") {
    // Brownian Noise: Integrated random walk (deep, warm, rumble)
    let last = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.6;
    }
  } else if (type === "pink") {
    // Pink Noise: Paul Kellet 1/f filter (natural, rain-like)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
      b6 = white * 0.115926;
    }
  } else {
    // White Noise: Uniform spectral energy
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.32;
    }
  }

  return buffer;
}

function initAudioSystem() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContext();

  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, currentNoiseType);
  source.loop = true;

  // Source Gain Node (enables click-free crossfades between noise types)
  const sourceGain = context.createGain();
  sourceGain.gain.setValueAtTime(1, context.currentTime);

  // Master Gain Node
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0, context.currentTime);

  // Equalizer Biquad Filters Chain (10 Bands)
  const filters = BANDS.map((band, i) => {
    const filter = context.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = band.freq;
    filter.Q.value = 0.95;
    filter.gain.value = eqValues[i];
    return filter;
  });

  // Fast Fourier Transform (FFT) Analyser Node
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.82;

  // Audio Graph: source -> sourceGain -> filters[0..9] -> analyser -> masterGain -> destination
  source.connect(sourceGain);
  sourceGain.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }
  filters[filters.length - 1].connect(analyser);
  analyser.connect(masterGain);
  masterGain.connect(context.destination);

  analyserData = new Uint8Array(analyser.frequencyBinCount);
  source.start();

  audio = { context, source, sourceGain, filters, analyser, masterGain };
}

// Rapid filter gain update for interactive node dragging
function updateAudioFilters() {
  if (!audio) return;
  eqValues.forEach((val, i) => {
    audio.filters[i].gain.setTargetAtTime(val, audio.context.currentTime, 0.025);
  });
}

// Silky smooth audio filter ramp for preset fades
function rampAudioFilters(targetValues, duration = 0.45) {
  if (!audio) return;
  const ctx = audio.context;
  const now = ctx.currentTime;
  targetValues.forEach((val, i) => {
    const filterGain = audio.filters[i].gain;
    filterGain.cancelScheduledValues(now);
    filterGain.setValueAtTime(filterGain.value, now);
    filterGain.linearRampToValueAtTime(val, now + duration);
  });
}

// Smooth noise generator crossfade between types
function setNoiseType(type, fadeDuration = 0.45) {
  if (type === currentNoiseType) return;
  currentNoiseType = type;

  if (!audio) return;

  const ctx = audio.context;
  const now = ctx.currentTime;

  if (isPlaying) {
    // Crossfade old noise stream out and new noise stream in
    const newBuffer = createNoiseBuffer(ctx, type);
    const newSource = ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;

    const newSourceGain = ctx.createGain();
    newSourceGain.gain.setValueAtTime(0.0001, now);
    newSourceGain.gain.linearRampToValueAtTime(1, now + fadeDuration);

    newSource.connect(newSourceGain);
    newSourceGain.connect(audio.filters[0]);
    newSource.start();

    const oldSource = audio.source;
    const oldGain = audio.sourceGain;

    if (oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }

    setTimeout(() => {
      try {
        oldSource.stop();
        oldSource.disconnect();
        if (oldGain) oldGain.disconnect();
      } catch (_) {}
    }, (fadeDuration + 0.1) * 1000);

    audio.source = newSource;
    audio.sourceGain = newSourceGain;
  } else {
    // Audio is paused: cleanly re-create buffer source ready for startPlayback
    try {
      if (audio.source) {
        audio.source.stop();
        audio.source.disconnect();
      }
      if (audio.sourceGain) {
        audio.sourceGain.disconnect();
      }
    } catch (_) {}

    const newBuffer = createNoiseBuffer(ctx, type);
    const newSource = ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;

    const newSourceGain = ctx.createGain();
    newSourceGain.gain.value = 1;

    newSource.connect(newSourceGain);
    newSourceGain.connect(audio.filters[0]);
    newSource.start();

    audio.source = newSource;
    audio.sourceGain = newSourceGain;
  }
}

async function startPlayback() {
  if (!audio) {
    initAudioSystem();
  }

  if (audio.context.state === "suspended") {
    await audio.context.resume();
  }

  const targetGain = isMuted ? 0 : masterVolume;
  audio.masterGain.gain.setValueAtTime(audio.masterGain.gain.value, audio.context.currentTime);
  audio.masterGain.gain.linearRampToValueAtTime(targetGain, audio.context.currentTime + 0.25);

  isPlaying = true;
  updatePlayButtonUI(true);
}

function pausePlayback() {
  if (!audio) return;

  audio.masterGain.gain.setValueAtTime(audio.masterGain.gain.value, audio.context.currentTime);
  audio.masterGain.gain.linearRampToValueAtTime(0.001, audio.context.currentTime + 0.2);

  setTimeout(() => {
    if (!isPlaying && audio) {
      audio.context.suspend();
    }
  }, 220);

  isPlaying = false;
  updatePlayButtonUI(false);
}

function togglePlayback() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function updatePlayButtonUI(playing) {
  mainFocusBtn.classList.toggle("is-playing", playing);
  mainFocusBtn.setAttribute("aria-pressed", playing ? "true" : "false");

  if (playing) {
    btnCaption.textContent = "Pause Focus";
    playSvgPath.setAttribute("d", "M6 19h4V5H6v14zm8-14v14h4V5h-4z");
  } else {
    btnCaption.textContent = "Start Focus";
    playSvgPath.setAttribute("d", "M8 5v14l11-7z");
  }
}

// --- Usable Pointer Dragging for Frequency Handles ---
function updateFromPointer(clientY) {
  if (draggingIndex === null) return;

  const rect = eqPlotWrap.getBoundingClientRect();
  const relY = clientY - rect.top;
  const centerY = rect.height / 2;
  const maxAmp = (rect.height / 2) * (148 / 180);

  let norm = (centerY - relY) / maxAmp;
  norm = Math.max(-1, Math.min(1, norm));

  const db = Math.round(norm * 12 * 2) / 2;
  eqValues[draggingIndex] = db;

  renderCurve();
  updateAudioFilters();
  updatePresetTitle("Custom Curve", "hand shaped");

  const band = BANDS[draggingIndex];
  tooltipBand.textContent = band.label;
  tooltipVal.textContent = `${db > 0 ? "+" : ""}${db.toFixed(1)} dB`;

  const nodeEl = eqNodesLayer.children[draggingIndex];
  if (nodeEl) {
    const nodeLeft = nodeEl.offsetLeft;
    const nodeTop = nodeEl.offsetTop;
    dragTooltip.style.left = `${nodeLeft}px`;
    dragTooltip.style.top = `${nodeTop - 16}px`;
    dragTooltip.classList.add("visible");
  }
}

function setupPointerInteraction() {
  eqPlotWrap.addEventListener("pointerdown", e => {
    cancelCurveAnimation();
    const handleEl = e.target.closest(".eq-handle");
    const rect = eqPlotWrap.getBoundingClientRect();

    if (handleEl) {
      draggingIndex = Number(handleEl.dataset.index);
    } else {
      const normX = (e.clientX - rect.left) / rect.width;
      let minDistance = Infinity;
      let bestIndex = 0;

      for (let i = 0; i < BANDS.length; i++) {
        const bandNormX = (55 + (i / 9) * (1000 - 110)) / 1000;
        const dist = Math.abs(normX - bandNormX);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }
      draggingIndex = bestIndex;
    }

    eqPlotWrap.setPointerCapture(e.pointerId);
    const activeHandle = eqNodesLayer.children[draggingIndex];
    if (activeHandle) activeHandle.classList.add("is-dragging");

    updateFromPointer(e.clientY);
  });

  eqPlotWrap.addEventListener("pointermove", e => {
    if (draggingIndex !== null) {
      updateFromPointer(e.clientY);
    }
  });

  const stopDragging = () => {
    if (draggingIndex !== null) {
      const activeHandle = eqNodesLayer.children[draggingIndex];
      if (activeHandle) activeHandle.classList.remove("is-dragging");
      draggingIndex = null;
      dragTooltip.classList.remove("visible");
      if (typeof resetIdleTimer === "function") resetIdleTimer();
    }
  };

  eqPlotWrap.addEventListener("pointerup", stopDragging);
  eqPlotWrap.addEventListener("pointercancel", stopDragging);

  // Double click to reset specific node to 0 dB
  eqPlotWrap.addEventListener("dblclick", e => {
    const handleEl = e.target.closest(".eq-handle");
    if (handleEl) {
      const idx = Number(handleEl.dataset.index);
      eqValues[idx] = 0;
      updatePresetTitle("Custom Curve", "hand shaped");
      renderCurve();
      updateAudioFilters();
    }
  });
}

// --- Live Audio Reactive Spectrum Canvas (Monochrome, No Dots) ---
function drawCanvasVisuals(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);

  if (audio && isPlaying && analyserData) {
    audio.analyser.getByteFrequencyData(analyserData);

    const step = width / (analyserData.length * 0.65);
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < analyserData.length * 0.65; i++) {
      const x = i * step;
      const norm = analyserData[i] / 255;
      const y = height - (norm * (height * 0.65));
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    // Monochrome white/silver gradient wash
    const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.14)");
    grad.addColorStop(0.6, "rgba(255, 255, 255, 0.03)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Clean white wave crest
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.stroke();
  }
}

// --- Live Audio Reactive Node Rings ---
function updateAcousticReactivity() {
  if (!audio || !isPlaying || !analyserData) {
    const handles = eqNodesLayer.querySelectorAll(".handle-ring");
    handles.forEach(ring => {
      ring.style.transform = "";
      ring.style.boxShadow = "";
    });
    return;
  }

  // Pulse node rings gently based on specific frequency band energy
  BANDS.forEach((band, i) => {
    let bandSum = 0;
    let count = 0;
    for (let b = band.binMin; b <= band.binMax && b < analyserData.length; b++) {
      bandSum += analyserData[b];
      count++;
    }
    const bandEnergy = count > 0 ? (bandSum / count) / 255 : 0;
    const handleEl = eqNodesLayer.children[i];
    if (handleEl && draggingIndex !== i) {
      const ring = handleEl.querySelector(".handle-ring");
      if (ring) {
        const scale = 1 + bandEnergy * 0.35;
        const glow = 10 + bandEnergy * 14;
        ring.style.transform = `scale(${scale.toFixed(2)})`;
        ring.style.boxShadow = `0 0 ${glow.toFixed(0)}px rgba(255, 255, 255, ${(0.7 + bandEnergy * 0.3).toFixed(2)}), 0 0 2px #ffffff`;
      }
    }
  });
}

// --- Animation Render Loop ---
function animationLoop() {
  const canvas = eqBackdropCanvas;
  if (canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(dpr, dpr);

    drawCanvasVisuals(ctx, rect.width, rect.height);
    ctx.restore();
  }

  updateAcousticReactivity();
  requestAnimationFrame(animationLoop);
}

// --- Clock Engine ---
function tick() {
  const now = new Date();
  clockDisplay.textContent = now.toLocaleTimeString([], { hour12: false });
}

// --- Volume & Master Gain ---
function setMasterVolume(val) {
  masterVolume = val / 100;
  volumeProgress.style.width = `${val}%`;
  volumeValue.textContent = `${val}%`;
  masterVolumeInput.value = val;

  if (isMuted) {
    isMuted = false;
    muteToggleBtn.classList.remove("muted");
  }

  if (audio && isPlaying) {
    audio.masterGain.gain.setTargetAtTime(masterVolume, audio.context.currentTime, 0.03);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  muteToggleBtn.classList.toggle("muted", isMuted);

  if (audio && isPlaying) {
    const targetGain = isMuted ? 0 : masterVolume;
    audio.masterGain.gain.setTargetAtTime(targetGain, audio.context.currentTime, 0.03);
  }
}

// --- Keyboard Shortcuts ---
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlayback();
    } else if (e.code === "KeyM") {
      e.preventDefault();
      toggleMute();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      resetCurveFlat();
    } else if (e.key >= "1" && e.key <= "6") {
      const idx = parseInt(e.key, 10) - 1;
      if (PRESETS[idx]) {
        applyPreset(idx);
      }
    }
  });
}

function resetCurveFlat() {
  const flatValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  activePresetIndex = -1;
  document.querySelectorAll(".preset-pill").forEach(pill => pill.classList.remove("active"));

  if (currentPresetName) currentPresetName.textContent = "Flat Curve";
  if (presetsActiveMode) presetsActiveMode.textContent = "all zero dB";

  setNoiseType("white", 0.45);
  rampAudioFilters(flatValues, 0.45);
  animateCurveTransition(flatValues, 450);
}

// --- Ambient Stillness / Idle Mode Engine ---
let idleTimer = null;
const IDLE_DELAY_MS = 3500; // 3.5 seconds of stillness

function resetIdleTimer() {
  if (document.body.classList.contains("is-idle")) {
    document.body.classList.remove("is-idle");
  }

  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  // Only trigger stillness fade if user is not dragging an EQ handle and near top
  idleTimer = setTimeout(() => {
    if (draggingIndex === null && window.scrollY <= 140) {
      document.body.classList.add("is-idle");
    }
  }, IDLE_DELAY_MS);
}

function initIdleDetector() {
  const activityEvents = [
    "pointermove",
    "pointerdown",
    "keydown",
    "wheel",
    "touchstart"
  ];

  activityEvents.forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  window.addEventListener("scroll", () => {
    if (window.scrollY > 140 && document.body.classList.contains("is-idle")) {
      document.body.classList.remove("is-idle");
    }
    resetIdleTimer();
  }, { passive: true });

  resetIdleTimer();
}

// --- Wire Event Handlers ---
function initEvents() {
  mainFocusBtn.addEventListener("click", togglePlayback);
  flatResetBtn.addEventListener("click", resetCurveFlat);

  masterVolumeInput.addEventListener("input", e => {
    setMasterVolume(Number(e.target.value));
  });

  muteToggleBtn.addEventListener("click", toggleMute);
  window.addEventListener("resize", renderCurve);
}

// --- App Bootstrap ---
function boot() {
  initNodesAndAxis();
  renderPresetsGrid();
  renderCurve();
  setupPointerInteraction();
  setupKeyboardShortcuts();
  initEvents();
  initIdleDetector();
  tick();
  setInterval(tick, 1000);
  requestAnimationFrame(animationLoop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

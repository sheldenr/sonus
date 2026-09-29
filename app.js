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
  { label: "8 kHz", freq: 8000 },
  { label: "12 kHz", freq: 12000 },
  { label: "16 kHz", freq: 16000 }
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
let masterVolume = 0.60;
const PAGE_LOUDNESS_SCALE = 0.60; // 60% baseline loudness scale
// Chromium supports the same Web Audio primitives used here.  Older versions
// of Sonus disabled playback for Chromium because the graph was being rebuilt
// while the user dragged EQ points.  Keep the engine browser-agnostic instead;
// the graph below is now persistent and only its AudioParams are automated.
const isChromiumBrowser = /Chrome|Chromium|Edg|OPR|Brave|Vivaldi/i.test(navigator.userAgent);

let draggingIndex = null;
let dragRect = null;
let pendingDragY = null;
let dragFrameId = null;
let audio = null;
let audioNeedsSync = false;
let curveAnimationId = null;

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
const eqPathFill = document.getElementById("eqPathFill");
const eqPathGlow = document.getElementById("eqPathGlow");
const eqPathCore = document.getElementById("eqPathCore");
const eqNodesLayer = document.getElementById("eqNodesLayer");
const eqFrequencyAxis = document.getElementById("eqFrequencyAxis");
const dragTooltip = document.getElementById("dragTooltip");
const tooltipBand = document.getElementById("tooltipBand");
const tooltipVal = document.getElementById("tooltipVal");
let curveHandles = [];
let curveAxisLabels = [];
let presetPills = [];
let curveRenderFrame = null;

const mainFocusBtn = document.getElementById("mainFocusBtn");
const playSvgPath = document.getElementById("playSvgPath");
const btnCaption = document.getElementById("btnCaption");
const presetPillGrid = document.getElementById("presetPillGrid");

// --- Initialize UI Nodes and Axis ---
function initNodesAndAxis() {
  eqNodesLayer.innerHTML = "";
  eqFrequencyAxis.innerHTML = "";
  curveHandles = [];
  curveAxisLabels = [];

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
    curveHandles.push(handle);

    // Axis label
    const axisLabel = document.createElement("button");
    axisLabel.className = "axis-band-label";
    axisLabel.dataset.index = i;
    axisLabel.type = "button";
    axisLabel.textContent = band.label.replace(" ", "");
    axisLabel.title = `Click to toggle ${band.label}`;
    axisLabel.addEventListener("click", () => {
      const targetValues = [...eqValues];
      targetValues[i] = targetValues[i] === 0 ? 4 : 0;
      updatePresetTitle("Custom Curve", "hand shaped");
      animateCurveTransition(targetValues, 260);
      if (audio && isPlaying) {
        rampAudioFilters(targetValues, 0.26);
      } else {
        audioNeedsSync = true;
      }
    });
    eqFrequencyAxis.appendChild(axisLabel);
    curveAxisLabels.push(axisLabel);
  });
}

// --- Render Glass Presets Grid (All 17 Presets Visible) ---
function renderPresetsGrid() {
  presetPillGrid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  presetPills = [];

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
    fragment.appendChild(pill);
    presetPills.push(pill);
  });

  presetPillGrid.appendChild(fragment);
}

function updatePresetPillState() {
  presetPills.forEach((pill, index) => {
    pill.classList.toggle("active", index === activePresetIndex);
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
function renderCurve({ updateHandles = true, updateAccessibility = true } = {}) {
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
  points.forEach(([x, y], i) => {
    const handle = curveHandles[i];
    if (handle && updateHandles) {
      handle.style.left = `${(x / svgWidth) * 100}%`;
      handle.style.top = `${(y / svgHeight) * 100}%`;
      if (updateAccessibility) {
        handle.setAttribute("aria-valuenow", eqValues[i]);
      }
    }

    const axisLabel = curveAxisLabels[i];
    if (axisLabel && updateAccessibility) {
      axisLabel.classList.toggle("active", Math.abs(eqValues[i]) >= 3 || draggingIndex === i);
    }
  });
}

// --- Smooth Visual Curve Transition Engine ---
// --- Apply Preset (Instant, Zero Animation Overhead) ---
function applyPreset(index) {
  activePresetIndex = index;
  const preset = PRESETS[index];

  if (currentPresetName) currentPresetName.textContent = preset.name;
  if (presetsActiveMode) presetsActiveMode.textContent = preset.desc;

  if (isPlaying && audio && audio.context && audio.context.state !== "running") {
    audio.context.resume().catch(() => {});
  }

  setNoiseType(preset.noise);
  animateCurveTransition([...preset.values], 420);
  if (audio && isPlaying) {
    rampAudioFilters(preset.values, 0.42);
  } else {
    audioNeedsSync = true;
  }

  updatePresetPillState();
}

function cancelCurveAnimation() {
  if (curveAnimationId !== null) {
    cancelAnimationFrame(curveAnimationId);
    curveAnimationId = null;
  }
}

function animateCurveTransition(targetValues, duration = 420) {
  cancelCurveAnimation();

  const startValues = [...eqValues];
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || duration <= 0) {
    eqValues = [...targetValues];
    renderCurve();
    return;
  }

  const startTime = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    eqValues = startValues.map((value, index) => (
      value + (targetValues[index] - value) * eased
    ));
    renderCurve();

    if (progress < 1) {
      curveAnimationId = requestAnimationFrame(step);
    } else {
      eqValues = [...targetValues];
      renderCurve();
      curveAnimationId = null;
    }
  };

  curveAnimationId = requestAnimationFrame(step);
}

function updatePresetTitle(customTitle, subTitle = "hand shaped") {
  if (activePresetIndex === -1 && currentPresetName && currentPresetName.textContent === customTitle) {
    return;
  }
  activePresetIndex = -1;
  if (currentPresetName) currentPresetName.textContent = customTitle;
  if (presetsActiveMode) presetsActiveMode.textContent = subTitle;
  updatePresetPillState();
}

// --- Mobile WebKit / iOS Audio Session & Hardware Silent Mode Fix ---
let silentAudioEl = null;

function getSilentAudio() {
  if (!silentAudioEl) {
    silentAudioEl = document.createElement("audio");
    silentAudioEl.setAttribute("loop", "true");
    silentAudioEl.setAttribute("playsinline", "true");
    silentAudioEl.setAttribute("webkit-playsinline", "true");
    // 44.1kHz mono silent WAV data URI (forces iOS AVAudioSessionCategoryPlayback so audio plays even in Silent Mode)
    silentAudioEl.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    silentAudioEl.style.display = "none";
    document.body.appendChild(silentAudioEl);
  }
  return silentAudioEl;
}

function enableAudioSessionPlayback() {
  // audioSession and the silent media element are WebKit workarounds only.
  // Starting a second media element in Chromium can compete with the actual
  // AudioContext for autoplay/audio-focus and is unnecessary there.
  if (isChromiumBrowser) return;
  try {
    if (typeof navigator !== "undefined" && "audioSession" in navigator) {
      navigator.audioSession.type = "playback";
    }
  } catch (_) {}

  try {
    const el = getSilentAudio();
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (_) {}
}

function disableAudioSessionPlayback() {
  try {
    if (silentAudioEl) {
      silentAudioEl.pause();
    }
  } catch (_) {}
}

// --- Mobile WebKit Audio Unlock Engine (One-Time User Gesture) ---
let audioUnlocked = false;

function unlockAudioContext() {
  if (isChromiumBrowser) return;
  if (audioUnlocked) return;

  enableAudioSessionPlayback();

  if (!audio) {
    initAudioSystem();
  }

  if (audio && audio.context) {
    if (audio.context.state !== "running") {
      audio.context.resume().catch(() => {});
    }

    // Prime WebKit audio thread with an instantaneous dummy buffer
    try {
      const dummy = audio.context.createBuffer(1, 1, audio.context.sampleRate || 44100);
      const dummySource = audio.context.createBufferSource();
      dummySource.buffer = dummy;
      dummySource.connect(audio.context.destination);
      dummySource.start(0);
    } catch (_) {}

    audio.context.resume().then(() => {
      if (audio.context.state === "running") {
        audioUnlocked = true;
        removeUnlockListeners();
      }
    }).catch(() => {});
  }
}

function removeUnlockListeners() {
  const events = ["touchstart", "touchend", "click"];
  events.forEach(evt => {
    document.removeEventListener(evt, unlockAudioContext, true);
  });
}

function setupUnlockListeners() {
  if (isChromiumBrowser) return;
  const events = ["touchstart", "touchend", "click"];
  events.forEach(evt => {
    document.addEventListener(evt, unlockAudioContext, { capture: true, passive: true });
  });
}

// --- High-Fidelity Audio Synthesis Engine ---
const noiseBufferCache = {};

function getNoiseBuffer(context, type) {
  if (!noiseBufferCache[type]) {
    noiseBufferCache[type] = createNoiseBuffer(context, type);
  }
  return noiseBufferCache[type];
}

function createNoiseBuffer(context, type) {
  const sampleRate = context.sampleRate || 44100;
  const bufferSize = Math.floor(sampleRate * 4);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
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
  if (audio) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let context;
  try {
    // `interactive` keeps control changes responsive without forcing a tiny
    // buffer size.  The actual noise source is continuous, so low output
    // latency is not worth the extra CPU/jitter on Chromium laptops.
    context = new AudioContextClass({ latencyHint: "interactive" });
  } catch (err) {
    // A few older WebKit builds reject the options object. Keep the fallback
    // so the same engine still starts there without weakening Chromium's path.
    try {
      context = new AudioContextClass();
    } catch (fallbackError) {
      console.warn("Failed to create AudioContext:", fallbackError || err);
      return;
    }
  }

  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context, currentNoiseType);
  source.loop = true;

  // Source Gain Node (enables click-free crossfades between noise types)
  const sourceGain = context.createGain();
  sourceGain.gain.setValueAtTime(1, context.currentTime);

  // Master Gain Node
  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0, context.currentTime);

  // Equalizer Biquad Filters Chain (10 Bands)
  const filters = createFilterChain(context, eqValues);

  // Simple audio graph: source -> filters -> master -> destination
  source.connect(sourceGain);
  sourceGain.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }
  filters[filters.length - 1].connect(masterGain);
  masterGain.connect(context.destination);

  source.start(0);

  // Mobile WebKit interruption / state recovery
  context.onstatechange = () => {
    if (isPlaying && context.state !== "running" && document.visibilityState === "visible") {
      context.resume().catch(() => {});
    }
  };

  audio = { context, source, sourceGain, filters, masterGain };
}

function createFilterChain(context, values) {
  return BANDS.map((band, i) => {
    const filter = context.createBiquadFilter();
    filter.type = "peaking";
    // Chromium rejects/behaves poorly when a filter is asked to run above
    // Nyquist on devices with a lower output sample rate.
    filter.frequency.value = Math.min(band.freq, context.sampleRate * 0.45);
    filter.Q.value = 0.95;
    filter.gain.value = Math.max(-12, Math.min(12, values[i] || 0));
    return filter;
  });
}

function rebuildAudioFilters() {
  // Kept as a compatibility shim for existing callers.  Disconnecting and
  // recreating BiquadFilterNodes during playback caused audible gaps in
  // Chromium.  Update the existing nodes instead.
  if (!audio) return;
  rampAudioFilters(eqValues, 0.06);
  audioNeedsSync = false;
}

// Silky smooth audio filter ramp for preset fades
function rampAudioFilters(targetValues, duration = 0.45) {
  if (!audio) return;
  const ctx = audio.context;
  const now = ctx.currentTime;
  targetValues.forEach((val, i) => {
    try {
      const filterGain = audio.filters[i].gain;
      filterGain.cancelScheduledValues(now);
      filterGain.setValueAtTime(filterGain.value, now);
      filterGain.linearRampToValueAtTime(val, now + duration);
    } catch (_) {
      try {
        audio.filters[i].gain.value = val;
      } catch (__) {}
    }
  });
}

let pendingRetiringSources = [];

// Smooth noise generator crossfade between types
function setNoiseType(type, fadeDuration = 0.45) {
  if (type === currentNoiseType) return;
  currentNoiseType = type;

  if (!audio) return;

  const ctx = audio.context;
  const now = ctx.currentTime;

  if (isPlaying) {
    // Crossfade old noise stream out and new noise stream in
    const newBuffer = getNoiseBuffer(ctx, type);
    const newSource = ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;

    const newSourceGain = ctx.createGain();
    newSourceGain.gain.setValueAtTime(0.0001, now);
    newSourceGain.gain.linearRampToValueAtTime(1, now + fadeDuration);

    newSource.connect(newSourceGain);
    newSourceGain.connect(audio.filters[0]);
    newSource.start(0);

    const oldSource = audio.source;
    const oldGain = audio.sourceGain;

    if (oldGain) {
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }

    const retireItem = { source: oldSource, gain: oldGain };
    pendingRetiringSources.push(retireItem);

    setTimeout(() => {
      try {
        retireItem.source.stop(0);
        retireItem.source.disconnect();
        if (retireItem.gain) retireItem.gain.disconnect();
      } catch (_) {}
      pendingRetiringSources = pendingRetiringSources.filter(item => item !== retireItem);
    }, (fadeDuration + 0.05) * 1000);

    audio.source = newSource;
    audio.sourceGain = newSourceGain;
  } else {
    // Audio is paused: clean up any pending retiring sources
    pendingRetiringSources.forEach(item => {
      try {
        item.source.stop(0);
        item.source.disconnect();
        if (item.gain) item.gain.disconnect();
      } catch (_) {}
    });
    pendingRetiringSources = [];

    try {
      if (audio.source) {
        audio.source.stop(0);
        audio.source.disconnect();
      }
      if (audio.sourceGain) {
        audio.sourceGain.disconnect();
      }
    } catch (_) {}

    const newBuffer = getNoiseBuffer(ctx, type);
    const newSource = ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;

    const newSourceGain = ctx.createGain();
    newSourceGain.gain.value = 1;

    newSource.connect(newSourceGain);
    newSourceGain.connect(audio.filters[0]);
    newSource.start(0);

    audio.source = newSource;
    audio.sourceGain = newSourceGain;
  }
}

let pauseTimeoutId = null;

async function startPlayback() {
  if (pauseTimeoutId) {
    clearTimeout(pauseTimeoutId);
    pauseTimeoutId = null;
  }

  // Ensure iOS media session category is playback (unmuted by silent switch)
  enableAudioSessionPlayback();

  if (!audio) {
    initAudioSystem();
  }

  // Mobile WebKit may have state 'suspended' or 'interrupted'
  if (audio && audio.context && audio.context.state !== "running") {
    try {
      await audio.context.resume();
    } catch (_) {}
  }

  if (!audio) return;

  // Apply any edits made before the first gesture.  During playback all later
  // changes use AudioParam ramps and never rebuild the graph.
  if (audioNeedsSync) {
    rampAudioFilters(eqValues, 0.06);
    audioNeedsSync = false;
  }

  const now = audio.context.currentTime;
  const targetGain = isMuted ? 0 : masterVolume * PAGE_LOUDNESS_SCALE;

  audio.masterGain.gain.cancelScheduledValues(now);
  audio.masterGain.gain.setValueAtTime(audio.masterGain.gain.value, now);
  audio.masterGain.gain.setTargetAtTime(targetGain, now, 0.05);

  isPlaying = true;
  updatePlayButtonUI(true);
}

function pausePlayback() {
  if (!audio) return;

  if (pauseTimeoutId) {
    clearTimeout(pauseTimeoutId);
    pauseTimeoutId = null;
  }

  const now = audio.context.currentTime;
  audio.masterGain.gain.cancelScheduledValues(now);
  audio.masterGain.gain.setValueAtTime(audio.masterGain.gain.value, now);
  audio.masterGain.gain.setTargetAtTime(0, now, 0.04);

  disableAudioSessionPlayback();

  pauseTimeoutId = setTimeout(() => {
    if (!isPlaying && audio && audio.context && audio.context.state === "running") {
      audio.context.suspend().catch(() => {});
    }
    pauseTimeoutId = null;
  }, 220);

  isPlaying = false;
  updatePlayButtonUI(false);
}

// --- Mobile WebKit / Background State Lifecycle Recovery ---
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isPlaying && audio && audio.context) {
    if (audio.context.state !== "running") {
      audio.context.resume().catch(() => {});
    }
    enableAudioSessionPlayback();
  }
});

window.addEventListener("pageshow", () => {
  if (isPlaying && audio && audio.context) {
    if (audio.context.state !== "running") {
      audio.context.resume().catch(() => {});
    }
    enableAudioSessionPlayback();
  }
});

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

function disableChromiumAudioUI() {
  // Retained for backwards compatibility with older integrations. Chromium
  // playback is supported and must remain enabled.
  if (!mainFocusBtn) return;
  mainFocusBtn.disabled = false;
  mainFocusBtn.classList.remove("audio-disabled");
  mainFocusBtn.removeAttribute("aria-disabled");
  mainFocusBtn.removeAttribute("title");
}

// --- Usable Pointer Dragging for Frequency Handles ---
function updateFromPointer(clientY, rect = dragRect) {
  if (draggingIndex === null) return;
  if (!rect) return;

  const relY = clientY - rect.top;
  const centerY = rect.height / 2;
  const maxAmp = (rect.height / 2) * (148 / 180);

  let norm = (centerY - relY) / maxAmp;
  norm = Math.max(-1, Math.min(1, norm));

  const db = Math.round(norm * 12 * 2) / 2;
  const hasChanged = eqValues[draggingIndex] !== db;
  eqValues[draggingIndex] = db;

  if (hasChanged) {
    renderCurve();
    // Keep pointer handling purely visual. Audio is synchronized once on
    // pointer release so Chromium's audio thread is never hit by drag events.
    updatePresetTitle("Custom Curve", "hand shaped");
  }

  const band = BANDS[draggingIndex];
  tooltipBand.textContent = band.label;
  tooltipVal.textContent = `${db > 0 ? "+" : ""}${db.toFixed(1)} dB`;

  const nodeEl = eqNodesLayer.children[draggingIndex];
  if (nodeEl) {
    // Use the already-known curve coordinates instead of offsetLeft/offsetTop,
    // which forces Chromium to synchronously flush layout after renderCurve().
    const nodeLeft = (55 + (draggingIndex / (BANDS.length - 1)) * 890) / 1000 * rect.width;
    const nodeTop = (centerY - (db / 12) * maxAmp);
    dragTooltip.style.left = `${nodeLeft}px`;
    dragTooltip.style.top = `${nodeTop - 16}px`;
    dragTooltip.classList.add("visible");
  }
}

function scheduleDragUpdate(clientY) {
  pendingDragY = clientY;
  if (dragFrameId !== null) return;

  dragFrameId = requestAnimationFrame(() => {
    dragFrameId = null;
    if (pendingDragY !== null && draggingIndex !== null) {
      updateFromPointer(pendingDragY);
    }
    pendingDragY = null;
  });
}

function setupPointerInteraction() {
  eqPlotWrap.addEventListener("pointerdown", e => {
    cancelCurveAnimation();
    const handleEl = e.target.closest(".eq-handle");
    const rect = eqPlotWrap.getBoundingClientRect();
    dragRect = rect;

    if (handleEl) {
      draggingIndex = Number(handleEl.dataset.index);
    } else {
      const normX = (e.clientX - rect.left) / rect.width;
      let minDistance = Infinity;
      let bestIndex = 0;

      for (let i = 0; i < BANDS.length; i++) {
        const bandNormX = (55 + (i / (BANDS.length - 1)) * (1000 - 110)) / 1000;
        const dist = Math.abs(normX - bandNormX);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }
      draggingIndex = bestIndex;
    }

    try {
      eqPlotWrap.setPointerCapture(e.pointerId);
    } catch (_) {}
    const activeHandle = eqNodesLayer.children[draggingIndex];
    if (activeHandle) activeHandle.classList.add("is-dragging");

    scheduleDragUpdate(e.clientY);
  });

  eqPlotWrap.addEventListener("pointermove", e => {
    if (draggingIndex !== null) {
      scheduleDragUpdate(e.clientY);
    }
  });

  const stopDragging = e => {
    if (dragFrameId !== null) {
      cancelAnimationFrame(dragFrameId);
      dragFrameId = null;
    }
    pendingDragY = null;
    if (e && e.pointerId && eqPlotWrap.hasPointerCapture && eqPlotWrap.hasPointerCapture(e.pointerId)) {
      try {
        eqPlotWrap.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    if (draggingIndex !== null) {
      const activeHandle = eqNodesLayer.children[draggingIndex];
      if (activeHandle) activeHandle.classList.remove("is-dragging");
      draggingIndex = null;
      dragRect = null;
      dragTooltip.classList.remove("visible");
      if (audio && isPlaying) {
        rampAudioFilters(eqValues, 0.12);
      } else {
        audioNeedsSync = true;
      }
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
      const targetValues = [...eqValues];
      targetValues[idx] = 0;
      updatePresetTitle("Custom Curve", "hand shaped");
      animateCurveTransition(targetValues, 220);
      if (audio && isPlaying) {
        rampAudioFilters(targetValues, 0.22);
      } else {
        audioNeedsSync = true;
      }
    }
  });
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
    const now = audio.context.currentTime;
    audio.masterGain.gain.cancelScheduledValues(now);
    audio.masterGain.gain.setTargetAtTime(masterVolume * PAGE_LOUDNESS_SCALE, now, 0.03);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  muteToggleBtn.classList.toggle("muted", isMuted);

  if (audio && isPlaying) {
    const now = audio.context.currentTime;
    const targetGain = isMuted ? 0 : masterVolume * PAGE_LOUDNESS_SCALE;
    audio.masterGain.gain.cancelScheduledValues(now);
    audio.masterGain.gain.setTargetAtTime(targetGain, now, 0.03);
  }
}

// --- Ambient Stillness Focus Quotes ---
// free of decorative quotation marks so the blockquote owns the presentation.
const FOCUS_QUOTES = [
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Education is not preparation for life; education is life itself.", author: "John Dewey" },
  { text: "Education is an admirable thing, but it is well to remember that nothing worth knowing can be taught.", author: "Oscar Wilde" },
  { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" }
];
let currentQuoteIndex = 0;

function cycleFocusQuote() {
  const quoteTextEl = document.getElementById("idleQuoteText");
  const quoteAuthorEl = document.getElementById("idleQuoteAuthor");
  if (!quoteTextEl || !quoteAuthorEl) return;

  const quote = FOCUS_QUOTES[currentQuoteIndex % FOCUS_QUOTES.length];
  currentQuoteIndex++;
  quoteTextEl.textContent = quote.text;
  quoteAuthorEl.textContent = `— ${quote.author.toUpperCase()}`;
}

// --- Fullscreen Engine ---
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function updateFullscreenUI() {
  const isFs = !!document.fullscreenElement;
  document.body.classList.toggle("is-fullscreen", isFs);
  const btn = document.getElementById("fullscreenToggleBtn");
  if (btn) {
    btn.setAttribute("title", isFs ? "Exit Fullscreen (F)" : "Toggle Fullscreen (F)");
    btn.setAttribute("aria-label", isFs ? "Exit Fullscreen (F)" : "Toggle Fullscreen (F)");
  }
}

// --- Light / Dark Theme Engine ---
function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  localStorage.setItem("sonus_theme", theme);

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", isLight ? "#f5f5f7" : "#050507");
  }

  // Update SVG curve fill gradient stop colors
  const gradStop0 = document.getElementById("gradStop0");
  const gradStop1 = document.getElementById("gradStop1");
  const gradStop2 = document.getElementById("gradStop2");
  if (gradStop0 && gradStop1 && gradStop2) {
    const col = isLight ? "#000000" : "#ffffff";
    gradStop0.setAttribute("stop-color", col);
    gradStop1.setAttribute("stop-color", col);
    gradStop2.setAttribute("stop-color", col);
  }

  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.setAttribute("title", isLight ? "Switch to Dark Mode (T)" : "Switch to Light Mode (T)");
    btn.setAttribute("aria-label", isLight ? "Switch to Dark Mode (T)" : "Switch to Light Mode (T)");
  }
}

function toggleTheme() {
  const current = document.body.classList.contains("light-theme") ? "light" : "dark";
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
}

function initTheme() {
  const saved = localStorage.getItem("sonus_theme");
  if (saved === "light") {
    applyTheme("light");
  } else {
    applyTheme("dark");
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
    } else if (e.code === "KeyF") {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.code === "KeyT") {
      e.preventDefault();
      toggleTheme();
    } else if (e.key >= "1" && e.key <= "6") {
      const idx = parseInt(e.key, 10) - 1;
      if (PRESETS[idx]) {
        applyPreset(idx);
      }
    }
  });
}

function resetCurveFlat() {
  const flatValues = Array(BANDS.length).fill(0);
  activePresetIndex = -1;
  updatePresetPillState();

  if (currentPresetName) currentPresetName.textContent = "Flat Curve";
  if (presetsActiveMode) presetsActiveMode.textContent = "all zero dB";

  setNoiseType("white", 0.45);
  audioNeedsSync = true;
  animateCurveTransition(flatValues, 260);
  if (audio && isPlaying) {
    rampAudioFilters(flatValues, 0.26);
    audioNeedsSync = false;
  }
}

// --- Ambient Stillness / Idle Mode Engine ---
let idleTimer = null;
let lastIdleResetTime = 0;
const IDLE_DELAY_MS = 3500; // 3.5 seconds of stillness

function resetIdleTimer() {
  if (draggingIndex !== null) return;

  if (document.body.classList.contains("is-idle")) {
    document.body.classList.remove("is-idle");
  }

  const now = performance.now();
  if (now - lastIdleResetTime < 300) return;
  lastIdleResetTime = now;

  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  // Only trigger stillness fade if user is not dragging an EQ handle and near top
  idleTimer = setTimeout(() => {
    if (draggingIndex === null && window.scrollY <= 140) {
      cycleFocusQuote();
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
  // Resize only changes the handle percentages; batch the work to one frame.
  window.addEventListener("resize", () => {
    if (curveRenderFrame !== null) return;
    curveRenderFrame = requestAnimationFrame(() => {
      curveRenderFrame = null;
      renderCurve();
    });
  }, { passive: true });

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }

  const fullscreenToggleBtn = document.getElementById("fullscreenToggleBtn");
  if (fullscreenToggleBtn) {
    fullscreenToggleBtn.addEventListener("click", toggleFullscreen);
  }

  document.addEventListener("fullscreenchange", updateFullscreenUI);
  document.addEventListener("webkitfullscreenchange", updateFullscreenUI);
}

// --- App Bootstrap ---
function boot() {
  initTheme();
  cycleFocusQuote();
  initNodesAndAxis();
  renderPresetsGrid();
  renderCurve();
  setupPointerInteraction();
  setupKeyboardShortcuts();
  initEvents();
  disableChromiumAudioUI();
  initIdleDetector();
  setupUnlockListeners();
  tick();
  setInterval(tick, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

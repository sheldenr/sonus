/**
 * Minimalist Noise Generator - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Instantiate Engine & Visualizer
  const engine = new window.NoiseEngine();
  const canvas = document.getElementById('vizCanvas');
  const visualizer = new window.AudioVisualizer(canvas, engine);

  // UI Elements
  const playBtn = document.getElementById('playBtn');
  const playBtnText = document.getElementById('playBtnText');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const currentPresetName = document.getElementById('currentPresetName');
  
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeValue = document.getElementById('volumeValue');
  const muteBtn = document.getElementById('muteBtn');
  const volIcon = document.getElementById('volIcon');
  const muteIcon = document.getElementById('muteIcon');

  const presetsGrid = document.getElementById('presetsGrid');
  const eqGrid = document.getElementById('eqGrid');
  const eqProfileTag = document.getElementById('eqProfileTag');
  const eqActiveBandsCount = document.getElementById('eqActiveBandsCount');
  const surpriseDesc = document.getElementById('surpriseDesc');

  const vizModeBars = document.getElementById('vizModeBars');
  const vizModeWave = document.getElementById('vizModeWave');
  const vizModeCurve = document.getElementById('vizModeCurve');

  const timerSelect = document.getElementById('timerSelect');
  const timerCountdown = document.getElementById('timerCountdown');

  // EQ Quick Action Buttons
  const eqFlattenBtn = document.getElementById('eqFlattenBtn');
  const eqWarmBtn = document.getElementById('eqWarmBtn');
  const eqVoiceBtn = document.getElementById('eqVoiceBtn');
  const eqAirBtn = document.getElementById('eqAirBtn');
  const eqRandBtn = document.getElementById('eqRandBtn');

  // Application State
  let previousVolume = 70;
  let timerInterval = null;
  let timerSecondsRemaining = 0;

  // Band Frequency Labels
  const eqFrequencies = [
    { hz: 31, label: '31Hz' },
    { hz: 62, label: '62Hz' },
    { hz: 125, label: '125Hz' },
    { hz: 250, label: '250Hz' },
    { hz: 500, label: '500Hz' },
    { hz: 1000, label: '1kHz' },
    { hz: 2000, label: '2kHz' },
    { hz: 4000, label: '4kHz' },
    { hz: 8000, label: '8kHz' },
    { hz: 16000, label: '16kHz' }
  ];

  const sliderElements = [];
  const dbLabelElements = [];
  const channelContainers = [];

  // =========================================================================
  // 1. Build 10-Band Equalizer UI
  // =========================================================================
  function buildEqualizerUI() {
    eqGrid.innerHTML = '';

    eqFrequencies.forEach((freq, index) => {
      const channel = document.createElement('div');
      channel.className = 'eq-channel';
      channel.id = `eqChannel-${index}`;

      // dB Value Display
      const dbValue = document.createElement('div');
      dbValue.className = 'eq-db-value';
      dbValue.textContent = '0dB';
      dbLabelElements.push(dbValue);

      // Track Wrapper
      const trackWrap = document.createElement('div');
      trackWrap.className = 'eq-slider-track-wrap';

      // Slider Input
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'eq-slider';
      slider.min = '-24';
      slider.max = '24';
      slider.step = '1';
      slider.value = '0';
      slider.dataset.index = index;
      slider.setAttribute('aria-label', `EQ ${freq.label} level`);

      // Slider event
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        updateBandUI(index, val);
        engine.setEqBand(index, val);
        checkEqStatus();
      });

      // Double-click to reset band to 0dB
      slider.addEventListener('dblclick', () => {
        slider.value = '0';
        updateBandUI(index, 0);
        engine.setEqBand(index, 0);
        checkEqStatus();
      });

      trackWrap.appendChild(slider);
      sliderElements.push(slider);

      // Frequency Label
      const freqLabel = document.createElement('div');
      freqLabel.className = 'eq-freq-label';
      freqLabel.textContent = freq.label;

      // Quick boost button (+6dB)
      const boostPill = document.createElement('div');
      boostPill.className = 'eq-boost-pill';
      boostPill.textContent = '+6dB';
      boostPill.title = `Boost ${freq.label} by +6dB`;
      boostPill.addEventListener('click', () => {
        const current = parseFloat(slider.value);
        const newVal = Math.min(24, current + 6);
        slider.value = newVal;
        updateBandUI(index, newVal);
        engine.setEqBand(index, newVal);
        checkEqStatus();
      });

      channel.appendChild(dbValue);
      channel.appendChild(trackWrap);
      channel.appendChild(freqLabel);
      channel.appendChild(boostPill);

      channelContainers.push(channel);
      eqGrid.appendChild(channel);
    });
  }

  function updateBandUI(index, val) {
    const formatted = val > 0 ? `+${val}dB` : `${val}dB`;
    dbLabelElements[index].textContent = formatted;

    if (val > 0) {
      channelContainers[index].classList.add('boosted');
    } else {
      channelContainers[index].classList.remove('boosted');
    }
  }

  function setAllBands(values, profileName = 'CUSTOM') {
    values.forEach((val, idx) => {
      sliderElements[idx].value = val;
      updateBandUI(idx, val);
      engine.setEqBand(idx, val);
    });
    checkEqStatus(profileName);
  }

  function checkEqStatus(profileOverride = null) {
    let boostedCount = 0;
    let nonZeroCount = 0;

    sliderElements.forEach((s) => {
      const v = parseFloat(s.value);
      if (v > 0) boostedCount++;
      if (v !== 0) nonZeroCount++;
    });

    if (profileOverride) {
      eqProfileTag.textContent = `PROFILE: ${profileOverride}`;
    } else if (nonZeroCount === 0) {
      eqProfileTag.textContent = 'PROFILE: FLAT';
    } else {
      eqProfileTag.textContent = 'PROFILE: CUSTOM';
    }

    eqActiveBandsCount.textContent = `${boostedCount} ${boostedCount === 1 ? 'BAND' : 'BANDS'} BOOSTED`;
  }

  // =========================================================================
  // 2. Preset Switching
  // =========================================================================
  const presetButtons = presetsGrid.querySelectorAll('.preset-btn');

  function setActivePreset(presetName) {
    presetButtons.forEach(btn => {
      if (btn.dataset.preset === presetName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    currentPresetName.textContent = presetName;

    // Trigger audio switch
    if (engine.isPlaying) {
      engine.play(presetName);
    } else {
      engine.currentPreset = presetName;
    }

    if (presetName === '℗ Surprise!') {
      setTimeout(() => {
        if (engine.surpriseProfile) {
          surpriseDesc.textContent = `${engine.surpriseProfile.base.toUpperCase()} • ${engine.surpriseProfile.f1}Hz / ${engine.surpriseProfile.f2}Hz`;
        }
      }, 100);
    }
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset;
      setActivePreset(presetName);

      // If audio is currently stopped, clicking a preset starts playing immediately
      if (!engine.isPlaying) {
        startPlayback();
      }
    });
  });

  // =========================================================================
  // 3. Playback Controls & Status
  // =========================================================================
  function startPlayback() {
    engine.play(engine.currentPreset);
    visualizer.start();

    playBtn.classList.add('playing');
    playBtnText.textContent = 'STOP';
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';

    statusDot.classList.add('active');
    statusText.textContent = 'GENERATING';

    if (engine.currentPreset === '℗ Surprise!' && engine.surpriseProfile) {
      surpriseDesc.textContent = `${engine.surpriseProfile.base.toUpperCase()} • ${engine.surpriseProfile.f1}Hz / ${engine.surpriseProfile.f2}Hz`;
    }
  }

  function stopPlayback() {
    engine.pause();
    setTimeout(() => visualizer.stop(), 200);

    playBtn.classList.remove('playing');
    playBtnText.textContent = 'PLAY';
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';

    statusDot.classList.remove('active');
    statusText.textContent = 'STOPPED';
  }

  function togglePlayback() {
    if (engine.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  playBtn.addEventListener('click', togglePlayback);

  // =========================================================================
  // 4. Volume & Mute Controls
  // =========================================================================
  function updateVolume(val) {
    const norm = val / 100;
    engine.setVolume(norm);
    volumeSlider.value = val;
    volumeValue.textContent = `${Math.round(val)}%`;

    if (val === 0) {
      volIcon.style.display = 'none';
      muteIcon.style.display = 'block';
    } else {
      volIcon.style.display = 'block';
      muteIcon.style.display = 'none';
    }
  }

  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val > 0) previousVolume = val;
    updateVolume(val);
  });

  muteBtn.addEventListener('click', () => {
    const current = parseFloat(volumeSlider.value);
    if (current > 0) {
      previousVolume = current;
      updateVolume(0);
    } else {
      updateVolume(previousVolume || 70);
    }
  });

  // =========================================================================
  // 5. Visualizer View Modes
  // =========================================================================
  function setVizActiveButton(activeBtn) {
    [vizModeBars, vizModeWave, vizModeCurve].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (vizModeBars) {
    vizModeBars.addEventListener('click', () => {
      visualizer.setMode('bars');
      setVizActiveButton(vizModeBars);
    });
  }

  if (vizModeWave) {
    vizModeWave.addEventListener('click', () => {
      visualizer.setMode('wave');
      setVizActiveButton(vizModeWave);
    });
  }

  if (vizModeCurve) {
    vizModeCurve.addEventListener('click', () => {
      visualizer.setMode('curve');
      setVizActiveButton(vizModeCurve);
    });
  }

  // =========================================================================
  // 6. Sleep Timer Logic
  // =========================================================================
  timerSelect.addEventListener('change', () => {
    const minutes = parseInt(timerSelect.value, 10);
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (minutes > 0) {
      timerSecondsRemaining = minutes * 60;
      updateTimerDisplay();
      timerCountdown.style.display = 'inline-block';

      timerInterval = setInterval(() => {
        timerSecondsRemaining--;
        if (timerSecondsRemaining <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          timerCountdown.style.display = 'none';
          timerSelect.value = '0';
          stopPlayback();
        } else {
          updateTimerDisplay();
        }
      }, 1000);
    } else {
      timerCountdown.style.display = 'none';
    }
  });

  function updateTimerDisplay() {
    const m = Math.floor(timerSecondsRemaining / 60);
    const s = timerSecondsRemaining % 60;
    timerCountdown.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // =========================================================================
  // 7. Equalizer Quick Action Buttons
  // =========================================================================
  eqFlattenBtn.addEventListener('click', () => {
    setAllBands([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'FLAT');
  });

  eqWarmBtn.addEventListener('click', () => {
    setAllBands([8, 6, 4, 2, 0, -1, -2, -3, -4, -6], 'WARM BASS');
  });

  eqVoiceBtn.addEventListener('click', () => {
    setAllBands([-4, -2, 1, 4, 7, 6, 5, 2, -1, -3], 'VOICE FOCUS');
  });

  eqAirBtn.addEventListener('click', () => {
    setAllBands([-5, -4, -3, -2, 0, 1, 3, 6, 9, 10], 'AIR LIFT');
  });

  eqRandBtn.addEventListener('click', () => {
    // Generate smooth randomized curve
    const randBands = [];
    let prev = (Math.random() * 16) - 8;
    for (let i = 0; i < 10; i++) {
      const step = (Math.random() * 8) - 4;
      prev = Math.max(-18, Math.min(18, Math.round(prev + step)));
      randBands.push(prev);
    }
    setAllBands(randBands, 'RANDOMIZED');
  });

  // =========================================================================
  // 8. Global Keyboard Shortcuts
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes if an input or select is focused
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.code === 'Space') return; // allow slider adjustment
    }

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayback();
    } else if (e.key === 'm' || e.key === 'M') {
      muteBtn.click();
    } else if (e.key === 'r' || e.key === 'R') {
      eqFlattenBtn.click();
    } else if (e.key === 's' || e.key === 'S') {
      setActivePreset('℗ Surprise!');
      if (!engine.isPlaying) startPlayback();
    }
  });

  // Initialize UI
  buildEqualizerUI();
  visualizer.clear();
  checkEqStatus();
});

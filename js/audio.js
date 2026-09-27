/**
 * Minimalist Noise Generator - Audio Engine
 * High-performance Web Audio API synthesis with zero external dependencies.
 */

class NoiseEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.analyser = null;
    this.currentSource = null;
    this.currentPreset = 'Brown';
    this.masterVolume = 0.7;

    // Buffers cache
    this.buffers = {
      white: null,
      pink: null,
      brown: null
    };

    // 10-Band EQ Frequencies in Hz
    this.eqFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    this.eqFilters = [];
    this.eqGains = new Array(10).fill(0); // dB values (-24 to +24)

    // Preset filter stage nodes
    this.presetNodes = [];
    this.modulationNodes = []; // LFOs, modulators
    
    // Dynamic surprise parameters
    this.surpriseProfile = null;
  }

  /**
   * Initialize AudioContext on first user interaction
   */
  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create Master Gain with safe headroom
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // Create Analyser for Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;

    // Safety limiter / compressor to prevent clipping on high EQ boosts
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(3.0, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(14.0, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.12, this.ctx.currentTime);

    // Build the 10-band EQ chain
    this.buildEqChain();

    // Pre-generate noise buffers
    this.generateNoiseBuffers();

    // Connect EQ output -> Master Gain -> Analyser -> Limiter -> Destination
    const lastEq = this.eqFilters[this.eqFilters.length - 1];
    lastEq.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);
  }

  /**
   * Pre-generate seamless 6-second stereo buffers for White, Pink, and Brown noise.
   */
  generateNoiseBuffers() {
    const sampleRate = this.ctx.sampleRate;
    const duration = 6.0; // 6 seconds buffer
    const frameCount = Math.floor(sampleRate * duration);
    const crossfadeFrames = Math.floor(sampleRate * 0.15); // 150ms crossfade at loop boundary

    // 1. WHITE NOISE BUFFER (Stereo)
    const whiteBuf = this.ctx.createBuffer(2, frameCount, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = whiteBuf.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.55;
      }
      this.applySeamlessCrossfade(data, crossfadeFrames);
    }
    this.buffers.white = whiteBuf;

    // 2. PINK NOISE BUFFER (Paul Kellet's filtered white noise algorithm)
    const pinkBuf = this.ctx.createBuffer(2, frameCount, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = pinkBuf.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      this.applySeamlessCrossfade(data, crossfadeFrames);
    }
    this.buffers.pink = pinkBuf;

    // 3. BROWN NOISE BUFFER (Leaky Integrator / Brownian Motion)
    const brownBuf = this.ctx.createBuffer(2, frameCount, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = brownBuf.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5; // Gain staging for brown noise
      }
      this.applySeamlessCrossfade(data, crossfadeFrames);
    }
    this.buffers.brown = brownBuf;
  }

  /**
   * Crossfade loop boundary to guarantee zero pop or click when looping
   */
  applySeamlessCrossfade(data, crossfadeFrames) {
    const len = data.length;
    for (let i = 0; i < crossfadeFrames; i++) {
      const alpha = i / crossfadeFrames;
      // Linear or equal-power crossfade
      const sampleFromEnd = data[len - crossfadeFrames + i];
      const sampleFromStart = data[i];
      data[i] = (sampleFromStart * alpha) + (sampleFromEnd * (1 - alpha));
    }
  }

  /**
   * Build 10 cascading Biquad peaking filters for the EQ
   */
  buildEqChain() {
    this.eqFilters = [];
    for (let i = 0; i < this.eqFrequencies.length; i++) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = this.eqFrequencies[i];
      filter.Q.value = 1.35; // Ideal Q for 1-octave graphic equalizer band
      filter.gain.value = this.eqGains[i];

      if (i > 0) {
        this.eqFilters[i - 1].connect(filter);
      }
      this.eqFilters.push(filter);
    }
  }

  /**
   * Set gain for a specific EQ band (0 to 9) in dB
   */
  setEqBand(bandIndex, dbValue) {
    if (bandIndex < 0 || bandIndex >= this.eqFilters.length) return;
    this.eqGains[bandIndex] = dbValue;
    if (this.ctx && this.eqFilters[bandIndex]) {
      const now = this.ctx.currentTime;
      this.eqFilters[bandIndex].gain.setTargetAtTime(dbValue, now, 0.02);
    }
  }

  /**
   * Reset all EQ bands to 0 dB
   */
  resetEq() {
    for (let i = 0; i < this.eqFilters.length; i++) {
      this.setEqBand(i, 0);
    }
  }

  /**
   * Build the preset filter stage based on selected preset
   */
  setupPresetStage(presetName) {
    // Tear down any previous preset nodes and modulation LFOs
    this.cleanupPresetNodes();

    let baseNoiseType = 'white';
    const firstEq = this.eqFilters[0];
    const now = this.ctx.currentTime;

    switch (presetName) {
      case 'Brown': {
        baseNoiseType = 'brown';
        // Connect directly to EQ
        break;
      }

      case 'Pink': {
        baseNoiseType = 'pink';
        // Connect directly to EQ
        break;
      }

      case 'White': {
        baseNoiseType = 'white';
        // Connect directly to EQ
        break;
      }

      case 'Grey': {
        // Grey noise: Inverted A-weighting / ITU equal-loudness curve
        // Boost low frequencies, dip at 2.5-4kHz ear sensitivity peak, slight sparkle at >10kHz
        baseNoiseType = 'white';
        const lowShelf = this.ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 120;
        lowShelf.gain.value = 6.0;

        const midDip = this.ctx.createBiquadFilter();
        midDip.type = 'peaking';
        midDip.frequency.value = 3200;
        midDip.Q.value = 0.8;
        midDip.gain.value = -5.0;

        const highShelf = this.ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 9000;
        highShelf.gain.value = 3.0;

        lowShelf.connect(midDip);
        midDip.connect(highShelf);
        highShelf.connect(firstEq);

        this.presetNodes.push(lowShelf, midDip, highShelf);
        break;
      }

      case 'Infra': {
        // Sub-bass heavy rumble, deep subterranean seismic hum
        baseNoiseType = 'brown';
        const lowPass1 = this.ctx.createBiquadFilter();
        lowPass1.type = 'lowpass';
        lowPass1.frequency.value = 60;
        lowPass1.Q.value = 2.0;

        const lowPass2 = this.ctx.createBiquadFilter();
        lowPass2.type = 'lowpass';
        lowPass2.frequency.value = 80;
        lowPass2.Q.value = 1.0;

        const subBoost = this.ctx.createBiquadFilter();
        subBoost.type = 'peaking';
        subBoost.frequency.value = 38;
        subBoost.Q.value = 1.8;
        subBoost.gain.value = 10;

        lowPass1.connect(lowPass2);
        lowPass2.connect(subBoost);
        subBoost.connect(firstEq);

        this.presetNodes.push(lowPass1, lowPass2, subBoost);
        break;
      }

      case 'Ultra': {
        // High frequency shimmer, air, ultra-fine hiss
        baseNoiseType = 'white';
        const highPass = this.ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 7500;
        highPass.Q.value = 1.2;

        const highAir = this.ctx.createBiquadFilter();
        highAir.type = 'peaking';
        highAir.frequency.value = 12000;
        highAir.Q.value = 1.5;
        highAir.gain.value = 6.0;

        highPass.connect(highAir);
        highAir.connect(firstEq);

        this.presetNodes.push(highPass, highAir);
        break;
      }

      case 'Around 60Hz': {
        // Electrical hum / power grid 60Hz ambient drone + subtle 120Hz harmonic
        baseNoiseType = 'brown';
        const bandPass60 = this.ctx.createBiquadFilter();
        bandPass60.type = 'bandpass';
        bandPass60.frequency.value = 60;
        bandPass60.Q.value = 4.5;

        const peak120 = this.ctx.createBiquadFilter();
        peak120.type = 'peaking';
        peak120.frequency.value = 120;
        peak120.Q.value = 5.0;
        peak120.gain.value = 4.0;

        const makeup = this.ctx.createGain();
        makeup.gain.value = 4.5;

        bandPass60.connect(peak120);
        peak120.connect(makeup);
        makeup.connect(firstEq);

        this.presetNodes.push(bandPass60, peak120, makeup);
        break;
      }

      case '125Hz':
      case '250Hz':
      case '500Hz':
      case '1kHz':
      case '2kHz':
      case '4kHz':
      case '8kHz': {
        // Resonant frequency bands
        baseNoiseType = 'pink';
        const freqMap = {
          '125Hz': 125,
          '250Hz': 250,
          '500Hz': 500,
          '1kHz': 1000,
          '2kHz': 2000,
          '4kHz': 4000,
          '8kHz': 8000
        };
        const targetFreq = freqMap[presetName];

        const bandPass = this.ctx.createBiquadFilter();
        bandPass.type = 'bandpass';
        bandPass.frequency.value = targetFreq;
        bandPass.Q.value = 3.5;

        const makeup = this.ctx.createGain();
        makeup.gain.value = 3.8;

        bandPass.connect(makeup);
        makeup.connect(firstEq);

        this.presetNodes.push(bandPass, makeup);
        break;
      }

      case 'Speech Blocker': {
        // Specifically shaped to mask human vocal range (250Hz - 3.8kHz)
        // Eliminates speech intelligibility and background chatter without fatigue
        baseNoiseType = 'pink';
        const speechPass = this.ctx.createBiquadFilter();
        speechPass.type = 'peaking';
        speechPass.frequency.value = 800;
        speechPass.Q.value = 0.5;
        speechPass.gain.value = 8.0;

        const speechConsonants = this.ctx.createBiquadFilter();
        speechConsonants.type = 'peaking';
        speechConsonants.frequency.value = 2400;
        speechConsonants.Q.value = 1.0;
        speechConsonants.gain.value = 6.0;

        const lowCut = this.ctx.createBiquadFilter();
        lowCut.type = 'highpass';
        lowCut.frequency.value = 180;

        const highCut = this.ctx.createBiquadFilter();
        highCut.type = 'lowpass';
        highCut.frequency.value = 4500;

        speechPass.connect(speechConsonants);
        speechConsonants.connect(lowCut);
        lowCut.connect(highCut);
        highCut.connect(firstEq);

        this.presetNodes.push(speechPass, speechConsonants, lowCut, highCut);
        break;
      }

      case 'Ear Massage': {
        // Binaural / sweeping organic cranial wash:
        // Slow sweeping dual filters + gentle spatial movement
        baseNoiseType = 'pink';

        const filterL = this.ctx.createBiquadFilter();
        filterL.type = 'peaking';
        filterL.frequency.value = 450;
        filterL.Q.value = 2.5;
        filterL.gain.value = 9.0;

        const filterR = this.ctx.createBiquadFilter();
        filterR.type = 'peaking';
        filterR.frequency.value = 750;
        filterR.Q.value = 2.5;
        filterR.gain.value = 9.0;

        // Channel merger / splitter for true binaural massage
        const splitter = this.ctx.createChannelSplitter(2);
        const merger = this.ctx.createChannelMerger(2);

        splitter.connect(filterL, 0);
        splitter.connect(filterR, 1);
        filterL.connect(merger, 0, 0);
        filterR.connect(merger, 0, 1);
        merger.connect(firstEq);

        // LFO 1 for Left filter sweep (0.1 Hz)
        const lfoL = this.ctx.createOscillator();
        lfoL.frequency.value = 0.11; // ~9s cycle
        const lfoLGain = this.ctx.createGain();
        lfoLGain.gain.value = 350; // Sweep 450 +/- 350 (100Hz - 800Hz)
        lfoL.connect(lfoLGain);
        lfoLGain.connect(filterL.frequency);
        lfoL.start();

        // LFO 2 for Right filter sweep (0.08 Hz, out of phase)
        const lfoR = this.ctx.createOscillator();
        lfoR.frequency.value = 0.083; // ~12s cycle
        const lfoRGain = this.ctx.createGain();
        lfoRGain.gain.value = 450; // Sweep 750 +/- 450 (300Hz - 1200Hz)
        lfoR.connect(lfoRGain);
        lfoRGain.connect(filterR.frequency);
        lfoR.start();

        this.presetNodes.push(splitter, filterL, filterR, merger);
        this.modulationNodes.push(lfoL, lfoLGain, lfoR, lfoRGain);
        break;
      }

      case '℗ Surprise!': {
        // Procedural surprise: Dynamic harmonic resonance & morphing soundscape
        const baseTypes = ['brown', 'pink', 'white'];
        baseNoiseType = baseTypes[Math.floor(Math.random() * baseTypes.length)];

        const f1 = 80 + Math.floor(Math.random() * 600);
        const f2 = 800 + Math.floor(Math.random() * 3200);

        const res1 = this.ctx.createBiquadFilter();
        res1.type = 'peaking';
        res1.frequency.value = f1;
        res1.Q.value = 2.0 + Math.random() * 3.0;
        res1.gain.value = 7.0 + Math.random() * 5.0;

        const res2 = this.ctx.createBiquadFilter();
        res2.type = 'peaking';
        res2.frequency.value = f2;
        res2.Q.value = 1.8 + Math.random() * 2.5;
        res2.gain.value = 6.0 + Math.random() * 6.0;

        // Slow subtle breathing LFO
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.15 + Math.random() * 0.2;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = f1 * 0.4;
        lfo.connect(lfoGain);
        lfoGain.connect(res1.frequency);
        lfo.start();

        res1.connect(res2);
        res2.connect(firstEq);

        this.presetNodes.push(res1, res2);
        this.modulationNodes.push(lfo, lfoGain);

        this.surpriseProfile = {
          base: baseNoiseType,
          f1: Math.round(f1),
          f2: Math.round(f2)
        };
        break;
      }

      default:
        baseNoiseType = 'brown';
        break;
    }

    // Connect source to preset filter input (or first EQ if no preset filter)
    const presetInput = this.presetNodes.length > 0 ? this.presetNodes[0] : firstEq;
    return { baseNoiseType, presetInput };
  }

  /**
   * Stop and disconnect old preset nodes & modulators
   */
  cleanupPresetNodes() {
    for (const mod of this.modulationNodes) {
      try {
        if (mod.stop) mod.stop();
        mod.disconnect();
      } catch (e) {}
    }
    this.modulationNodes = [];

    for (const node of this.presetNodes) {
      try {
        node.disconnect();
      } catch (e) {}
    }
    this.presetNodes = [];
  }

  /**
   * Play noise with the specified preset (or resume current)
   */
  async play(presetName = this.currentPreset) {
    await this.init();

    this.currentPreset = presetName;

    // Stop current source if active
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {}
      this.currentSource = null;
    }

    const { baseNoiseType, presetInput } = this.setupPresetStage(presetName);

    // Create looping buffer source
    const buffer = this.buffers[baseNoiseType] || this.buffers.brown;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(presetInput);
    source.start(0);
    this.currentSource = source;

    // Smooth fade in master volume to avoid clicks
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + 0.15);

    this.isPlaying = true;
  }

  /**
   * Pause/Stop noise with smooth fade out
   */
  pause() {
    if (!this.isPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(0, now + 0.15);

    setTimeout(() => {
      if (this.currentSource) {
        try {
          this.currentSource.stop();
          this.currentSource.disconnect();
        } catch (e) {}
        this.currentSource = null;
      }
      this.cleanupPresetNodes();
      this.isPlaying = false;
    }, 160);
  }

  /**
   * Toggle between play and pause
   */
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play(this.currentPreset);
    }
    return this.isPlaying;
  }

  /**
   * Switch preset while playing or stopped
   */
  setPreset(presetName) {
    this.currentPreset = presetName;
    if (this.isPlaying) {
      this.play(presetName);
    }
  }

  /**
   * Set Master Volume (0.0 to 1.0)
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.03);
    }
  }

  /**
   * Get Frequency Data for Visualizer
   */
  getFrequencyData(array) {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  /**
   * Get Time Domain Data (Waveform) for Visualizer
   */
  getTimeDomainData(array) {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }
}

// Export singleton instance to window
window.NoiseEngine = NoiseEngine;

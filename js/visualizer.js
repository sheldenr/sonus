/**
 * Minimalist Noise Generator - Audio Visualizer
 * High-precision segmented LED VU meter spectrum analyzer matching pro hardware aesthetics.
 */

class AudioVisualizer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.animationId = null;

    this.mode = 'bars'; // 'bars' (segmented LED) | 'wave' | 'curve'
    
    // Bar analyzer settings
    this.numBars = 32;
    this.barValues = new Float32Array(this.numBars).fill(0);
    this.targetValues = new Float32Array(this.numBars).fill(0);
    this.peakValues = new Float32Array(this.numBars).fill(0);
    this.peakHold = new Int16Array(this.numBars).fill(0);

    this.fftData = new Uint8Array(256);
    this.waveData = new Uint8Array(256);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Adjust bar count for screen width
    if (this.width < 500) {
      this.numBars = 22;
    } else if (this.width < 800) {
      this.numBars = 28;
    } else {
      this.numBars = 34;
    }

    if (this.barValues.length !== this.numBars) {
      this.barValues = new Float32Array(this.numBars).fill(0);
      this.targetValues = new Float32Array(this.numBars).fill(0);
      this.peakValues = new Float32Array(this.numBars).fill(0);
      this.peakHold = new Int16Array(this.numBars).fill(0);
    }
  }

  setMode(mode) {
    this.mode = mode;
  }

  start() {
    if (!this.animationId) {
      this.draw = this.draw.bind(this);
      this.animationId = requestAnimationFrame(this.draw);
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    // Draw idle state
    if (this.mode === 'bars') {
      this.drawLedBars(true);
    } else {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height / 2);
      this.ctx.lineTo(this.width, this.height / 2);
      this.ctx.stroke();
    }
  }

  draw() {
    this.animationId = requestAnimationFrame(this.draw);

    if (this.mode === 'wave') {
      this.drawWaveform();
    } else if (this.mode === 'curve') {
      this.drawCurve();
    } else {
      this.drawLedBars(false);
    }
  }

  /**
   * Segmented LED VU Meter Spectrum Analyzer with Peak-Hold & Mirror Reflection
   */
  drawLedBars(isIdle = false) {
    const w = this.width;
    const h = this.height;

    // Clear background to deep dark canvas
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    if (!isIdle) {
      this.engine.getFrequencyData(this.fftData);
    }

    const reflectionHeight = Math.floor(h * 0.18); // Bottom reflection
    const baselineY = h - reflectionHeight - 4;
    const availableHeight = baselineY - 14;

    const segHeight = 3.5;
    const segGap = 2.0;
    const segTotal = segHeight + segGap;
    const maxSegments = Math.max(12, Math.floor(availableHeight / segTotal));

    const totalBars = this.numBars;
    const sidePadding = 12;
    const usableWidth = w - (sidePadding * 2);
    const barGap = 4;
    const barWidth = Math.max(3, (usableWidth - (totalBars - 1) * barGap) / totalBars);

    // Map FFT frequencies to logarithmic bands
    const fftLen = this.fftData.length;
    for (let i = 0; i < totalBars; i++) {
      if (isIdle) {
        this.targetValues[i] = 0;
      } else {
        // Logarithmic distribution to span low, mid, and high frequencies cleanly
        const lowFreqFraction = Math.pow(i / totalBars, 1.8);
        const highFreqFraction = Math.pow((i + 1) / totalBars, 1.8);

        const startBin = Math.min(fftLen - 2, Math.max(1, Math.floor(lowFreqFraction * (fftLen * 0.7))));
        const endBin = Math.min(fftLen - 1, Math.max(startBin + 1, Math.floor(highFreqFraction * (fftLen * 0.7))));

        let sum = 0;
        let count = 0;
        for (let b = startBin; b <= endBin; b++) {
          sum += this.fftData[b];
          count++;
        }
        const avg = count > 0 ? sum / count : 0;
        // Normalized 0 to 1 with gentle boost for highs
        const highCompensation = 1 + (i / totalBars) * 0.65;
        this.targetValues[i] = Math.min(1.0, (avg / 255) * highCompensation);
      }

      // Smooth attack and decay
      if (this.targetValues[i] > this.barValues[i]) {
        this.barValues[i] += (this.targetValues[i] - this.barValues[i]) * 0.45; // Fast attack
      } else {
        this.barValues[i] += (this.targetValues[i] - this.barValues[i]) * 0.12; // Smooth decay
      }

      // Peak Hold Logic
      if (this.barValues[i] >= this.peakValues[i]) {
        this.peakValues[i] = this.barValues[i];
        this.peakHold[i] = 14; // ~230ms hold at 60fps
      } else {
        if (this.peakHold[i] > 0) {
          this.peakHold[i]--;
        } else {
          this.peakValues[i] = Math.max(0, this.peakValues[i] - 0.018); // Fall by gravity
        }
      }
    }

    // Render Bars
    for (let i = 0; i < totalBars; i++) {
      const barX = sidePadding + i * (barWidth + barGap);
      const activeSegs = Math.round(this.barValues[i] * maxSegments);
      const peakSeg = Math.min(maxSegments - 1, Math.round(this.peakValues[i] * maxSegments));

      // 1. Draw unlit ghost segments (pro hardware display look)
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      for (let s = activeSegs; s < maxSegments; s++) {
        const segY = baselineY - (s + 1) * segTotal;
        this.ctx.fillRect(barX, segY, barWidth, segHeight);
      }

      // 2. Draw active lit segments
      for (let s = 0; s < activeSegs; s++) {
        const segY = baselineY - (s + 1) * segTotal;
        const normHeight = s / maxSegments;

        // Subtle gradient: bright white at base -> sleek crisp silver -> soft high
        if (normHeight < 0.45) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        } else if (normHeight < 0.75) {
          this.ctx.fillStyle = 'rgba(235, 235, 235, 0.82)';
        } else {
          this.ctx.fillStyle = 'rgba(180, 180, 180, 0.60)';
        }

        this.ctx.fillRect(barX, segY, barWidth, segHeight);
      }

      // 3. Draw Floating Peak Cap (Crisp bright white segment)
      if (peakSeg > 0 && this.peakValues[i] > 0.04) {
        const peakY = baselineY - (peakSeg + 1) * segTotal;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        this.ctx.fillRect(barX, peakY, barWidth, segHeight);
        this.ctx.shadowBlur = 0;
      }

      // 4. Draw Bottom Mirror Reflection
      const reflectCount = Math.min(activeSegs, 7);
      for (let r = 0; r < reflectCount; r++) {
        const refY = baselineY + 3 + r * segTotal;
        // Fade downward
        const alpha = Math.max(0, (1 - (r / 7)) * 0.22);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        this.ctx.fillRect(barX, refY, barWidth, segHeight);
      }
    }

    // Draw Sleek Baseline Divider
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(sidePadding, baselineY);
    this.ctx.lineTo(w - sidePadding, baselineY);
    this.ctx.stroke();
  }

  /**
   * Minimalist Smooth Waveform View
   */
  drawWaveform() {
    this.engine.getTimeDomainData(this.waveData);
    const len = this.waveData.length;
    const w = this.width;
    const h = this.height;

    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.beginPath();
    const sliceWidth = w / (len - 1);

    for (let i = 0; i < len; i++) {
      const v = this.waveData[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 1.3;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }

  /**
   * Continuous smooth curve view
   */
  drawCurve() {
    this.engine.getFrequencyData(this.fftData);
    const len = Math.floor(this.fftData.length * 0.75);
    const w = this.width;
    const h = this.height;

    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.beginPath();
    const sliceWidth = w / (len - 1);

    for (let i = 0; i < len; i++) {
      const v = this.fftData[i] / 255;
      const y = h - (v * (h * 0.8)) - 4;
      const x = i * sliceWidth;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * sliceWidth;
        const prevY = h - (this.fftData[i - 1] / 255 * (h * 0.8)) - 4;
        this.ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
      }
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 1.4;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }
}

window.AudioVisualizer = AudioVisualizer;

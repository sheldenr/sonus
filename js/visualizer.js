/**
 * Minimalist Noise Generator - Immersive Frequency Curve Wave Visualizer
 * Renders a smooth, dynamic, organic frequency response & audio spectrum wave.
 */

class AudioVisualizer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.animationId = null;

    // FFT & Visualizer data
    this.fftData = new Uint8Array(256);
    this.smoothedFft = new Float32Array(256).fill(0);
    this.phase = 0;

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
    this.drawCurveWave(true);
  }

  draw() {
    this.animationId = requestAnimationFrame(this.draw);
    this.drawCurveWave(false);
  }

  /**
   * Main Drawing Routine: Centerpiece Curve Wave
   */
  drawCurveWave(isIdle = false) {
    const w = this.width;
    const h = this.height;

    // Clear background to pure OLED deep dark
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, w, h);

    const centerY = h * 0.52;

    // 1. Draw subtle horizontal 0dB baseline
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.moveTo(0, centerY);
    this.ctx.lineTo(w, centerY);
    this.ctx.stroke();

    // Subtle guide markings
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.setLineDash([4, 6]);
    [-h * 0.28, h * 0.28].forEach(offset => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, centerY + offset);
      this.ctx.lineTo(w, centerY + offset);
      this.ctx.stroke();
    });
    this.ctx.setLineDash([]);

    if (!isIdle && this.engine && this.engine.isPlaying) {
      this.engine.getFrequencyData(this.fftData);
      this.phase += 0.035;
    } else {
      // Gentle idle breathing
      this.phase += 0.015;
    }

    const fftLen = this.fftData.length;
    for (let i = 0; i < fftLen; i++) {
      const target = isIdle ? 0 : this.fftData[i];
      this.smoothedFft[i] += (target - this.smoothedFft[i]) * 0.25;
    }

    // 2. Compute 10-Band EQ Curve Influence
    // Map each frequency band to its relative position along canvas width
    const eqFrequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const bandXPositions = eqFrequencies.map(f => {
      return ((Math.log10(f) - logMin) / (logMax - logMin)) * w;
    });

    const getEqOffsetAtX = (x) => {
      if (!this.engine || !this.engine.eqGains) return 0;
      let totalGain = 0;
      for (let i = 0; i < eqFrequencies.length; i++) {
        const bandX = bandXPositions[i];
        const gain = this.engine.eqGains[i];
        const dist = Math.abs(x - bandX);
        const radius = w * 0.12; // Octave spread radius
        if (dist < radius) {
          const factor = Math.cos((dist / radius) * (Math.PI / 2));
          totalGain += gain * factor;
        }
      }
      // Scale gain dB (-24 to +24) to pixels (upwards for positive)
      return -(totalGain / 24) * (h * 0.32);
    };

    // 3. Generate Curve Points
    const numPoints = 120;
    const step = w / (numPoints - 1);
    const points = [];
    const secondaryPoints = [];

    for (let i = 0; i < numPoints; i++) {
      const x = i * step;
      const normX = i / (numPoints - 1);

      // FFT audio energy component
      const binIdx = Math.min(fftLen - 1, Math.max(1, Math.floor(Math.pow(normX, 1.4) * (fftLen * 0.75))));
      const energy = (this.smoothedFft[binIdx] / 255);

      // EQ offset component
      const eqOffset = getEqOffsetAtX(x);

      // Dynamic organic wave movement
      const waveMotion = Math.sin(normX * Math.PI * 4 + this.phase) * (energy * 18);
      const subHarmonic = Math.cos(normX * Math.PI * 2 - this.phase * 0.8) * (energy * 10);

      // Final Y position
      const audioY = (energy * (h * 0.35));
      const y = centerY + eqOffset - audioY + waveMotion;
      const y2 = centerY + eqOffset * 0.7 - (audioY * 0.65) - subHarmonic;

      points.push({ x, y });
      secondaryPoints.push({ x, y: y2 });
    }

    // 4. Draw Atmospheric Gradient Under Main Wave
    this.ctx.beginPath();
    this.ctx.moveTo(0, h);
    this.ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      this.ctx.quadraticCurveTo(p1.x, p1.y, cx, cy);
    }
    this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    this.ctx.lineTo(w, h);
    this.ctx.closePath();

    const fillGrad = this.ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    fillGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    fillGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    this.ctx.fillStyle = fillGrad;
    this.ctx.fill();

    // 5. Draw Secondary Subtle Ghost Wave
    this.ctx.beginPath();
    this.ctx.moveTo(secondaryPoints[0].x, secondaryPoints[0].y);
    for (let i = 0; i < secondaryPoints.length - 1; i++) {
      const p1 = secondaryPoints[i];
      const p2 = secondaryPoints[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      this.ctx.quadraticCurveTo(p1.x, p1.y, cx, cy);
    }
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    // 6. Draw Primary Luminous Frequency Curve Wave
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      this.ctx.quadraticCurveTo(p1.x, p1.y, cx, cy);
    }
    this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.2;
    this.ctx.shadowBlur = 14;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // 7. Subtle Frequency Band Node Anchors on Baseline
    bandXPositions.forEach((bx, idx) => {
      const gain = this.engine && this.engine.eqGains ? this.engine.eqGains[idx] : 0;
      const isModified = gain !== 0;

      // Small anchor tick
      this.ctx.fillStyle = isModified ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(bx, centerY, isModified ? 3 : 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
}

window.AudioVisualizer = AudioVisualizer;

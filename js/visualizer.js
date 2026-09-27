/**
 * Minimalist Noise Generator - Unified Interactive Audio Visualizer & Parametric EQ Curve
 */

class AudioVisualizer {
  constructor(canvas, engine, onBandChange = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.onBandChange = onBandChange;
    this.animationId = null;

    // Frequencies (10 bands)
    this.frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    this.freqLabels = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

    // FFT & Visualizer data
    this.fftData = new Uint8Array(256);
    this.smoothedFft = new Float32Array(256).fill(0);

    // Interactive Node State
    this.draggedIndex = -1;
    this.hoveredIndex = -1;
    this.nodePositions = []; // { x, y, freq, label }

    // Padding & geometry
    this.padding = { top: 30, right: 35, bottom: 35, left: 35 };

    this.resize();
    this.initEvents();
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

    this.computeNodePositions();
  }

  /**
   * Logarithmic mapping of frequency to X pixel position
   */
  freqToX(freq) {
    const minF = 20;
    const maxF = 20000;
    const usableW = this.width - this.padding.left - this.padding.right;
    const logMin = Math.log10(minF);
    const logMax = Math.log10(maxF);
    const logF = Math.log10(freq);
    return this.padding.left + ((logF - logMin) / (logMax - logMin)) * usableW;
  }

  /**
   * Gain (-24dB to +24dB) to Y pixel position
   */
  gainToY(db) {
    const usableH = this.height - this.padding.top - this.padding.bottom;
    const centerY = this.padding.top + usableH / 2;
    // +24dB at top, -24dB at bottom
    return centerY - (db / 24) * (usableH / 2);
  }

  /**
   * Y pixel position to gain in dB (-24 to +24)
   */
  yToGain(y) {
    const usableH = this.height - this.padding.top - this.padding.bottom;
    const centerY = this.padding.top + usableH / 2;
    const normalized = (centerY - y) / (usableH / 2);
    const db = normalized * 24;
    return Math.max(-24, Math.min(24, Math.round(db)));
  }

  computeNodePositions() {
    this.nodePositions = this.frequencies.map((freq, i) => {
      const x = this.freqToX(freq);
      const db = this.engine ? this.engine.eqGains[i] : 0;
      const y = this.gainToY(db);
      return {
        x,
        y,
        freq,
        label: this.freqLabels[i],
        index: i
      };
    });
  }

  initEvents() {
    const getPointerPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const findClosestNode = (pos) => {
      const hitRadius = 24;
      let closestIdx = -1;
      let minDist = hitRadius;

      this.nodePositions.forEach((node, idx) => {
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = idx;
        }
      });
      return closestIdx;
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      const pos = getPointerPos(e);
      const idx = findClosestNode(pos);
      if (idx !== -1) {
        this.draggedIndex = idx;
        this.canvas.setPointerCapture(e.pointerId);
        const newGain = this.yToGain(pos.y);
        this.updateBandGain(idx, newGain);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const pos = getPointerPos(e);
      if (this.draggedIndex !== -1) {
        const newGain = this.yToGain(pos.y);
        this.updateBandGain(this.draggedIndex, newGain);
      } else {
        const hovered = findClosestNode(pos);
        if (hovered !== this.hoveredIndex) {
          this.hoveredIndex = hovered;
          this.canvas.style.cursor = hovered !== -1 ? 'ns-resize' : 'default';
        }
      }
    });

    const endDrag = (e) => {
      if (this.draggedIndex !== -1) {
        try {
          this.canvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
        this.draggedIndex = -1;
      }
    };

    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);

    // Double-click resets clicked band to 0dB
    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getPointerPos(e);
      const idx = findClosestNode(pos);
      if (idx !== -1) {
        this.updateBandGain(idx, 0);
      }
    });
  }

  updateBandGain(index, db) {
    if (this.engine) {
      this.engine.setEqBand(index, db);
    }
    this.computeNodePositions();
    if (this.onBandChange) {
      this.onBandChange(index, db);
    }
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
    this.drawInteractiveCurve(true);
  }

  draw() {
    this.animationId = requestAnimationFrame(this.draw);
    this.drawInteractiveCurve(false);
  }

  /**
   * Main Interactive EQ & Curve Visualizer
   */
  drawInteractiveCurve(isIdle = false) {
    const w = this.width;
    const h = this.height;

    // Refresh node coordinates to track any external slider/preset changes
    this.computeNodePositions();

    // 1. Deep OLED Background
    this.ctx.fillStyle = '#060606';
    this.ctx.fillRect(0, 0, w, h);

    const centerY = this.gainToY(0);

    // 2. Draw Reference Grid Lines
    this.ctx.lineWidth = 1;

    // Subtle horizontal dB markings (+18, +12, +6, 0, -6, -12, -18)
    const dbSteps = [18, 12, 6, 0, -6, -12, -18];
    dbSteps.forEach(db => {
      const y = this.gainToY(db);
      this.ctx.beginPath();
      if (db === 0) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        this.ctx.setLineDash([]);
      } else {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.setLineDash([4, 4]);
      }
      this.ctx.moveTo(this.padding.left, y);
      this.ctx.lineTo(w - this.padding.right, y);
      this.ctx.stroke();

      // dB Labels on right edge
      this.ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.18)';
      this.ctx.font = '9px SF Mono, monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${db > 0 ? '+' : ''}${db}`, w - 10, y + 3);
    });
    this.ctx.setLineDash([]);

    // Vertical octave grid lines
    this.nodePositions.forEach(node => {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      this.ctx.beginPath();
      this.ctx.moveTo(node.x, this.padding.top);
      this.ctx.lineTo(node.x, h - this.padding.bottom);
      this.ctx.stroke();

      // Frequency labels along bottom edge
      this.ctx.fillStyle = (this.hoveredIndex === node.index || this.draggedIndex === node.index)
        ? '#ffffff'
        : 'rgba(255, 255, 255, 0.35)';
      this.ctx.font = '10px SF Mono, monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(node.label, node.x, h - 14);
    });

    // 3. Draw Real-time Ambient Audio Spectrum (Soft Glowing Fill & Wave)
    if (!isIdle) {
      this.engine.getFrequencyData(this.fftData);
      const fftLen = this.fftData.length;

      // Smooth FFT data
      for (let i = 0; i < fftLen; i++) {
        this.smoothedFft[i] += (this.fftData[i] - this.smoothedFft[i]) * 0.28;
      }

      // Draw subtle audio energy glow under curve
      this.ctx.beginPath();
      const numSamples = 64;
      const step = (w - this.padding.left - this.padding.right) / (numSamples - 1);

      this.ctx.moveTo(this.padding.left, h - this.padding.bottom);

      for (let s = 0; s < numSamples; s++) {
        const x = this.padding.left + s * step;
        const normX = s / (numSamples - 1);
        const bin = Math.min(fftLen - 1, Math.max(1, Math.floor(Math.pow(normX, 1.6) * (fftLen * 0.75))));
        const energy = this.smoothedFft[bin] / 255;
        // Map energy height smoothly
        const y = (h - this.padding.bottom) - (energy * (h - this.padding.top - this.padding.bottom) * 0.7);

        if (s === 0) {
          this.ctx.lineTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.lineTo(w - this.padding.right, h - this.padding.bottom);
      this.ctx.closePath();

      // Very subtle monochromatic gradient fill
      const grad = this.ctx.createLinearGradient(0, this.padding.top, 0, h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
      this.ctx.fillStyle = grad;
      this.ctx.fill();
    }

    // 4. Draw Smooth Parametric EQ Filter Curve
    // Smooth Catmull-Rom or Bezier interpolation passing through all 10 nodes
    const curvePoints = [];
    // Start anchor at left edge
    curvePoints.push({ x: 0, y: this.nodePositions[0].y });
    curvePoints.push({ x: this.padding.left, y: this.nodePositions[0].y });

    this.nodePositions.forEach(n => {
      curvePoints.push({ x: n.x, y: n.y });
    });

    // End anchor at right edge
    curvePoints.push({ x: w - this.padding.right, y: this.nodePositions[this.nodePositions.length - 1].y });
    curvePoints.push({ x: w, y: this.nodePositions[this.nodePositions.length - 1].y });

    // Draw the curve line
    this.ctx.beginPath();
    this.ctx.moveTo(curvePoints[0].x, curvePoints[0].y);

    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p0 = i > 0 ? curvePoints[i - 1] : curvePoints[i];
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];
      const p3 = i < curvePoints.length - 2 ? curvePoints[i + 2] : p2;

      // Tension spline approximation
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    // Curve glow and crisp stroke
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.0;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // 5. Draw 10 Interactive Draggable Control Nodes
    this.nodePositions.forEach(node => {
      const isHovered = this.hoveredIndex === node.index;
      const isDragged = this.draggedIndex === node.index;
      const gain = this.engine ? this.engine.eqGains[node.index] : 0;
      const isBoosted = gain > 0;
      const isModified = gain !== 0;

      // Halo on hover / drag
      if (isHovered || isDragged) {
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.ctx.fill();
      }

      // Connecting stem line from 0dB baseline to node
      if (isModified) {
        this.ctx.beginPath();
        this.ctx.moveTo(node.x, centerY);
        this.ctx.lineTo(node.x, node.y);
        this.ctx.strokeStyle = isBoosted ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }

      // Outer Handle Circle
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, isDragged ? 8 : (isHovered ? 7.5 : 6), 0, Math.PI * 2);
      this.ctx.fillStyle = isModified ? '#ffffff' : '#0a0a0a';
      this.ctx.fill();
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.stroke();

      // Inner center dot
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = isModified ? '#000000' : '#ffffff';
      this.ctx.fill();

      // Floating Tooltip Badge on active drag or hover
      if (isDragged || isHovered) {
        const badgeText = `${gain > 0 ? '+' : ''}${gain}dB`;
        this.ctx.font = '600 10px SF Mono, monospace';
        const textWidth = this.ctx.measureText(badgeText).width;
        const badgeW = textWidth + 12;
        const badgeH = 18;
        const badgeY = node.y - 24;

        // Tooltip pill background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.roundRect(node.x - badgeW / 2, badgeY, badgeW, badgeH, 4);
        this.ctx.fill();

        // Tooltip text
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(badgeText, node.x, badgeY + 12.5);
      }
    });
  }
}

window.AudioVisualizer = AudioVisualizer;

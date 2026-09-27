/**
 * Minimalist Noise Generator - Audio Visualizer
 * Subtle, ultra-clean monochrome spectrum & waveform renderer
 */

class AudioVisualizer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.animationId = null;

    this.mode = 'spectrum'; // 'spectrum' | 'wave'
    this.fftData = new Uint8Array(256);
    this.smoothedData = new Float32Array(256).fill(0);

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
    // Draw subtle minimal center baseline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
  }

  draw() {
    this.animationId = requestAnimationFrame(this.draw);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; // Gentle decay trail
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.mode === 'wave') {
      this.drawWaveform();
    } else {
      this.drawSpectrum();
    }
  }

  drawSpectrum() {
    this.engine.getFrequencyData(this.fftData);

    const len = Math.floor(this.fftData.length * 0.75); // Cut off ultrasonic artifacts
    const w = this.width;
    const h = this.height;

    // Smooth lerp
    for (let i = 0; i < len; i++) {
      this.smoothedData[i] += (this.fftData[i] - this.smoothedData[i]) * 0.25;
    }

    // Draw delicate subtle spectrum curve
    this.ctx.beginPath();
    this.ctx.moveTo(0, h);

    const sliceWidth = w / (len - 1);
    for (let i = 0; i < len; i++) {
      const v = this.smoothedData[i] / 255;
      const y = h - (v * (h * 0.85)) - 2;
      const x = i * sliceWidth;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * sliceWidth;
        const prevY = h - (this.smoothedData[i - 1] / 255 * (h * 0.85)) - 2;
        const cX = (prevX + x) / 2;
        const cY = (prevY + y) / 2;
        this.ctx.quadraticCurveTo(prevX, prevY, cX, cY);
      }
    }

    // Line style: crisp, minimal white with soft glow
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    this.ctx.lineWidth = 1.25;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Soft gradient fill beneath curve
    this.ctx.lineTo(w, h);
    this.ctx.lineTo(0, h);
    this.ctx.closePath();
    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    this.ctx.fillStyle = grad;
    this.ctx.fill();

    // Baseline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, h - 1);
    this.ctx.lineTo(w, h - 1);
    this.ctx.stroke();
  }

  drawWaveform() {
    this.engine.getTimeDomainData(this.fftData);
    const len = this.fftData.length;
    const w = this.width;
    const h = this.height;

    this.ctx.beginPath();
    const sliceWidth = w / (len - 1);

    for (let i = 0; i < len; i++) {
      const v = this.fftData[i] / 128.0;
      const y = (v * h) / 2;
      const x = i * sliceWidth;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    this.ctx.lineWidth = 1.2;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.25)';
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }
}

window.AudioVisualizer = AudioVisualizer;

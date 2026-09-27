# NOISE • Minimalist Ambient Sound Generator

A simple, all-black, ultra-minimalist web application that generates audio noise using the native browser Web Audio API. Zero dependencies, 100% client-side, zero latency, and seamless looping.

---

## Features

### 1. 17 Curated Sound Presets
- **Brown**: $1/f^2$ Brownian/red noise. Deep, warm, waterfall-like rumble.
- **Pink**: $1/f$ pink noise. Balanced, soothing natural rain and rustling foliage.
- **White**: Flat frequency distribution across all audible octaves ($20\text{Hz} - 20\text{kHz}$). Crisp hiss.
- **Grey**: Psychoacoustic inverted A-weighting / equal-loudness contour. Sounds equally loud across all human-audible frequencies.
- **Infra**: Sub-bass rumble ($<60\text{Hz}$) with high-order low-pass steep cutoff for deep physical vibration.
- **Ultra**: Air and brilliance ($>8\text{kHz}$) with mid/low reduction for gentle high-frequency shimmer.
- **Around 60Hz**: Electrical mains hum and resonant 60Hz ambient drone with 120Hz warmth.
- **125Hz**: Resonant low-bass band.
- **250Hz**: Resonant low-mid body.
- **500Hz**: Resonant acoustic centrum tone.
- **1kHz**: Reference telephone / mid presence.
- **2kHz**: Auditory clarity band.
- **4kHz**: High-mid articulation / speech sibilance.
- **8kHz**: Treble brilliance.
- **Speech Blocker**: Engineered speech privacy filter targeting $250\text{Hz} - 3.8\text{kHz}$ vocal formant range to mask conversational speech and background chatter.
- **Ear Massage**: Dynamic dual-channel binaural sweep. Counter-phase slow LFO sweeps peaking filters across both ears for a soothing cranial massage feeling.
- **℗ Surprise!**: Procedurally generated generative texture with dynamic harmonic resonances and evolving modulation.

---

### 2. 10-Band Custom Equalizer
Shape and sculpt your own custom noise spectrum by selectively increasing (or cutting) 10 discrete frequency bands:
- **31 Hz** (Sub-bass / rumble)
- **62 Hz** (Deep bass / hum)
- **125 Hz** (Bass warmth)
- **250 Hz** (Low midrange)
- **500 Hz** (Mid body)
- **1 kHz** (Vocal presence)
- **2 kHz** (Clarity)
- **4 kHz** (Attack & crispness)
- **8 kHz** (Treble brilliance)
- **16 kHz** (Air & sheen)

**Features**:
- Range from $-24\text{dB}$ to $+24\text{dB}$ per band.
- Direct dB readout with visual glow indicator on boosted bands.
- Quick `+6dB` boost pills and double-click to reset to $0\text{dB}$.
- Quick sculpt shortcuts: `FLATTEN`, `WARM BASS`, `VOICE FOCUS`, `AIR LIFT`, `RANDOM`.
- Integrated `DynamicsCompressorNode` safety limiter preventing any digital clipping regardless of EQ boost level.

---

### 3. Ultra-Minimalist All-Black Interface
- Pure OLED black palette (`#000000`) with subtle hair-thin borders.
- Real-time monochrome visualizer with **Spectrum** (smooth frequency response curve) and **Waveform** (oscilloscope) views.
- Sleep timer ($15$, $30$, $45$, $60$, $90$ minutes) with live countdown.
- Master volume fader with mute toggle.

---

### 4. Keyboard Shortcuts
- <kbd>Space</kbd> : Play / Stop
- <kbd>M</kbd> : Mute / Unmute
- <kbd>R</kbd> : Flatten EQ
- <kbd>S</kbd> : Trigger ℗ Surprise!

---

## Running Locally

Simply open `index.html` in any modern web browser, or serve it using your preferred local HTTP server:

```bash
# Using npx serve
npx serve .

# Or using Python
python3 -m http.server 3000
```

// High-Fidelity Web Audio API Sound Synthesizer for TIMEVERSE
// Designed to play professional, cinematic, and pleasant sensory cues for each Persona.

class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6; // Default volume: 60%
  private masterInput: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on the first user interaction
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("timeverse_muted");
      this.isMuted = savedMute === "true";
      const savedVol = localStorage.getItem("timeverse_volume");
      if (savedVol) {
        this.volume = parseFloat(savedVol);
      }
    }
  }

  // Lazy initialize AudioContext to comply with browser autoplay policies
  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Set mute state
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem("timeverse_muted", String(muted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Set volume
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem("timeverse_volume", String(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Master bus: all sounds route here → compressor (glue) + convolution reverb (space) → output.
  // This is what turns dry "beeps" into rich, cinematic, spatial cues.
  private masterBus(ctx: AudioContext): GainNode {
    if (this.masterInput) return this.masterInput;

    const input = ctx.createGain();
    input.gain.value = 1;

    // Gentle bus compression to glue layers and add perceived loudness/body
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-20, ctx.currentTime);
    comp.knee.setValueAtTime(26, ctx.currentTime);
    comp.ratio.setValueAtTime(3, ctx.currentTime);
    comp.attack.setValueAtTime(0.003, ctx.currentTime);
    comp.release.setValueAtTime(0.25, ctx.currentTime);

    // High shelf sparkle
    const tone = ctx.createBiquadFilter();
    tone.type = "highshelf";
    tone.frequency.setValueAtTime(3500, ctx.currentTime);
    tone.gain.setValueAtTime(3, ctx.currentTime);

    // Dry / wet split
    const dry = ctx.createGain();
    dry.gain.value = 0.9;
    const wet = ctx.createGain();
    wet.gain.value = 0.18; // subtle sheen, avoids muddiness on ticks

    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(ctx, 1.8, 3.2);
    const preDelay = ctx.createDelay();
    preDelay.delayTime.value = 0.02;

    input.connect(comp);
    comp.connect(tone);
    tone.connect(dry);
    tone.connect(preDelay);
    preDelay.connect(reverb);
    reverb.connect(wet);
    dry.connect(ctx.destination);
    wet.connect(ctx.destination);

    this.masterInput = input;
    return input;
  }

  // Procedurally generate a smooth reverb impulse response (no audio files needed)
  private makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // Create primary output node with smooth volume control
  private createGainNode(ctx: AudioContext, initialValue: number = this.volume): GainNode {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(initialValue, ctx.currentTime);
    return gainNode;
  }

  // Plays a beautiful physical chime / bell sound with detuned harmonics
  private playBell(frequency: number, type: OscillatorType, decay: number, detuneAmount = 1.5) {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const mainGain = this.createGainNode(ctx, 0.0001);
      mainGain.connect(this.masterBus(ctx));

      // Smooth decay envelope
      mainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      mainGain.gain.linearRampToValueAtTime(this.volume * 0.4, ctx.currentTime + 0.05);
      mainGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + decay);

      // Harmonically rich layers
      const partials = [1, 2, 3, 4.2, 5.4];
      const partialGains = [0.4, 0.2, 0.1, 0.05, 0.02];

      partials.forEach((mult, i) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency * mult, ctx.currentTime);
        
        // Add subtle pitch detuning for realistic metallic beat
        if (i > 0) {
          osc.detune.setValueAtTime((Math.random() - 0.5) * detuneAmount * 10, ctx.currentTime);
        }

        const partialGain = ctx.createGain();
        partialGain.gain.setValueAtTime(partialGains[i] || 0.01, ctx.currentTime);
        partialGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + decay * (1 / mult));

        osc.connect(partialGain);
        partialGain.connect(mainGain);

        osc.start();
        osc.stop(ctx.currentTime + decay);
      });
    } catch (err) {
      console.warn("Audio chime error:", err);
    }
  }

  // Tap: tactile mechanical click — a filtered noise transient over a short pitched body
  public playTap() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const now = ctx.currentTime;
      const bus = this.masterBus(ctx);

      // 1) Noise transient (the "tk" attack)
      const noiseLen = Math.floor(ctx.sampleRate * 0.03);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 4);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const nbp = ctx.createBiquadFilter();
      nbp.type = "bandpass";
      nbp.frequency.setValueAtTime(2600, now);
      nbp.Q.setValueAtTime(1.2, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(this.volume * 0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      noise.connect(nbp); nbp.connect(ng); ng.connect(bus);
      noise.start(now); noise.stop(now + 0.04);

      // 2) Pitched body (gives the click weight)
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.16, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(gain); gain.connect(bus);
      osc.start(now); osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Inspire: Upward acoustic scale (C4 -> E4 -> G4 -> C5)
  public playStart() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      
      notes.forEach((freq, idx) => {
        const timeOffset = idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = this.createGainNode(ctx, 0.0001);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(this.volume * 0.22, ctx.currentTime + timeOffset + 0.05);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + timeOffset + 0.4);

        // Lowpass filter for warm, cozy analog sound
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1200, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterBus(ctx));

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.5);
      });
    } catch (e) {}
  }

  // Chill Pause: Downward filter sweep
  public playPause() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(392.00, ctx.currentTime); // G4
      osc.frequency.linearRampToValueAtTime(196.00, ctx.currentTime + 0.35); // G3

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterBus(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  // Resume: Clean double tone
  public playResume() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      [392.00, 523.25].forEach((freq, idx) => {
        const timeOffset = idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = this.createGainNode(ctx, 0.0001);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(this.volume * 0.2, ctx.currentTime + timeOffset + 0.02);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + timeOffset + 0.15);

        osc.connect(gain);
        gain.connect(this.masterBus(ctx));

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.2);
      });
    } catch (e) {}
  }

  // Reset: Swooshing rewind sweep
  public playReset() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.masterBus(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  // Complete: Gorgeous full major-9th chord pad
  public playComplete() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      // F Major 9: F3, A3, C4, E4, G4
      const freqs = [174.61, 220.00, 261.63, 329.63, 392.00];
      const totalDecay = 4.5;

      const mainGain = this.createGainNode(ctx, 0.0001);
      mainGain.connect(this.masterBus(ctx));
      mainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      mainGain.gain.linearRampToValueAtTime(this.volume * 0.35, ctx.currentTime + 0.5);
      mainGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + totalDecay);

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        // detune slightly for lush warmth
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(3, ctx.currentTime);

        osc.connect(filter);
        filter.connect(mainGain);

        osc.start();
        osc.stop(ctx.currentTime + totalDecay);
      });
    } catch (e) {}
  }

  // --- PERSONA-SPECIFIC SYNTHS ---

  // 1. Barista (Coffee): Cozy coffee-shop bubble cascade
  public playBaristaSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      // Simulate 3 water/bubble drop drips
      const drips = [
        { time: 0, startFreq: 400, endFreq: 950 },
        { time: 0.12, startFreq: 550, endFreq: 1150 },
        { time: 0.22, startFreq: 380, endFreq: 880 }
      ];

      drips.forEach((drip) => {
        const osc = ctx.createOscillator();
        const gain = this.createGainNode(ctx, 0.0001);

        osc.type = "sine";
        osc.frequency.setValueAtTime(drip.startFreq, ctx.currentTime + drip.time);
        osc.frequency.linearRampToValueAtTime(drip.endFreq, ctx.currentTime + drip.time + 0.08);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + drip.time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.25, ctx.currentTime + drip.time + 0.02);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + drip.time + 0.08);

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.setValueAtTime(drip.endFreq, ctx.currentTime);
        bandpass.Q.setValueAtTime(5, ctx.currentTime);

        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.masterBus(ctx));

        osc.start(ctx.currentTime + drip.time);
        osc.stop(ctx.currentTime + drip.time + 0.12);
      });
    } catch (e) {}
  }

  // 2. Chef (Cooking): Frying sizzle noise burst & warm stove bell
  public playChefSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      
      // Play warm stove bell
      this.playBell(349.23, "sine", 2.5, 1.2); // F4 bell

      // Play soft sizzle
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(5000, ctx.currentTime);

      const gain = this.createGainNode(ctx, 0.0001);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.12, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterBus(ctx));

      noiseNode.start();
    } catch (e) {}
  }

  // 3. Parent (Baby): Sweet Music-Box chime sequence
  public playParentSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      // Lullaby progression: C5 -> E5 -> G5 -> C6
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      const baseDelay = 0.18;

      freqs.forEach((freq, idx) => {
        const triggerTime = ctx.currentTime + idx * baseDelay;
        const osc = ctx.createOscillator();
        const gain = this.createGainNode(ctx, 0.0001);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, triggerTime);

        // Music box pure high pluck
        gain.gain.setValueAtTime(0.0001, triggerTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.28, triggerTime + 0.005);
        gain.gain.linearRampToValueAtTime(0.0001, triggerTime + 0.7);

        osc.connect(gain);
        gain.connect(this.masterBus(ctx));

        osc.start(triggerTime);
        osc.stop(triggerTime + 0.8);
      });
    } catch (e) {}
  }

  // 4. Workout (Coach): Crisp digital whistle or energy double-tone
  public playWorkoutSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      // Double sporty synth beep
      [800, 1050].forEach((freq, idx) => {
        const timeOffset = idx * 0.09;
        const osc = ctx.createOscillator();
        const gain = this.createGainNode(ctx, 0.0001);

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime + timeOffset);
        gain.gain.linearRampToValueAtTime(this.volume * 0.18, ctx.currentTime + timeOffset + 0.01);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + timeOffset + 0.12);

        // Lowpass to make square wave sound rich/clean instead of annoying buzz
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1500, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterBus(ctx));

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.15);
      });
    } catch (e) {}
  }

  // 5. Focus Monk (Study): Pure crystal sound-bowl resonance
  public playStudySound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      // Deep focus major chord (C# major chime: C#3, G#3, C#4, F4)
      const notes = [138.59, 207.65, 277.18, 349.23];
      const duration = 2.5;

      const mainGain = this.createGainNode(ctx, 0.0001);
      mainGain.connect(this.masterBus(ctx));
      mainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      mainGain.gain.linearRampToValueAtTime(this.volume * 0.35, ctx.currentTime + 0.15);
      mainGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration);

      notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        osc.connect(filter);
        filter.connect(mainGain);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      });
    } catch (e) {}
  }

  // 6. Zen Master (Meditation): Magnificent Tibetan Singing Bowl
  public playZenSound() {
    this.playBell(130.81, "sine", 4.0, 1.8); // Deep C3 Singing Bowl Chime
  }

  // 7. Quantum (Scientist): Sub-atomic sci-fi laser telemetry ping
  public playScientistSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);

      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.25, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.masterBus(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // 8. Minimalist: Subtle dry physical tick click
  public playMinimalistTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);

      osc.type = "sine";
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.setValueAtTime(100, ctx.currentTime + 0.008);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.002);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.015);

      osc.connect(gain);
      gain.connect(this.masterBus(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch (e) {}
  }

  // 9. Standard (Classic Stopwatch): Retro digital stopwatch high-pitch beep
  public playStandardSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      const osc = ctx.createOscillator();
      const gain = this.createGainNode(ctx, 0.0001);

      osc.type = "sine";
      osc.frequency.setValueAtTime(2000, ctx.currentTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.005);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterBus(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // --- PERSONA-SPECIFIC INDIVIDUAL SECOND TICKS (SOUNDSCAPES) ---
  // Plays a tiny, highly pleasant, non-intrusive second ticking sound tailored to each persona
  public playPersonaTick(personaId: string) {
    if (this.isMuted) return;
    try {
      const ctx = this.init();
      
      // Let's create a custom ticking sound depending on the persona!
      switch (personaId) {
        case "coffee": { // Barista: Gentle drip-drop
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(900, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.015);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.003);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(1100, ctx.currentTime);
          filter.Q.setValueAtTime(8, ctx.currentTime);

          osc.connect(filter);
          filter.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.03);
          break;
        }

        case "cooking": { // Chef: Hot grease sizzle crack (tiny noise burst)
          const bufferSize = ctx.sampleRate * 0.012; // 12ms crackle
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.setValueAtTime(6500, ctx.currentTime);

          const gain = this.createGainNode(ctx, 0.0001);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.12, ctx.currentTime + 0.002);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.012);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterBus(ctx));

          noise.start();
          noise.stop(ctx.currentTime + 0.02);
          break;
        }

        case "baby": { // Parent: Sweet, high-pitch music-box spark
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(783.99, ctx.currentTime); // G5 note

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.004);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.065);

          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
          break;
        }

        case "workout": { // Coach: Sporty energetic click
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "triangle";
          osc.frequency.setValueAtTime(1100, ctx.currentTime);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.14, ctx.currentTime + 0.002);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.015);

          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.02);
          break;
        }

        case "study": { // Focus Monk: Soft crystal glass chime
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(880.00, ctx.currentTime); // A5 pure note

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.13, ctx.currentTime + 0.005);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(1000, ctx.currentTime);

          osc.connect(filter);
          filter.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
          break;
        }

        case "meditation": { // Zen Master: Deep woody temple block (Moktak) click
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.025);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.22, ctx.currentTime + 0.002);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(320, ctx.currentTime);
          filter.Q.setValueAtTime(5, ctx.currentTime);

          osc.connect(filter);
          filter.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.035);
          break;
        }

        case "scientist": { // Quantum: Sci-fi computer data pulse
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(2000, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.012);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.001);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.012);

          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.02);
          break;
        }

        case "standard": { // Standard: Crisp digital stopwatch high tick
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(3200, ctx.currentTime);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.12, ctx.currentTime + 0.001);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.005);

          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.01);
          break;
        }

        case "minimalist":
        default: { // Minimalist / Default: Crisp standard wooden mechanical tick
          const osc = ctx.createOscillator();
          const gain = this.createGainNode(ctx, 0.0001);
          gain.connect(this.masterBus(ctx));

          osc.type = "sine";
          osc.frequency.setValueAtTime(2400, ctx.currentTime);
          osc.frequency.setValueAtTime(100, ctx.currentTime + 0.008);

          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.15, ctx.currentTime + 0.002);
          gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.01);

          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.025);
          break;
        }
      }
    } catch (e) {
      console.warn("Tick sound failed to play:", e);
    }
  }

  // --- GENERAL MULTIPLEXER ---
  // Plays the unique sound tailored to a given persona ID
  public playPersonaSound(personaId: string) {
    switch (personaId) {
      case "coffee":
        this.playBaristaSound();
        break;
      case "cooking":
        this.playChefSound();
        break;
      case "baby":
        this.playParentSound();
        break;
      case "workout":
        this.playWorkoutSound();
        break;
      case "study":
        this.playStudySound();
        break;
      case "meditation":
        this.playZenSound();
        break;
      case "scientist":
        this.playScientistSound();
        break;
      case "standard":
        this.playStandardSound();
        break;
      case "minimalist":
        this.playMinimalistTick();
        break;
      default:
        this.playTap();
    }
  }
}

export const soundService = new SoundService();

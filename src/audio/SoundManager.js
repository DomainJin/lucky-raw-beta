// Sound system
export class SoundManager {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.initialized = false;
    this.raceLoopInterval = null;
    this.crowdNoiseInterval = null;
    this.customAudioBuffer = null; // For loaded mp3/wav files
    this.customAudioSource = null; // Current playing source

    // Audio buffers for different stages
    this.startAudioBuffer = null; // start.mp3 (3s)
    this.raceAudioBuffer = null; // race.mp3 (30s)
    this.endAudioBuffer = null; // end.mp3

    // Audio sources
    this.startAudioSource = null;
    this.raceAudioSource = null;
    this.endAudioSource = null;

    // Load audio files from static folder
    this.loadStaticAudio();
  }

  init() {
    if (this.initialized) return;
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.log("Audio not supported");
    }
  }

  // Load audio files from static folder
  async loadStaticAudio() {
    if (!this.context) {
      try {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
      } catch (e) {
        console.log("Audio not supported");
        return;
      }
    }

    try {
      // Load start.mp3
      const startResponse = await fetch("static/start.mp3");
      if (startResponse.ok) {
        const startArrayBuffer = await startResponse.arrayBuffer();
        this.startAudioBuffer =
          await this.context.decodeAudioData(startArrayBuffer);
        console.log(
          "✅ start.mp3 loaded:",
          this.startAudioBuffer.duration.toFixed(1) + "s",
        );
      }
    } catch (error) {
      console.warn("⚠️ Could not load start.mp3:", error.message);
    }

    try {
      // Load race.mp3
      const raceResponse = await fetch("static/race.mp3");
      if (raceResponse.ok) {
        const raceArrayBuffer = await raceResponse.arrayBuffer();
        this.raceAudioBuffer =
          await this.context.decodeAudioData(raceArrayBuffer);
        console.log(
          "✅ race.mp3 loaded:",
          this.raceAudioBuffer.duration.toFixed(1) + "s",
        );
      }
    } catch (error) {
      console.warn("⚠️ Could not load race.mp3:", error.message);
    }

    try {
      // Load end.mp3
      const endResponse = await fetch("static/end.mp3");
      if (endResponse.ok) {
        const endArrayBuffer = await endResponse.arrayBuffer();
        this.endAudioBuffer =
          await this.context.decodeAudioData(endArrayBuffer);
        console.log(
          "✅ end.mp3 loaded:",
          this.endAudioBuffer.duration.toFixed(1) + "s",
        );
      }
    } catch (error) {
      console.warn("⚠️ Could not load end.mp3:", error.message);
    }
  }

  // Load audio file (mp3, wav, ogg)
  async loadAudioFile(file) {
    if (!this.initialized) this.init();
    if (!this.context) {
      console.error("AudioContext not available");
      return false;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          this.customAudioBuffer =
            await this.context.decodeAudioData(arrayBuffer);
          console.log(
            "✅ Audio file loaded successfully:",
            file.name,
            this.customAudioBuffer.duration + "s",
          );
          resolve(true);
        } catch (error) {
          console.error("❌ Error decoding audio file:", error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Load audio from base64 string (for BroadcastChannel sharing)
  async loadAudioFromBase64(base64Data, fileName) {
    if (!this.initialized) this.init();
    if (!this.context) {
      console.error("AudioContext not available");
      return false;
    }

    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      this.customAudioBuffer = await this.context.decodeAudioData(bytes.buffer);
      console.log(
        "✅ Audio loaded from base64:",
        fileName,
        this.customAudioBuffer.duration + "s",
      );
      return true;
    } catch (error) {
      console.error("❌ Error decoding base64 audio:", error);
      return false;
    }
  }

  // Clear custom audio and return to default
  clearCustomAudio() {
    console.log("🗑️ Clearing custom audio buffer");

    // Stop custom audio if playing
    if (this.customAudioSource) {
      try {
        this.customAudioSource.stop();
      } catch (e) {}
      this.customAudioSource = null;
    }

    // Clear buffer
    this.customAudioBuffer = null;

    console.log("✓ Custom audio cleared, will use default race.mp3");
  }

  playStartSound() {
    if (!this.enabled || !this.initialized) return;

    // Play start.mp3 if loaded
    if (this.startAudioBuffer && this.context) {
      // Stop previous start sound if playing
      if (this.startAudioSource) {
        try {
          this.startAudioSource.stop();
        } catch (e) {}
      }

      this.startAudioSource = this.context.createBufferSource();
      this.startAudioSource.buffer = this.startAudioBuffer;
      this.startAudioSource.connect(this.context.destination);
      this.startAudioSource.start(0);
      console.log("🔊 Playing start.mp3 (3s countdown)");
    } else {
      // Fallback: Horn sound - trumpet style
      this.playBeep(500, 0.15, 0.3);
      setTimeout(() => this.playBeep(600, 0.15, 0.3), 100);
      setTimeout(() => this.playBeep(700, 0.2, 0.5), 200);
    }
  }

  playCrowdCheer() {
    if (!this.enabled || !this.initialized) return;
    // Victory crowd sound
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.playBeep(300 + Math.random() * 500, 0.08, 0.15);
      }, i * 80);
    }
  }

  playFinishSound() {
    if (!this.enabled || !this.initialized) return;

    // Stop race.mp3 first
    this.stopRacingAmbiance();

    // Play end.mp3 if loaded
    if (this.endAudioBuffer && this.context) {
      // Stop previous end sound if playing
      if (this.endAudioSource) {
        try {
          this.endAudioSource.stop();
        } catch (e) {}
      }

      this.endAudioSource = this.context.createBufferSource();
      this.endAudioSource.buffer = this.endAudioBuffer;
      this.endAudioSource.connect(this.context.destination);
      this.endAudioSource.start(0);
      console.log("🔊 Playing end.mp3 (victory sound)");
    } else {
      // Fallback: Victory fanfare
      this.playBeep(1000, 0.15, 0.2);
      setTimeout(() => this.playBeep(1200, 0.15, 0.2), 150);
      setTimeout(() => this.playBeep(1500, 0.2, 0.4), 300);

      // Add crowd cheer
      setTimeout(() => this.playCrowdCheer(), 200);
    }
  }

  // Horse galloping sound effect
  playHorseGallop() {
    if (!this.enabled || !this.initialized) return;
    // Simulate horse hooves - 4 beats in quick succession
    const hoofFreq = 180;
    const beatDelay = 80;

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playNoise(hoofFreq + Math.random() * 40, 0.08, 0.05);
      }, i * beatDelay);
    }
  }

  // Start continuous racing ambiance
  startRacingAmbiance(raceDuration = 30) {
    if (!this.enabled || !this.initialized) return;

    // Priority 1: Use custom audio if loaded
    if (this.customAudioBuffer) {
      console.log("🎵 Using custom audio instead of default race audio");
      this.playCustomAudio();
      return;
    }

    // Priority 2: Play race.mp3 if loaded
    if (this.raceAudioBuffer && this.context) {
      // Stop previous race sound if playing
      if (this.raceAudioSource) {
        try {
          this.raceAudioSource.stop();
        } catch (e) {}
      }

      this.raceAudioSource = this.context.createBufferSource();
      this.raceAudioSource.buffer = this.raceAudioBuffer;
      this.raceAudioSource.connect(this.context.destination);

      // Loop if race duration > 30s
      const raceAudioDuration = this.raceAudioBuffer.duration;
      const audioName = "default race audio";
      if (raceDuration > raceAudioDuration) {
        this.raceAudioSource.loop = true;
        console.log(
          `🔊 Playing ${audioName} in LOOP (race duration: ${raceDuration}s)`,
        );
      } else {
        this.raceAudioSource.loop = false;
        console.log(
          `🔊 Playing ${audioName} once (race duration: ${raceDuration}s)`,
        );
      }

      this.raceAudioSource.start(0);
      return;
    }

    // Fallback: Horse galloping loop - continuous hooves sound
    this.raceLoopInterval = setInterval(() => {
      // Multiple horses galloping
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.playHorseGallop();
        }, i * 100);
      }
    }, 600);

    // Background crowd noise
    this.crowdNoiseInterval = setInterval(() => {
      // Random crowd murmur
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.playBeep(200 + Math.random() * 300, 0.02, 0.3);
        }, Math.random() * 500);
      }
    }, 800);
  }

  // Play custom loaded audio in loop
  playCustomAudio() {
    if (!this.customAudioBuffer || !this.context) return;

    // Stop previous source if exists
    if (this.customAudioSource) {
      this.customAudioSource.stop();
    }

    this.customAudioSource = this.context.createBufferSource();
    this.customAudioSource.buffer = this.customAudioBuffer;
    this.customAudioSource.loop = true; // Loop the audio
    this.customAudioSource.connect(this.context.destination);
    this.customAudioSource.start(0);
    console.log("🔊 Playing custom audio in loop");
  }

  // Stop racing ambiance
  stopRacingAmbiance() {
    // Stop race audio if playing
    if (this.raceAudioSource) {
      try {
        this.raceAudioSource.stop();
        console.log("🔇 Stopped race audio");
      } catch (e) {}
      this.raceAudioSource = null;
    }

    if (this.raceLoopInterval) {
      clearInterval(this.raceLoopInterval);
      this.raceLoopInterval = null;
    }
    if (this.crowdNoiseInterval) {
      clearInterval(this.crowdNoiseInterval);
      this.crowdNoiseInterval = null;
    }
    // Stop custom audio if playing
    if (this.customAudioSource) {
      try {
        this.customAudioSource.stop();
      } catch (e) {}
      this.customAudioSource = null;
    }
  }

  playBeep(frequency, volume, duration) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + duration,
    );

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  // Noise generator for hoof sounds
  playNoise(frequency, volume, duration) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "square"; // Square wave for percussive hoof sound

    gainNode.gain.setValueAtTime(volume, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.context.currentTime + duration,
    );

    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + duration);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopRacingAmbiance();
    }
  }
}

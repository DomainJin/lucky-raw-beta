// Finish line offset - distance from duck center to right edge of 150px icon
// 75px = half of 150px icon width (center of icon)
const FINISH_LINE_OFFSET = 75;

// Minimum participants required to start/continue a race
const MINIMUM_PARTICIPANTS = 5;

// Helper function to safely get element and perform action
function safeElementAction(id, action) {
  const element = document.getElementById(id);
  if (element && action) {
    action(element);
  }
  return element;
}

// Sound system
class SoundManager {
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

    console.log("✓ Custom audio cleared, will use default race audio");
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

    // Stop race audio first
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

      // Loop if race duration > audio duration
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

    // Priority 3: Fallback to procedural sounds
    // Horse galloping loop - continuous hooves sound
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

// Duck class with color and advanced animation
class Duck {
  constructor(id, trackLength, name = null) {
    this.id = id;
    this.name = name || `Racer #${id}`;
    this.position = 0;
    this.speed = 0;
    this.baseSpeed = Math.random() * 0.8 + 3.2;
    this.acceleration = 0;
    this.maxSpeed = this.baseSpeed * 2.0;
    this.minSpeed = this.baseSpeed * 0.3;
    this.trackLength = trackLength;
    this.finished = false;
    this.finishTime = null;
    this.color = this.generateColor();
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.previousPosition = 0;
    this.previousRank = 0;
    // Timers now in milliseconds for delta time
    this.speedChangeTimer = 0;
    this.speedChangeInterval = 500 + Math.random() * 500; // 500-1000ms
    this.targetSpeed = this.baseSpeed;
    this.particles = [];
    this.turboActive = false;
    this.turboTimer = 0;
    this.turboDuration = 833; // ~50 frames at 60fps = 833ms
    this.wingFlapSpeed = 1;
    this.targetWingFlapSpeed = 1; // Target for smooth wing flap transitions
    this.laneOffset = 0;
    this.targetLaneOffset = 0;
    this.laneChangeTimer = 0;
    this.laneChangeInterval = 2000; // 2 seconds
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.animationFPS = 20; // Increased from 12 to 20 FPS for smoother animation

    // Lane management for finish line collision avoidance
    this.lane = Math.floor(Math.random() * 5); // 0-4: 5 lanes for smoother transitions
    this.preferredLane = this.lane;
    this.laneChangeSpeed = 0.05; // Smooth lane transitions
    this.lastLaneChangeTime = 0; // Timestamp of last lane change
    this.laneChangeCooldown = 1000; // 1 second cooldown between lane changes
  }

  generateColor() {
    const colors = [
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
      "#F8B739",
      "#52B788",
      "#E63946",
      "#457B9D",
      "#E76F51",
      "#2A9D8F",
      "#FF1493",
      "#00CED1",
      "#FF4500",
      "#32CD32",
      "#BA55D3",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  randomizeSpeed() {
    this.speed = this.baseSpeed;
    this.targetSpeed = this.baseSpeed;
  }

  update(
    time,
    currentRank,
    totalDucks,
    deltaTime = 1.0,
    inSlowdownZone = false,
  ) {
    this.previousPosition = this.position;
    if (!this.finished) {
      // Lane changing logic (time-based)
      this.laneChangeTimer -= 16.67 * deltaTime; // deltaTime normalized to 60fps frame time
      if (this.laneChangeTimer <= 0 && Math.random() > 0.85) {
        this.laneChangeTimer = this.laneChangeInterval + Math.random() * 2000; // 2000-4000ms
        this.targetLaneOffset = (Math.random() - 0.5) * 40;
      }

      // Smooth lane transition
      this.laneOffset +=
        (this.targetLaneOffset - this.laneOffset) * 0.05 * deltaTime;

      // Smooth wing flap speed transition (reduced from instant to gradual)
      this.wingFlapSpeed +=
        (this.targetWingFlapSpeed - this.wingFlapSpeed) * 0.1;

      // Animation frame update với FPS cố định 20 (increased for smoother motion)
      const currentTime = Date.now();
      const frameInterval = 1000 / this.animationFPS; // ~50ms cho 20 FPS
      if (currentTime - this.lastFrameTime >= frameInterval) {
        this.lastFrameTime = currentTime;
        this.currentFrame = (this.currentFrame + 1) % 3; // Cycle through 0, 1, 2
      }

      // Speed change with rubber banding (time-based)
      this.speedChangeTimer -= 16.67 * deltaTime;
      if (this.speedChangeTimer <= 0) {
        this.speedChangeTimer = this.speedChangeInterval;
        const rand = Math.random();

        // Strong rubber banding: leaders very likely to slow down
        const isLeader = currentRank === 1;
        const isTop3 = currentRank <= 3;
        const isTop10 = currentRank <= 10;
        const isLagging = currentRank > totalDucks * 0.5;

        // Leader (rank 1) has 60% chance to slow down
        const slowDownChance = isLeader
          ? 0.6
          : isTop3
            ? 0.45
            : isTop10
              ? 0.25
              : 0.1;
        // Leader has only 5% turbo chance, laggers have 25% chance
        const turboChance = isLeader
          ? 0.95
          : isTop3
            ? 0.85
            : isTop10
              ? 0.75
              : isLagging
                ? 0.7
                : 0.8;

        if (rand > turboChance) {
          // Extreme turbo boost - stronger for laggers
          const boostMultiplier = isLagging ? 1.8 : 1.4;
          this.targetSpeed =
            this.maxSpeed * (boostMultiplier + Math.random() * 0.5);
          this.turboActive = true;
          this.turboTimer = this.turboDuration; // 833ms (~50 frames at 60fps)
          this.targetWingFlapSpeed = 3; // Smooth transition to fast flap
        } else if (rand > 0.6) {
          // Fast speed
          this.targetSpeed = this.baseSpeed * (1.5 + Math.random() * 0.7);
          this.targetWingFlapSpeed = 2; // Smooth transition
        } else if (rand < slowDownChance) {
          // Sudden slowdown - more severe for leaders
          const slowMultiplier = isLeader ? 0.2 : isTop3 ? 0.4 : 0.6;
          this.targetSpeed =
            this.minSpeed * (slowMultiplier + Math.random() * 0.2);
          this.targetWingFlapSpeed = 0.5; // Smooth transition (increased from 0.2)
        } else {
          // Normal speed with variation
          this.targetSpeed = this.baseSpeed * (0.7 + Math.random() * 0.6);
          this.targetWingFlapSpeed = 1; // Smooth transition
        }
      }

      if (this.turboActive) {
        this.turboTimer -= 16.67 * deltaTime;
        if (this.turboTimer <= 0) {
          this.turboActive = false;
        }
        if (Math.random() > 0.7) {
          this.particles.push({
            x: this.position,
            y: 0,
            vx: (-2 - Math.random() * 2) * deltaTime,
            vy: (Math.random() - 0.5) * 2 * deltaTime,
            life: 20,
            maxLife: 20,
          });
        }
      }

      // Check if approaching finish line - only slow down in the last 50px to avoid overshooting
      const distanceToFinish =
        this.trackLength - FINISH_LINE_OFFSET - this.position;
      const decelerationZone = 50;

      if (distanceToFinish <= decelerationZone && distanceToFinish > 0) {
        // Gradually slow down as approaching finish line
        const slowdownFactor = distanceToFinish / decelerationZone;
        this.targetSpeed = this.baseSpeed * slowdownFactor * 0.5;
      }

      // Smooth acceleration - REDUCED for ultra-smooth movement
      // Lower value = slower speed transitions = smoother camera tracking
      this.acceleration = (this.targetSpeed - this.speed) * 0.05; // Reduced from 0.15 to 0.05
      this.speed += this.acceleration;
      this.speed = Math.max(
        this.minSpeed,
        Math.min(this.maxSpeed * 1.7, this.speed),
      );

      // Boost speed when camera/background are stopping (inSlowdownZone) to maintain visual motion
      let speedMultiplier = 1.0;
      if (inSlowdownZone) {
        // Increase multiplier as camera slows down (1.0 to 1.8x) - reduced for smoother motion
        const leader = this.trackLength - this.position;
        const slowdownProgress = Math.max(0, Math.min(1, (500 - leader) / 500)); // 0 at 500px, 1 at finish
        speedMultiplier = 1.0 + slowdownProgress * 0.8; // Gradually increase from 1.0x to 1.8x
      }

      // Position movement normalized to 60 FPS - removed random jitter for smooth motion
      this.position += this.speed * deltaTime * speedMultiplier;

      // Update particles (time-based)
      this.particles = this.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // Visual duck center is ~FINISH_LINE_OFFSET px before the right edge of 150px icon
      // Allow duck to pass finish line and continue with deceleration (inertia)
      if (
        this.position >= this.trackLength - FINISH_LINE_OFFSET &&
        !this.finished
      ) {
        this.finished = true;
        this.finishTime = Date.now();
        // Don't stop immediately - let duck continue with gradual slowdown for realism
        // Set target speed to slowly decelerate
        this.targetSpeed = this.speed * 0.3; // Reduce to 30% of current speed
      }

      // Continue moving even after finishing (with deceleration) for visual realism
      // Will be stopped by race end logic in animate()
    } else {
      // Duck has finished - continue with gradual deceleration
      this.speed *= 0.95; // Gradually slow down (95% each frame)
      if (this.speed > 0.1) {
        this.position += this.speed * deltaTime;
      }
    }
  }

  getWobble(time) {
    // WOBBLE COMPLETELY DISABLED - causes violent shaking when camera moves
    return 0;
  }

  getSpeedIndicator() {
    const speedPercent = this.speed / this.maxSpeed;
    if (this.turboActive) return "🔥";
    if (speedPercent > 0.8) return "⚡";
    if (speedPercent < 0.4) return "💤";
    return "";
  }
}

console.log("Classes loaded successfully");

// Game class with all features
class Game {
  // Always use topN mode with configurable winner count
  handleWinnerCountChange(val) {
    const n = parseInt(val);
    this.raceMode = "topN"; // Always use topN mode
    this.winnerCount = n;
    console.log("[TopN Mode] Winner count:", n);
  }
  // Force update all duck sizes (live update)
  forceUpdateDuckSize() {
    const duckHeight = this.trackHeight * this.duckSizeRatio;
    for (const [id, duckEl] of this.duckElements.entries()) {
      duckEl.style.width = `${duckHeight}px`;
      duckEl.style.height = `${duckHeight}px`;
      const img = duckEl.querySelector(".duck-icon");
      if (img) {
        img.style.width = `${duckHeight}px`;
        img.style.height = `${duckHeight}px`;
      }
    }
    console.log("[DuckSize] forceUpdateDuckSize:", duckHeight);
  }
  constructor(isDisplayMode = false) {
    // Set display mode FIRST before any other initialization
    this.isDisplayMode = isDisplayMode;

    this.ducks = [];
    this.duckCount = 300;
    this.raceDuration = 30;
    this.gameSpeed = 1.0; // Game speed multiplier: 0.25x to 3x
    this.raceMode = "topN"; // Always use topN mode with variable winner count
    this.winnerCount = null; // Will be set by race script only - no default
    this.winners = []; // Array to store accumulated winners across races
    this.currentRaceWinners = []; // Array to store winners for current race only (topN mode)

    // Prize management - separate for race and result
    this.prizeRaceList =
      JSON.parse(localStorage.getItem("prizeRaceList")) || [];
    this.prizeResultAssignments =
      JSON.parse(localStorage.getItem("prizeResultAssignments")) || [];
    this.usedPrizesCount =
      parseInt(localStorage.getItem("usedPrizesCount")) || 0; // Track số giải đã trao

    // Race Scripts Management - Each script represents one race session
    this.raceScripts = JSON.parse(localStorage.getItem("raceScripts")) || [];
    this.currentScriptPrizeName = null; // Store prize name from current running script

    this.trackContainer = null;
    this.duckElements = new Map();

    // Finish ordering for staggered finish visuals
    this.nextFinishOrder = 1; // incremental finish order counter
    this.finishSpacingRatio = 0.6; // spacing multiplier relative to duckHeight
    this.maxFinishStack = 60; // cap for total finish offset steps to avoid huge stacking
    // Safe zone distance (px) from finish where lane switching is disabled
    // Default: 0 (disabled) so ducks finish naturally; can be adjusted in settings
    this.finishSafeZone = 0; // default 0px; configurable via settings

    this.trackLength = 0;
    this.raceStarted = false;
    this.raceFinished = false;
    this.racePaused = false;
    this.animationId = null;
    this.startTime = null;
    this.pausedTime = 0;
    this.rankings = [];
    this.soundManager = new SoundManager();

    // Setup sound toggle listener in index.html (not display mode)
    if (!isDisplayMode) {
      setTimeout(() => {
        const soundToggleEl = document.getElementById("soundToggle");
        const soundToggleControlEl =
          document.getElementById("soundToggleControl");

        // Sync both checkboxes
        const updateSound = (enabled) => {
          this.soundManager.setEnabled(enabled);
          // Sync both checkboxes
          if (soundToggleEl) soundToggleEl.checked = enabled;
          if (soundToggleControlEl) soundToggleControlEl.checked = enabled;
          // Broadcast to display.html
          if (this.displayChannel) {
            this.displayChannel.postMessage({
              type: "SOUND_TOGGLE_CHANGED",
              data: { enabled },
            });
            console.log(
              "📢 Sound toggle changed:",
              enabled,
              "- sent to display",
            );
          }
        };

        if (soundToggleEl) {
          soundToggleEl.addEventListener("change", (e) => {
            updateSound(e.target.checked);
          });
        }

        if (soundToggleControlEl) {
          soundToggleControlEl.addEventListener("change", (e) => {
            updateSound(e.target.checked);
          });
        }

        // Setup custom sound file input
        const customSoundFileEl = document.getElementById("customSoundFile");
        if (customSoundFileEl) {
          customSoundFileEl.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            console.log("Loading audio file:", file.name);
            try {
              await this.soundManager.loadAudioFile(file);

              // Share with display.html via BroadcastChannel
              const reader = new FileReader();
              const self = this; // Save this context
              reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                // Convert to base64 for transmission
                const base64 = btoa(
                  new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    "",
                  ),
                );

                // Save to localStorage so display can load after refresh
                try {
                  localStorage.setItem("customAudioData", base64);
                  localStorage.setItem("customAudioFileName", file.name);
                  console.log("💾 Custom audio saved to localStorage");
                } catch (e) {
                  console.warn("⚠️ Could not save audio to localStorage:", e);
                }

                if (self.displayChannel) {
                  self.displayChannel.postMessage({
                    type: "CUSTOM_AUDIO_LOADED",
                    data: {
                      audioData: base64,
                      fileName: file.name,
                    },
                  });
                  console.log("📢 Custom audio sent to display:", file.name);
                  alert(
                    "✓ Custom sound loaded: " +
                      file.name +
                      "\n\n📺 If display window is already open, please REFRESH it (Ctrl+F5) to apply the new sound!",
                  );
                } else {
                  console.warn(
                    "⚠️ Display channel not available - display window may not be open",
                  );
                  alert(
                    "✓ Custom sound loaded: " +
                      file.name +
                      "\n\n⚠️ Please open Display window to use custom sound!",
                  );
                }

                // Update UI to show loaded file
                self.updateAudioFileStatus(file.name);
              };
              reader.readAsArrayBuffer(file);
            } catch (error) {
              alert("❌ Error loading audio file: " + error.message);
            }
          });
        }
      }, 100);
    }

    // Performance optimization - viewport culling
    this.viewportBuffer = 500; // Render ducks 500px outside viewport
    this.visibleDucks = new Set(); // Track which ducks are currently visible

    // Canvas rendering for large races (performance boost)
    this.useCanvasRendering = false; // Auto-enabled for 100+ ducks
    this.canvas = null;
    this.ctx = null;
    this.canvasUpdateBatch = []; // Batch canvas updates

    // Web Workers for multi-threaded physics (large races)
    this.useWorkers = false; // Auto-enabled for 1000+ ducks
    this.workers = [];
    this.workerCount = 4; // Number of worker threads
    this.pendingWorkerUpdates = 0;
    this.workerDuckBatches = []; // Ducks split into batches for workers

    // Delta time normalization - 60 FPS baseline
    this.targetFPS = 60;
    this.targetFrameTime = 1000 / this.targetFPS; // ~16.67ms
    this.lastFrameTime = 0;
    this.deltaTime = 1.0; // Multiplier for frame-independent movement
    this.smoothedDeltaTime = 1.0; // Smoothed delta time to prevent jitter

    // Smooth camera system with velocity
    this.cameraOffset = 0;
    this.cameraVelocity = 0; // Camera movement velocity for smooth soft start/stop
    this.smoothCameraTarget = 0; // EMA smoothed target for ultra-smooth movement
    this.lastCameraOffset = 0; // Track last camera position to prevent backwards movement
    this.backgroundOffset = 0;
    this.targetBackgroundOffset = 0; // Target position for smooth background scrolling
    this.finishLinePosition = 0; // Track finish line position for smooth reveal
    this.finishLinePreviewShown = false; // Track if finish line preview animation is done
    this.finishLinePreviewStartTime = 0; // When preview started
    this.finishLineRevealDistance = 3000; // Distance to start revealing finish line (early reveal)
    this.duckVisualSpeed = 0; // Visual animation speed when background stops
    this.viewportWidth = 0;
    this.trackHeight = 0;
    this.duckSizeRatio = 0.5; // global ratio: duck height = trackHeight * duckSizeRatio (default 50%)
    this.isFullscreen = false;

    this.stats = this.loadStats();
    this.currentRaceNumber = this.stats.totalRaces + 1;
    // this.highlights = [];
    this.raceHistory = [];

    this.duckNames = [];
    this.duckCodes = []; // Store employee codes
    this.activeDuckNames = []; // Danh sách vịt đang tham gia (sẽ giảm dần)
    this.activeDuckCodes = []; // Mã NV tương ứng
    this.winners = this.loadWinners(); // Danh sách các vịt đã thắng
    this.excludedDucks = []; // Danh sách các vịt bị loại

    this.winnerAnimationFrame = 0;
    this.winnerAnimationInterval = null;

    this.duckImages = []; // Mỗi phần tử sẽ là array 3 ảnh [frame1, frame2, frame3]
    this.iconCount = 44; // output_3 có 44 folders
    this.imagesLoaded = false;
    this.displayIconsLoaded = false; // Track if display has loaded icons
    this.currentTheme = "output_3"; // Sử dụng output_3

    this.currentTab = "settings"; // Track current tab

    // Display tab management (user opens display.html manually in new tab)
    this.displayReady = false; // Track if display tab is ready to receive messages
    this.displayChannel = new BroadcastChannel("race_display");
    this.forceClusterCamera = false; // Default - can be overridden by persisted setting
    // isDisplayMode already set in constructor parameter

    // Listen for display ready and race finish
    this.displayChannel.onmessage = (event) => {
      const msg = event.data || {};
      const type = msg.type;
      const data = msg.data;
      // Live update duck size from control tab
      if (type === "UPDATE_DUCK_SIZE") {
        this.duckSizeRatio = data.duckSizeRatio;
        console.log(
          "[DuckSize][display] Received UPDATE_DUCK_SIZE:",
          data.duckSizeRatio,
        );
        if (
          this.useCanvasRendering &&
          typeof this.updateDuckPositionsCanvas === "function"
        ) {
          this.updateDuckPositionsCanvas();
        } else if (typeof this.forceUpdateDuckSize === "function") {
          this.forceUpdateDuckSize();
        }
        console.log(
          "[DuckSize][display] Updated duckSizeRatio:",
          this.duckSizeRatio,
        );
        return;
      }
      if (type === "DISPLAY_READY") {
        console.log("✅ Display window is READY to receive messages");
        this.displayReady = true;
      } else if (type === "DISPLAY_ICONS_LOADED") {
        const iconCount = data.iconCount || 0;
        console.log(
          "✅ Display icons loaded successfully -",
          iconCount,
          "icons",
        );

        // Only accept if display has actually loaded icons
        if (iconCount === 0) {
          console.warn(
            "⚠️ Display reported icons loaded but iconCount is 0 - ignoring",
          );
          return;
        }

        this.displayIconsLoaded = true;
        // Send confirmation back to display to stop retry
        this.displayChannel.postMessage({
          type: "CONTROL_ICONS_ACK",
          data: {},
        });
        // Enable Start button ONLY if both control and display have loaded icons
        if (this.imagesLoaded && this.iconCount > 0) {
          console.log(
            "✅ Both control (" +
              this.iconCount +
              ") and display (" +
              iconCount +
              ") icons ready - enabling Start button",
          );
          this.enableStartButton();
        } else {
          console.log(
            "⏳ Control icons not ready yet. Control:",
            this.imagesLoaded,
            this.iconCount,
          );
        }
      } else if (type === "FORCE_CLUSTER_CAMERA") {
        // Remote toggle from control or display - set local flag
        const enabled = !!(data && data.enabled);
        this.forceClusterCamera = enabled;
        console.log("📢 FORCE_CLUSTER_CAMERA received - enabled:", enabled);
      } else if (type === "DISPLAY_RACE_FINISHED") {
        // Display has detected winner and sent it back
        console.log("✅ Received DISPLAY_RACE_FINISHED from display");
        this.handleDisplayRaceFinished(data);
      } else if (type === "SHOW_RESULTS_ASSIGNED") {
        // Display custom assigned results on display screen
        console.log("✅ Received SHOW_RESULTS_ASSIGNED for display");
        this.displayCustomAssignedResults(data);
      }
    };

    // Request display status after listener is ready (in case display opened before control)
    setTimeout(() => {
      console.log("Control ready - requesting display icon status...");
      this.displayChannel.postMessage({
        type: "REQUEST_ICONS_STATUS",
        data: {},
      });
    }, 500);

    // this.updateStatsDisplay(); // Stats panel removed
    // Update history to display victory history on load
    this.updateHistoryWin();

    // Load result panel settings for both control and display mode
    this.loadResultPanelSettings();

    // Only detect themes and load images if NOT in display mode
    // Display mode will load icons immediately to be ready
    if (!this.isDisplayMode) {
      this.detectAvailableThemes();
      this.detectAndLoadDuckImages();

      // Update Start button state based on existing scripts
      setTimeout(() => {
        this.updateStartButtonState();
      }, 100);
    } else {
      console.log("Display mode: Loading icons immediately...");
      this.detectAndLoadDuckImages();
    }
  }

  checkBothIconsLoaded() {
    // Only enable Start Race if both control and display have loaded icons
    if (this.imagesLoaded && this.displayIconsLoaded) {
      console.log(
        "✅ Both control and display icons loaded - enabling Start Race",
      );
      this.enableStartButton();
    } else {
      console.log(
        "⏳ Waiting for icons... Control:",
        this.imagesLoaded,
        "Display:",
        this.displayIconsLoaded,
      );
    }
  }

  initDisplayMode() {
    // Called when START_RACE is received - load images on demand
    console.log("initDisplayMode: Loading images for race...");
    this.detectAndLoadDuckImages();
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    if (tabName === "settings") {
      document.getElementById("settingsTab").classList.add("active");
      document.getElementById("settingsTabContent").classList.add("active");
    } else if (tabName === "game") {
      document.getElementById("gameTab").classList.add("active");
      document.getElementById("gameTabContent").classList.add("active");
    }

    this.currentTab = tabName;
  }

  // DEPRECATED: openDisplayWindow() - Display is now opened manually by user in new tab
  // openDisplayWindow() {
  //     ... (code kept for reference but not used)
  // }

  // Removed getPrizeTitle, savePrizeTitle, addPrizeNameField, removePrizeNameField, sortPrizeNames, savePrizeNames
  // Prize name now comes from script only via this.currentScriptPrizeName

  getPositionSuffix(pos) {
    if (pos === 1) return "st";
    if (pos === 2) return "nd";
    if (pos === 3) return "rd";
    return "th";
  }

  // Compute center position of the densest cluster of ducks within a sliding window
  // Returns an object { center, count }
  getDensestClusterCenter(windowWidth) {
    if (!this.ducks || this.ducks.length === 0) return { center: 0, count: 0 };

    // Extract positions and sort
    const positions = this.ducks.map((d) => d.position).sort((a, b) => a - b);

    // Exclude extreme outliers: remove top/bottom K elements
    const K = Math.max(5, Math.floor(positions.length * 0.01)); // at least 5 or 1%
    const filtered = positions.slice(K, Math.max(K, positions.length - K));

    if (!filtered || filtered.length === 0) {
      // fallback to median of original positions
      const mid = Math.floor(positions.length / 2);
      return { center: positions[mid] || 0, count: positions.length };
    }

    let bestCount = 0;
    let bestCenter = filtered[Math.floor(filtered.length / 2)] || 0;

    // Two-pointer sliding window to find maximal count in windowWidth
    let j = 0;
    for (let i = 0; i < filtered.length; i++) {
      const leftPos = filtered[i];
      while (j < filtered.length && filtered[j] <= leftPos + windowWidth) {
        j++;
      }
      const count = j - i;
      if (count > bestCount) {
        bestCount = count;
        // Compute center of this window (mean)
        const segment = filtered.slice(i, j);
        const center = segment.reduce((s, v) => s + v, 0) / segment.length;
        bestCenter = center;
      }
    }

    return { center: bestCenter, count: bestCount };
  }

  // Get display name with employee code (if available)
  getDisplayName(duck) {
    if (duck.code) {
      return `${duck.code} - ${duck.name}`;
    }
    return duck.name;
  }

  // loadPrizeNames() removed - prize names now come from scripts only

  toggleResultPanelSettings() {
    const container = document.getElementById("resultPanelSettingsContainer");
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    }
  }

  toggleBackgroundSettings() {
    const container = document.getElementById("backgroundSettingsContainer");
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
      } else {
        container.style.display = "none";
      }
    }
  }

  togglePlayerListSection() {
    const container = document.getElementById("playerListContainer");
    const btn = event.target;
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
        btn.textContent = "−";
      } else {
        container.style.display = "none";
        btn.textContent = "+";
      }
    }
  }

  toggleAudioSection() {
    const container = document.getElementById("audioContainer");
    const btn = event.target;
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
        btn.textContent = "−";
      } else {
        container.style.display = "none";
        btn.textContent = "+";
      }
    }
  }

  toggleDisplaySection() {
    const container = document.getElementById("displayContainer");
    const btn = event.target;
    if (container) {
      if (container.style.display === "none") {
        container.style.display = "block";
        btn.textContent = "−";
      } else {
        container.style.display = "none";
        btn.textContent = "+";
      }
    }
  }

  // --- RACE PRIZE MANAGEMENT ---
  addPrizeField(type) {
    if (type === "race") {
      this.prizeRaceList.push(`Giải mới ${this.prizeRaceList.length + 1}`);
      this.renderPrizeRaceUI();
      this.renderSimplePrizeUI(); // Update simplified UI as well
      this.renderRaceScripts(); // Update race scripts UI as well
    }
  }

  renderPrizeRaceUI() {
    const container = document.getElementById("prizeNamesRaceContainer");
    if (!container) return;

    // Also render race scripts UI
    this.renderRaceScripts();

    // Also render simplified UI
    this.renderSimplePrizeUI();

    if (this.prizeRaceList.length === 0) {
      container.innerHTML =
        '<p style="color: #888; padding: 10px; text-align: center;">Chưa có giải thưởng. Hãy thêm nhóm giải bên trên.</p>';
      return;
    }

    container.innerHTML = this.prizeRaceList
      .map((prize, index) => {
        const isUsed = index < this.usedPrizesCount;
        const opacity = isUsed ? "0.5" : "1";
        const disabled = isUsed ? "disabled" : "";
        const cursor = isUsed ? "not-allowed" : "pointer";
        const bgColor = isUsed ? "#1a1a1a" : "#222";

        return `
        <div style="display: flex; gap: 5px; align-items: center; opacity: ${opacity};">
            <label style="min-width: 60px; color: ${isUsed ? "#666" : "#ffd700"}; font-weight: bold;">Prize ${index + 1}:</label>
            <input type="text" value="${prize}" onchange="game.updatePrizeRaceName(${index}, this.value)" 
                   ${disabled}
                   style="flex: 1; padding: 5px; background: ${bgColor}; color: white; border: 1px solid #444; border-radius: 3px; cursor: ${isUsed ? "not-allowed" : "text"};">
            <button onclick="game.removePrizeRace(${index});" 
                    ${disabled}
                    style="background:#c0392b; color:white; border:none; padding: 0 10px; border-radius: 3px; cursor: ${cursor}; opacity: ${isUsed ? "0.5" : "1"};">X</button>
            ${isUsed ? '<span style="color: #27ae60; font-size: 12px; min-width: 80px;">✓ Đã trao</span>' : ""}
        </div>
    `;
      })
      .join("");
  }

  addPrizeGroup() {
    const nameInput = document.getElementById("prizeGroupName");
    const countInput = document.getElementById("prizeGroupCount");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Số người phải lớn hơn 0!");
      countInput.focus();
      return;
    }

    if (count > 100) {
      if (!confirm(`Bạn có chắc muốn tạo ${count} giải? Số lượng khá lớn.`)) {
        return;
      }
    }

    // Add N prizes with same name
    for (let i = 0; i < count; i++) {
      this.prizeRaceList.push(prizeName);
    }

    // Save to localStorage
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));

    // Update UI
    this.renderPrizeRaceUI();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    // Auto-show the prizes list
    const displayContainer = document.getElementById("racePrizesDisplay");
    if (displayContainer) {
      displayContainer.style.display = "block";
      this.showRacePrizes(); // This will populate the content
    }

    alert(
      `✓ Đã thêm ${count} giải "${prizeName}"!\nTổng số giải: ${this.prizeRaceList.length}`,
    );
    console.log(`✓ Added ${count} prizes:`, prizeName);
  }

  // Race Scripts Management - Each script represents one race session
  addRaceScript() {
    const nameInput = document.getElementById("simplePrizeName");
    const countInput = document.getElementById("simplePrizeCount");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Số người phải lớn hơn 0!");
      countInput.focus();
      return;
    }

    // Initialize race scripts array if not exists
    if (!this.raceScripts) {
      this.raceScripts = JSON.parse(localStorage.getItem("raceScripts")) || [];
    }

    // Create new race script
    const script = {
      id: Date.now(),
      prizeName: prizeName,
      winnerCount: count,
      status: "pending", // pending, running, completed
      createdAt: new Date().toISOString(),
    };

    this.raceScripts.push(script);
    localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));

    // Update UI
    this.renderRaceScripts();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    console.log(`✓ Created race script:`, script);
  }

  renderRaceScripts() {
    const container = document.getElementById("raceScriptsList");
    if (!container) return;

    if (!this.raceScripts) {
      this.raceScripts = JSON.parse(localStorage.getItem("raceScripts")) || [];
    }

    if (this.raceScripts.length === 0) {
      container.innerHTML =
        '<i style="color: #888;">Chưa có script nào được tạo...</i>';
      return;
    }

    let html = `
      <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #444;">
        <span style="color: #ffd700;">Tổng scripts:</span> <b>${this.raceScripts.length}</b> | 
        <span style="color: #2ecc71;">Pending:</span> <b>${this.raceScripts.filter((s) => s.status === "pending").length}</b> | 
        <span style="color: #3498db;">Completed:</span> <b>${this.raceScripts.filter((s) => s.status === "completed").length}</b>
      </div>
    `;

    this.raceScripts.forEach((script, index) => {
      const statusColor =
        script.status === "completed"
          ? "#2ecc71"
          : script.status === "running"
            ? "#e67e22"
            : "#888";
      const statusIcon =
        script.status === "completed"
          ? "✓"
          : script.status === "running"
            ? "▶"
            : "○";
      const isRunning = script.status === "running";
      const isCompleted = script.status === "completed";

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding: 8px 0; background: ${isCompleted ? "rgba(46, 204, 113, 0.1)" : "transparent"}; margin: 0 -8px; padding: 8px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${statusColor}; font-size: 16px;">${statusIcon}</span>
              <span style="color: #ffd700; font-weight: bold;">${script.prizeName}</span>
              <span style="color: #67e8f9; font-size: 12px;">(${script.winnerCount} người)</span>
            </div>
            <div style="font-size: 11px; color: #666; margin-top: 2px; margin-left: 24px;">
              ${new Date(script.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
          <div style="display: flex; gap: 5px;">
            <button 
              onclick="game.${isRunning ? `cancelRunningScript(${script.id})` : `startRaceWithScript(${script.id})`}" 
              style="
                background: ${isCompleted ? "#95a5a6" : isRunning ? "#e67e22" : "#27ae60"};
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: ${isCompleted ? "not-allowed" : "pointer"};
                font-size: 13px;
                font-weight: bold;
              "
              ${isCompleted ? "disabled" : ""}
              ${isRunning ? 'title="Click để hủy chọn script này"' : ""}
            >
              ${isCompleted ? "✓ Done" : isRunning ? "Running... ✕" : "▶ START"}
            </button>
            <button 
              onclick="game.deleteRaceScript(${script.id})" 
              style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size: 16px;"
              ${isRunning ? 'disabled title="Không thể xóa script đang chạy"' : ""}
            >✕</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Update Start button state based on scripts
    this.updateStartButtonState();
  }

  // Update Start button state - disable if no running script
  updateStartButtonState() {
    if (this.isDisplayMode) return; // Only for control panel

    const controlStartBtn = document.getElementById("controlStartBtn");
    if (!controlStartBtn) return;

    // Check if there's a running script
    const hasRunningScript =
      this.raceScripts && this.raceScripts.some((s) => s.status === "running");

    if (hasRunningScript) {
      controlStartBtn.disabled = false;
      controlStartBtn.style.opacity = "1";
      controlStartBtn.style.cursor = "pointer";
    } else {
      controlStartBtn.disabled = true;
      controlStartBtn.style.opacity = "0.5";
      controlStartBtn.style.cursor = "not-allowed";
      controlStartBtn.title = "Vui lòng chọn script để chạy";
    }
  }

  // Cancel running script and return to pending state
  cancelRunningScript(scriptId) {
    const script = this.raceScripts.find((s) => s.id === scriptId);
    if (!script) {
      alert("Không tìm thấy script!");
      return;
    }

    if (script.status !== "running") {
      alert("Script không ở trạng thái running!");
      return;
    }

    // Check if race has started
    if (this.raceStarted && !this.raceFinished) {
      alert(
        "⚠️ Không thể hủy script khi đua đang chạy!\n\nVui lòng đợi cuộc đua kết thúc hoặc nhấn Home để dừng.",
      );
      return;
    }

    // Confirm cancellation
    if (
      !confirm(
        `Hủy chọn script "${script.prizeName}"?\n\nScript sẽ trở về trạng thái chờ.`,
      )
    ) {
      return;
    }

    // Reset script to pending
    script.status = "pending";
    delete script.startedAt;

    // Remove blinking effect from START button
    const startBtn = document.getElementById("controlStartBtn");
    if (startBtn) {
      startBtn.classList.remove("btn-blinking");
    }
    localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));

    // Clear current script prize name
    this.currentScriptPrizeName = null;

    // Re-render UI
    this.renderRaceScripts();

    console.log(`✓ Script cancelled and reset to pending:`, script);
  }

  startRaceWithScript(scriptId) {
    const script = this.raceScripts.find((s) => s.id === scriptId);
    if (!script) {
      alert("Không tìm thấy script!");
      return;
    }

    if (script.status === "completed") {
      alert("Script này đã chạy xong!");
      return;
    }

    if (script.status === "running") {
      alert("Script đang chạy!");
      return;
    }

    // Check if another script is already running
    const runningScript = this.raceScripts.find(
      (s) => s.status === "running" && s.id !== scriptId,
    );
    if (runningScript) {
      alert(
        `Có script khác đang chạy: "${runningScript.prizeName}"!\nVui lòng đợi script hiện tại hoàn thành.`,
      );
      return;
    }

    // Check if display is connected
    if (!this.displayReady) {
      const openDisplay = confirm(
        `⚠️ Chưa mở Display!\n\n` +
          `Vui lòng:\n` +
          `1. Nhấn "OK" để tiếp tục mở Display\n` +
          `2. Nhấn nút "📺 Open Display" ở góc trên bên phải\n` +
          `3. Sau khi Display đã sẵn sàng, quay lại đây và nhấn START lại\n\n` +
          `Nhấn "Cancel" nếu muốn chạy mà không có Display (không khuyến nghị).`,
      );

      if (openDisplay) {
        alert(
          "📺 Hãy nhấn nút 'Open Display' ở góc trên bên phải màn hình!\n\n" +
            "Sau khi Display đã mở, quay lại đây và nhấn START lại.",
        );
        return;
      } else {
        // User chose to continue without display
        console.warn("⚠️ User chose to start race without display");
      }
    }

    // Set up race with script configuration
    // Create prizeRaceList with unique names for each winner
    this.prizeRaceList = [];
    for (let i = 0; i < script.winnerCount; i++) {
      // If script has multiple winners, append position number to prize name
      if (script.winnerCount > 1) {
        this.prizeRaceList.push(`${script.prizeName} ${i + 1}`);
      } else {
        this.prizeRaceList.push(script.prizeName);
      }
    }

    this.winnerCount = script.winnerCount;
    this.usedPrizesCount = 0;
    this.currentScriptPrizeName = script.prizeName; // Save current script's prize name

    // Update winnerCount input
    const winnerCountInput = document.getElementById("winnerCount");
    if (winnerCountInput) {
      winnerCountInput.value = this.winnerCount;
    }

    // Save to localStorage - IMPORTANT: save winnerCount to prevent override
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    localStorage.setItem("usedPrizesCount", "0");
    localStorage.setItem("winnerCount", this.winnerCount.toString());

    console.log(
      `✓ Script config: winnerCount=${this.winnerCount}, prizeName="${script.prizeName}"`,
    );

    // Mark script as running
    script.status = "running";
    script.startedAt = new Date().toISOString();
    localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));
    this.renderRaceScripts();

    // Add blinking effect to START button
    const startBtn = document.getElementById("controlStartBtn");
    if (startBtn) {
      startBtn.classList.add("btn-blinking");
    }

    // Reset result assignments to avoid mixing with previous script
    this.prizeResultAssignments = [];
    localStorage.removeItem("prizeResultAssignments");
    if (this.renderPrizeAssignmentUI) {
      this.renderPrizeAssignmentUI();
    }

    // Start the race
    this.startRace();

    console.log(`✓ Started race with script:`, script);
  }

  deleteRaceScript(scriptId) {
    const script = this.raceScripts.find((s) => s.id === scriptId);
    if (script && script.status === "running") {
      alert("Không thể xóa script đang chạy!");
      return;
    }

    if (confirm("Xóa script này?")) {
      this.raceScripts = this.raceScripts.filter((s) => s.id !== scriptId);
      localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));
      this.renderRaceScripts();
      console.log(`✓ Deleted race script: ${scriptId}`);
    }
  }

  markScriptCompleted(scriptId) {
    const script = this.raceScripts.find((s) => s.id === scriptId);
    if (script) {
      script.status = "completed";
      script.completedAt = new Date().toISOString();
      localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));
      this.renderRaceScripts(); // Re-render UI to show completed status
      console.log(`✓ Marked script as completed:`, script);
    }
  }

  // Simplified prize management functions (legacy - for backward compatibility)
  addSimplePrize() {
    const nameInput = document.getElementById("simplePrizeName");
    const countInput = document.getElementById("simplePrizeCount");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Số người phải lớn hơn 0!");
      countInput.focus();
      return;
    }

    if (count > 100) {
      if (!confirm(`Bạn có chắc muốn tạo ${count} giải? Số lượng khá lớn.`)) {
        return;
      }
    }

    // Add N prizes with same name
    for (let i = 0; i < count; i++) {
      this.prizeRaceList.push(prizeName);
    }

    // Auto-update winnerCount to match total prizes
    this.winnerCount = this.prizeRaceList.length;
    const winnerCountInput = document.getElementById("winnerCount");
    if (winnerCountInput) {
      winnerCountInput.value = this.winnerCount;
    }

    // Save to localStorage
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));

    // Update both UIs
    this.renderPrizeRaceUI();
    this.renderSimplePrizeUI();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    console.log(
      `✓ Added ${count} prizes: "${prizeName}". Total winners: ${this.winnerCount}`,
    );
  }

  renderSimplePrizeUI() {
    const container = document.getElementById("simplePrizeList");
    if (!container) return;

    if (this.prizeRaceList.length === 0) {
      container.innerHTML =
        '<i style="color: #888;">Chưa có giải nào được thêm...</i>';
      return;
    }

    let html = `
      <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #444;">
        <span style="color: #ffd700;">Tổng số giải:</span> <b>${this.prizeRaceList.length}</b> | 
        <span style="color: #e74c3c;">Đã trao:</span> <b>${this.usedPrizesCount}</b> | 
        <span style="color: #2ecc71;">Còn lại:</span> <b>${this.prizeRaceList.length - this.usedPrizesCount}</b>
      </div>
    `;

    this.prizeRaceList.forEach((prize, index) => {
      const isUsed = index < this.usedPrizesCount;
      const opacity = isUsed ? "opacity: 0.5;" : "";
      const status = isUsed ? '<span style="color: #2ecc71;">✓</span>' : "";

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding: 5px 0; ${opacity}">
          <span>${index + 1}. <b>${prize}</b> ${status}</span>
          <button 
            onclick="game.removeSimplePrize(${index})" 
            style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size: 16px;"
            ${isUsed ? 'disabled title="Không thể xóa giải đã trao"' : ""}
          >✕</button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  removeSimplePrize(index) {
    // Check if this prize was already awarded
    if (index < this.usedPrizesCount) {
      alert(
        "Không thể xóa giải đã được trao!\nVui lòng Reset History nếu muốn xóa tất cả.",
      );
      return;
    }

    if (confirm(`Xóa giải "${this.prizeRaceList[index]}"?`)) {
      this.prizeRaceList.splice(index, 1);

      // Update winnerCount
      this.winnerCount = this.prizeRaceList.length;
      const winnerCountInput = document.getElementById("winnerCount");
      if (winnerCountInput) {
        winnerCountInput.value = this.winnerCount;
      }

      // Save and update UI
      localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
      this.renderPrizeRaceUI();
      this.renderSimplePrizeUI();

      console.log(
        `✓ Removed prize at index ${index}. Total winners: ${this.winnerCount}`,
      );
    }
  }

  clearAllPrizes() {
    // Check if any prizes have been awarded
    if (this.usedPrizesCount > 0) {
      alert(
        `Không thể xóa tất cả giải vì đã có ${this.usedPrizesCount} giải được trao!\nVui lòng Reset History trước.`,
      );
      return;
    }

    if (this.prizeRaceList.length === 0) {
      alert("Danh sách giải đang trống!");
      return;
    }

    if (
      !confirm(`Bạn có chắc muốn xóa tất cả ${this.prizeRaceList.length} giải?`)
    ) {
      return;
    }

    // Clear all prizes
    this.prizeRaceList = [];
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));

    // Update UI
    this.renderPrizeRaceUI();

    alert("✓ Đã xóa tất cả giải thưởng!");
    console.log("✓ Cleared all prizes");
  }

  updatePrizeRaceName(index, value) {
    this.prizeRaceList[index] = value;
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    console.log(`✓ Updated prize ${index + 1}: "${value}"`);
  }

  removePrizeRace(index) {
    if (this.prizeRaceList.length <= 1) {
      alert("Phải giữ ít nhất 1 giải thưởng!");
      return;
    }
    if (index < this.usedPrizesCount) {
      alert("Không thể xóa giải đã trao! Vui lòng reset history trước.");
      return;
    }
    this.prizeRaceList.splice(index, 1);
    this.renderPrizeRaceUI();
  }

  applyPrizeRace() {
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    alert("✓ Đã áp dụng danh sách giải thưởng cho cuộc đua!");
    console.log("✓ Prize race list saved:", this.prizeRaceList);
  }

  // --- RESULT PRIZE ASSIGNMENT (CUSTOM WINNER SELECTION) ---
  addPrizeAssignmentField() {
    this.prizeResultAssignments.push({ prizeName: "Tên giải", winnerId: "" });
    this.renderPrizeAssignmentUI();
  }

  addPrizeResultGroup() {
    const nameInput = document.getElementById("prizeResultGroupName");
    const countInput = document.getElementById("prizeResultGroupCount");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Số người phải lớn hơn 0!");
      countInput.focus();
      return;
    }

    if (count > 50) {
      if (
        !confirm(
          `Bạn có chắc muốn tạo ${count} hàng gán giải? Số lượng khá lớn.`,
        )
      ) {
        return;
      }
    }

    // Add N assignment fields with same prize name
    for (let i = 0; i < count; i++) {
      this.prizeResultAssignments.push({ prizeName: prizeName, winnerId: "" });
    }

    // Update UI
    this.renderPrizeAssignmentUI();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    alert(`✓ Đã thêm ${count} hàng gán giải "${prizeName}"!`);
    console.log(`✓ Added ${count} result assignment rows:`, prizeName);
  }

  clearAllResultAssignments() {
    if (this.prizeResultAssignments.length === 0) {
      alert("Danh sách gán giải đang trống!");
      return;
    }

    if (
      !confirm(
        `Bạn có chắc muốn xóa tất cả ${this.prizeResultAssignments.length} hàng gán giải?`,
      )
    ) {
      return;
    }

    // Clear all assignments
    this.prizeResultAssignments = [];
    localStorage.removeItem("prizeResultAssignments");

    // Update UI
    this.renderPrizeAssignmentUI();

    console.log("✓ All prize result assignments cleared");
    alert("✓ Đã xóa tất cả gán giải!");
  }

  reverseAssignments() {
    if (this.prizeResultAssignments.length === 0) {
      alert("Danh sách gán giải đang trống!");
      return;
    }

    // Reverse the array
    this.prizeResultAssignments.reverse();

    // Save to localStorage
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Update UI
    this.renderPrizeAssignmentUI();

    console.log("✓ Prize assignments reversed:", this.prizeResultAssignments);
    alert(`✓ Đã đảo ngược thứ tự ${this.prizeResultAssignments.length} hàng!`);
  }

  loadVictoryHistoryToAssignments() {
    // Load winners from victory history and populate prize assignments
    if (!this.winners || this.winners.length === 0) {
      alert(
        "⚠️ Chưa có Victory History!\n\nVui lòng chạy cuộc đua trước để tạo danh sách người chiến thắng.",
      );
      return;
    }

    // Clear existing assignments first
    this.prizeResultAssignments = [];

    // Create assignments from all winners
    this.winners.forEach((winner, index) => {
      // Use winner's actual prizeName (each winner has their own prize name from the race)
      // This is the most accurate source since it was assigned during the race
      let prizeName = winner.prizeName || `Giải ${index + 1}`;

      this.prizeResultAssignments.push({
        prizeName: prizeName,
        winnerId: winner.id,
      });
    });

    // Save to localStorage
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Update UI
    this.renderPrizeAssignmentUI();

    alert(`✓ Đã load ${this.winners.length} người từ Victory History!`);
    console.log(`✓ Loaded ${this.winners.length} winners to prize assignments`);
  }

  renderPrizeAssignmentUI() {
    const container = document.getElementById("prizeAssignmentResultContainer");
    if (!container) return;

    console.log(
      "renderPrizeAssignmentUI called with",
      this.prizeResultAssignments.length,
      "assignments",
    );

    // Don't auto-sync or override when called from loadVictoryHistoryToAssignments
    // Just render what's already in prizeResultAssignments

    // If no assignments, show empty message
    if (
      !this.prizeResultAssignments ||
      this.prizeResultAssignments.length === 0
    ) {
      container.innerHTML =
        '<p style="color: #888; padding: 10px;">Chưa có gán giải. Nhấn "Load Victory History" để tải danh sách.</p>';
      return;
    }

    // Load checkbox states from localStorage
    const prizeAssignStates = JSON.parse(
      localStorage.getItem("prizeAssignStates") || "{}",
    );

    // Lấy danh sách người thắng từ this.winners với note (vắng) nếu unchecked
    const winnerOptions = this.winners
      .map((w, idx) => {
        const winnerId = `winner_${idx}_${w.name}`;
        const isPresent = prizeAssignStates[winnerId] !== false; // Default true if not set
        const label = `${w.code ? w.code + " - " : ""}${w.name}${!isPresent ? " (vắng)" : ""}`;
        return `<option value="${w.id}">${label}</option>`;
      })
      .join("");

    container.innerHTML = this.prizeResultAssignments
      .map(
        (assign, index) => `
        <div style="display: flex; gap: 5px; align-items: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px;">
            <input type="text" placeholder="Tên giải" value="${assign.prizeName}" 
                   onchange="game.prizeResultAssignments[${index}].prizeName = this.value"
                   style="flex: 1; padding: 5px; background: #111; color: #ffd700; border: 1px solid #333; border-radius: 3px;">
            <span style="color: white;">➜</span>
            <select onchange="game.prizeResultAssignments[${index}].winnerId = this.value"
                    style="flex: 1; padding: 5px; background: #111; color: white; border: 1px solid #333; border-radius: 3px;">
                <option value="">-- Chọn người nhận --</option>
                ${winnerOptions}
            </select>
            <button onclick="game.moveAssignmentUp(${index});" 
                    ${index === 0 ? "disabled" : ""}
                    style="background: #3498db; border: none; color: white; padding: 5px 8px; border-radius: 3px; cursor: pointer; ${index === 0 ? "opacity: 0.5; cursor: not-allowed;" : ""}" 
                    title="Di chuyển lên">↑</button>
            <button onclick="game.moveAssignmentDown(${index});" 
                    ${index === this.prizeResultAssignments.length - 1 ? "disabled" : ""}
                    style="background: #3498db; border: none; color: white; padding: 5px 8px; border-radius: 3px; cursor: pointer; ${index === this.prizeResultAssignments.length - 1 ? "opacity: 0.5; cursor: not-allowed;" : ""}" 
                    title="Di chuyển xuống">↓</button>
            <button onclick="game.removePrizeAssignment(${index});" 
                    style="background: #c0392b; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;" 
                    title="Xóa">X</button>
        </div>
    `,
      )
      .join("");

    // Set lại giá trị đã chọn cho các select sau khi render
    this.prizeResultAssignments.forEach((assign, index) => {
      const selects = container.querySelectorAll("select");
      if (selects[index]) selects[index].value = assign.winnerId;
    });
  }

  removePrizeAssignment(index) {
    this.prizeResultAssignments.splice(index, 1);
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );
    this.renderPrizeAssignmentUI();
  }

  moveAssignmentUp(index) {
    if (index === 0) return; // Already at top

    // Swap with previous item
    const temp = this.prizeResultAssignments[index];
    this.prizeResultAssignments[index] = this.prizeResultAssignments[index - 1];
    this.prizeResultAssignments[index - 1] = temp;

    // Save to localStorage
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Re-render
    this.renderPrizeAssignmentUI();
    console.log(`✓ Moved assignment up from position ${index} to ${index - 1}`);
  }

  moveAssignmentDown(index) {
    if (index === this.prizeResultAssignments.length - 1) return; // Already at bottom

    // Swap with next item
    const temp = this.prizeResultAssignments[index];
    this.prizeResultAssignments[index] = this.prizeResultAssignments[index + 1];
    this.prizeResultAssignments[index + 1] = temp;

    // Save to localStorage
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Re-render
    this.renderPrizeAssignmentUI();
    console.log(
      `✓ Moved assignment down from position ${index} to ${index + 1}`,
    );
  }

  applyPrizeResultAssignment() {
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Hiển thị Result Panel dựa trên dữ liệu đã gán
    this.showFinalAssignedResults();
  }

  showCurrentSettings() {
    const duckCount = document.getElementById("duckCount")?.value || "N/A";
    const raceDuration =
      document.getElementById("raceDuration")?.value || "N/A";
    const gameSpeed = document.getElementById("gameSpeed")?.value || "N/A";
    const duckSizeRatio =
      document.getElementById("duckSizeRatio")?.value || "N/A";
    const finishSafeZone =
      document.getElementById("finishSafeZone")?.value || "N/A";
    const finishStaggerEnabled = document.getElementById(
      "finishStaggerToggle",
    )?.checked;
    const winnerCount = document.getElementById("winnerCount")?.value || "N/A";

    const settings = `
═══════════════════════════════════
       📊 CURRENT RACE SETTINGS
═══════════════════════════════════

🏁 Race Configuration:
   • Number of Racers: ${duckCount}
   • Race Duration: ${raceDuration} seconds
   • Number of Winners: ${winnerCount}

⚡ Performance:
   • Game Speed: ${gameSpeed}x
   • Duck Size: ${duckSizeRatio}%

🎯 Finish Line:
   • Safe Zone: ${finishSafeZone}px
   • Finish Stagger: ${finishStaggerEnabled ? "✓ Enabled" : "✗ Disabled"}

🏆 Prizes (Race Auto-Assign):
   Total: ${this.prizeRaceList.length} prizes
   Used: ${this.usedPrizesCount} prizes
${this.prizeRaceList.length > 0 ? this.prizeRaceList.map((p, i) => `   ${i + 1}. ${p}${i < this.usedPrizesCount ? " ✓" : ""}`).join("\n") : "   (No prizes configured)"}

═══════════════════════════════════
    `;

    alert(settings);
    console.log("Current Settings:", {
      duckCount,
      raceDuration,
      gameSpeed,
      duckSizeRatio,
      finishSafeZone,
      finishStaggerEnabled,
      winnerCount,
      prizeRaceList: this.prizeRaceList,
      usedPrizesCount: this.usedPrizesCount,
    });
  }

  showRacePrizes() {
    const displayContainer = document.getElementById("racePrizesDisplay");
    const contentDiv = document.getElementById("racePrizesContent");

    if (!displayContainer || !contentDiv) return;

    // Toggle display
    if (displayContainer.style.display === "none") {
      // Show the display
      if (this.prizeRaceList.length === 0) {
        contentDiv.innerHTML = `<div style="color: #888; font-style: italic;">No race prizes configured yet. Add prizes using the input above.</div>`;
      } else {
        let html = `
          <div style="margin-bottom: 8px;">
            <span style="color: #ffd700;">Total:</span> ${this.prizeRaceList.length} | 
            <span style="color: #e74c3c;">Used:</span> ${this.usedPrizesCount} | 
            <span style="color: #2ecc71;">Available:</span> ${this.prizeRaceList.length - this.usedPrizesCount}
          </div>
          <div style="border-top: 1px solid #444; padding-top: 8px;">
        `;

        this.prizeRaceList.forEach((prize, index) => {
          const status =
            index < this.usedPrizesCount
              ? `<span style="color: #2ecc71;">✓ Awarded</span>`
              : `<span style="color: #888;">○ Available</span>`;
          const opacity = index < this.usedPrizesCount ? "opacity: 0.6;" : "";
          html += `<div style="${opacity} padding: 3px 0;">${index + 1}. ${prize} ${status}</div>`;
        });

        html += `</div>`;
        contentDiv.innerHTML = html;
      }
      displayContainer.style.display = "block";
      console.log("Race Prizes shown:", {
        prizeRaceList: this.prizeRaceList,
        usedPrizesCount: this.usedPrizesCount,
        available: this.prizeRaceList.length - this.usedPrizesCount,
      });
    } else {
      // Hide the display
      displayContainer.style.display = "none";
    }
  }

  showPrizeAssignments() {
    const displayContainer = document.getElementById(
      "resultAssignmentsDisplay",
    );
    const contentDiv = document.getElementById("resultAssignmentsContent");

    if (!displayContainer || !contentDiv) return;

    // Toggle display
    if (displayContainer.style.display === "none") {
      // Show the display
      if (this.prizeResultAssignments.length === 0) {
        contentDiv.innerHTML = `<div style="color: #888; font-style: italic;">No prize assignments configured yet. Add prizes using the input above.</div>`;
      } else {
        let html = `
          <div style="margin-bottom: 8px;">
            <span style="color: #667eea;">Total Assignments:</span> ${this.prizeResultAssignments.length}
          </div>
          <div style="border-top: 1px solid #444; padding-top: 8px;">
        `;

        this.prizeResultAssignments.forEach((assign, index) => {
          const winnerInfo = this.winners.find((w) => w.id == assign.winnerId);
          const winnerName = winnerInfo
            ? `${winnerInfo.code ? winnerInfo.code + " - " : ""}${winnerInfo.name}`
            : `<span style="color: #e74c3c;">(Not selected)</span>`;

          html += `
            <div style="padding: 5px 0; border-bottom: 1px solid #333;">
              <div style="color: #ffd700;">${index + 1}. ${assign.prizeName}</div>
              <div style="padding-left: 15px; color: #67e8f9; font-size: 12px;">→ ${winnerName}</div>
            </div>
          `;
        });

        html += `</div>`;
        contentDiv.innerHTML = html;
      }
      displayContainer.style.display = "block";
      console.log(
        "Prize Result Assignments shown:",
        this.prizeResultAssignments,
      );
    } else {
      // Hide the display
      displayContainer.style.display = "none";
    }
  }

  showFinalAssignedResults() {
    const resultPanel = document.getElementById("resultPanel");
    const resultMessage = document.getElementById("resultMessage");
    if (!resultPanel || !resultMessage) return;

    resultPanel.classList.remove("hidden");

    let html = `<div class="winners-grid" style="width: 95%; gap: 1.5%;">`;

    this.prizeResultAssignments.forEach((assign, index) => {
      // Tìm thông tin người thắng dựa trên winnerId đã chọn
      const winnerInfo = this.winners.find((w) => w.id == assign.winnerId);
      const displayName = winnerInfo ? winnerInfo.name : "---";
      const displayCode = winnerInfo && winnerInfo.code ? winnerInfo.code : "";

      html += `
            <div class="winner-card">
                <div class="winner-medal">${index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}</div>
                <div class="winner-position">${assign.prizeName}</div>
                <div class="winner-duck-name">${displayCode} ${displayName}</div>
            </div>
        `;
    });

    html += `</div>`;
    resultMessage.innerHTML = html;

    // Get prize title from input or current script
    const prizeTitleInput = document.getElementById("prizeTitleInput");
    const prizeTitle = prizeTitleInput
      ? prizeTitleInput.value.trim()
      : this.currentScriptPrizeName || "Kết quả";

    // Update result title
    const resultTitle = document.getElementById("resultTitle");
    if (resultTitle) {
      resultTitle.innerHTML = `🏆 ${prizeTitle}`;
    }

    // Gửi sang màn hình Display
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "SHOW_RESULTS_ASSIGNED",
        data: {
          assignments: this.prizeResultAssignments,
          winners: this.winners,
          prizeTitle: prizeTitle,
        },
      });
    }

    alert("✓ Đã cập nhật bảng giải thưởng kết quả!");
    console.log("✓ Result assignments applied:", this.prizeResultAssignments);
  }

  displayCustomAssignedResults(data) {
    // This function runs on display.html to show custom assigned results
    if (!this.isDisplayMode) return; // Only run on display

    const resultPanel = document.getElementById("resultPanel");
    const resultMessage = document.getElementById("resultMessage");
    if (!resultPanel || !resultMessage) return;

    resultPanel.classList.remove("hidden");

    const assignments = data.assignments || [];
    const winners = data.winners || [];

    let html = `<div class="winners-grid" style="width: 95%; gap: 1.5%;">`;

    assignments.forEach((assign, index) => {
      // Find winner info by winnerId
      const winnerInfo = winners.find((w) => w.id == assign.winnerId);
      const displayName = winnerInfo ? winnerInfo.name : "---";
      const displayCode = winnerInfo && winnerInfo.code ? winnerInfo.code : "";

      html += `
            <div class="winner-card">
                <div class="winner-medal">${index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}</div>
                <div class="winner-position">${assign.prizeName}</div>
                <div class="winner-duck-name">${displayCode} ${displayName}</div>
            </div>
        `;
    });

    html += `</div>`;
    resultMessage.innerHTML = html;
    console.log("✓ Display showing custom assigned results");
  }

  applyRaceTrackAspectRatio(width, height) {
    const raceTrack = document.getElementById("raceTrack");
    const resultPanel = document.getElementById("resultPanel");
    const victoryPopup = document.getElementById("victoryPopup");
    const loadingDisplay = document.getElementById("loadingDisplay");

    // Create CSS rule for aspect ratio
    const styleId = "dynamic-aspect-ratio";
    let styleEl = document.getElementById(styleId);

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
            .race-track {
                height: calc(100vw * ${height} / ${width}) !important;
                max-width: calc(100vh * ${width} / ${height}) !important;
            }
            .result-panel.fullscreen {
                height: calc(100vw * ${height} / ${width}) !important;
                max-width: calc(100vh * ${width} / ${height}) !important;
            }
            .victory-popup {
                height: calc(100vw * ${height} / ${width}) !important;
                max-width: calc(100vh * ${width} / ${height}) !important;
            }
            .loading-display {
                height: calc(100vw * ${height} / ${width}) !important;
                max-width: calc(100vh * ${width} / ${height}) !important;
            }
        `;

    console.log(`Applied aspect ratio ${width}:${height}`);
  }

  toggleResultBackground() {
    const bgType = document.getElementById("resultBgType").value;
    const bgColorGroup = document.getElementById("resultBgColorGroup");
    const bgImageGroup = document.getElementById("resultBgImageGroup");

    // Hide all groups first
    if (bgColorGroup) bgColorGroup.style.display = "none";
    if (bgImageGroup) bgImageGroup.style.display = "none";

    // Show relevant group
    if (bgType === "color" && bgColorGroup) {
      bgColorGroup.style.display = "block";
    } else if (bgType === "image" && bgImageGroup) {
      bgImageGroup.style.display = "block";
    }
  }

  loadResultBackgroundImage(event) {
    const file = event.target.files[0];
    if (!file) {
      // If no file selected, set default to lucky.png
      localStorage.setItem("resultPanelBackgroundImage", "static/lucky.png");
      console.log(
        "No file selected. Set result panel background to static/lucky.png",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      // Save to localStorage
      localStorage.setItem("resultPanelBackgroundImage", imageData);
      console.log("Result panel background image loaded");
    };
    reader.readAsDataURL(file);
  }

  applyResultPanelSettings() {
    // Removed savePrizeTitle() and savePrizeNames() - prize name comes from script only

    const bgType = document.getElementById("resultBgType").value;
    const bgColor = document.getElementById("resultBgColor").value;
    const bgImage = localStorage.getItem("resultPanelBackgroundImage");

    // Get prize title from input field or use current script prize name
    const prizeTitleInput = document.getElementById("prizeTitleInput");
    const prizeTitle = prizeTitleInput
      ? prizeTitleInput.value.trim()
      : this.currentScriptPrizeName || "Kết quả";

    const prizeNames = {}; // Not used anymore

    // Get layout settings
    const winnersGridWidthEl = document.getElementById("winnersGridWidth");
    const cardGapEl = document.getElementById("cardGap");
    const raceTrackAspectRatioEl = document.getElementById(
      "raceTrackAspectRatio",
    );

    const winnersGridWidth = winnersGridWidthEl
      ? winnersGridWidthEl.value
      : "95";
    const cardGap = cardGapEl ? cardGapEl.value : "1.5";

    // Parse aspect ratio from input (e.g., "16:9" or "30:9")
    let raceTrackWidth = "20";
    let raceTrackHeight = "5";

    if (raceTrackAspectRatioEl && raceTrackAspectRatioEl.value) {
      const aspectRatio = raceTrackAspectRatioEl.value.trim();
      const match = aspectRatio.match(/^(\d+):(\d+)$/);

      if (match) {
        raceTrackWidth = match[1];
        raceTrackHeight = match[2];
      } else {
        alert(
          '❌ Invalid aspect ratio format! Please use format like "16:9" or "30:9"',
        );
        return;
      }
    }

    // Save layout settings to localStorage
    localStorage.setItem("winnersGridWidth", winnersGridWidth);
    localStorage.setItem("cardGap", cardGap);
    localStorage.setItem("raceTrackWidth", raceTrackWidth);
    localStorage.setItem("raceTrackHeight", raceTrackHeight);

    // Apply race track aspect ratio
    this.applyRaceTrackAspectRatio(raceTrackWidth, raceTrackHeight);

    const resultPanel = document.getElementById("resultPanel");
    if (!resultPanel) {
      alert("Result panel not found!");
      return;
    }
    localStorage.setItem("resultPanelBackgroundType", bgType);
    localStorage.setItem("resultPanelBackgroundColor", bgColor);

    // Apply settings immediately with !important to override CSS
    if (bgType === "default") {
      resultPanel.style.removeProperty("background");
      resultPanel.style.removeProperty("background-image");
      resultPanel.style.removeProperty("background-size");
      resultPanel.style.removeProperty("background-position");
      resultPanel.style.removeProperty("background-repeat");
      resultPanel.style.removeProperty("background-color");
      resultPanel.classList.remove("custom-background");
    } else {
      // Add class to hide pseudo-elements
      resultPanel.classList.add("custom-background");

      if (bgType === "color") {
        resultPanel.style.setProperty("background", bgColor, "important");
        resultPanel.style.removeProperty("background-image");
      } else if (bgType === "image" && bgImage) {
        resultPanel.style.setProperty(
          "background-image",
          `url(${bgImage})`,
          "important",
        );
        resultPanel.style.setProperty("background-size", "cover", "important");
        resultPanel.style.setProperty(
          "background-position",
          "center",
          "important",
        );
        resultPanel.style.setProperty(
          "background-repeat",
          "no-repeat",
          "important",
        );
        resultPanel.style.setProperty(
          "background-color",
          "transparent",
          "important",
        );
      }
    }

    // Apply prize title immediately to result panel
    const resultTitle = document.getElementById("resultTitle");
    if (resultTitle) {
      resultTitle.innerHTML = `🏆 ${prizeTitle}`;
    }

    // Re-render winner cards if there are winners
    if (this.winners && this.winners.length > 0) {
      const resultMessage = document.getElementById("resultMessage");
      if (resultMessage) {
        let html = '<div class="winners-list">';
        html += `<div class="winners-grid" style="width: ${winnersGridWidth}%; gap: ${cardGap}%;">`;
        this.winners.forEach((winner, index) => {
          const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `🏅`;
          // Always use prizeName from winner object (set by script)
          const prizeName =
            winner.prizeName || this.currentScriptPrizeName || "";
          html += `
                        <div class="winner-card">
                            <div class="winner-medal">${medal}</div>
                            <div class="winner-position">${prizeName}</div>
                            <div class="winner-duck-name">${winner.name}</div>
                        </div>
                    `;
        });
        html += "</div></div>";

        // Keep existing buttons if they exist
        const existingActions = document.getElementById("resultActions");
        if (existingActions) {
          html += existingActions.outerHTML;
        }

        resultMessage.innerHTML = html;
      }
    }

    // Send settings to display via BroadcastChannel
    if (this.displayChannel) {
      const settings = {
        type: bgType,
        color: bgColor,
        image: bgImage,
        prizeTitle: prizeTitle,
        prizeNames: prizeNames,
        winnersGridWidth: winnersGridWidth,
        cardGap: cardGap,
        raceTrackWidth: raceTrackWidth,
        raceTrackHeight: raceTrackHeight,
      };

      this.displayChannel.postMessage({
        type: "UPDATE_RESULT_PANEL_SETTINGS",
        data: settings,
      });

      console.log("Result panel settings sent to display:", settings);
    }

    console.log("Result panel settings applied:", {
      bgType,
      bgColor,
      prizeTitle,
      prizeNames,
      winnersGridWidth,
      cardGap,
      raceTrackWidth,
      raceTrackHeight,
    });
    alert("✓ Result panel settings updated!");
  }

  resetResultPanelSettings() {
    const resultPanel = document.getElementById("resultPanel");

    // Reset to default
    document.getElementById("resultBgType").value = "default";
    document.getElementById("resultBgColor").value = "#1a1a2e";

    // Reset layout settings
    const winnersGridWidthEl = document.getElementById("winnersGridWidth");
    const cardGapEl = document.getElementById("cardGap");
    const raceTrackAspectRatioEl = document.getElementById(
      "raceTrackAspectRatio",
    );

    if (winnersGridWidthEl) {
      winnersGridWidthEl.value = "95";
      document.getElementById("winnersGridWidthValue").textContent = "95%";
    }
    if (cardGapEl) {
      cardGapEl.value = "1.5";
      document.getElementById("cardGapValue").textContent = "1.5%";
    }
    if (raceTrackAspectRatioEl) {
      raceTrackAspectRatioEl.value = "20:5";
      raceTrackAspectRatioEl.style.borderColor = "#667eea";
      raceTrackAspectRatioEl.style.background = "rgba(0,0,0,0.3)";
    }

    // Reset prize title input
    const titleInput = document.getElementById("prizeTitleInput");
    if (titleInput) titleInput.value = "Prize Results";

    // Reset prize name inputs
    for (let i = 1; i <= 10; i++) {
      const input = document.getElementById(`prizeName${i}`);
      if (input) input.value = "";
    }

    // Clear localStorage
    localStorage.removeItem("resultPanelBackgroundType");
    localStorage.removeItem("resultPanelBackgroundColor");
    localStorage.removeItem("resultPanelBackgroundImage");
    localStorage.removeItem("customPrizeTitle");
    localStorage.removeItem("customPrizeNames");
    localStorage.removeItem("winnersGridWidth");
    localStorage.removeItem("cardGap");
    localStorage.removeItem("raceTrackWidth");
    localStorage.removeItem("raceTrackHeight");

    // Reset race track aspect ratio
    this.applyRaceTrackAspectRatio(20, 5);

    // Reset panel style completely
    if (resultPanel) {
      resultPanel.style.removeProperty("background");
      resultPanel.style.removeProperty("background-image");
      resultPanel.style.removeProperty("background-size");
      resultPanel.style.removeProperty("background-position");
      resultPanel.style.removeProperty("background-repeat");
      resultPanel.style.removeProperty("background-color");
      resultPanel.classList.remove("custom-background");
    }

    // Hide all option groups
    this.toggleResultBackground();

    // Send reset to display
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "UPDATE_RESULT_PANEL_SETTINGS",
        data: { type: "default" },
      });
      console.log("Result panel reset sent to display");
    }

    console.log("Result panel settings reset to default");
    alert("✓ Settings reset to default!");
  }

  // Load saved result panel settings on page load
  loadResultPanelSettings() {
    // Load custom prize title
    const savedTitle = localStorage.getItem("customPrizeTitle");
    const titleInput = document.getElementById("prizeTitleInput");
    if (titleInput && savedTitle) {
      titleInput.value = savedTitle;
    }

    // Load layout settings
    const savedGridWidth = localStorage.getItem("winnersGridWidth") || "95";
    const savedGap = localStorage.getItem("cardGap") || "1.5";
    const savedTrackWidth = localStorage.getItem("raceTrackWidth") || "20";
    const savedTrackHeight = localStorage.getItem("raceTrackHeight") || "5";

    const winnersGridWidthEl = document.getElementById("winnersGridWidth");
    const cardGapEl = document.getElementById("cardGap");
    const raceTrackAspectRatioEl = document.getElementById(
      "raceTrackAspectRatio",
    );

    if (winnersGridWidthEl) {
      winnersGridWidthEl.value = savedGridWidth;
      const widthValueEl = document.getElementById("winnersGridWidthValue");
      if (widthValueEl) widthValueEl.textContent = savedGridWidth + "%";
    }

    if (cardGapEl) {
      cardGapEl.value = savedGap;
      const gapValueEl = document.getElementById("cardGapValue");
      if (gapValueEl) gapValueEl.textContent = savedGap + "%";
    }

    if (raceTrackAspectRatioEl) {
      raceTrackAspectRatioEl.value = `${savedTrackWidth}:${savedTrackHeight}`;
    }

    // Apply race track aspect ratio
    this.applyRaceTrackAspectRatio(savedTrackWidth, savedTrackHeight);

    if (cardGapEl) {
      cardGapEl.value = savedGap;
      const gapValueEl = document.getElementById("cardGapValue");
      if (gapValueEl) gapValueEl.textContent = savedGap + "%";
    }

    // Removed loadPrizeNames() - prize names now come from scripts only

    // Apply prize title to result panel (for display mode)
    if (this.isDisplayMode) {
      const resultTitle = document.querySelector(".result-title");
      if (resultTitle && this.currentScriptPrizeName) {
        resultTitle.textContent = this.currentScriptPrizeName;
      }
    }

    const bgType = localStorage.getItem("resultPanelBackgroundType");
    const bgColor = localStorage.getItem("resultPanelBackgroundColor");
    const bgImage = localStorage.getItem("resultPanelBackgroundImage");

    if (!bgType || bgType === "default") return;

    const resultPanel = document.getElementById("resultPanel");
    if (!resultPanel) return;

    // Add class to hide pseudo-elements
    resultPanel.classList.add("custom-background");

    // Apply saved settings with !important
    if (bgType === "color" && bgColor) {
      resultPanel.style.setProperty("background", bgColor, "important");
    } else if (bgType === "image" && bgImage) {
      resultPanel.style.setProperty(
        "background-image",
        `url(${bgImage})`,
        "important",
      );
      resultPanel.style.setProperty("background-size", "cover", "important");
      resultPanel.style.setProperty(
        "background-position",
        "center",
        "important",
      );
      resultPanel.style.setProperty(
        "background-repeat",
        "no-repeat",
        "important",
      );
      resultPanel.style.setProperty(
        "background-color",
        "transparent",
        "important",
      );
    }

    // Load saved duck size ratio (control mode setting)
    const savedDuckRatio = parseFloat(localStorage.getItem("duckSizeRatio"));
    if (!isNaN(savedDuckRatio) && savedDuckRatio > 0) {
      this.duckSizeRatio = savedDuckRatio;
      const trackElement = document.getElementById("raceTrack");
      if (trackElement) {
        const sizePx = this.trackHeight * this.duckSizeRatio;
        trackElement.style.setProperty("--duck-size", `${sizePx}px`);
      }
      const duckSizeEl = document.getElementById("duckSizeRatio");
      if (duckSizeEl) {
        // Slider expects 10-100 (percent). Convert internal 0.1-1.0 -> 10-100
        duckSizeEl.value = Math.round(this.duckSizeRatio * 100);
      }
      const duckSizeValue = document.getElementById("duckSizeValue");
      if (duckSizeValue)
        duckSizeValue.textContent = Math.round(this.duckSizeRatio * 100) + "%";
    }

    // Load persisted force cluster camera preference
    try {
      const savedForce = localStorage.getItem("forceClusterCamera") === "true";
      this.forceClusterCamera = !!savedForce;
      const forceEl = document.getElementById("forceClusterToggle");
      if (forceEl) forceEl.checked = this.forceClusterCamera;
    } catch (e) {
      console.warn("Failed to load forceClusterCamera setting:", e);
    }

    // Load persisted finish safe zone
    try {
      const savedSafeZone = parseInt(
        localStorage.getItem("finishSafeZone"),
        10,
      );
      if (!isNaN(savedSafeZone) && savedSafeZone >= 0) {
        this.finishSafeZone = savedSafeZone;
      }
      const fsEl = document.getElementById("finishSafeZone");
      if (fsEl) fsEl.value = this.finishSafeZone;
      const fsVal = document.getElementById("finishSafeZoneValue");
      if (fsVal) fsVal.textContent = `${this.finishSafeZone}px`;
    } catch (e) {
      console.warn("Failed to load finishSafeZone setting:", e);
    }

    // Finish stagger setting: when enabled, finished ducks are vertically staggered to prevent overlap
    // Default: OFF (natural finish)
    try {
      this.finishStaggerEnabled = false; // default off
      const savedStagger = localStorage.getItem("finishStaggerEnabled");
      if (savedStagger === "true") this.finishStaggerEnabled = true;
      const fsToggle = document.getElementById("finishStaggerToggle");
      if (fsToggle) fsToggle.checked = this.finishStaggerEnabled;
    } catch (e) {
      console.warn("Failed to load finishStaggerEnabled setting:", e);
    }

    console.log("Result panel settings loaded:", {
      bgType,
      bgColor,
      isDisplayMode: this.isDisplayMode,
    });
  }

  loadStats() {
    const saved = localStorage.getItem("duckRaceStats");
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      totalRaces: 0,
      top3Finishes: 0,
      wins: 0,
    };
  }

  saveStats() {
    localStorage.setItem("duckRaceStats", JSON.stringify(this.stats));
  }

  loadWinners() {
    const saved = localStorage.getItem("duckRaceWinners");
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  }

  saveWinners() {
    localStorage.setItem("duckRaceWinners", JSON.stringify(this.winners));
  }

  updateStatsDisplay() {
    // Stats panel removed - method disabled
    return;
    /*
        document.getElementById('totalRaces').textContent = this.stats.totalRaces;
        document.getElementById('top3Count').textContent = this.stats.top3Finishes;
        const winRate = this.stats.totalRaces > 0 
            ? ((this.stats.top3Finishes / this.stats.totalRaces) * 100).toFixed(1)
            : 0;
        document.getElementById('winRate').textContent = winRate + '%';
        */
  }

  detectAvailableThemes() {
    // Tự động phát hiện các thư mục output_X
    const themeSelect = document.getElementById("iconTheme");

    // Skip if element doesn't exist (display mode)
    if (!themeSelect) {
      console.log("iconTheme element not found, skipping theme detection");
      return;
    }

    themeSelect.innerHTML = ""; // Xóa các option cũ

    let themeIndex = 1;
    let consecutiveFails = 0;
    const maxFails = 2;

    const checkTheme = (index) => {
      const testImg = new Image();
      const themeName = `output_${index}`;
      testImg.src = `${themeName}/Input_Icon_01.webp`;

      testImg.onload = () => {
        // Thư mục tồn tại, thêm vào dropdown
        const option = document.createElement("option");
        option.value = themeName;
        option.textContent = `Chủ đề ${index}`;
        themeSelect.appendChild(option);

        consecutiveFails = 0;
        checkTheme(index + 1);
      };

      testImg.onerror = () => {
        consecutiveFails++;
        if (consecutiveFails < maxFails) {
          checkTheme(index + 1);
        } else {
          console.log(`Detected ${themeSelect.options.length} icon themes`);
        }
      };
    };

    checkTheme(themeIndex);
  }

  changeIconTheme() {
    this.currentTheme = document.getElementById("iconTheme").value;
    this.duckImages = [];
    this.iconCount = 0;
    this.imagesLoaded = false;
    this.disableStartButton();
    this.detectAndLoadDuckImages();
  }

  // toggleRaceMode không còn cần thiết, giữ lại cho tương thích cũ nếu bị gọi ngoài, nhưng không làm gì
  toggleRaceMode() {}

  updateGameSpeed(speed) {
    this.gameSpeed = speed;
    console.log(`🎮 Game speed updated to: ${speed}x`);
  }

  // Loading UI helper methods
  showLoading(message, progress) {
    const loadingContainer = document.getElementById("loadingContainer");
    const loadingText = document.getElementById("loadingText");
    const loadingProgress = document.getElementById("loadingProgress");

    if (loadingContainer) loadingContainer.classList.remove("hidden");
    if (loadingText) loadingText.textContent = message;
    if (loadingProgress) loadingProgress.textContent = `${progress}%`;
  }

  updateLoadingProgress(message, progress) {
    const loadingText = document.getElementById("loadingText");
    const loadingProgress = document.getElementById("loadingProgress");

    if (loadingText) loadingText.textContent = message;
    if (loadingProgress) loadingProgress.textContent = `${progress}%`;
  }

  hideLoading() {
    const loadingContainer = document.getElementById("loadingContainer");
    if (loadingContainer) loadingContainer.classList.add("hidden");
  }

  // Toast Notification System
  showToastNotification(winner, position) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    // Create toast element
    const toast = document.createElement("div");
    toast.className = "toast-notification";

    // Get position suffix (1st, 2nd, 3rd, 4th...)
    const getPositionSuffix = (pos) => {
      if (pos === 1) return "1st";
      if (pos === 2) return "2nd";
      if (pos === 3) return "3rd";
      return `${pos}th`;
    };

    // Format time
    const finishTime = winner.finishTime
      ? ((winner.finishTime - this.startTime) / 1000).toFixed(2) + "s"
      : "N/A";

    // Create toast content
    toast.innerHTML = `
            <div class="toast-icon">
                <img src="${winner.iconSrc || this.duckImages[0]}" alt="Winner">
            </div>
            <div class="toast-content">
                <p class="toast-position">🏆 ${getPositionSuffix(position)} Place!</p>
                <p class="toast-name">${winner.name}</p>
                <p class="toast-time">⏱️ ${finishTime}</p>
            </div>
        `;

    // Add to container
    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.add("toast-fadeout");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);

    console.log(
      `📢 Toast shown: ${getPositionSuffix(position)} - ${winner.name}`,
    );
  }

  enableStartButton() {
    // Only enable if display window is open and has loaded icons
    if (
      !this.isDisplayMode &&
      this.displayWindow &&
      !this.displayWindow.closed
    ) {
      if (!this.displayIconsLoaded) {
        console.log("⏳ Display icons not loaded yet, waiting...");
        return;
      }
    }

    // Enable both Start Race buttons
    const startBtn = document.getElementById("startRaceBtn");
    const controlStartBtn = document.getElementById("controlStartBtn");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "🚀 Start Race";
    }
    if (controlStartBtn) {
      controlStartBtn.disabled = false;
      controlStartBtn.textContent = "🚀 Start";
    }

    // Enable Display link
    const displayBtn = document.getElementById("openDisplayBtn");
    if (displayBtn) {
      displayBtn.style.pointerEvents = "auto";
      displayBtn.style.opacity = "1";
      displayBtn.textContent = "🖥️ Open Display";
    }

    // Show success notification only if loading container exists (not in display mode)
    if (document.getElementById("loadingContainer")) {
      this.updateLoadingProgress("✓ All icons loaded successfully!", 100);
      setTimeout(() => {
        this.hideLoading();
      }, 1500);
    }
  }

  disableStartButton() {
    const startBtn = document.getElementById("startRaceBtn");
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading...";
    }

    const displayBtn = document.getElementById("openDisplayBtn");
    if (displayBtn) {
      displayBtn.style.pointerEvents = "none";
      displayBtn.style.opacity = "0.5";
      displayBtn.textContent = "⏳ Loading Icons...";
    }
  }

  detectAndLoadDuckImages() {
    // Tự động detect số folder có sẵn trong theme
    console.log(`Starting icon detection for theme: ${this.currentTheme}`);

    const iconCountEl = document.getElementById("iconCount");
    if (iconCountEl) {
      iconCountEl.textContent = "Detecting icons...";
    }

    // Only show loading UI if element exists (not in display mode)
    if (document.getElementById("loadingContainer")) {
      this.showLoading("Detecting icons...", 0);
    }

    const maxFolders = 50; // Kiểm tra tối đa 50 folders
    let detectedCount = 0;
    let consecutiveFails = 0;
    const maxFails = 3;

    const checkFolder = (folderNum) => {
      const testImg = new Image();
      const testPath = `${this.currentTheme}/${folderNum}/compressed_final_${folderNum}_1.webp`;
      testImg.src = testPath;

      testImg.onload = () => {
        console.log(`✓ Found folder ${folderNum}`);
        detectedCount++;
        consecutiveFails = 0;

        const progress = Math.round((detectedCount / maxFolders) * 50); // 50% cho detection
        this.updateLoadingProgress(
          `Detecting icons... (${detectedCount} found)`,
          progress,
        );

        if (folderNum < maxFolders) {
          checkFolder(folderNum + 1);
        } else {
          this.iconCount = detectedCount;
          console.log(`Detection complete: ${detectedCount} folders found`);
          document.getElementById("iconCount").textContent =
            `${detectedCount} icons detected`;
          this.loadAllDuckImages();
        }
      };

      testImg.onerror = () => {
        console.log(`✗ Folder ${folderNum} not found (path: ${testPath})`);
        consecutiveFails++;
        if (consecutiveFails < maxFails && folderNum < maxFolders) {
          checkFolder(folderNum + 1);
        } else {
          // Kết thúc detection
          this.iconCount = detectedCount;
          console.log(
            `Detection stopped at folder ${folderNum}. Total found: ${detectedCount}`,
          );

          const iconCountEl = document.getElementById("iconCount");
          if (iconCountEl) {
            iconCountEl.textContent = `${detectedCount} icons detected`;
          }

          if (detectedCount > 0) {
            this.loadAllDuckImages();
          } else {
            console.error(
              "No icons found! Check if files exist in:",
              this.currentTheme,
            );
            if (document.getElementById("loadingContainer")) {
              this.hideLoading();
            }
            if (!this.isDisplayMode) {
              alert("No icons found! Please check the icon theme.");
            }
          }
        }
      };
    };

    checkFolder(1);
  }

  loadAllDuckImages() {
    if (this.iconCount === 0) {
      console.warn("No icons detected!");
      this.hideLoading();
      return;
    }

    // Load 3 frames từ mỗi folder
    let loadedFolders = 0;
    const totalFolders = this.iconCount;

    this.updateLoadingProgress(`Loading ${totalFolders} animated icons...`, 50);

    for (let folderNum = 1; folderNum <= totalFolders; folderNum++) {
      const frames = [];
      let loadedFrames = 0;

      // Load 3 frames cho mỗi folder
      for (let frameNum = 1; frameNum <= 3; frameNum++) {
        const img = new Image();
        img.src = `${this.currentTheme}/${folderNum}/compressed_final_${folderNum}_${frameNum}.webp`;

        img.onload = () => {
          loadedFrames++;
          if (loadedFrames === 3) {
            loadedFolders++;
            const progress =
              50 + Math.round((loadedFolders / totalFolders) * 50); // 50-100%
            this.updateLoadingProgress(
              `Loading icons: ${loadedFolders}/${totalFolders}`,
              progress,
            );

            if (loadedFolders === totalFolders) {
              this.imagesLoaded = true;
              console.log(
                `Loaded ${totalFolders} duck animations (3 frames each) from ${this.currentTheme}!`,
              );
              const iconCountEl = document.getElementById("iconCount");
              if (iconCountEl) {
                iconCountEl.textContent = `${totalFolders} icon (animated)`;
              }
              this.hideLoading();
              this.enableStartButton();
            }
          }
        };

        img.onerror = () => {
          console.warn(`Failed to load: ${img.src}`);
          loadedFrames++;
          if (loadedFrames === 3) {
            loadedFolders++;
            const progress =
              50 + Math.round((loadedFolders / totalFolders) * 50);
            this.updateLoadingProgress(
              `Loading icons: ${loadedFolders}/${totalFolders}`,
              progress,
            );

            if (loadedFolders === totalFolders) {
              this.imagesLoaded = true;
              const iconCountEl = document.getElementById("iconCount");
              if (iconCountEl) {
                iconCountEl.textContent = `${totalFolders} icon (animated)`;
              }
              this.hideLoading();
              this.enableStartButton();
            }
          }
        };

        frames.push(img);
      }

      this.duckImages.push(frames);
    }

    // Cập nhật UI ngay lập tức
    const iconCountEl = document.getElementById("iconCount");
    if (iconCountEl) {
      iconCountEl.textContent = `Loading ${totalFolders} animated ducks...`;
    }
  }

  preloadDuckImages() {
    let loadedCount = 0;
    const totalImages = this.iconCount;

    for (let i = 1; i <= totalImages; i++) {
      const img = new Image();
      const paddedNum = String(i).padStart(2, "0");
      img.src = `output/Input_Icon_${paddedNum}.webp`;

      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          this.imagesLoaded = true;
          console.log("All duck icons loaded!");
        }
      };

      img.onerror = () => {
        console.warn(`Failed to load: ${img.src}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          this.imagesLoaded = true;
        }
      };

      this.duckImages.push(img);
    }
  }

  loadDuckNames(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop().toLowerCase();

    if (fileExt === "xlsx" || fileExt === "xls") {
      // Đọc file Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          this.duckNames = [];
          this.duckCodes = []; // Store employee codes separately

          // Bỏ qua header (dòng 0), đọc từ dòng 1
          // Cột 0: STT, Cột 1: Mã NV, Cột 2: Họ và tên
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row && row.length >= 3 && row[1] && row[2]) {
              const code = String(row[1]).trim(); // Mã NV
              const name = String(row[2]).trim(); // Họ và tên
              if (code && name) {
                // Internal name is just the full name
                this.duckNames.push(name);
                // Store code separately for display
                this.duckCodes.push(code);
                console.log(`Loaded row ${i}: Code=${code}, Name=${name}`);
              }
            }
          }

          if (this.duckNames.length > 0) {
            this.activeDuckNames = [...this.duckNames];
            this.activeDuckCodes = [...this.duckCodes];

            if (this.winners.length > 0) {
              const winnerNames = this.winners.map((w) => w.name);
              // Filter both arrays together
              const filteredData = this.duckNames
                .map((name, index) => ({ name, code: this.duckCodes[index] }))
                .filter((item) => !winnerNames.includes(item.name));
              this.activeDuckNames = filteredData.map((item) => item.name);
              this.activeDuckCodes = filteredData.map((item) => item.code);
            }

            // Save to localStorage for persistence
            localStorage.setItem("duckNames", JSON.stringify(this.duckNames));
            localStorage.setItem("duckCodes", JSON.stringify(this.duckCodes));
            localStorage.setItem("excelFileName", file.name);

            document.getElementById("duckCount").value = this.duckNames.length;
            alert(`Đã tải ${this.duckNames.length} tên từ file Excel!`);

            // Update file status UI
            this.updateFileStatus(file.name);
          } else {
            alert("Không đọc được tên từ file Excel.");
          }
        } catch (error) {
          console.error("Error reading Excel:", error);
          alert("Lỗi khi đọc file Excel: " + error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Đọc file CSV với encoding UTF-8
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n");

        this.duckNames = [];
        this.duckCodes = [];

        // Cột 0: STT, Cột 1: Mã NV, Cột 2: Họ và tên
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(",");
          if (columns.length >= 3) {
            const code = columns[1].trim(); // Mã NV
            const name = columns[2].trim(); // Họ và tên
            if (code && name) {
              this.duckNames.push(name);
              this.duckCodes.push(code);
            }
          }
        }

        if (this.duckNames.length > 0) {
          this.activeDuckNames = [...this.duckNames];
          this.activeDuckCodes = [...this.duckCodes];

          if (this.winners.length > 0) {
            const winnerNames = this.winners.map((w) => w.name);
            const filteredData = this.duckNames
              .map((name, index) => ({ name, code: this.duckCodes[index] }))
              .filter((item) => !winnerNames.includes(item.name));
            this.activeDuckNames = filteredData.map((item) => item.name);
            this.activeDuckCodes = filteredData.map((item) => item.code);
          }

          // Save to localStorage for persistence
          localStorage.setItem("duckNames", JSON.stringify(this.duckNames));
          localStorage.setItem("duckCodes", JSON.stringify(this.duckCodes));
          localStorage.setItem("excelFileName", file.name);

          document.getElementById("duckCount").value = this.duckNames.length;
          alert(`Đã tải ${this.duckNames.length} tên từ file CSV!`);

          // Update file status UI
          this.updateFileStatus(file.name);
        } else {
          alert("Không đọc được tên từ file CSV.");
        }
      };

      // Chỉ định encoding UTF-8 để đọc tiếng Việt đúng
      reader.readAsText(file, "UTF-8");
    }
  }

  // Load saved Excel/CSV data from localStorage
  loadSavedData() {
    try {
      const savedNames = localStorage.getItem("duckNames");
      const savedCodes = localStorage.getItem("duckCodes");
      const savedFileName = localStorage.getItem("excelFileName");

      if (savedNames && savedCodes) {
        this.duckNames = JSON.parse(savedNames);
        this.duckCodes = JSON.parse(savedCodes);
        this.activeDuckNames = [...this.duckNames];
        this.activeDuckCodes = [...this.duckCodes];

        // Filter out winners if any exist
        if (this.winners.length > 0) {
          const winnerNames = this.winners.map((w) => w.name);
          const filteredData = this.duckNames
            .map((name, index) => ({ name, code: this.duckCodes[index] }))
            .filter((item) => !winnerNames.includes(item.name));
          this.activeDuckNames = filteredData.map((item) => item.name);
          this.activeDuckCodes = filteredData.map((item) => item.code);
        }

        document.getElementById("duckCount").value = this.duckNames.length;
        console.log(
          `✓ Restored ${this.duckNames.length} names from localStorage${savedFileName ? ` (${savedFileName})` : ""}`,
        );

        // Show notification and clear button
        this.updateFileStatus(savedFileName);
      }

      // Load saved audio file status
      const savedAudioFileName = localStorage.getItem("customAudioFileName");
      if (savedAudioFileName) {
        this.updateAudioFileStatus(savedAudioFileName);
      }
    } catch (e) {
      console.error("Error loading saved data:", e);
    }
  }

  updateFileStatus(fileName) {
    const fileLabel = document.getElementById("fileLabel");
    const clearBtn = document.getElementById("clearFileBtn");
    const fileHelp = document.getElementById("fileHelp");

    if (fileName && this.duckNames.length > 0) {
      if (fileLabel)
        fileLabel.innerHTML = `Racer List File <span style="color: #4CAF50;">(✓ Loaded: ${fileName})</span>:`;
      if (clearBtn) clearBtn.style.display = "inline-block";
      if (fileHelp)
        fileHelp.innerHTML = `<span style="color: #4CAF50;">✓ Using ${this.duckNames.length} names from file. Click Clear to use random names instead.</span>`;
    } else {
      if (fileLabel) fileLabel.textContent = "Racer List File (CSV/Excel):";
      if (clearBtn) clearBtn.style.display = "none";
      if (fileHelp)
        fileHelp.innerHTML =
          "Upload CSV/Excel to use custom names, or leave empty for random names";
    }
  }

  clearLoadedFile() {
    if (
      !confirm(
        "Clear loaded file and use random names?\n\nThis will remove all custom names and codes.",
      )
    ) {
      return;
    }

    // Clear data
    this.duckNames = [];
    this.duckCodes = [];
    this.activeDuckNames = [];
    this.activeDuckCodes = [];

    // Clear localStorage
    localStorage.removeItem("duckNames");
    localStorage.removeItem("duckCodes");
    localStorage.removeItem("excelFileName");
    localStorage.removeItem("customPrizeNames");
    localStorage.removeItem("prizeNamesSortOrder");

    // Clear file input
    const fileInput = document.getElementById("duckNamesFile");
    if (fileInput) fileInput.value = "";

    // Update UI
    this.updateFileStatus(null);

    console.log(
      "✓ Cleared loaded file. You can now enter any number of racers.",
    );
    alert("File cleared! You can now enter any number of racers (up to 2000).");
  }

  updateAudioFileStatus(fileName) {
    const audioLabel = document.getElementById("audioFileLabel");
    const clearBtn = document.getElementById("clearAudioBtn");

    if (fileName) {
      if (audioLabel)
        audioLabel.innerHTML = `Custom Race Sound <span style="color: #2ed573;">(✓ Loaded: ${fileName})</span>:`;
      if (clearBtn) clearBtn.style.display = "inline-block";
      // Save to localStorage
      localStorage.setItem("customAudioFileName", fileName);
    } else {
      if (audioLabel) audioLabel.innerHTML = "Custom Race Sound (MP3):";
      if (clearBtn) clearBtn.style.display = "none";
      // Remove from localStorage
      localStorage.removeItem("customAudioFileName");
    }
  }

  clearAudioFile() {
    if (
      !confirm(
        "Clear custom audio and use default race.mp3?\n\nThis will remove the custom sound.",
      )
    ) {
      return;
    }

    // Clear audio from SoundManager
    this.soundManager.clearCustomAudio();

    // Clear file input
    const fileInput = document.getElementById("customSoundFile");
    if (fileInput) fileInput.value = "";

    // Clear from localStorage
    localStorage.removeItem("customAudioData");
    localStorage.removeItem("customAudioFileName");
    console.log("💾 Custom audio removed from localStorage");

    // Update UI
    this.updateAudioFileStatus(null);

    // Send clear message to display
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "CLEAR_CUSTOM_AUDIO",
      });
      console.log("📢 Sent CLEAR_CUSTOM_AUDIO to display");
    }

    console.log("✓ Custom audio cleared. Using default race.mp3.");
    alert(
      "✓ Custom audio cleared!\n\n📺 REFRESH (Ctrl+F5) the Display window to apply changes!",
    );
  }

  startRace() {
    // Check if a script is selected (running)
    if (this.raceScripts && this.raceScripts.length > 0) {
      const hasRunningScript = this.raceScripts.some(
        (s) => s.status === "running",
      );
      if (!hasRunningScript) {
        alert(
          "⚠️ Vui lòng chọn script để chạy!\n\nNhấn nút START bên cạnh script bạn muốn chạy.",
        );
        return;
      }
    }

    // Check if images are loaded
    if (!this.imagesLoaded) {
      console.warn("Cannot start race - images not loaded yet");
      alert("Icons are still loading. Please wait a moment.");
      return;
    }

    // Check if race is already running - prevent starting new race
    if (this.raceStarted && !this.raceFinished) {
      console.warn("Race is already running!");
      alert(
        "Cuộc đua đang chạy! Vui lòng đợi kết thúc hoặc nhấn Home để dừng.",
      );
      return;
    }

    // Always check and update mode from winner count
    const winnerCountEl = document.getElementById("winnerCount");
    if (winnerCountEl) {
      const n = parseInt(winnerCountEl.value);
      // Always use topN mode regardless of count
      this.raceMode = "topN";
      this.winnerCount = n;
    }

    console.log(
      "startRace: Setting up race (not starting yet), mode:",
      this.raceMode,
    );

    // Only setup race, don't start automatically
    // User must press Start button on control panel to begin
    this.setupRaceOnly();
  }

  setupRaceOnly() {
    // Setup race without starting - just prepare everything
    if (!this.isDisplayMode) {
      // Lấy giá trị slider mới nhất trước khi setupRace
      const duckSizeEl = document.getElementById("duckSizeRatio");
      if (duckSizeEl) {
        this.duckSizeRatio = parseFloat(duckSizeEl.value) / 100;
        console.log(
          "[DuckSize] Updated duckSizeRatio from slider:",
          this.duckSizeRatio,
        );
      }
      this.setupRace();

      // Show control panel with enabled Start button
      const raceInfo = document.getElementById("raceInfo");
      const controlPanel = document.getElementById("controlPanel");
      const controlStartBtn = document.getElementById("controlStartBtn");
      const raceStatus = document.getElementById("raceStatus");

      if (raceInfo) raceInfo.classList.remove("hidden");
      if (controlPanel) controlPanel.classList.remove("hidden");
      if (controlStartBtn) {
        controlStartBtn.disabled = false;
        controlStartBtn.textContent = "🚀 Start";
      }
      if (raceStatus)
        raceStatus.textContent = "Ready to start - Press Start button!";

      console.log("✅ Race setup complete. Press Start button to begin.");
    }
  }

  controlStartRace() {
    // This is called when user presses Start button on control panel
    // Check if there's a running script
    const hasRunningScript =
      this.raceScripts && this.raceScripts.some((s) => s.status === "running");
    if (!hasRunningScript) {
      alert(
        "⚠️ Vui lòng chọn script để chạy!\n\nNhấn nút START bên cạnh script bạn muốn chạy.",
      );
      return;
    }

    // Check if display is connected
    if (!this.displayReady) {
      const openDisplay = confirm(
        `⚠️ Chưa mở Display!\n\n` +
          `Vui lòng:\n` +
          `1. Nhấn "OK" để tiếp tục mở Display\n` +
          `2. Nhấn nút "📺 Open Display" ở góc trên bên phải\n` +
          `3. Sau khi Display đã sẵn sàng, quay lại đây và nhấn START lại\n\n` +
          `Nhấn "Cancel" nếu muốn chạy mà không có Display (không khuyến nghị).`,
      );

      if (openDisplay) {
        alert(
          "📺 Hãy nhấn nút 'Open Display' ở góc trên bên phải màn hình!\n\n" +
            "Sau khi Display đã mở, quay lại đây và nhấn START lại.",
        );
        return;
      } else {
        // User chose to continue without display
        console.warn("⚠️ User chose to start race without display");
      }
    }

    // Now actually start the race
    console.log("controlStartRace: Beginning race from control panel");

    // Disable and dim the START button while race is running
    const startBtn = document.getElementById("controlStartBtn");
    if (startBtn) {
      startBtn.classList.remove("btn-blinking");
      startBtn.disabled = true;
      startBtn.style.opacity = "0.5";
      startBtn.textContent = "⏳ Racing...";
    }

    this.proceedWithRaceStart();
  }

  proceedWithRaceStart() {
    // Don't switch tabs in control mode, keep settings visible
    // this.switchTab('game');

    // In display mode, setup and run the race
    if (this.isDisplayMode) {
      this.setupRace();
      // Display will auto-start via beginRace()
      setTimeout(() => {
        console.log("Display: Auto-starting race visualization");
        this.beginRace();
      }, 100);
    } else {
      // Control mode: Setup race for data tracking but DON'T run visualization
      this.setupRace();

      // Wait for countdown duration (3-2-1-GO = 3 intervals * 600ms = 1800ms)
      // This syncs with display countdown so timers match
      setTimeout(() => {
        console.log(
          "Control panel: Starting race timing after countdown (no visualization)",
        );
        // Set start time AFTER countdown completes (same as display)
        this.startTime = Date.now();
        this.raceStarted = true;

        // Update timer on control panel only (no duck animation)
        this.updateControlPanelTimer();
      }, 1900); // 3s countdown + 100ms buffer
    }

    // Send start message to display tab
    if (this.displayChannel) {
      console.log("startRace: Sending START_RACE message to display tab");

      const raceData = {
        duckCount: this.duckCount,
        raceDuration: this.raceDuration,
        raceMode: this.raceMode, // Send race mode to display
        winnerCount: this.winnerCount, // Send winner count to display
        gameSpeed: this.gameSpeed, // Send game speed to display
        theme: this.currentTheme,
        duckNames: [...this.activeDuckNames], // Clone array
        duckCodes: [...this.activeDuckCodes], // Send employee codes
        startTime: this.startTime, // Send synchronized start time
        usedPrizesCount: this.usedPrizesCount, // Send prize counter
        prizeRaceList: [...this.prizeRaceList], // Send prize list
        currentScriptPrizeName: this.currentScriptPrizeName, // Send prize name from script
      };

      console.log("Race data to send:", raceData);

      this.displayChannel.postMessage({
        type: "START_RACE",
        data: raceData,
      });

      console.log("START_RACE message posted to channel");
      console.log("✅ Message sent to display tab (if open)");
    } else {
      console.warn("startRace: displayChannel not available");
    }
  }

  setupRace() {
    // In display mode, duckCount and raceDuration are already set via handleStartRace
    if (!this.isDisplayMode) {
      const duckCountEl = document.getElementById("duckCount");
      const raceDurationEl = document.getElementById("raceDuration");
      const soundToggleEl = document.getElementById("soundToggle");
      const winnerCountEl = document.getElementById("winnerCount");
      const gameSpeedEl = document.getElementById("gameSpeed");

      if (duckCountEl) this.duckCount = parseInt(duckCountEl.value);
      if (raceDurationEl)
        this.raceDuration = parseInt(raceDurationEl.value) || 10;
      if (gameSpeedEl) this.gameSpeed = parseFloat(gameSpeedEl.value) || 1.0;

      // Lấy mode từ winnerCount
      if (winnerCountEl) {
        const n = parseInt(winnerCountEl.value);
        // Always use topN mode
        this.raceMode = "topN";
        this.winnerCount = n;
      }

      console.log(
        `🏁 Race Setup - Mode: ${this.raceMode}, Winner Count: ${this.winnerCount}, Duration: ${this.raceDuration}s, Speed: ${this.gameSpeed}x`,
      );

      // Pre-check available participants before setup
      let availableCount = 0;
      if (this.duckNames.length > 0) {
        availableCount = this.duckNames.length;
      } else {
        availableCount = this.duckCount;
      }

      // Subtract winners
      if (this.winners.length > 0) {
        availableCount -= this.winners.length;
      }

      console.log(
        `Available participants: ${availableCount} (Requested: ${this.duckCount}, Winners removed: ${this.winners.length})`,
      );

      if (availableCount < MINIMUM_PARTICIPANTS) {
        alert(
          `Not enough participants!\n\nAvailable: ${availableCount}\nRequired: at least ${MINIMUM_PARTICIPANTS}\nWinners (excluded): ${this.winners.length}\n\nPlease reduce number of racers or reset winner history.`,
        );
        return;
      }

      if (availableCount < this.duckCount) {
        const confirmed = confirm(
          `Only ${availableCount} participants available (${this.winners.length} winners excluded).\n\nDo you want to continue with ${availableCount} racers instead of ${this.duckCount}?`,
        );
        if (!confirmed) return;
      }

      if (soundToggleEl) {
        const enabled = soundToggleEl.checked;
        this.soundManager.setEnabled(enabled);
        // Send initial sound state to display
        if (this.displayChannel) {
          this.displayChannel.postMessage({
            type: "SOUND_TOGGLE_CHANGED",
            data: { enabled },
          });
          console.log("📢 Initial sound state:", enabled, "- sent to display");
        }
      }
    }

    // Load persistent winners from localStorage to preserve across races
    // Reset currentRaceWinners for BOTH modes to avoid showing old winners
    this.currentRaceWinners = []; // Always reset for new race

    const savedWinners = this.loadWinners();
    if (this.raceMode === "topN") {
      // Top N mode: Start fresh for this race, but keep history for display
      this.winners = savedWinners || []; // Keep historical winners
      console.log(
        `Top N mode: Starting fresh race. Historical winners: ${this.winners.length}`,
      );
    } else {
      // Normal mode: Accumulate winners across races
      if (savedWinners && savedWinners.length > 0) {
        this.winners = savedWinners;
      } else {
        this.winners = [];
      }
    }

    if (this.duckCount < MINIMUM_PARTICIPANTS || this.duckCount > 10000) {
      alert(
        `Number of racers must be between ${MINIMUM_PARTICIPANTS} and 10000!`,
      );
      return;
    }

    this.trackContainer = document.getElementById("raceRiver");

    if (!this.trackContainer) {
      console.error("ERROR: raceRiver element not found!");
      return;
    }

    console.log("setupRace: trackContainer found", this.trackContainer);

    // Ensure a dedicated ducks layer exists (so ducks are not visually occluded by river/track decorations)
    const raceTrackEl = document.getElementById("raceTrack");
    if (raceTrackEl) {
      let ducksLayer = document.getElementById("ducksLayer");
      if (!ducksLayer) {
        ducksLayer = document.createElement("div");
        ducksLayer.id = "ducksLayer";
        ducksLayer.className = "ducks-layer";
        raceTrackEl.appendChild(ducksLayer);
      }
      this.ducksLayer = ducksLayer;
    } else {
      this.ducksLayer = this.trackContainer; // fallback
    }

    // Calculate viewport width dynamically based on track container
    const trackElement = document.getElementById("raceTrack");
    this.viewportWidth = trackElement.clientWidth || 1200;
    // Calculate trackHeight from race-river which is 60% of race-track
    // Use race-track height and calculate race-river portion
    const raceTrackHeight = trackElement.clientHeight || 250;
    this.trackHeight = raceTrackHeight * 0.6; // race-river is 60% of race-track

    console.log(
      `[Track Debug] raceTrack clientHeight: ${raceTrackHeight}, calculated raceRiver height: ${this.trackHeight}`,
    );
    console.log(`[Track Debug] raceTrack width: ${trackElement.clientWidth}`);

    // Debug bank sizes
    const bankTop = document.getElementById("bankTop");
    const bankBot = document.getElementById("bankBot");
    if (bankTop)
      console.log(
        `[Track Debug] bankTop clientHeight: ${bankTop.clientHeight}`,
      );
    if (bankBot)
      console.log(
        `[Track Debug] bankBot clientHeight: ${bankBot.clientHeight}`,
      );

    // Tính trackLength dựa trên tốc độ thực tế với delta time normalization
    // baseSpeed: 3.2-4.0 px/frame (avg 3.6) @ 60 FPS với deltaTime = 1.0
    // Tốc độ thực tế: 3.6 px/frame * 60 fps = 216 px/s
    // Rubber-banding làm giảm tốc độ trung bình ~30% (leaders bị slow down)
    // Turbo boost tăng tốc độ cho laggers ~20%
    // => Tốc độ hiệu quả: 216 * 0.85 = ~183 px/s (balanced)
    // UPDATE: Quan sát thực tế cho thấy vịt chạy NHANH GẤP 2 LẦN → giảm xuống 1/2
    const baseEffectiveSpeed = 366; // px/s - doubled from observation (183 * 2)
    // Race dài hơn cần track dài hơn một chút do dynamic không ổn định
    const durationFactor = Math.min(1.15, 1.0 + this.raceDuration / 600);
    const pixelsPerSecond = baseEffectiveSpeed * durationFactor;

    // Scale trackLength by gameSpeed to maintain race duration
    // gameSpeed > 1: ducks move faster (deltaTime *= gameSpeed), track longer to keep duration same
    // gameSpeed < 1: ducks move slower, track shorter to keep duration same
    // Result: Real-world duration always = raceDuration, visual speed changes
    this.trackLength = this.raceDuration * pixelsPerSecond * this.gameSpeed;

    console.log(
      `[Track Setup] Duration: ${this.raceDuration}s | Speed: ${pixelsPerSecond.toFixed(1)} px/s | GameSpeed: ${this.gameSpeed}x | Track: ${this.trackLength.toFixed(0)}px | Expected finish: ${this.raceDuration}s (real time)`,
    );
    this.cameraOffset = 0;
    this.smoothCameraTarget = 0; // Reset smooth camera target
    this.lastCameraOffset = 0; // Reset last camera position
    this.backgroundOffset = 0;
    this.targetBackgroundOffset = 0; // Reset target background offset
    this.finishLinePosition = 0; // Reset finish line position
    this.finishLinePreviewShown = false; // Reset preview state
    this.finishLinePreviewStartTime = 0; // Reset preview timer

    // Set initial CSS variable for duck size
    const initialDuckHeight = this.trackHeight * this.duckSizeRatio;
    trackElement.style.setProperty("--duck-size", `${initialDuckHeight}px`);

    // Add resize handler for responsive scaling
    this.resizeHandler = () => {
      this.viewportWidth = trackElement.clientWidth || 1200;
      const raceTrackHeight = trackElement.clientHeight || 250;
      this.trackHeight = raceTrackHeight * 0.6; // race-river is 60% of race-track

      // Update CSS variable for duck size
      const duckHeight = this.trackHeight * this.duckSizeRatio;
      trackElement.style.setProperty("--duck-size", `${duckHeight}px`);

      if (this.raceStarted && !this.raceFinished) {
        this.redistributeDucks();
      }
    };
    window.addEventListener("resize", this.resizeHandler);

    // Clear only duck elements, preserve water-flow, water-ripples, fish-layer
    const duckElements = this.trackContainer.querySelectorAll(".duck-element");
    duckElements.forEach((el) => el.remove());
    this.duckElements.clear();

    // Hide fish and water effects when race starts
    const fishLayer = document.getElementById("fishLayer");
    const waterFlow = this.trackContainer.querySelector(".water-flow");
    const waterRipples = this.trackContainer.querySelector(".water-ripples");

    if (fishLayer) fishLayer.style.display = "none";
    if (waterFlow) waterFlow.style.display = "none";
    if (waterRipples) waterRipples.style.display = "none";

    this.ducks = [];

    console.log("setupRace: Creating", this.duckCount, "ducks");

    // this.highlights = [];

    // Ẩn finish line từ race trước
    const finishLineEl = document.getElementById("finishLine");
    if (finishLineEl) {
      finishLineEl.classList.add("hidden");
      finishLineEl.classList.remove("visible");
    }

    // Rebuild activeDuckNames from duckNames, excluding winners
    // This ensures we always start with correct list after mode changes
    if (this.duckNames.length > 0) {
      // Có file CSV đã upload - rebuild từ full list
      this.activeDuckNames = [...this.duckNames];
      this.activeDuckCodes = [...this.duckCodes];
    } else {
      // Không có file - rebuild full list với số lượng duckCount mới
      this.activeDuckNames = [];
      this.activeDuckCodes = [];
      for (let i = 1; i <= this.duckCount; i++) {
        this.activeDuckNames.push(`Racer #${i}`);
        this.activeDuckCodes.push(`R${i}`);
      }
    }

    // Remove winners from active list
    if (this.winners.length > 0) {
      const winnerNames = this.winners.map((w) => w.name);
      // Filter both arrays together
      const filteredData = this.activeDuckNames
        .map((name, index) => ({
          name,
          code: this.activeDuckCodes[index] || "",
        }))
        .filter((item) => !winnerNames.includes(item.name));
      this.activeDuckNames = filteredData.map((item) => item.name);
      this.activeDuckCodes = filteredData.map((item) => item.code);
      console.log(
        `Removed ${this.winners.length} winners from active list. Remaining: ${this.activeDuckNames.length}`,
      );
    }

    // Lấy danh sách vịt hiện tại (limited by duckCount setting)
    let currentDucks = this.activeDuckNames.slice(0, this.duckCount);
    let currentCodes = this.activeDuckCodes.slice(0, this.duckCount);

    console.log(`Active ducks available: ${this.activeDuckNames.length}`);
    console.log(`First 5 active ducks:`, this.activeDuckNames.slice(0, 5));
    console.log(`First 5 active codes:`, this.activeDuckCodes.slice(0, 5));

    // Update actual duck count to match available ducks
    const actualDuckCount = currentDucks.length;
    console.log(
      `Setting up race: Requested ${this.duckCount} ducks, Available ${this.activeDuckNames.length}, Using ${actualDuckCount}`,
    );

    if (actualDuckCount < MINIMUM_PARTICIPANTS) {
      alert(
        `Not enough participants! Only ${actualDuckCount} available (need at least ${MINIMUM_PARTICIPANTS}). Please reset winners or add more participants.`,
      );
      return;
    }

    // Enable canvas rendering for large races (>100 ducks)
    this.useCanvasRendering = actualDuckCount > 100;
    if (this.useCanvasRendering) {
      console.log(`🎨 Canvas mode ENABLED for ${actualDuckCount} ducks`);
      this.setupCanvasRendering();
    } else {
      console.log(`📦 DOM mode for ${actualDuckCount} ducks`);
      this.cleanupCanvas();
    }

    // Enable Web Workers for very large races (>1000 ducks)
    this.useWorkers = actualDuckCount > 1000;
    if (this.useWorkers) {
      console.log(
        `⚡ Multi-threaded mode ENABLED for ${actualDuckCount} ducks (${this.workerCount} workers)`,
      );
      this.setupWorkers();
    } else {
      this.cleanupWorkers();
    }

    for (let i = 1; i <= actualDuckCount; i++) {
      const duckName = currentDucks[i - 1];
      const duckCode = currentCodes[i - 1] || "";
      const duck = new Duck(i, this.trackLength, duckName);
      duck.code = duckCode; // Store employee code
      duck.randomizeSpeed();
      this.ducks.push(duck);

      console.log(
        `Created duck ${i}/${actualDuckCount}: ${duckCode} - ${duckName}`,
      );

      // Don't create elements upfront for performance - they'll be created lazily when visible
      // this.createDuckElement(duck, i);
    }

    // Distribute initial lanes evenly to avoid stacked clusters at start
    const NUM_DISPLAY_LANES = 5;
    for (let idx = 0; idx < this.ducks.length; idx++) {
      const d = this.ducks[idx];
      d.lane = idx % NUM_DISPLAY_LANES; // Evenly spread across lanes
      d.preferredLane = d.lane;
      d.laneOffset = (Math.random() - 0.5) * 12; // slight vertical jitter
      d.targetLaneOffset = d.laneOffset;
      d.lastLaneChangeTime = Date.now();

      // Spread initial horizontal positions slightly so ducks are not stacked at x=0
      // Use up to ~6% of viewport width to scatter starters
      const scatterPx = Math.max(20, Math.round(this.viewportWidth * 0.06));
      d.position = Math.random() * scatterPx;
      d._lastScreenX = Math.round(d.position - this.cameraOffset);
    }

    console.log("setupRace: Total ducks created:", this.ducks.length);

    // Only hide settings panel if in control mode and element exists
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel && !this.isDisplayMode) {
      settingsPanel.classList.add("hidden");
    }

    // In control mode, DON'T show race track - only show controls
    // Race will only display on the secondary display window
    if (!this.isDisplayMode) {
      // Show only controls for operator
      const raceInfo = document.getElementById("raceInfo");
      const controlPanel = document.getElementById("controlPanel");
      if (raceInfo) raceInfo.classList.remove("hidden");
      if (controlPanel) controlPanel.classList.remove("hidden");
      // Keep race track hidden on control screen
      // document.getElementById('raceTrack').classList.remove('hidden');
      // document.getElementById('bigTimer').classList.remove('hidden');
    } else {
      // Display mode - show ONLY race track and timer (no controls)
      const raceTrack = document.getElementById("raceTrack");
      const bigTimer = document.getElementById("bigTimer");

      if (raceTrack) raceTrack.classList.remove("hidden");
      if (bigTimer) bigTimer.classList.remove("hidden");
      // DO NOT show raceInfo or controlPanel on display - those are only for index.html
    }

    this.raceStarted = false;
    this.raceFinished = false;
    this.racePaused = false;

    // Hide continue button
    const continueBtn = document.getElementById("continueBtn");
    const continueBankBtn = document.getElementById("continueBankBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const startBtn = document.getElementById("startRaceBtn");
    const controlStartBtn = document.getElementById("controlStartBtn");

    if (continueBtn) continueBtn.style.display = "none";
    if (continueBankBtn) continueBankBtn.classList.add("hidden");
    if (pauseBtn) pauseBtn.disabled = false;

    // Re-enable both Start Race buttons (in case they were disabled)
    if (this.imagesLoaded) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = "🚀 Start Race";
      }
      if (controlStartBtn) {
        controlStartBtn.disabled = false;
        controlStartBtn.textContent = "🚀 Start";
      }
    }

    this.currentRaceNumber = this.stats.totalRaces + 1;

    // Update UI elements if they exist
    const raceNumber = document.getElementById("raceNumber");
    const raceStatus = document.getElementById("raceStatus");
    const timeLeft = document.getElementById("timeLeft");
    const fullscreenBtn = document.getElementById("fullscreenBtn");

    if (raceNumber) raceNumber.textContent = `#${this.currentRaceNumber}`;
    if (raceStatus) raceStatus.textContent = "Waiting to start...";
    if (timeLeft) timeLeft.textContent = `${this.raceDuration}s`;
    if (fullscreenBtn) fullscreenBtn.textContent = "🚀 Start";

    // Initialize sound manager
    this.soundManager.init();
  }

  beginRace() {
    if (this.raceStarted) return;

    // Set race started flag BEFORE calling animate()
    this.raceStarted = true;

    console.log("=== RACE SETUP ===");
    console.log("Preparing race with", this.ducks.length, "ducks");
    console.log("Target pixel (finish line):", this.trackLength);
    console.log("==================");

    // Only show countdown on display mode (removed auto-fullscreen to preserve aspect ratio)
    if (this.isDisplayMode) {
      // Finish line will be revealed by animate() logic when close to finish

      // Play start sound IMMEDIATELY when Start button clicked (during 3s countdown)
      this.soundManager.playStartSound();

      // Show countdown directly without fullscreen
      this.showCountdown(() => {
        // Set start time AFTER countdown finishes (only if not already set from control)
        if (!this.startTime) {
          this.startTime = Date.now();
        }
        console.log("=== RACE START ===");
        console.log(
          "Start time:",
          new Date(this.startTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          }),
        );
        // Play race ambiance when countdown finishes
        this.soundManager.startRacingAmbiance(this.raceDuration);

        // Reset frame time tracking and start animation loop
        this.lastFrameTime = Date.now();
        this.lastUIUpdate = 0;
        this.rankingUpdateCounter = 0;
        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
      });
    } else {
      // Control mode - NO countdown, NO animation, just track timing
      console.log("=== CONTROL PANEL - NO RACE VISUALIZATION ===");
      console.log("Race will display on external display window only");
      // Do NOT call showCountdown() or animate() in control mode
      // Timing is handled via updateControlPanelTimer() called from proceedWithRaceStart()
    }

    // Update UI elements
    const raceStatus = document.getElementById("raceStatus");
    const pauseBtn = document.getElementById("pauseBtn");
    const resumeBtn = document.getElementById("resumeBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const startBtn = document.getElementById("startRaceBtn");
    const controlStartBtn = document.getElementById("controlStartBtn");

    if (raceStatus) raceStatus.textContent = "Racing!";
    if (pauseBtn) pauseBtn.disabled = false;
    if (resumeBtn) resumeBtn.disabled = true;
    if (fullscreenBtn) fullscreenBtn.textContent = "🔲 Fullscreen";

    // Disable start buttons during race
    if (startBtn) startBtn.disabled = true;
    if (controlStartBtn) controlStartBtn.disabled = true;

    // Update race number display
    safeElementAction(
      "raceNumber",
      (el) => (el.textContent = `#${this.currentRaceNumber}`),
    );
  }

  setupCanvasRendering() {
    // Create or get canvas element
    let canvas = document.getElementById("raceCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "raceCanvas";
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "10";
      this.trackContainer.appendChild(canvas);
    }

    // Set canvas resolution to match container
    const rect = this.trackContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });

    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    console.log(`✓ Canvas initialized: ${canvas.width}x${canvas.height}`);
  }

  cleanupCanvas() {
    const canvas = document.getElementById("raceCanvas");
    if (canvas) {
      canvas.remove();
    }
    this.canvas = null;
    this.ctx = null;
  }

  setupWorkers() {
    // Create worker pool
    this.workers = [];
    for (let i = 0; i < this.workerCount; i++) {
      try {
        const worker = new Worker("duck-worker.js");
        worker.onmessage = (e) => this.handleWorkerMessage(e, i);
        worker.onerror = (err) => console.error(`Worker ${i} error:`, err);
        this.workers.push(worker);
      } catch (error) {
        console.error("Failed to create worker:", error);
        this.useWorkers = false;
        return;
      }
    }
    console.log(`✓ Created ${this.workers.length} worker threads`);
  }

  cleanupWorkers() {
    if (this.workers.length > 0) {
      this.workers.forEach((w) => w.terminate());
      this.workers = [];
      console.log("✓ Workers terminated");
    }
  }

  handleWorkerMessage(event, workerIndex) {
    const { type, ducks } = event.data;

    if (type === "DUCKS_UPDATED") {
      // Merge updated ducks back into main array
      const batchIndex = workerIndex;
      if (this.workerDuckBatches[batchIndex]) {
        // Update ducks in place
        ducks.forEach((updatedDuck, i) => {
          const duckIndex = this.workerDuckBatches[batchIndex].startIndex + i;
          if (this.ducks[duckIndex]) {
            Object.assign(this.ducks[duckIndex], updatedDuck);
          }
        });
      }

      this.pendingWorkerUpdates--;
    }
  }

  createDuckElement(duck, index) {
    console.log(
      "[DuckSize][createDuckElement] trackHeight:",
      this.trackHeight,
      "duckSizeRatio:",
      this.duckSizeRatio,
      "duckHeight:",
      this.trackHeight * this.duckSizeRatio,
    );
    // Skip DOM creation if using canvas rendering
    if (this.useCanvasRendering) {
      return;
    }

    // Duck size scales with track height (controlled by duckSizeRatio)
    const duckHeight = this.trackHeight * this.duckSizeRatio;
    const topPadding = this.trackHeight * 0.02; // 2% padding
    const bottomPadding = this.trackHeight * 0.02; // 2% padding
    // Sửa: không trừ duckHeight để lane đầu/cuối sát mép trên/dưới
    const availableHeight = this.trackHeight - topPadding - bottomPadding;
    // Nếu chỉ có 1 vịt thì đặt laneHeight = 0 để không chia
    const laneHeight =
      this.duckCount > 1 ? availableHeight / (this.duckCount - 1) : 0;

    const duckEl = document.createElement("div");
    duckEl.className = "duck-element";
    duckEl.style.width = `${duckHeight}px`;
    duckEl.style.height = `${duckHeight}px`;
    // Lane 0 sát đáy river-race, lane N-1 sát đỉnh, chia đều từ dưới lên
    const laneIdx = index - 1;
    const laneCount = this.duckCount;
    const y = (this.trackHeight - duckHeight) * (1 - laneIdx / (laneCount - 1));
    duckEl.style.top = `${y}px`;
    duckEl.style.left = "0px";

    if (this.imagesLoaded && this.duckImages.length > 0) {
      const iconIndex = (duck.id - 1) % this.duckImages.length;
      const img = document.createElement("img");
      // Sử dụng frame đầu tiên (index 0)
      img.src = this.duckImages[iconIndex][0].src;
      img.className = "duck-icon";
      img.alt = duck.name;
      img.style.width = `${duckHeight}px`;
      img.style.height = `${duckHeight}px`;
      duckEl.appendChild(img);
    } else {
      const circle = document.createElement("div");
      circle.style.borderRadius = "50%";
      circle.style.background = duck.color;
      duckEl.appendChild(circle);
    }

    const nameLabel = document.createElement("span");
    nameLabel.className = "duck-name";
    nameLabel.textContent =
      duck.name.length > 20 ? duck.name.substring(0, 18) + ".." : duck.name;
    // Ban đầu duck-name ở sau icon
    duckEl.appendChild(nameLabel);
    // Nếu đã về đích thì chuyển dần duck-name ra trước icon
    if (duck.finished) {
      // Nếu có img (icon) thì chuyển nameLabel ra trước icon
      const img = duckEl.querySelector(".duck-icon");
      if (img) {
        // Thêm class để animate dịch chuyển
        nameLabel.classList.add("duck-name-move-front");
        // Đưa nameLabel ra trước icon
        duckEl.insertBefore(nameLabel, img);
      }
    }

    // Append to ducks layer if available so ducks are above decorations
    const ducksParent = this.ducksLayer || this.trackContainer;
    ducksParent.appendChild(duckEl);
    this.duckElements.set(duck.id, duckEl);
  }

  redistributeDucks() {
    const duckHeight = this.trackHeight * this.duckSizeRatio;
    const topPadding = this.trackHeight * 0.02;
    const bottomPadding = this.trackHeight * 0.02;
    // Sửa: không trừ duckHeight để lane đầu/cuối sát mép trên/dưới
    const availableHeight = this.trackHeight - topPadding - bottomPadding;
    const laneHeight =
      this.duckCount > 1 ? availableHeight / (this.duckCount - 1) : 0;

    this.ducks.forEach((duck, index) => {
      const duckEl = this.duckElements.get(duck.id);
      if (duckEl) {
        // Lane 0 sát đáy river-race, lane N-1 sát đỉnh, chia đều từ dưới lên
        const laneCount = this.duckCount;
        const y =
          (this.trackHeight - duckHeight) * (1 - index / (laneCount - 1));
        duckEl.style.top = `${y}px`;
        // Animate duck-name nếu đã về đích
        const nameLabel = duckEl.querySelector(".duck-name");
        const duckImg = duckEl.querySelector(".duck-icon");
        if (duck.finished && nameLabel && duckImg) {
          nameLabel.classList.add("duck-name-move-front");
          if (duckEl.firstChild !== nameLabel) {
            duckEl.insertBefore(nameLabel, duckImg);
          }
        } else if (nameLabel && duckImg) {
          // Nếu chưa về đích, đảm bảo nameLabel ở sau icon
          nameLabel.classList.remove("duck-name-move-front");
          if (duckImg.nextSibling !== nameLabel) {
            duckEl.appendChild(nameLabel);
          }
        }
        // Update icon/circle size if already created
        const duckImg2 = duckEl.querySelector(".duck-icon");
        if (duckImg2) {
          duckImg2.style.width = `${duckHeight}px`;
          duckImg2.style.height = `${duckHeight}px`;
        } else {
          const circle = duckEl.querySelector("div");
          if (circle) {
            circle.style.width = `${duckHeight}px`;
            circle.style.height = `${duckHeight}px`;
          }
        }
      }
    });
  }

  // Update duck size ratio at runtime and apply to all elements
  setDuckSizeRatio(ratio) {
    // Accept percent (10–100) or ratio (0.1–1.0)
    let r = typeof ratio === "string" ? parseFloat(ratio) : ratio;
    if (isNaN(r) || r <= 0) return;
    if (r > 1) r = r / 100;
    this.duckSizeRatio = Math.max(0.1, Math.min(1, r));
    localStorage.setItem("duckSizeRatio", this.duckSizeRatio);
    // Update slider and label if present
    const duckSizeEl = document.getElementById("duckSizeRatio");
    if (duckSizeEl) duckSizeEl.value = Math.round(this.duckSizeRatio * 100);
    const duckSizeValue = document.getElementById("duckSizeValue");
    if (duckSizeValue)
      duckSizeValue.textContent = Math.round(this.duckSizeRatio * 100) + "%";
    console.log("[DuckSize] setDuckSizeRatio applied:", this.duckSizeRatio);

    // Determine effective trackHeight: prefer existing this.trackHeight, otherwise derive from DOM
    const trackElement = document.getElementById("raceTrack");
    let effectiveTrackHeight =
      this.trackHeight && this.trackHeight > 0 ? this.trackHeight : 0;
    if (!effectiveTrackHeight && trackElement) {
      const raceTrackHeight = trackElement.clientHeight || 250;
      effectiveTrackHeight = raceTrackHeight * 0.6; // race-river is 60% of race-track
      this.trackHeight = effectiveTrackHeight; // store for subsequent calls
    }

    const sizePx = Math.max(
      1,
      Math.round(effectiveTrackHeight * this.duckSizeRatio),
    );

    // Update CSS variable so .duck-element picks it up
    if (trackElement) {
      document.documentElement.style.setProperty("--duck-size", `${sizePx}px`);
      console.log("[DuckSize] --duck-size set to", `${sizePx}px`);
    }

    // Recompute lanes and spacing so layout matches new size
    this.redistributeDucks();
  }

  // Force cluster camera mode - can be toggled from control panel
  setForceClusterCamera(enabled) {
    this.forceClusterCamera = !!enabled;
    try {
      localStorage.setItem(
        "forceClusterCamera",
        this.forceClusterCamera ? "true" : "false",
      );
    } catch (e) {
      console.warn("Could not persist forceClusterCamera:", e);
    }

    console.log("Force Cluster Camera set to:", this.forceClusterCamera);

    // Update UI checkbox if exists
    const el = document.getElementById("forceClusterToggle");
    if (el) el.checked = this.forceClusterCamera;

    // Broadcast to display/control so both sides stay in sync
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "FORCE_CLUSTER_CAMERA",
        data: { enabled: this.forceClusterCamera },
      });
      console.log(
        "📢 Sent FORCE_CLUSTER_CAMERA to channel:",
        this.forceClusterCamera,
      );
    }
  }

  // Finish-safe zone (px) setter - persists to localStorage
  setFinishSafeZone(px) {
    const v = Number(px) || 0;
    this.finishSafeZone = Math.max(0, Math.round(v));
    try {
      localStorage.setItem("finishSafeZone", String(this.finishSafeZone));
      console.log("Finish safe zone set to:", this.finishSafeZone);
    } catch (e) {
      console.warn("Could not persist finishSafeZone:", e);
    }

    // Update UI if present
    const el = document.getElementById("finishSafeZone");
    if (el) el.value = this.finishSafeZone;
    const disp = document.getElementById("finishSafeZoneValue");
    if (disp) disp.textContent = `${this.finishSafeZone}px`;

    // Broadcast to display if needed
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "FINISH_SAFE_ZONE_UPDATED",
        data: { finishSafeZone: this.finishSafeZone },
      });
    }
  }

  // Toggle whether finishers should be vertically staggered to avoid overlap
  // Default is OFF to allow natural finishing behavior
  setFinishStaggerEnabled(enabled) {
    const v = !!enabled;
    this.finishStaggerEnabled = v;
    try {
      localStorage.setItem("finishStaggerEnabled", v ? "true" : "false");
      console.log("Finish stagger set to:", v);
    } catch (e) {
      console.warn("Could not persist finishStaggerEnabled:", e);
    }

    const el = document.getElementById("finishStaggerToggle");
    if (el) el.checked = this.finishStaggerEnabled;

    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "FINISH_STAGGER_UPDATED",
        data: { finishStaggerEnabled: this.finishStaggerEnabled },
      });
    }
  }

  showCountdown(callback) {
    let countdown = 3;
    const countdownEl = document.createElement("div");
    countdownEl.style.position = "fixed";
    countdownEl.style.top = "50%";
    countdownEl.style.left = "50%";
    countdownEl.style.transform = "translate(-50%, -50%)";
    countdownEl.style.fontSize = "120px";
    countdownEl.style.fontWeight = "bold";
    countdownEl.style.color = "#FFD700";
    countdownEl.style.textShadow = "0 0 30px rgba(255, 215, 0, 0.8)";
    countdownEl.style.zIndex = "2147483647";
    countdownEl.textContent = countdown;

    // Append to fullscreen element if in fullscreen mode
    const fullscreenElement = document.fullscreenElement;
    if (fullscreenElement) {
      fullscreenElement.appendChild(countdownEl);
    } else {
      document.body.appendChild(countdownEl);
    }

    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        countdownEl.textContent = countdown;
      } else if (countdown === 0) {
        countdownEl.textContent = "GO!";
        countdownEl.style.color = "#00FF00";
      } else {
        clearInterval(interval);
        if (countdownEl.parentElement) {
          countdownEl.parentElement.removeChild(countdownEl);
        }
        callback();
      }
    }, 600);
  }

  handleDisplayRaceFinished(data) {
    const { winner, finishTime, rankings, raceMode, winnerCount, winners } =
      data;

    console.log("Control: Processing race finish from display");
    console.log("Winner:", winner.name, "Time:", finishTime, "Mode:", raceMode);
    if (winners) {
      console.log("Control: Received", winners.length, "winners from display");
    }

    // Update local state from display
    this.raceFinished = true;
    this.raceStarted = false;
    this.rankings = rankings;
    if (winnerCount) {
      this.winnerCount = winnerCount;
    }

    // For Top N mode: Set currentRaceWinners from display data
    if (raceMode === "topN" && winners && winners.length > 0) {
      // Gán prizePosition và prizeName cho từng winner theo thứ tự giải
      this.currentRaceWinners = winners.map((w, idx) => {
        // Use prize name from script
        const prizeName = this.currentScriptPrizeName || "";

        return {
          ...w,
          prizePosition: idx + 1,
          prizeName: prizeName, // Store prize name in winner object
        };
      });
      console.log(
        "Control: Set currentRaceWinners from display:",
        this.currentRaceWinners.length,
        "winners",
      );
    }

    // Play finish sounds (stops race.mp3, plays end.mp3)
    this.soundManager.playFinishSound();

    // Send messages to display based on mode from display data
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "RACE_FINISHED",
        data: { winner },
      });

      // Send popup message to display with winners and prize info
      if (
        raceMode === "topN" &&
        this.currentRaceWinners &&
        this.currentRaceWinners.length > 0
      ) {
        setTimeout(() => {
          console.log(
            "Sending SHOW_TOPN_WINNER to display with",
            this.currentRaceWinners.length,
            "winners",
          );
          console.log(
            "Winners data being sent:",
            JSON.stringify(
              this.currentRaceWinners.map((w) => ({
                name: w.name,
                prizeName: w.prizeName,
              })),
            ),
          );
          this.displayChannel.postMessage({
            type: "SHOW_TOPN_WINNER",
            data: {
              winners: this.currentRaceWinners,
              finishTime: finishTime,
            },
          });
        }, 5000);
      }
    }

    // Show/hide continue buttons based on mode
    if (raceMode === "topN") {
      safeElementAction("continueBtn", (el) => (el.style.display = "none"));
      safeElementAction("continueBankBtn", (el) => el.classList.add("hidden"));
    } else {
      safeElementAction(
        "continueBtn",
        (el) => (el.style.display = "inline-block"),
      );
      safeElementAction("continueBankBtn", (el) =>
        el.classList.remove("hidden"),
      );
    }
    safeElementAction("pauseBtn", (el) => (el.disabled = true));

    // Mark race script as completed when race finishes
    if (!this.isDisplayMode && this.raceScripts) {
      const runningScript = this.raceScripts.find(
        (s) => s.status === "running",
      );
      if (runningScript) {
        console.log(
          `✓ Found running script to complete:`,
          runningScript.id,
          runningScript.prizeName,
        );
        this.markScriptCompleted(runningScript.id);
        console.log(
          `✓ Script "${runningScript.prizeName}" marked as completed`,
        );
      } else {
        console.warn("⚠️ No running script found to mark as completed");
        console.log("All scripts:", this.raceScripts);
      }
    }

    // Save winners to accumulated list and update UI
    if (raceMode === "topN") {
      // Top N mode: Merge current race winners into historical winners
      if (this.currentRaceWinners && this.currentRaceWinners.length > 0) {
        const startPosition = this.winners.length; // Continue numbering from last position

        this.currentRaceWinners.forEach((w, index) => {
          w._controlFinishTime = parseFloat(finishTime);
          w.position = startPosition + index + 1; // Tổng số winner
          w.raceNumber = this.currentRaceNumber;
          w.prizePosition = w.prizePosition || index + 1; // Đảm bảo có prizePosition
          // Add to accumulated winners
          this.winners.push(w);
          console.log(
            `✓ Added winner ${w.name} with prizeName: "${w.prizeName}"`,
          );
        });

        console.log(
          `Control: Top N mode - Added ${this.currentRaceWinners.length} new winners. Total winners: ${this.winners.length}`,
        );

        // Remove winners from activeDuckNames for next race
        const winnerNames = this.currentRaceWinners.map((w) => w.name);
        this.activeDuckNames = this.activeDuckNames.filter(
          (name) => !winnerNames.includes(name),
        );

        // Save accumulated winners to localStorage
        this.saveWinners();
        // Update victory history panel
        this.updateHistoryWin();

        // Update prize assignment UI with new winners
        if (this.renderPrizeAssignmentUI) {
          this.renderPrizeAssignmentUI();
        }

        // Don't show popup - only show result panel
        // Show result panel immediately after race ends
        if (!this.isDisplayMode) {
          setTimeout(() => {
            this.showWinnersPanel();
          }, 1000);
        }
      }
    }

    // Update stats
    this.stats.totalRaces++;
    if (this.rankings.indexOf(this.rankings[0]) < 3) {
      this.stats.top3Finishes++;
    }
    this.saveStats();

    // Update race history
    this.raceHistory.push({
      raceNumber: this.currentRaceNumber,
      mode: "topN",
      winners:
        this.currentRaceWinners && this.currentRaceWinners.length > 0
          ? this.currentRaceWinners.map((w) => ({ id: w.id, name: w.name }))
          : [],
      winnerCount: this.currentRaceWinners ? this.currentRaceWinners.length : 0,
      duckCount: this.duckCount,
      duration: this.raceDuration,
      timestamp: new Date().toLocaleString("vi-VN"),
    });

    // Update UI
    safeElementAction("raceStatus", (el) => (el.textContent = "Finished!"));
    safeElementAction("timeLeft", (el) => (el.textContent = "0s"));
    safeElementAction("pauseBtn", (el) => (el.disabled = true));

    // Show Next Race button after race finishes
    safeElementAction(
      "nextRaceBtn",
      (el) => (el.style.display = "inline-block"),
    );
  }

  updateControlPanelTimer() {
    if (
      !this.raceStarted ||
      this.raceFinished ||
      this.racePaused ||
      this.isDisplayMode
    ) {
      return;
    }

    // Update timer display on control panel - use real time
    const elapsed = (Date.now() - this.startTime) / 1000;
    const timeLeft = Math.max(0, this.raceDuration - elapsed);

    const raceStatus = document.getElementById("raceStatus");
    const timeLeftEl = document.getElementById("timeLeft");

    if (raceStatus) raceStatus.textContent = "Racing!";
    if (timeLeftEl) timeLeftEl.textContent = `${Math.ceil(timeLeft)}s`;

    // Send update to display
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "RACE_UPDATE",
        data: {
          timeLeft,
          raceNumber: this.currentRaceNumber,
          status: "Racing!",
        },
      });
    }

    // Continue updating every 100ms
    if (this.raceStarted && !this.raceFinished && !this.racePaused) {
      setTimeout(() => this.updateControlPanelTimer(), 100);
    }
  }

  pauseRace() {
    if (!this.racePaused && this.raceStarted && !this.raceFinished) {
      this.racePaused = true;
      this.pausedTime = Date.now();

      // Stop animation interval
      if (this.animationId) {
        clearInterval(this.animationId);
        this.animationId = null;
      }

      // Stop race sounds when paused
      this.soundManager.stopRacingAmbiance();
      safeElementAction("pauseBtn", (el) => (el.disabled = true));
      safeElementAction("resumeBtn", (el) => (el.disabled = false));
      safeElementAction("raceStatus", (el) => (el.textContent = "Paused"));

      // Send pause command to display window
      if (this.displayChannel && !this.isDisplayMode) {
        this.displayChannel.postMessage({
          type: "PAUSE_RACE",
          data: {},
        });
        console.log("Sent PAUSE_RACE to display");
      }
    }
  }

  resumeRace() {
    if (this.racePaused) {
      this.racePaused = false;
      const pauseDuration = Date.now() - this.pausedTime;
      this.startTime += pauseDuration;
      // Resume race sounds
      this.soundManager.startRacingAmbiance(this.raceDuration);
      safeElementAction("pauseBtn", (el) => (el.disabled = false));
      safeElementAction("resumeBtn", (el) => (el.disabled = true));
      safeElementAction("raceStatus", (el) => (el.textContent = "Racing!"));

      // Reset frame time tracking
      this.lastFrameTime = Date.now();
      this.animationId = requestAnimationFrame((ts) => this.animate(ts));

      // Send resume command to display window
      if (this.displayChannel && !this.isDisplayMode) {
        this.displayChannel.postMessage({
          type: "RESUME_RACE",
          data: { pauseDuration },
        });
        console.log("Sent RESUME_RACE to display");
      }
    }
  }

  animate(timestamp) {
    if (!this.raceStarted || this.raceFinished || this.racePaused) return;

    // Continue animation loop with requestAnimationFrame
    this.animationId = requestAnimationFrame((ts) => this.animate(ts));

    // Calculate delta time for frame-independent movement
    const currentTime = Date.now();

    if (!this.lastFrameTime) this.lastFrameTime = currentTime;
    const frameTime = currentTime - this.lastFrameTime;

    // Skip frame if less than 8ms passed (cap at ~120fps)
    if (frameTime < 8) return;

    this.lastFrameTime = currentTime;

    // Delta time multiplier: 1.0 at 60fps, >1.0 for slower fps, <1.0 for faster fps
    this.deltaTime = frameTime / this.targetFrameTime;

    // Clamp delta time to a very tight range to prevent visible jumps
    this.deltaTime = Math.max(0.8, Math.min(1.2, this.deltaTime));

    // Apply game speed multiplier
    this.deltaTime *= this.gameSpeed;

    // If deltaTime is still too large (frame drop), skip this frame to avoid jitter
    if (this.deltaTime > 1.5) {
      // Optionally log for debugging
      console.warn("Frame skipped due to large deltaTime:", this.deltaTime);
      return;
    }

    // Smooth delta time with exponential moving average to reduce jitter
    const smoothingFactor = 0.85; // Higher = more smoothing (0-1)
    this.smoothedDeltaTime =
      this.smoothedDeltaTime * smoothingFactor +
      this.deltaTime * (1 - smoothingFactor);

    // Calculate elapsed time - always use real time to keep race duration accurate
    // gameSpeed only affects visual speed, not race duration
    const elapsed = (Date.now() - this.startTime) / 1000;
    const timeLeft = Math.max(0, this.raceDuration - elapsed);

    // Update time left on control panel (index.html) - throttled to reduce DOM operations
    if (!this.lastUIUpdate || currentTime - this.lastUIUpdate > 50) {
      // Update UI every 50ms
      this.lastUIUpdate = currentTime;

      const timeLeftEl = document.getElementById("timeLeft");
      if (timeLeftEl) {
        timeLeftEl.textContent = `${timeLeft.toFixed(1)}s`;
      }

      // Send update to display window
      if (this.displayChannel && !this.isDisplayMode) {
        this.displayChannel.postMessage({
          type: "RACE_UPDATE",
          data: {
            timeLeft,
            raceNumber: this.currentRaceNumber,
            status: "Racing!",
          },
        });
      }

      // Big timer shows elapsed time (counting up)
      const bigTimerEl = document.getElementById("bigTimer");
      if (bigTimerEl) {
        const timerDisplay = bigTimerEl.querySelector(".timer-display");
        if (timerDisplay) {
          const minutes = Math.floor(elapsed / 60);
          const seconds = Math.floor(elapsed % 60);
          const milliseconds = Math.floor((elapsed % 1) * 100);
          timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`;
        }
      }
    }

    // Check for finishers and handle based on race mode
    let hasFinisher = false; // Track if any duck finished (for normal mode)

    this.ducks.forEach((duck) => {
      // For Top N mode: Check against currentRaceWinners (not accumulated winners)
      // For Normal mode: Check against winners array
      const winnersList =
        this.raceMode === "topN" ? this.currentRaceWinners || [] : this.winners;

      // Check if duck just finished (not already in winners list)
      if (
        duck.position >= this.trackLength - FINISH_LINE_OFFSET &&
        !winnersList.find((w) => w.id === duck.id)
      ) {
        // Only control mode should track winners - display mode just counts finishers
        if (this.isDisplayMode) {
          // Display mode: For Top N, just log; race end is detected by counting all finished ducks below
          if (this.raceMode === "topN") {
            console.log(`🏁 Display: Duck finished:`, duck.name);
          } else {
            hasFinisher = true;
          }

          // Assign finish order and compute stagger offset for display visuals
          if (this.isDisplayMode && !duck.finishOrder) {
            duck.finishOrder = this.nextFinishOrder++;
            const idx = duck.finishOrder - 1; // 0-based
            const k = Math.ceil(idx / 2);
            const sign = idx % 2 === 1 ? 1 : -1; // pattern: 0, +1, -1, +2, -2...
            const duckHeight = this.trackHeight * this.duckSizeRatio;
            const spacing = Math.round(duckHeight * this.finishSpacingRatio);
            const offset = k * sign * spacing;
            duck.finishOffset = offset;
            // cap offsets if too many finishers
            if (Math.abs(duck.finishOffset) > this.maxFinishStack * spacing) {
              duck.finishOffset =
                this.maxFinishStack *
                spacing *
                (duck.finishOffset < 0 ? -1 : 1);
            }
            // mark for immediate DOM update (if element exists)
            const duckEl = this.duckElements.get(duck.id);
            if (duckEl) {
              duckEl.classList.add("duck-finished");
              // ensure high z-index
              duckEl.style.zIndex = 1000 + duck.finishOrder;
              const nameLabel = duckEl.querySelector(".duck-name");
              if (nameLabel) {
                nameLabel.classList.add("duck-name-finish-top");
              }
            }
          }
        } else {
          // Control mode: Track winners
          if (this.raceMode === "topN") {
            if (!this.currentRaceWinners) this.currentRaceWinners = [];

            // Get prize name based on winner position (index in currentRaceWinners)
            const winnerIndex = this.currentRaceWinners.length;
            const prizeName =
              this.prizeRaceList && this.prizeRaceList[winnerIndex]
                ? this.prizeRaceList[winnerIndex]
                : this.currentScriptPrizeName || "";

            this.currentRaceWinners.push({
              id: duck.id,
              name: duck.name,
              code: duck.code, // Include employee code
              iconSrc: duck.iconSrc,
              finishTime: duck.finishTime,
              position: duck.position,
              prizeName: prizeName, // Prize name based on winner position
            });

            console.log(
              `🏆 Winner #${this.currentRaceWinners.length}:`,
              duck.name,
              "Time:",
              duck.finishTime,
            );

            // Top N mode: No toast notification, just log

            // Send winner update to display
            if (this.displayChannel && !this.isDisplayMode) {
              this.displayChannel.postMessage({
                type: "WINNER_FINISHED",
                data: {
                  winner:
                    this.currentRaceWinners[this.currentRaceWinners.length - 1],
                  position: this.currentRaceWinners.length,
                  totalWinners: this.winnerCount,
                },
              });
            }
          } else {
            // Normal mode: just mark that someone finished (don't add to winners array)
            hasFinisher = true;
            console.log(
              `🏁 First finisher: ${duck.name}, Time: ${duck.finishTime}`,
            );
          }
        }
      }
    });

    // For display mode Top N: Count total ducks that have crossed the finish line
    let finisherCount = 0;
    if (this.isDisplayMode && this.raceMode === "topN") {
      finisherCount = this.ducks.filter(
        (duck) => duck.position >= this.trackLength - FINISH_LINE_OFFSET,
      ).length;
    }

    // Check if race should end based on mode
    const shouldEndRace =
      this.raceMode === "topN"
        ? this.isDisplayMode
          ? finisherCount >= this.winnerCount
          : this.currentRaceWinners &&
            this.currentRaceWinners.length >= this.winnerCount
        : hasFinisher; // Normal mode: end when first duck finishes

    if (shouldEndRace) {
      console.log(
        `Race complete! Mode: ${this.raceMode}, Winners: ${this.winners.length}`,
      );

      // Stop all ducks immediately when race ends
      this.ducks.forEach((duck) => {
        duck.speed = 0;
        duck.targetSpeed = 0;
      });

      this.endRace();
      return;
    }

    // Performance optimization: Aggressive viewport culling for large duck counts
    const viewportStart = this.cameraOffset - this.viewportBuffer;
    const viewportEnd =
      this.cameraOffset + this.viewportWidth + this.viewportBuffer;
    const duckCount = this.ducks.length;
    const isLargeRace = duckCount > 100;
    const isVeryLargeRace = duckCount > 500;

    // Use Web Workers for physics updates if enabled
    if (
      this.useWorkers &&
      this.workers.length > 0 &&
      this.pendingWorkerUpdates === 0
    ) {
      this.updateDucksWithWorkers(timestamp, viewportStart, viewportEnd);
    } else {
      // Single-threaded updates for smaller races or fallback
      this.updateDucksSingleThreaded(
        timestamp,
        viewportStart,
        viewportEnd,
        duckCount,
        isLargeRace,
        isVeryLargeRace,
      );
    }

    // Update rankings only when needed
    const shouldUpdateRankings =
      !this.rankingUpdateCounter ||
      this.rankingUpdateCounter % (isVeryLargeRace ? 10 : 5) === 0;

    // Cache previous leader for smooth transitions
    const previousLeader = this.rankings.length > 0 ? this.rankings[0] : null;

    if (shouldUpdateRankings) {
      this.rankings = [...this.ducks].sort((a, b) => b.position - a.position);
    }

    if (this.rankings.length > 0) {
      let leader = this.rankings[0];

      // ========================================
      // CAMERA FOCUS ON TOP GROUP (not single duck) - MUCH SMOOTHER!
      // ========================================
      // Calculate average position of top 3-5 ducks to reduce camera shake
      // This prevents camera from following individual duck animations
      const topGroupSize = Math.min(5, this.rankings.length); // Top 5 or less if fewer ducks
      let groupPositionSum = 0;

      for (let i = 0; i < topGroupSize; i++) {
        groupPositionSum += this.rankings[i].position;
      }

      // Average position of leading group
      let leaderPosition = groupPositionSum / topGroupSize;

      const distanceToFinish = this.trackLength - leaderPosition;

      // Log thông tin vịt dẫn đầu real-time với tốc độ và delta time
      const leaderSpeed = leader.speed || 0;
      const effectiveSpeed = leaderSpeed * this.deltaTime;
      const estimatedTimeToFinish =
        distanceToFinish / (effectiveSpeed * 60 || 1); // Convert to seconds

      // Log every 1 second
      if (
        Math.floor(elapsed) !==
        Math.floor(elapsed - (this.deltaTime * this.targetFrameTime) / 1000)
      ) {
        console.log(
          `[${elapsed.toFixed(1)}s] Leader: ${leader.name} | Pos: ${leader.position.toFixed(0)}/${this.trackLength} (${((leader.position / this.trackLength) * 100).toFixed(1)}%) | Speed: ${effectiveSpeed.toFixed(2)} px/frame | ETA: ${estimatedTimeToFinish.toFixed(1)}s | Delta: ${this.deltaTime.toFixed(3)}`,
        );
      }

      // Calculate top ducks for both background sync and camera velocity matching
      const topDucks = this.rankings.slice(
        0,
        Math.min(10, this.rankings.length),
      );
      const avgSpeed =
        topDucks.reduce(
          (sum, duck) =>
            sum + (duck.speed || duck.baseSpeed) * this.smoothedDeltaTime,
          0,
        ) / topDucks.length;

      // Background speed synchronized with leader duck movement
      let backgroundSpeed = avgSpeed * 2.5;
      let duckVisualSpeed = 0;

      // ========================================
      // SIMPLE CAMERA ALGORITHM - FOCUS ON GROUP AVERAGE
      // ========================================

      // Leader group positioned at 40% from left edge (slightly left of center for forward view)
      let leaderScreenPosition = 0.4;

      // When approaching finish line, shift camera RIGHT to show finish line + space for ducks to cross
      const finishLineRevealDistance = this.viewportWidth * 2.0; // Hiển sớm hơn (2.0 thay vì 1.5)

      // Store whether we're in finish approach zone
      const inFinishApproach = distanceToFinish <= finishLineRevealDistance;

      if (inFinishApproach) {
        // Calculate camera shift based on distance to finish
        // Gradually shift camera right as leader approaches finish
        const shiftProgress = Math.max(
          0,
          Math.min(
            1,
            (finishLineRevealDistance - distanceToFinish) /
              finishLineRevealDistance,
          ),
        );

        // Shift camera right by moving leader's screen position from 0.4 to 0.2 (20% from left)
        // This creates 80% viewport space on the right for finish line + crossing space
        leaderScreenPosition = 0.4 - shiftProgress * 0.2; // 0.4 -> 0.2
      }

      // ========================================
      // CONSTANT VELOCITY CAMERA WITH INERTIA
      // Priority: SMOOTH (constant speed) > Following exactly
      // ========================================

      // Calculate leader-based camera target (stable mode)
      const leaderTarget =
        leaderPosition - this.viewportWidth * leaderScreenPosition;

      // Calculate densest-cluster-based target (alternate mode)
      // Window width chosen as 70% of viewport to capture dense mid-pack
      const clusterWindow = Math.max(this.viewportWidth * 0.7, 300);
      const clusterInfo = this.getDensestClusterCenter(clusterWindow);
      const clusterCenter = clusterInfo.center || 0;
      const clusterCount = clusterInfo.count || 0;
      const clusterTarget = clusterCenter - this.viewportWidth * 0.5; // center cluster in viewport

      // Determine which camera stream to use based on race progress
      const halfTime = (this.raceDuration || 1) * 0.09; // fallback to 1s if undefined (30% race -> switch to leader)
      const transitionDuration = 2.0; // seconds to blend between streams
      const elapsedSec = elapsed; // already computed above

      // Minimum cluster size required to use cluster mode (3% of ducks or at least 5)
      const minClusterCount = Math.max(
        5,
        Math.floor((this.ducks.length || 0) * 0.03),
      );

      let chosenTarget = leaderTarget; // default
      let activeMode = "stable";

      // If user forces cluster mode, override everything
      if (this.forceClusterCamera) {
        chosenTarget = clusterTarget;
        activeMode = "cluster-forced";
      } else if (elapsedSec < halfTime && clusterCount >= minClusterCount) {
        // First half: use cluster-focused stream only if cluster is big enough
        chosenTarget = clusterTarget;
        activeMode = "cluster";
      } else if (elapsedSec < halfTime && clusterCount < minClusterCount) {
        // Not enough cluster density - fallback to leader
        chosenTarget = leaderTarget;
        activeMode = "stableFallback";
      } else if (
        elapsedSec >= halfTime &&
        elapsedSec <= halfTime + transitionDuration
      ) {
        // Smoothly blend from cluster to leader during transitionDuration
        const t = Math.min(
          1,
          Math.max(0, (elapsedSec - halfTime) / transitionDuration),
        );
        // If cluster was too small, start from leader to leader (no effect)
        const startTarget =
          clusterCount >= minClusterCount ? clusterTarget : leaderTarget;
        chosenTarget = startTarget * (1 - t) + leaderTarget * t;
        activeMode = "blending";
      } else {
        // Second half: stable leader-based camera
        chosenTarget = leaderTarget;
        activeMode = "stable";
      }

      // Use chosenTarget as the final camera target
      let targetCameraOffset = chosenTarget;

      // Calculate distance from target
      const distance = targetCameraOffset - this.cameraOffset;

      // Debug log showing which camera stream is active
      if (!this.cameraStreamLogCounter) this.cameraStreamLogCounter = 0;
      this.cameraStreamLogCounter++;
      if (this.cameraStreamLogCounter % 30 === 0) {
        console.log(
          `Camera Stream: ${activeMode.toUpperCase()} | ClusterCenter: ${Math.round(clusterCenter)} | LeaderPos: ${Math.round(leaderPosition)} | Target: ${Math.round(targetCameraOffset)}`,
        );
      }

      // VELOCITY MATCHING: Match camera velocity with leader group velocity
      // Use top 5 ducks from the topDucks array already calculated above
      const topGroup = topDucks.slice(0, Math.min(5, topDucks.length));
      const avgLeaderVelocity =
        topGroup.reduce(
          (sum, duck) =>
            sum + (duck.speed || duck.baseSpeed) * this.smoothedDeltaTime,
          0,
        ) / topGroup.length;

      // Compute target velocity depending on active camera stream
      let targetVelocity = 0;

      // Proportional controller to gently move towards chosenTarget when in cluster modes
      const distanceToTarget = targetCameraOffset - this.cameraOffset; // positive -> need move right

      if (activeMode.startsWith("cluster")) {
        // Cluster-focused: move slowly towards chosenTarget, low influence from leader
        const kpCluster = 0.06; // proportional gain (tuneable)
        targetVelocity = distanceToTarget * kpCluster;
        // Small pacing from leader to keep movement natural
        targetVelocity += avgLeaderVelocity * 0.05;
        // Clamp for stability
        targetVelocity = Math.max(-40, Math.min(40, targetVelocity));
      } else if (activeMode === "blending") {
        // Blending: combine proportional to distance and leader velocity
        const kpBlend = 0.04;
        const tFactor = Math.min(
          1,
          Math.max(0, (elapsedSec - halfTime) / transitionDuration),
        );
        targetVelocity =
          distanceToTarget * kpBlend +
          avgLeaderVelocity * (0.5 + 0.5 * tFactor);
        targetVelocity = Math.max(-60, Math.min(60, targetVelocity));
      } else {
        // Stable leader-based camera: base on leader velocity with safe zone corrections
        targetVelocity = avgLeaderVelocity;

        // ONLY use safe zone check when NOT in finish approach
        // This prevents conflict between finish approach shift and boundary correction
        if (!inFinishApproach) {
          const safeZoneStart = this.viewportWidth * 0.2; // 20% from left
          const safeZoneEnd = this.viewportWidth * 0.8; // 80% from left
          const leaderScreenPos = leaderPosition - this.cameraOffset;

          // If leader is outside safe zone, gradually adjust velocity to bring it back
          if (leaderScreenPos < safeZoneStart) {
            // Leader too far left - slow down camera
            const correction = (safeZoneStart - leaderScreenPos) * 0.02;
            targetVelocity = avgLeaderVelocity - correction;
          } else if (leaderScreenPos > safeZoneEnd) {
            // Leader too far right - speed up camera
            const correction = (leaderScreenPos - safeZoneEnd) * 0.02;
            targetVelocity = avgLeaderVelocity + correction;
          }
        }
      }

      // Debug: log when cluster mode active to help tuning
      if (
        activeMode.startsWith("cluster") &&
        this.cameraStreamLogCounter % 10 === 0
      ) {
        console.log(
          `Cluster mode: dist=${Math.round(distanceToTarget)}, tgtVel=${targetVelocity.toFixed(2)}, avgLeaderVel=${avgLeaderVelocity.toFixed(2)}, clusterCount=${clusterCount}`,
        );
      }

      // INERTIA: Smoothly interpolate current velocity toward target velocity
      // High inertia = smooth movement, low responsiveness
      const inertiaFactor = 0.95; // Increased from 0.92 for even smoother camera movement
      const oldVelocity = this.cameraVelocity;
      this.cameraVelocity =
        this.cameraVelocity * inertiaFactor +
        targetVelocity * (1 - inertiaFactor);

      // Safety clamp to prevent extreme speeds
      const maxVelocity = 60;
      this.cameraVelocity = Math.max(
        -maxVelocity,
        Math.min(maxVelocity, this.cameraVelocity),
      );

      // Update camera position with constant-ish velocity
      const oldCameraOffset = this.cameraOffset;
      this.cameraOffset += this.cameraVelocity;

      // CRITICAL FIX: Round camera offset to integer pixels
      // This prevents sub-pixel movement that causes icon jitter
      // Duck icons will move smoothly by whole pixels only
      this.cameraOffset = Math.round(this.cameraOffset);

      // LOG CAMERA MOVEMENT every 10 frames
      if (!this.cameraLogCounter) this.cameraLogCounter = 0;
      this.cameraLogCounter++;
      if (this.cameraLogCounter % 10 === 0) {
        const velocityChange = Math.abs(this.cameraVelocity - oldVelocity);
        const offsetChange = Math.abs(this.cameraOffset - oldCameraOffset);
        console.log(
          `📹 Camera | Vel: ${this.cameraVelocity.toFixed(2)} (Δ${velocityChange.toFixed(2)}) | Offset: ${this.cameraOffset.toFixed(0)} (Δ${offsetChange.toFixed(2)}) | Target: ${targetVelocity.toFixed(2)} | DeltaT: ${this.deltaTime.toFixed(3)}/${this.smoothedDeltaTime.toFixed(3)}`,
        );
      }

      // Allow camera to go beyond normal bounds to show finish line
      // Add extra space = 25% viewport to see finish line + ducks crossing
      const cameraMaxOffset = this.trackLength - this.viewportWidth * 0.75; // Allow camera to go further

      // Finish line reveal - show when leader is close
      const finishLine = document.getElementById("finishLine");

      if (distanceToFinish <= finishLineRevealDistance) {
        // Reveal finish line
        if (finishLine && finishLine.classList.contains("hidden")) {
          finishLine.classList.remove("hidden");
          console.log(
            `%c[Finish Line] 🏁 REVEALED! Distance: ${distanceToFinish.toFixed(0)}px | Leader will shift from 40% to 20%`,
            "color: #FFD700; font-weight: bold; font-size: 16px;",
          );
        }
        // Force visibility
        if (finishLine) {
          finishLine.style.display = "flex";
        }
      }

      // Update finish line position (at actual track end)
      if (finishLine && !finishLine.classList.contains("hidden")) {
        const finishScreenX = this.trackLength - this.cameraOffset;
        finishLine.style.left = finishScreenX + "px";

        // Debug: Log finish line position occasionally
        if (Math.random() < 0.01) {
          // 1% chance per frame
          console.log(
            `🏁 Finish Line | Screen X: ${finishScreenX.toFixed(0)}px | Viewport: ${this.viewportWidth}px | Visible: ${finishScreenX >= -100 && finishScreenX <= this.viewportWidth + 100}`,
          );
        }
      }

      // When very close to finish line (< 0.5 viewport), slow down background for dramatic effect
      if (distanceToFinish <= this.viewportWidth * 0.5) {
        const slowdownFactor = Math.max(
          0.3,
          distanceToFinish / (this.viewportWidth * 0.5),
        );
        backgroundSpeed = backgroundSpeed * slowdownFactor;
        duckVisualSpeed = avgSpeed * (1.0 - slowdownFactor) * 0.5;
      }

      // Prevent camera from moving backwards (always move forward or stay)
      if (this.cameraOffset < this.lastCameraOffset) {
        this.cameraOffset = this.lastCameraOffset;
        this.cameraVelocity = 0; // Reset velocity when stopped
      }
      this.lastCameraOffset = this.cameraOffset;

      // Clamp camera within track bounds
      this.cameraOffset = Math.max(
        0,
        Math.min(cameraMaxOffset, this.cameraOffset),
      );

      // Update background with smooth interpolation
      this.targetBackgroundOffset += backgroundSpeed * this.deltaTime;
      const backgroundSmoothSpeed = 0.25; // Smooth background scrolling (increased for better sync)
      this.backgroundOffset +=
        (this.targetBackgroundOffset - this.backgroundOffset) *
        backgroundSmoothSpeed;

      // Store visual speed for duck animation
      this.duckVisualSpeed = duckVisualSpeed;
    } else {
      // If no leader or race not active, calculate average speed of all ducks
      const allDucksSpeed =
        this.ducks.length > 0
          ? this.ducks.reduce(
              (sum, duck) => sum + (duck.speed || duck.baseSpeed),
              0,
            ) / this.ducks.length
          : 3.5; // Default base speed
      this.targetBackgroundOffset += allDucksSpeed * 2.5 * this.deltaTime;
      const backgroundSmoothSpeed = 0.25; // Match updated smooth speed
      this.backgroundOffset +=
        (this.targetBackgroundOffset - this.backgroundOffset) *
        backgroundSmoothSpeed;

      this.duckVisualSpeed = 0;
    }

    this.updateDuckPositions();
    this.updateBackgrounds();
    // this.updateLeaderboard(); // Function removed
  }

  updateDucksWithWorkers(timestamp, viewportStart, viewportEnd) {
    // Split ducks into batches for workers
    const batchSize = Math.ceil(this.ducks.length / this.workerCount);
    this.workerDuckBatches = [];

    for (let i = 0; i < this.workerCount; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, this.ducks.length);
      const batch = this.ducks.slice(startIndex, endIndex);

      if (batch.length > 0) {
        this.workerDuckBatches.push({ startIndex, batch });
        this.pendingWorkerUpdates++;

        // Send batch to worker
        this.workers[i].postMessage({
          type: "UPDATE_DUCKS",
          data: {
            ducks: batch,
            deltaTime: this.deltaTime,
            trackLength: this.trackLength,
            rankings: this.rankings,
            timestamp: timestamp || Date.now(),
            cameraOffset: this.cameraOffset,
            viewportWidth: this.viewportWidth,
            viewportBuffer: this.viewportBuffer,
          },
        });
      }
    }
  }

  updateDucksSingleThreaded(
    timestamp,
    viewportStart,
    viewportEnd,
    duckCount,
    isLargeRace,
    isVeryLargeRace,
  ) {
    // Update rankings less frequently for large races
    if (!this.rankingUpdateCounter) this.rankingUpdateCounter = 0;
    this.rankingUpdateCounter++;
    const rankingUpdateFrequency = isVeryLargeRace ? 10 : isLargeRace ? 5 : 3;
    const shouldUpdateRankings =
      this.rankingUpdateCounter % rankingUpdateFrequency === 0;

    this.ducks.forEach((duck, index) => {
      // Always update finished ducks and ducks near viewport
      const isNearViewport =
        duck.position >= viewportStart && duck.position <= viewportEnd;

      // For very large races (500+), extremely aggressive culling:
      const leaderCount = isVeryLargeRace ? 10 : 20;
      const isLeader = index < leaderCount;
      const shouldUpdate = duck.finished || isNearViewport || isLeader;

      if (shouldUpdate) {
        const currentRank = shouldUpdateRankings
          ? this.rankings.findIndex((d) => d.id === duck.id) + 1 || duckCount
          : duck.lastRank || duckCount;

        // Check if we're in slowdown zone (within 500px of finish)
        const leader = this.rankings[0];
        const distanceToFinish = leader
          ? this.trackLength - leader.position
          : Infinity;
        const inSlowdownZone = distanceToFinish <= 500;

        duck.update(
          timestamp || Date.now(),
          currentRank,
          duckCount,
          this.deltaTime,
          inSlowdownZone,
        );
        duck.lastRank = currentRank;
      } else {
        // Ultra-lightweight update for off-screen ducks
        if (!duck.finished) {
          duck.position += (duck.speed || duck.baseSpeed) * this.deltaTime;
        }
      }
    });

    // Lane management for top ducks approaching finish line
    this.manageLanes();
  }

  manageLanes() {
    if (!this.rankings || this.rankings.length === 0) return;

    const leader = this.rankings[0];
    const distanceToFinish = this.trackLength - leader.position;
    const laneManagementZone = this.viewportWidth * 1.5; // Start managing lanes 1.5 viewports from finish

    // Only manage lanes when approaching finish
    if (distanceToFinish > laneManagementZone) return;

    const currentTime = Date.now();

    // Get top ducks in finish zone
    const topDuckCount = Math.min(20, this.rankings.length);
    const topDucks = this.rankings.slice(0, topDuckCount);

    // Group ducks by their current lane
    const NUM_LANES = 5; // Use 5 lanes for smoother transitions
    const lanes = Array.from({ length: NUM_LANES }, () => []);

    topDucks.forEach((duck) => {
      const safeLane = Math.max(0, Math.min(NUM_LANES - 1, duck.lane || 0));
      lanes[safeLane].push(duck);
    });

    // Check for lane conflicts and reassign (one duck at a time)
    lanes.forEach((ducksInLane, laneIndex) => {
      if (ducksInLane.length > 1) {
        // Sort by position (furthest first gets priority to stay)
        ducksInLane.sort((a, b) => b.position - a.position);

        // Only first duck stays, others must move
        for (let i = 1; i < ducksInLane.length; i++) {
          const duck = ducksInLane[i];

          // Check cooldown - don't move if recently changed lane
          if (currentTime - duck.lastLaneChangeTime < duck.laneChangeCooldown) {
            continue; // Skip this duck, still in cooldown
          }

          // Don't perform last-moment lane switches when too close to finish
          const FINISH_SAFE_ZONE = this.finishSafeZone ?? 80; // pixels (nullish coalescing keeps 0 as valid)
          if (
            duck.position >=
            this.trackLength - FINISH_LINE_OFFSET - FINISH_SAFE_ZONE
          ) {
            continue; // Too close to finish - keep lane to avoid jumpy behavior
          }

          // Find least crowded ADJACENT lane (only +1 or -1 from current lane)
          const possibleLanes = [];
          if (laneIndex > 0) possibleLanes.push(laneIndex - 1); // Lane above
          if (laneIndex < NUM_LANES - 1) possibleLanes.push(laneIndex + 1); // Lane below

          if (possibleLanes.length === 0) continue; // No adjacent lanes available

          // Choose least crowded adjacent lane
          let bestLane = laneIndex;
          let minCount = ducksInLane.length;

          for (const adjacentLane of possibleLanes) {
            if (lanes[adjacentLane].length < minCount) {
              minCount = lanes[adjacentLane].length;
              bestLane = adjacentLane;
            }
          }

          // Move duck to new lane if it's better
          if (bestLane !== laneIndex && minCount < ducksInLane.length) {
            duck.lane = bestLane;
            duck.lastLaneChangeTime = currentTime; // Record lane change time
            lanes[bestLane].push(duck);
            console.log(
              `🎯 Lane switch: ${duck.name} | ${laneIndex} → ${bestLane} | Cooldown: ${duck.laneChangeCooldown}ms`,
            );

            // Only move ONE duck per frame to avoid chaos
            break;
          }
        }
      }
    });
  }

  updateDuckPositions() {
    // Use canvas rendering for large races
    if (this.useCanvasRendering && this.ctx) {
      this.updateDuckPositionsCanvas();
      return;
    }

    // DOM rendering for smaller races
    const viewportStart = this.cameraOffset - this.viewportBuffer;
    const viewportEnd =
      this.cameraOffset + this.viewportWidth + this.viewportBuffer;
    const currentVisibleDucks = new Set();

    if (!this.trackContainer) {
      console.error("trackContainer is null in updateDuckPositions!");
      return;
    }

    // Batch DOM operations for better performance
    const domUpdates = [];

    this.ducks.forEach((duck) => {
      const screenX = duck.position - this.cameraOffset;
      const isVisible =
        duck.position >= viewportStart && duck.position <= viewportEnd;

      if (isVisible) {
        currentVisibleDucks.add(duck.id);

        let duckEl = this.duckElements.get(duck.id);

        // Lazy creation - only create element when duck enters viewport
        if (!duckEl) {
          const duckHeight = this.trackHeight * this.duckSizeRatio;
          const topPadding = this.trackHeight * 0.02;
          const bottomPadding = this.trackHeight * 0.02;
          const availableHeight = this.trackHeight - topPadding - bottomPadding;
          const NUM_DISPLAY_LANES = 5;
          const laneHeight =
            NUM_DISPLAY_LANES > 1
              ? availableHeight / (NUM_DISPLAY_LANES - 1)
              : 0;
          const targetLane = Math.max(
            0,
            Math.min(NUM_DISPLAY_LANES - 1, duck.lane || 0),
          );

          duckEl = document.createElement("div");
          duckEl.className = "duck-element";
          // Đảo ngược: lane 0 ở dưới, lane N-1 ở trên
          duckEl.style.top = `${topPadding + (NUM_DISPLAY_LANES - 1 - targetLane) * laneHeight}px`;
          duckEl.style.left = "0px";
          duckEl.style.transition = "top 0.5s ease-out"; // Smooth lane transitions

          if (this.imagesLoaded && this.duckImages.length > 0) {
            const iconIndex = (duck.id - 1) % this.duckImages.length;
            const img = document.createElement("img");
            img.src = this.duckImages[iconIndex][0].src;
            img.className = "duck-icon";
            img.alt = duck.name;
            img.style.width = `${duckHeight}px`;
            img.style.height = `${duckHeight}px`;
            duckEl.appendChild(img);
          } else {
            const circle = document.createElement("div");
            circle.style.width = `${duckHeight}px`;
            circle.style.height = `${duckHeight}px`;
            circle.style.borderRadius = "50%";
            circle.style.background = duck.color;
            duckEl.appendChild(circle);
          }

          const nameLabel = document.createElement("span");
          nameLabel.className = "duck-name";
          nameLabel.textContent =
            duck.name.length > 20
              ? duck.name.substring(0, 18) + ".."
              : duck.name;
          duckEl.appendChild(nameLabel);

          const ducksParent = this.ducksLayer || this.trackContainer;
          ducksParent.appendChild(duckEl);
          this.duckElements.set(duck.id, duckEl);
        }

        // Batch style updates - only use cameraOffset-adjusted screenX
        const newLeft = screenX;

        // Only update if position changed significantly (>1px)
        if (!duck._lastScreenX || Math.abs(newLeft - duck._lastScreenX) > 1) {
          domUpdates.push(() => {
            duckEl.style.left = `${newLeft}px`;
            duckEl.style.display = "";
          });
          duck._lastScreenX = newLeft;
        }

        // Update lane position dynamically
        const duckHeight = this.trackHeight * this.duckSizeRatio;
        const topPadding = this.trackHeight * 0.02;
        const bottomPadding = this.trackHeight * 0.02;
        const availableHeight = this.trackHeight - topPadding - bottomPadding;
        const NUM_DISPLAY_LANES = 5;
        const laneHeight =
          NUM_DISPLAY_LANES > 1 ? availableHeight / (NUM_DISPLAY_LANES - 1) : 0;
        const targetLane = Math.max(
          0,
          Math.min(NUM_DISPLAY_LANES - 1, duck.lane || 0),
        );
        // Đảo ngược: lane 0 ở dưới, lane N-1 ở trên
        const newTop =
          topPadding + (NUM_DISPLAY_LANES - 1 - targetLane) * laneHeight;

        // Update top position if lane changed

        if (!duck._lastTop || Math.abs(newTop - duck._lastTop) > 1) {
          domUpdates.push(() => {
            duckEl.style.top = `${newTop}px`;
          });
          duck._lastTop = newTop;
        }

        // Xử lý hiệu ứng chuyển duck-name ra trước icon khi vừa cán đích (chắc chắn)
        const nameLabel = duckEl.querySelector(".duck-name");
        // Tìm icon: img (duck-icon) hoặc div (circle)
        let icon = duckEl.querySelector(".duck-icon");
        if (!icon) icon = duckEl.querySelector("div");
        if (nameLabel) {
          if (duck.finished) {
            domUpdates.push(() => {
              nameLabel.classList.remove("duck-name-move-front");
              nameLabel.classList.add("duck-name-finish-top");
              // append so it sits after icon; CSS positions it to the right
              if (duckEl.lastChild !== nameLabel) duckEl.appendChild(nameLabel);
            });
          } else {
            domUpdates.push(() => {
              nameLabel.classList.remove("duck-name-finish-top");
              // Ensure default placement (left of icon via CSS 'right: calc(100% + 2px)')
              if (duckEl.lastChild !== nameLabel) duckEl.appendChild(nameLabel);
            });
          }
        }

        // Skip wobble animation for large races (500+ ducks)
        if (this.ducks.length < 500) {
          const wobble = duck.getWobble(Date.now());
          const laneShift = duck.laneOffset || 0;
          domUpdates.push(() => {
            const finishOffset = this.finishStaggerEnabled
              ? (duck.finishOffset ?? 0)
              : 0;
            duckEl.style.transform = `translateY(${wobble + laneShift + finishOffset}px)`;
            // If finished ensure higher z-index so names/icons appear above others
            if (duck.finished || duck.finishOrder) {
              duckEl.style.zIndex = 1000 + (duck.finishOrder || 0);
            }
          });
        } else {
          // For very large races, apply finishOffset only if staggering enabled and offset non-zero
          if (this.finishStaggerEnabled && (duck.finishOffset ?? 0) !== 0) {
            const laneShift = duck.laneOffset || 0;
            const wobbleFallback = duck.getWobble
              ? duck.getWobble(Date.now())
              : 0;
            domUpdates.push(() => {
              duckEl.style.transform = `translateY(${wobbleFallback + laneShift + duck.finishOffset}px)`;
              if (duck.finished || duck.finishOrder)
                duckEl.style.zIndex = 1000 + (duck.finishOrder || 0);
            });
          } else {
            // If not applying stagger, ensure finished z-index is still updated
            domUpdates.push(() => {
              if (duck.finished || duck.finishOrder)
                duckEl.style.zIndex = 1000 + (duck.finishOrder || 0);
            });
          }
        }

        // Update animation frame only every 3rd frame for large races
        const shouldUpdateFrame =
          this.ducks.length < 500 || (this.rankingUpdateCounter || 0) % 3 === 0;
        if (
          shouldUpdateFrame &&
          this.imagesLoaded &&
          this.duckImages.length > 0
        ) {
          const iconIndex = (duck.id - 1) % this.duckImages.length;
          const imgEl = duckEl.querySelector(".duck-icon");
          if (
            imgEl &&
            this.duckImages[iconIndex] &&
            this.duckImages[iconIndex][duck.currentFrame]
          ) {
            domUpdates.push(() => {
              imgEl.src = this.duckImages[iconIndex][duck.currentFrame].src;
            });
          }
        }
      } else {
        // Hide off-screen ducks - batch this too
        const duckEl = this.duckElements.get(duck.id);
        if (duckEl && duckEl.style.display !== "none") {
          domUpdates.push(() => {
            duckEl.style.display = "none";
          });
        }
      }
    });

    // Apply all DOM updates in one batch using requestAnimationFrame
    // This reduces layout thrashing significantly
    if (domUpdates.length > 0) {
      for (const update of domUpdates) {
        update();
      }
    }

    this.visibleDucks = currentVisibleDucks;
  }

  updateDuckPositionsCanvas() {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate duck metrics
    // Luôn lấy duckHeight từ this.duckSizeRatio hiện tại
    const duckHeight = this.trackHeight * this.duckSizeRatio;
    // Log để debug live update
    console.log(
      "[DuckSize][Canvas] duckHeight:",
      duckHeight,
      "trackHeight:",
      this.trackHeight,
      "duckSizeRatio:",
      this.duckSizeRatio,
    );
    const topPadding = this.trackHeight * 0.02;
    const bottomPadding = this.trackHeight * 0.02;
    const availableHeight = this.trackHeight - topPadding - bottomPadding;
    const NUM_DISPLAY_LANES = 5;
    const laneHeight =
      NUM_DISPLAY_LANES > 1 ? availableHeight / (NUM_DISPLAY_LANES - 1) : 0;

    // Viewport culling for canvas
    const viewportStart = this.cameraOffset - this.viewportBuffer;
    const viewportEnd =
      this.cameraOffset + this.viewportWidth + this.viewportBuffer;

    let drawnCount = 0;

    // Build visible list and draw non-finished first, finished last (so finished are on top)
    const visibleDucks = [];
    this.ducks.forEach((duck, index) => {
      const roundedDuckPos = Math.round(duck.position);
      const screenX = roundedDuckPos - this.cameraOffset;
      const isVisible =
        duck.position >= viewportStart && duck.position <= viewportEnd;
      if (!isVisible) return;

      // Calculate base Y and other metrics
      const targetLane = Math.max(
        0,
        Math.min(NUM_DISPLAY_LANES - 1, duck.lane || 0),
      );
      const laneCount = NUM_DISPLAY_LANES;
      const yPos =
        (this.trackHeight - duckHeight) * (1 - targetLane / (laneCount - 1));
      const wobble = duck.getWobble(Date.now());
      const laneShift = duck.laneOffset || 0;
      const finishOffset = this.finishStaggerEnabled
        ? (duck.finishOffset ?? 0)
        : 0;
      const finalY = Math.round(yPos + wobble + laneShift + finishOffset);
      const finalX = Math.round(screenX);

      visibleDucks.push({ duck, index, finalX, finalY });
    });

    const notFinished = visibleDucks.filter((v) => !v.duck.finished);
    const finishedArr = visibleDucks.filter((v) => v.duck.finished);
    const drawList = [...notFinished, ...finishedArr];

    // Draw from drawList so finished ducks are drawn last (on top)
    drawList.forEach(({ duck, index, finalX, finalY }, drawIdx) => {
      // Draw icon
      if (this.imagesLoaded && this.duckImages.length > 0) {
        const iconIndex = (duck.id - 1) % this.duckImages.length;
        const frameImages = this.duckImages[iconIndex];
        if (frameImages && frameImages[duck.currentFrame]) {
          const img = frameImages[duck.currentFrame];
          if (img.complete)
            this.ctx.drawImage(img, finalX, finalY, duckHeight, duckHeight);
        }
      } else {
        this.ctx.fillStyle = duck.color;
        this.ctx.beginPath();
        this.ctx.arc(
          finalX + duckHeight / 2,
          finalY + duckHeight / 2,
          duckHeight / 2,
          0,
          Math.PI * 2,
        );
        this.ctx.fill();
      }

      // Draw name label - if finished, draw to RIGHT of icon with background; else draw LEFT as before
      const fontSize =
        this.duckCount > 500 ? 24 : this.duckCount > 200 ? 28 : 32;
      this.ctx.font = `bold ${fontSize}px Arial`;
      this.ctx.textBaseline = "middle";

      const maxNameLength = this.duckCount > 500 ? 15 : 20;
      const name =
        duck.name.length > maxNameLength
          ? duck.name.substring(0, maxNameLength - 2) + ".."
          : duck.name;
      const textMetrics = this.ctx.measureText(name);
      const textWidth = textMetrics.width;
      const textY = Math.round(finalY + duckHeight / 2);

      if (duck.finished) {
        // Draw semi-transparent bg rect and gold text to the right
        const padding = 6;
        const rectX = Math.round(finalX + duckHeight + 8);
        const rectY = Math.round(textY - fontSize / 2 - 2);
        const rectW = Math.round(textWidth + padding * 2);
        const rectH = Math.round(fontSize + 4);
        this.ctx.fillStyle = "rgba(0,0,0,0.6)";
        this.ctx.fillRect(rectX, rectY, rectW, rectH);
        this.ctx.fillStyle = "#ffd700";
        this.ctx.strokeStyle = "rgba(0,0,0,0.7)";
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(name, rectX + padding, textY + 2);
        this.ctx.fillText(name, rectX + padding, textY + 2);
      } else {
        this.ctx.fillStyle = "white";
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = 3;
        const textX = Math.round(finalX - textWidth - 8);
        this.ctx.strokeText(name, textX, textY + 2);
        this.ctx.fillText(name, textX, textY + 2);
      }
    });

    // Performance stats overlay (top-right corner)
    if (drawnCount > 200) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(this.canvas.width - 200, 10, 190, 60);
      this.ctx.fillStyle = "#00ff00";
      this.ctx.font = "bold 14px monospace";
      this.ctx.fillText(`Canvas Mode`, this.canvas.width - 190, 30);
      this.ctx.fillText(
        `Ducks: ${this.duckCount}`,
        this.canvas.width - 190,
        48,
      );
      this.ctx.fillText(`Visible: ${drawnCount}`, this.canvas.width - 190, 66);
    }
  }

  updateBackgrounds() {
    const raceRiver = document.getElementById("raceRiver");
    const bankTop = document.getElementById("bankTop");
    const bankBot = document.getElementById("bankBot");

    if (raceRiver) {
      // River moves continuously independent of camera
      raceRiver.style.backgroundPosition = `${-this.backgroundOffset}px 0`;
    }

    if (bankTop && bankBot) {
      // Banks move slower (parallax effect) - 60% of river speed
      const bankOffset = this.backgroundOffset * 0.6;
      bankTop.style.backgroundPosition = `${-bankOffset}px 0`;
      bankBot.style.backgroundPosition = `${-bankOffset}px 0`;
    }
  }

  updateMinimap() {
    this.minimapContainer.innerHTML = "";

    const trackWidth = 270;

    const viewportEl = document.getElementById("minimapViewport");
    const cameraStartX =
      15 + (this.cameraOffset / this.trackLength) * trackWidth;
    const cameraWidth = (this.viewportWidth / this.trackLength) * trackWidth;
    viewportEl.style.left = `${cameraStartX}px`;
    viewportEl.style.width = `${cameraWidth}px`;

    for (
      let i = 0;
      i < this.ducks.length;
      i += Math.max(1, Math.floor(this.ducks.length / 100))
    ) {
      const duck = this.ducks[i];
      const dotEl = document.createElement("div");
      dotEl.className = "minimap-duck";
      dotEl.style.background = duck.color;
      const x = (duck.position / this.trackLength) * trackWidth;
      const y = Math.random() * 80 + 10;
      dotEl.style.left = `${x}px`;
      dotEl.style.top = `${y}px`;
      this.minimapContainer.appendChild(dotEl);
    }
  }

  // checkHighlights(oldRankings, newRankings) {
  //     if (oldRankings.length === 0) return;

  //     for (let i = 0; i < Math.min(10, newRankings.length); i++) {
  //         const duck = newRankings[i];
  //         const oldRank = oldRankings.findIndex(d => d.id === duck.id);

  //         if (oldRank > i && oldRank - i >= 3) {
  //             this.addHighlight(`${duck.name} vuot len ${oldRank - i} bac! Hien tai: Hang ${i + 1}`);
  //         }
  //     }
  // }

  // addHighlight(message) {
  //     const time = ((Date.now() - this.startTime) / 1000).toFixed(1);
  //     this.highlights.unshift({ time, message });
  //     if (this.highlights.length > 10) this.highlights.pop();

  //     const list = document.getElementById('highlightsList');
  //     list.innerHTML = this.highlights.map(h =>
  //         `<div class="highlight-item">[${h.time}s] ${h.message}</div>`
  //     ).join('');
  // }

  updateHistoryWin() {
    // Cập nhật danh sách lịch sử chiến thắng
    const list = document.getElementById("historyWinList");

    console.log(
      "updateHistoryWin called - Winners:",
      this.winners.length,
      "List element:",
      list ? "found" : "not found",
    );

    if (!list) {
      console.warn("historyWinList element not found");
      return;
    }

    if (this.winners.length === 0) {
      list.innerHTML =
        '<p style="color: #888; padding: 10px;">No winners yet. Start racing!</p>';
      return;
    }

    // Load checkbox states from localStorage
    const prizeAssignStates = JSON.parse(
      localStorage.getItem("prizeAssignStates") || "{}",
    );

    let html = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
    `;

    this.winners.forEach((winner, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      const colorDot = winner.color
        ? `<span style="display:inline-block;width:12px;height:12px;background:${winner.color};border-radius:50%;margin-right:5px;"></span>`
        : "";

      // Get prize name directly from winner object (already saved with script)
      const prizeName = winner.prizeName || "";

      // Create unique ID for winner (using name + index)
      const winnerId = `winner_${index}_${winner.name}`;
      // Default to checked (present) if not explicitly set to false
      const isChecked = prizeAssignStates[winnerId] !== false;

      html += `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">
          <span style="min-width: 35px; text-align: center; color: #ffd700; font-weight: bold; font-size: 14px;">#${index + 1}</span>
          <input 
            type="checkbox" 
            id="${winnerId}" 
            ${isChecked ? "checked" : ""}
            onchange="game.togglePrizeAssigned('${winnerId}')"
            style="cursor: pointer; width: 16px; height: 16px;"
            title="Đã gán giải thưởng"
          />
          <span style="min-width: 150px; color: #67e8f9; font-size: 13px;">${prizeName}</span>
          <span style="flex: 1;">${medal}${colorDot}${winner.name}</span>
        </div>
      `;
    });

    html += `</div>`;

    list.innerHTML = html;
    console.log("History Win updated with", this.winners.length, "winners");
  }

  togglePrizeAssigned(winnerId) {
    // Load current states
    const prizeAssignStates = JSON.parse(
      localStorage.getItem("prizeAssignStates") || "{}",
    );

    // Toggle state
    const checkbox = document.getElementById(winnerId);
    if (checkbox) {
      prizeAssignStates[winnerId] = checkbox.checked;
      localStorage.setItem(
        "prizeAssignStates",
        JSON.stringify(prizeAssignStates),
      );
      console.log(
        `✓ Prize assignment state saved for ${winnerId}:`,
        checkbox.checked,
      );

      // Re-render prize assignment UI to update "(vắng)" labels
      this.renderPrizeAssignmentUI();
    }
  }

  endRace() {
    this.raceFinished = true;
    this.raceStarted = false;

    // Re-enable START button and remove blinking effect
    const startBtn = document.getElementById("controlStartBtn");
    if (startBtn) {
      startBtn.classList.remove("btn-blinking");
      startBtn.disabled = false;
      startBtn.style.opacity = "1";
      startBtn.textContent = "🚀 Start";
    }

    // Stop animation interval
    if (this.animationId) {
      clearInterval(this.animationId);
      this.animationId = null;
    }

    // Stop racing sounds
    this.soundManager.stopRacingAmbiance();

    // Display mode: Send winner info back to control then stop
    if (this.isDisplayMode) {
      console.log("Display: Race ended, Mode:", this.raceMode);

      // Calculate rankings
      this.rankings = [...this.ducks].sort((a, b) => b.position - a.position);
      const winner = this.rankings[0];

      // Calculate finish time - use real time
      const finishTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

      // For Top N mode: Get top N finishers from rankings
      let topNWinners = null;
      if (this.raceMode === "topN") {
        // Get top N ducks that finished (crossed finish line)
        const finishedDucks = this.rankings.filter(
          (duck) => duck.position >= this.trackLength - FINISH_LINE_OFFSET,
        );
        topNWinners = finishedDucks.slice(0, this.winnerCount).map((duck) => ({
          id: duck.id,
          name: duck.name,
          code: duck.code, // Include employee code
          iconSrc: duck.iconSrc,
          finishTime: duck.finishTime,
          position: duck.position,
        }));
        console.log(
          "Display: Calculated Top N winners:",
          topNWinners.length,
          "winners",
        );
      }

      // Send race finished message to control panel
      if (this.displayChannel) {
        this.displayChannel.postMessage({
          type: "DISPLAY_RACE_FINISHED",
          data: {
            winner,
            finishTime: parseFloat(finishTime),
            rankings: this.rankings,
            raceMode: this.raceMode,
            winnerCount: this.winnerCount,
            winners: topNWinners, // Send top N winners for Top N mode
          },
        });
        console.log(
          "Display: Sent DISPLAY_RACE_FINISHED - Mode:",
          this.raceMode,
          "Winners:",
          topNWinners?.length || 1,
        );
      }

      return; // Display doesn't show victory popup locally
    }

    this.rankings = [...this.ducks].sort((a, b) => b.position - a.position);
    const winner = this.rankings[0];

    this.soundManager.playFinishSound();
    setTimeout(() => this.soundManager.playCrowdCheer(), 300);

    // Calculate finish time here to ensure consistency - use real time
    const finishTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

    // Send finish message to display window (if display tab is open)
    // Display will handle race finish and send DISPLAY_RACE_FINISHED back to control
    // Control should wait for that message instead of processing winners here
    if (this.displayChannel && !this.isDisplayMode) {
      this.displayChannel.postMessage({
        type: "RACE_FINISHED",
        data: { winner },
      });

      // IMPORTANT: Return here! Let display handle race finish and send message back
      // Winners will be processed in handleDisplayRaceFinished() to avoid duplicate
      console.log(
        "Control: Sent RACE_FINISHED to display, waiting for DISPLAY_RACE_FINISHED message",
      );
      return;
    }

    // Below code ONLY runs when control is standalone (no display tab)
    console.log(
      "Control: Running standalone mode (no display), processing winners locally",
    );

    // Show continue button in control panel (always hidden in topN mode)
    safeElementAction("continueBtn", (el) => (el.style.display = "none"));
    safeElementAction("continueBankBtn", (el) => el.classList.add("hidden"));
    safeElementAction("pauseBtn", (el) => (el.disabled = true));

    // Save winners to history and exclude them from next race (always topN mode)
    // Merge current race winners into historical winners
    if (this.currentRaceWinners && this.currentRaceWinners.length > 0) {
      const startPosition = this.winners.length; // Continue numbering from last position

      this.currentRaceWinners.forEach((w, index) => {
        w._controlFinishTime = parseFloat(finishTime);
        w.position = startPosition + index + 1; // Continue position numbering
        w.raceNumber = this.currentRaceNumber;

        // Add to accumulated winners
        this.winners.push(w);
      });

      console.log(
        `Top N mode: Added ${this.currentRaceWinners.length} new winners. Total winners: ${this.winners.length}`,
      );

      // Remove winners from activeDuckNames for next race
      const winnerNames = this.currentRaceWinners.map((w) => w.name);
      this.activeDuckNames = this.activeDuckNames.filter(
        (name) => !winnerNames.includes(name),
      );

      // Save accumulated winners to localStorage
      this.saveWinners();
      // Don't update history win - removed

      // Update prize assignment UI with new winners
      if (this.renderPrizeAssignmentUI) {
        this.renderPrizeAssignmentUI();
      }

      // Don't show popup - only show result panel
      // Show result panel immediately
      if (!this.isDisplayMode) {
        setTimeout(() => {
          this.showWinnersPanel();
        }, 1000);
      }
    }

    this.stats.totalRaces++;
    if (this.rankings.indexOf(this.rankings[0]) < 3) {
      this.stats.top3Finishes++;
    }
    this.saveStats();
    // this.updateStatsDisplay(); // Stats panel removed

    this.raceHistory.push({
      raceNumber: this.currentRaceNumber,
      mode: "topN",
      winners: this.currentRaceWinners.map((w) => ({ id: w.id, name: w.name })),
      winnerCount: this.winnerCount,
      duckCount: this.duckCount,
      duration: this.raceDuration,
      timestamp: new Date().toLocaleString("vi-VN"),
    });

    safeElementAction("raceStatus", (el) => (el.textContent = "Finished!"));
    safeElementAction("timeLeft", (el) => (el.textContent = "0s"));
    safeElementAction("pauseBtn", (el) => (el.disabled = true));

    const resultPanel = document.getElementById("resultPanel");
    if (resultPanel) resultPanel.classList.remove("hidden");

    safeElementAction(
      "resultTitle",
      (el) =>
        (el.innerHTML = `🏆 Race Finished! <span style="font-size:0.6em;color:#888;">(Top ${this.winnerCount})</span>`),
    );

    let resultHTML = `
            <div class="result-winner">
                <h3>🏆 Winner: ${winner.name} 🏆</h3>
                <div style="width:30px;height:30px;background:${winner.color};border-radius:50%;margin:10px auto;"></div>
            </div>
            <div class="result-stats">
                <p><strong>Top 3:</strong></p>
                <p>🥇 ${this.rankings[0].name} - ${((this.rankings[0].position / this.trackLength) * 100).toFixed(1)}%</p>
                <p>🥈 ${this.rankings[1].name} - ${((this.rankings[1].position / this.trackLength) * 100).toFixed(1)}%</p>
                <p>🥉 ${this.rankings[2].name} - ${((this.rankings[2].position / this.trackLength) * 100).toFixed(1)}%</p>
            </div>
        `;

    document.getElementById("resultMessage").innerHTML = resultHTML;
  }

  // showVictoryPopup(winner) {
  //   console.log("Showing victory popup for:", winner.name);
  //   const popup = document.getElementById("victoryPopup");
  //   const winnerIconEl = document.getElementById("winnerIcon");
  //   const winnerNameEl = document.getElementById("winnerName");
  //   const winnerStatsEl = document.getElementById("winnerStats");

  //   if (!popup) {
  //     console.error("Victory popup element not found!");
  //     return;
  //   }

  //   console.log("Popup element found:", popup);

  //   // If in fullscreen, append popup to fullscreen element
  //   const fullscreenElement = document.fullscreenElement;
  //   if (fullscreenElement && popup.parentElement !== fullscreenElement) {
  //     console.log("Moving popup to fullscreen element");
  //     fullscreenElement.appendChild(popup);
  //   }

  //   // Set winner icon với animation
  //   if (this.imagesLoaded && this.duckImages.length > 0) {
  //     const iconIndex = (winner.id - 1) % this.duckImages.length;
  //     // Tạo img element với frame đầu tiên
  //     const imgEl = document.createElement("img");
  //     imgEl.src = this.duckImages[iconIndex][0].src;
  //     imgEl.alt = winner.name;
  //     imgEl.id = "winnerAnimatedIcon";
  //     winnerIconEl.innerHTML = "";
  //     winnerIconEl.appendChild(imgEl);

  //     // Bắt đầu animation cho winner icon (nhanh hơn - mỗi 100ms)
  //     this.winnerAnimationFrame = 0;
  //     if (this.winnerAnimationInterval) {
  //       clearInterval(this.winnerAnimationInterval);
  //     }
  //     this.winnerAnimationInterval = setInterval(() => {
  //       this.winnerAnimationFrame = (this.winnerAnimationFrame + 1) % 3;
  //       const animImgEl = document.getElementById("winnerAnimatedIcon");
  //       if (
  //         animImgEl &&
  //         this.duckImages[iconIndex] &&
  //         this.duckImages[iconIndex][this.winnerAnimationFrame]
  //       ) {
  //         animImgEl.src =
  //           this.duckImages[iconIndex][this.winnerAnimationFrame].src;
  //       }
  //     }, 100); // 100ms = animation nhanh cho winner
  //   } else {
  //     winnerIconEl.innerHTML = `<div style="width:200px;height:200px;border-radius:50%;background:${winner.color};margin:0 auto;"></div>`;
  //   }

  //   // Set winner name with code
  //   winnerNameEl.textContent = this.getDisplayName(winner);

  //   // Calculate finish time - prioritize synchronized time from control/display
  //   let finishTime;
  //   if (winner._displayFinishTime !== undefined) {
  //     // Display mode: Use time sent from control
  //     finishTime = winner._displayFinishTime.toFixed(2);
  //     console.log(
  //       "Victory popup - Using synchronized displayFinishTime:",
  //       finishTime,
  //     );
  //   } else if (winner._controlFinishTime !== undefined) {
  //     // Control mode: Use previously calculated time
  //     finishTime = winner._controlFinishTime.toFixed(2);
  //     console.log("Victory popup - Using controlFinishTime:", finishTime);
  //   } else {
  //     // Fallback: Calculate from current time (may be inaccurate on display)
  //     finishTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
  //     console.log(
  //       "Victory popup - Calculated finishTime:",
  //       finishTime,
  //       "Start:",
  //       this.startTime,
  //       "Now:",
  //       Date.now(),
  //     );
  //   }

  //   // Get prize name theo prizePosition
  //   const prizeName = this.getPrizeName(winner.prizePosition || 1);

  //   // Use winner.position if available, else fallback to 1
  //   const winnerPos = winner.position || 1;
  //   winnerStatsEl.innerHTML = `
  //       <p><strong>🏆 Prize:</strong> ${prizeName}</p>
  //       <p><strong>🕒 Time:</strong> ${finishTime}s</p>
  //       <p><strong>📍 Position:</strong> ${winnerPos}${this.getPositionSuffix(winnerPos)}</p>
  //     `;

  //   // Show popup with animation
  //   popup.style.display = "flex";
  //   popup.classList.remove("hidden");
  //   console.log("Popup classes after remove hidden:", popup.classList);
  //   setTimeout(() => {
  //     popup.classList.add("show");
  //     console.log("Added show class, popup should be visible now");
  //   }, 10);
  // }

  closeVictoryPopup() {
    const popup = document.getElementById("victoryPopup");
    popup.classList.remove("show");

    // Dừng winner animation
    if (this.winnerAnimationInterval) {
      clearInterval(this.winnerAnimationInterval);
      this.winnerAnimationInterval = null;
    }

    setTimeout(() => {
      popup.classList.add("hidden");
      popup.style.display = "none";
      // Move popup back to body if it's in fullscreen element
      if (popup.parentElement !== document.body) {
        document.body.appendChild(popup);
      }
    }, 300);
  }

  showTopNVictoryPopup() {
    // Show only current race winners, not accumulated winners
    const winnersToShow = this.currentRaceWinners || [];
    console.log(
      "Showing Top N victory popup with",
      winnersToShow.length,
      "winners from current race",
    );

    const popup = document.getElementById("topNVictoryPopup");
    const topNCountEl = document.getElementById("topNCount");
    const topNWinnersGridEl = document.getElementById("topNWinnersGrid");

    // Collect assignments to sync Result panel with exactly what popup shows
    const popupAssignments = [];

    if (!popup || !topNWinnersGridEl) {
      console.error("Top N victory popup elements not found!");
      return;
    }

    // Update winner count
    if (topNCountEl) {
      topNCountEl.textContent = winnersToShow.length;
    }

    // Build winners grid - show only current race winners
    let winnersHTML = "";
    winnersToShow.forEach((winner, index) => {
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

      // Always use prizeName from winner object (set by script)
      const prizeName = winner.prizeName || this.currentScriptPrizeName || "";

      console.log(
        `Winner ${index}: prizeName="${prizeName}" (from winner.prizeName="${winner.prizeName}")`,
      );
      console.log(`Winner ${index} full object:`, JSON.stringify(winner));

      // Create winner icon
      let iconHTML = "";
      if (this.imagesLoaded && this.duckImages.length > 0) {
        const iconIndex = (winner.id - 1) % this.duckImages.length;
        if (this.duckImages[iconIndex] && this.duckImages[iconIndex][0]) {
          iconHTML = `<img src="${this.duckImages[iconIndex][0].src}" alt="${winner.name}">`;
        }
      }

      winnersHTML += `
            <div class="topn-winner-card">
              <div class="topn-winner-medal">${medal}</div>
              <div class="topn-winner-icon">${iconHTML}</div>
              <div class="topn-winner-position">${prizeName}</div>
              <div class="topn-winner-name">${this.getDisplayName(winner)}</div>
            </div>
          `;

      // Store assignment exactly as shown in popup
      popupAssignments.push({ prizeName, winnerId: winner.id });
    });

    topNWinnersGridEl.innerHTML = winnersHTML;

    // Show popup with animation
    popup.style.display = "flex";
    popup.classList.remove("hidden");
    setTimeout(() => {
      popup.classList.add("show");
    }, 10);

    // ONLY control mode should update usedPrizesCount (display just shows popup)
    if (!this.isDisplayMode) {
      this.usedPrizesCount += winnersToShow.length;
      localStorage.setItem("usedPrizesCount", this.usedPrizesCount.toString());
      console.log(`✓ Updated usedPrizesCount: ${this.usedPrizesCount}`);

      // Re-render prize UI to disable used prizes
      if (this.renderPrizeRaceUI) {
        this.renderPrizeRaceUI();
      }

      // Sync Result assignments with popup content to ensure names match
      this.prizeResultAssignments = popupAssignments;
      localStorage.setItem(
        "prizeResultAssignments",
        JSON.stringify(this.prizeResultAssignments),
      );
      if (this.renderPrizeAssignmentUI) {
        this.renderPrizeAssignmentUI();
      }

      // Mark race script as completed after popup is shown and prizes updated
      if (this.raceScripts) {
        const runningScript = this.raceScripts.find(
          (s) => s.status === "running",
        );
        if (runningScript) {
          console.log(
            `✓ Found running script to complete:`,
            runningScript.id,
            runningScript.prizeName,
          );
          this.markScriptCompleted(runningScript.id);
          console.log(
            `✓ Script "${runningScript.prizeName}" marked as completed`,
          );
        } else {
          console.warn("⚠️ No running script found to mark as completed");
          console.log("All scripts:", this.raceScripts);
        }
      }
    } else {
      console.log(
        `📺 Display showing popup (usedPrizesCount NOT changed): ${this.usedPrizesCount}`,
      );
    }
  }

  closeTopNVictoryPopup() {
    const popup = document.getElementById("topNVictoryPopup");
    if (!popup) return;
    popup.classList.remove("show");
    setTimeout(() => {
      popup.classList.add("hidden");
      popup.style.display = "none";
    }, 300);
    // Gửi tín hiệu cho display để tắt popup Top N nếu đang ở chế độ điều khiển
    if (this.displayChannel && !this.isDisplayMode) {
      this.displayChannel.postMessage({
        type: "CLOSE_TOPN_POPUP",
        data: {},
      });
    }
  }

  continueRace() {
    // Winner already saved in endRace() - just close popup and prepare for next race
    console.log(
      "Continue Race - Winner already saved. Total winners:",
      this.winners.length,
    );

    // Đóng victory popup
    this.closeVictoryPopup();

    // Send message to display to close victory popup
    if (this.displayChannel && !this.isDisplayMode) {
      this.displayChannel.postMessage({
        type: "CLOSE_VICTORY",
        data: {},
      });
    }

    // Ẩn result panel
    safeElementAction("resultPanel", (el) => el.classList.add("hidden"));

    // Check if enough racers remain
    if (this.activeDuckNames.length < MINIMUM_PARTICIPANTS) {
      alert(
        `Only ${this.activeDuckNames.length} racers left! Not enough to continue (need at least ${MINIMUM_PARTICIPANTS} racers).`,
      );
      this.showWinnersPanel();
      return;
    }

    // Reset và bắt đầu đua mới với số vịt còn lại
    this.ducks = [];
    this.duckElements.clear();
    this.raceStarted = false;
    this.raceFinished = false;
    this.racePaused = false;
    this.rankings = [];
    // this.highlights = [];

    // Send RESET_RACE message to display to clear old race
    if (this.displayChannel && !this.isDisplayMode) {
      this.displayChannel.postMessage({
        type: "RESET_RACE",
        data: {},
      });
      console.log("Sent RESET_RACE to display");
    }

    // Ẩn vạch đích
    safeElementAction("finishLine", (el) => el.classList.add("hidden"));

    if (this.trackContainer) {
      // Clear only duck elements, preserve water-flow, water-ripples, fish-layer
      const duckElements =
        this.trackContainer.querySelectorAll(".duck-element");
      duckElements.forEach((el) => el.remove());
    }

    // Display remaining racers count
    alert(`Continue with ${this.activeDuckNames.length} remaining racers!`);

    // Start new race setup
    this.setupRace();
  }

  goHome() {
    // If race is currently running, just show control panel (don't reset!)
    if (this.raceStarted && !this.raceFinished) {
      console.log("Race is running - showing control panel");

      // Hide result and history panels
      const resultPanel = document.getElementById("resultPanel");
      const historyPanel = document.getElementById("historyPanel");
      if (resultPanel) resultPanel.classList.add("hidden");
      if (historyPanel) historyPanel.classList.add("hidden");

      // Show control panel to monitor race
      const raceInfo = document.getElementById("raceInfo");
      const controlPanel = document.getElementById("controlPanel");
      if (raceInfo) raceInfo.classList.remove("hidden");
      if (controlPanel) controlPanel.classList.remove("hidden");

      // Don't reset race state!
      return;
    }

    // Race is not running - safe to go home and reset
    // Stop the race if was paused
    if (this.isRunning) {
      this.stopRace();
    }

    // Hide all panels
    const resultPanel = document.getElementById("resultPanel");
    const historyPanel = document.getElementById("historyPanel");
    const raceTrack = document.getElementById("raceTrack");
    const controlPanel = document.getElementById("controlPanel");
    const raceInfo = document.getElementById("raceInfo");

    if (resultPanel) resultPanel.classList.add("hidden");
    if (historyPanel) historyPanel.classList.add("hidden");
    if (raceTrack) raceTrack.classList.add("hidden");
    if (controlPanel) controlPanel.classList.add("hidden");
    if (raceInfo) raceInfo.classList.add("hidden");

    // Show settings panel
    const settingsPanel = document.getElementById("settingsPanel");
    if (settingsPanel) settingsPanel.classList.remove("hidden");

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    // Reset race state
    this.reset();
  }

  // Next Race - Reset display to waiting screen
  nextRace() {
    console.log("Next Race - Resetting display to waiting screen");

    // Hide popup on display if showing
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "CLOSE_TOPN_POPUP",
        data: {},
      });
    }

    // Reset display to waiting screen
    if (this.displayChannel) {
      this.displayChannel.postMessage({
        type: "RESET_RACE",
        data: {},
      });
    }

    // Hide Next Race button
    safeElementAction("nextRaceBtn", (el) => (el.style.display = "none"));

    // Hide result panel on control
    const resultPanel = document.getElementById("resultPanel");
    if (resultPanel) resultPanel.classList.add("hidden");

    console.log("✓ Display reset to waiting screen, ready for next race");
  }

  showTopNResultPanel() {
    console.log(
      "Showing Top N Result Panel with",
      this.winners.length,
      "winners",
    );

    const resultPanel = document.getElementById("resultPanel");
    resultPanel.classList.remove("hidden");

    // Send results to display
    if (this.displayChannel && !this.isDisplayMode) {
      this.displayChannel.postMessage({
        type: "SHOW_RESULTS",
        data: {
          winners: this.winners,
          totalRaces: this.stats.totalRaces,
          prizeTitle: this.currentScriptPrizeName || "Kết quả", // Use current script prize name
        },
      });
    }

    const prizeTitle = this.currentScriptPrizeName || "Kết quả";
    document.getElementById("resultTitle").innerHTML =
      `🏆 ${prizeTitle} - Top ${this.winners.length}`;

    // Get saved layout settings
    const winnersGridWidth = localStorage.getItem("winnersGridWidth") || "95";
    const cardGap = localStorage.getItem("cardGap") || "1.5";

    let html = '<div class="winners-list">';

    if (this.winners.length > 0) {
      html += `<div class="winners-grid" style="width: ${winnersGridWidth}%; gap: ${cardGap}%;">`;
      this.winners.forEach((winner, index) => {
        const medal =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `🏅`;
        // Always use prizeName from winner object (set by script)
        const prizeName = winner.prizeName || this.currentScriptPrizeName || "";

        // Create duck icon
        let iconHTML = "";
        if (this.imagesLoaded && this.duckImages.length > 0) {
          const iconIndex = (winner.id - 1) % this.duckImages.length;
          if (this.duckImages[iconIndex] && this.duckImages[iconIndex][0]) {
            iconHTML = `<img src="${this.duckImages[iconIndex][0].src}" alt="${winner.name}" style="width: 60px; height: 60px; object-fit: contain;">`;
          }
        }

        html += `
                    <div class="winner-card">
                        <div class="winner-medal">${medal}</div>
                        <div class="winner-icon-display">${iconHTML}</div>
                        <div class="winner-position">${prizeName}</div>
                        <div class="winner-duck-name">${this.getDisplayName(winner)}</div>
                    </div>
                `;
      });
      html += "</div>";
    } else {
      html += "<p>No winners yet!</p>";
    }

    html += "</div>";
    html += '<div class="result-actions" id="resultActions">';
    html +=
      '<button class="btn btn-secondary" onclick="game.sendResultsToDisplay()">📺 Send to Display</button>';
    html += "</div>";

    document.getElementById("resultMessage").innerHTML = html;

    // Auto scroll to result panel
    setTimeout(() => {
      resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Play celebration sound
    this.soundManager.playCrowdCheer();
  }

  showWinnersPanel() {
    const resultPanel = document.getElementById("resultPanel");
    resultPanel.classList.remove("hidden");

    const prizeTitle = this.currentScriptPrizeName || "Kết quả";
    document.getElementById("resultTitle").innerHTML = `🏆 ${prizeTitle}`;

    // Get saved layout settings
    const winnersGridWidth = localStorage.getItem("winnersGridWidth") || "95";
    const cardGap = localStorage.getItem("cardGap") || "1.5";

    let html = '<div class="winners-list">';

    if (this.winners.length > 0) {
      html += `<div class="winners-grid" style="width: ${winnersGridWidth}%; gap: ${cardGap}%;">`;
      this.winners.forEach((winner, index) => {
        const medal =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `🏅`;
        // Always use prizeName from winner object (set by script)
        const prizeName = winner.prizeName || this.currentScriptPrizeName || "";
        html += `
                    <div class="winner-card">
                        <div class="winner-medal">${medal}</div>
                        <div class="winner-position">${prizeName}</div>
                        <div class="winner-duck-name">${this.getDisplayName(winner)}</div>
                    </div>
                `;
      });
      html += "</div>";
    } else {
      html += "<p>No winners yet!</p>";
    }

    html += "</div>";
    html += '<div class="result-actions" id="resultActions">';
    html +=
      '<button class="btn btn-secondary" onclick="game.sendResultsToDisplay()">📺 Send to Display</button>';
    html +=
      '<button class="btn btn-secondary" onclick="game.resetHistory()">🗑️ Clear History</button>';
    html += "</div>";

    document.getElementById("resultMessage").innerHTML = html;

    // Tự động cuộn đến panel kết quả
    setTimeout(() => {
      resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  sendResultsToDisplay() {
    if (!this.displayChannel) {
      alert("Display channel not available. Please open display tab first.");
      return;
    }

    if (!this.winners || this.winners.length === 0) {
      alert("No results to send!");
      return;
    }

    console.log("📤 Sending results to display...");

    // Send SHOW_RESULTS message with data
    this.displayChannel.postMessage({
      type: "SHOW_RESULTS",
      data: {
        winners: this.winners,
        totalRaces: this.stats.totalRaces,
        prizeTitle: this.currentScriptPrizeName || "Kết quả", // Use current script prize name
      },
    });

    console.log("✅ Results sent to display");
    alert("Results sent to display! Check the display tab.");
  }

  resetHistory() {
    if (
      confirm(
        "⚠️ RESTART: Xóa toàn bộ lịch sử, scripts và reset game về trạng thái ban đầu?\n\nKhông thể hoàn tác!",
      )
    ) {
      this.winners = [];
      this.activeDuckNames = [...this.duckNames];
      this.usedPrizesCount = 0; // Reset prize counter

      // Clear all scripts
      this.raceScripts = [];
      localStorage.removeItem("raceScripts");

      // Reset prize list to default
      this.prizeRaceList = ["Giải Nhất", "Giải Nhì", "Giải Ba"];
      localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));

      // Clear all prize-related localStorage
      localStorage.setItem("usedPrizesCount", "0"); // Force set to 0
      localStorage.removeItem("prizeResultAssignments");
      localStorage.removeItem("duckRaceWinners");
      localStorage.removeItem("prizeAssignStates"); // Clear checkbox states

      this.saveWinners(); // Save empty winners array
      this.prizeResultAssignments = []; // Reset result assignments

      // Remove blinking effect from START button
      const startBtn = document.getElementById("controlStartBtn");
      if (startBtn) {
        startBtn.classList.remove("btn-blinking");
      }

      // Send reset message to display
      if (this.displayChannel && !this.isDisplayMode) {
        this.displayChannel.postMessage({
          type: "RESET_HISTORY",
          data: {},
        });
        console.log("📤 Sent RESET_HISTORY to display");

        // Send message to force close display tab
        this.displayChannel.postMessage({
          type: "FORCE_CLOSE_DISPLAY",
          data: {},
        });
        console.log("📤 Sent FORCE_CLOSE_DISPLAY to display");
      }

      // Đóng popup victory nếu còn hiển thị
      this.closeVictoryPopup && this.closeVictoryPopup();
      this.closeTopNVictoryPopup && this.closeTopNVictoryPopup();

      // Re-render prize UI immediately before reload
      if (this.renderPrizeRaceUI) {
        this.renderPrizeRaceUI();
      }
      if (this.renderPrizeAssignmentUI) {
        this.renderPrizeAssignmentUI();
      }

      console.log(
        "✓ Reset complete: usedPrizesCount set to 0, reloading page...",
      );

      // Reload page to refresh interface
      setTimeout(() => location.reload(), 100);
    }
  }

  fullReset() {
    // Reset hoàn toàn bao gồm cả winners
    localStorage.clear(); // Xóa toàn bộ localStorage khi restart

    // Reset all variables
    this.winners = [];
    this.excludedDucks = [];
    this.activeDuckNames = [...this.duckNames]; // Reset về danh sách ban đầu
    this.activeDuckCodes = [...this.duckCodes]; // Reset codes as well
    this.usedPrizesCount = 0; // Reset prize counter
    this.prizeResultAssignments = []; // Reset result assignments
    this.prizeRaceList = ["Giải Nhất", "Giải Nhì", "Giải Ba"]; // Reset to default
    this.raceScripts = []; // Clear all scripts

    // Đóng popup victory nếu còn hiển thị
    this.closeVictoryPopup && this.closeVictoryPopup();
    this.closeTopNVictoryPopup && this.closeTopNVictoryPopup();
    // Reload page to refresh interface
    location.reload();
  }

  toggleFullscreenResult() {
    const resultPanel = document.getElementById("resultPanel");
    const resultActions = document.getElementById("resultActions");

    if (resultPanel.classList.contains("fullscreen")) {
      resultPanel.classList.remove("fullscreen");
      if (resultActions) resultActions.style.display = "flex";
      document.body.style.overflow = "";
    } else {
      resultPanel.classList.add("fullscreen");
      if (resultActions) resultActions.style.display = "none";
      document.body.style.overflow = "hidden";
    }
  }

  viewHistory() {
    if (this.raceHistory.length === 0) {
      alert("No race history yet!");
      return;
    }

    const historyPanel = document.getElementById("historyPanel");
    const historyList = document.getElementById("historyList");

    let html =
      '<table class="history-table"><thead><tr><th>Race</th><th>Winner</th><th>Racers</th><th>Duration</th><th>Date/Time</th></tr></thead><tbody>';

    this.raceHistory
      .slice()
      .reverse()
      .forEach((race) => {
        html += `<tr>
                <td>#${race.raceNumber}</td>
                <td>Racer #${race.winner}</td>
                <td>${race.duckCount}</td>
                <td>${race.duration}s</td>
                <td>${race.timestamp}</td>
            </tr>`;
      });

    html += "</tbody></table>";
    historyList.innerHTML = html;

    historyPanel.classList.remove("hidden");
    document.getElementById("resultPanel").classList.add("hidden");
  }

  closeHistory() {
    document.getElementById("historyPanel").classList.add("hidden");
    document.getElementById("resultPanel").classList.remove("hidden");
  }

  toggleFullscreen() {
    // If race not started yet, begin the race (ONLY on display mode)
    if (
      !this.raceStarted &&
      !this.raceFinished &&
      this.ducks.length > 0 &&
      this.isDisplayMode
    ) {
      this.beginRace();
      return;
    }

    // Fullscreen disabled to preserve custom aspect ratio (20:5)
    console.log("Fullscreen disabled - preserving custom aspect ratio");
  }

  reset() {
    // Reset nhưng giữ lại winners và excludedDucks nếu có
    this.ducks = [];
    this.duckElements.clear();
    this.raceStarted = false;
    this.raceFinished = false;
    this.racePaused = false;
    this.rankings = [];
    // this.highlights = [];

    // Remove resize handler
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.trackContainer) {
      // Clear only duck elements, preserve water-flow, water-ripples, fish-layer
      const duckElements =
        this.trackContainer.querySelectorAll(".duck-element");
      duckElements.forEach((el) => el.remove());
    }

    document.getElementById("resultPanel").classList.add("hidden");
    document.getElementById("historyPanel").classList.add("hidden");
    document.getElementById("raceInfo").classList.add("hidden");
    document.getElementById("controlPanel").classList.add("hidden");
    document.getElementById("raceTrack").classList.add("hidden");
    document.getElementById("minimap").classList.add("hidden");
    // document.getElementById('highlightsPanel').classList.add('hidden');
    document.getElementById("bigTimer").classList.add("hidden");
    document.getElementById("finishLine").classList.add("hidden");

    document.getElementById("settingsPanel").classList.remove("hidden");
  }
}

console.log("Game class defined");
const game = new Game();
window.game = game; // Make game accessible globally for onclick handlers
console.log("Game instance created");

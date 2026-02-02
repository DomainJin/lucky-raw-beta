import { FINISH_LINE_OFFSET } from "../utils/constants.js";

// Duck class with color and advanced animation
export class Duck {
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

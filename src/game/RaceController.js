/**
 * RaceController Module
 *
 * Manages race lifecycle, animation loop, camera system, and duck updates
 * - Start/pause/resume/end race
 * - Animation loop and rendering
 * - Camera tracking and smooth scrolling
 * - Duck position updates (DOM and Canvas)
 * - Race mode handling (normal vs topN)
 */

import { FINISH_LINE_OFFSET, safeElementAction } from "../utils/constants.js";

export class RaceController {
  constructor(game) {
    this.game = game;
  }

  // ==================== Race Lifecycle ====================

  startRace() {
    // Check if a script is selected (running)
    if (this.game.raceScripts && this.game.raceScripts.length > 0) {
      const hasRunningScript = this.game.raceScripts.some(
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
    if (!this.game.imagesLoaded) {
      console.warn("Cannot start race - images not loaded yet");
      alert("Icons are still loading. Please wait a moment.");
      return;
    }

    // Check if race is already running - prevent starting new race
    if (this.game.raceStarted && !this.game.raceFinished) {
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
      this.game.raceMode = "topN";
      this.game.winnerCount = n;
    }

    console.log(
      "startRace: Setting up race (not starting yet), mode:",
      this.game.raceMode,
    );

    // Only setup race, don't start automatically
    // User must press Start button on control panel to begin
    this.setupRaceOnly();
  }

  setupRaceOnly() {
    // Setup race without starting - just prepare everything
    if (!this.game.isDisplayMode) {
      // Lấy giá trị slider mới nhất trước khi setupRace
      const duckSizeEl = document.getElementById("duckSizeRatio");
      if (duckSizeEl) {
        this.game.duckSizeRatio = parseFloat(duckSizeEl.value) / 100;
        console.log(
          "[DuckSize] Updated duckSizeRatio from slider:",
          this.game.duckSizeRatio,
        );
      }
      this.game.setupRace();

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

  pauseRace() {
    if (
      !this.game.raceStarted ||
      this.game.raceFinished ||
      this.game.racePaused
    )
      return;

    this.game.racePaused = true;
    this.game.pausedAt = Date.now();

    // Send to display if control mode
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "PAUSE_RACE",
        data: {},
      });
    }

    console.log("Race paused at", this.game.pausedAt);
  }

  resumeRace() {
    if (!this.game.racePaused) return;

    this.game.racePaused = false;
    const pauseDuration = Date.now() - this.game.pausedAt;
    this.game.startTime += pauseDuration;

    // Send to display if control mode
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "RESUME_RACE",
        data: { pauseDuration },
      });
    }

    console.log("Race resumed, pause duration:", pauseDuration);
  }

  endRace() {
    this.game.raceFinished = true;
    this.game.raceStarted = false;

    // Stop animation interval
    if (this.game.animationId) {
      clearInterval(this.game.animationId);
      this.game.animationId = null;
    }

    // Stop racing sounds
    this.game.soundManager.stopRacingAmbiance();

    // Display mode: Send winner info back to control then stop
    if (this.game.isDisplayMode) {
      console.log("Display: Race ended, Mode:", this.game.raceMode);

      // Calculate rankings
      this.game.rankings = [...this.game.ducks].sort(
        (a, b) => b.position - a.position,
      );
      const winner = this.game.rankings[0];

      // Calculate finish time - use real time
      const finishTime = ((Date.now() - this.game.startTime) / 1000).toFixed(2);

      // For Top N mode: Get top N finishers from rankings
      let topNWinners = null;
      if (this.game.raceMode === "topN") {
        // Get top N ducks that finished (crossed finish line)
        const finishedDucks = this.game.rankings.filter(
          (duck) => duck.position >= this.game.trackLength - FINISH_LINE_OFFSET,
        );
        topNWinners = finishedDucks
          .slice(0, this.game.winnerCount)
          .map((duck) => ({
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
      if (this.game.displayChannel) {
        this.game.displayChannel.postMessage({
          type: "DISPLAY_RACE_FINISHED",
          data: {
            winner,
            finishTime: parseFloat(finishTime),
            rankings: this.game.rankings,
            raceMode: this.game.raceMode,
            winnerCount: this.game.winnerCount,
            winners: topNWinners, // Send top N winners for Top N mode
          },
        });
        console.log(
          "Display: Sent DISPLAY_RACE_FINISHED - Mode:",
          this.game.raceMode,
          "Winners:",
          topNWinners?.length || 1,
        );
      }

      return; // Display doesn't show victory popup locally
    }

    this.game.rankings = [...this.game.ducks].sort(
      (a, b) => b.position - a.position,
    );
    const winner = this.game.rankings[0];

    this.game.soundManager.playFinishSound();
    setTimeout(() => this.game.soundManager.playCrowdCheer(), 300);

    // Calculate finish time here to ensure consistency - use real time
    const finishTime = ((Date.now() - this.game.startTime) / 1000).toFixed(2);

    // Send finish message to display window (if display tab is open)
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "RACE_FINISHED",
        data: { winner },
      });

      console.log(
        "Control: Sent RACE_FINISHED to display, waiting for DISPLAY_RACE_FINISHED message",
      );
      return;
    }

    // Below code ONLY runs when control is standalone (no display tab)
    this.processRaceResults(winner, finishTime);
  }

  processRaceResults(winner, finishTime) {
    console.log(
      "Control: Running standalone mode (no display), processing winners locally",
    );

    if (this.game.raceMode === "topN") {
      // Top N mode: Save top N finishers to current race winners
      const finishedDucks = this.game.rankings.filter(
        (duck) => duck.position >= this.game.trackLength - FINISH_LINE_OFFSET,
      );
      this.game.currentRaceWinners = finishedDucks
        .slice(0, this.game.winnerCount)
        .map((duck) => ({
          id: duck.id,
          name: duck.name,
          code: duck.code,
          iconSrc: duck.iconSrc,
          finishTime: duck.finishTime,
        }));

      console.log(
        "Control: Top N mode -",
        this.game.currentRaceWinners.length,
        "winners",
      );
    } else {
      // Normal mode: single winner
      this.game.currentRaceWinners = [
        {
          id: winner.id,
          name: winner.name,
          code: winner.code,
          iconSrc: winner.iconSrc,
          finishTime: finishTime,
        },
      ];
    }

    // Update accumulated winners
    this.game.winners = this.game.winners.concat(this.game.currentRaceWinners);
    this.game.historyManager.saveWinners();
    this.game.stats.totalRaces++;
    this.game.historyManager.saveStats();

    // Show victory popup
    if (this.game.raceMode === "topN") {
      this.game.showTopNVictoryPopup();
    } else {
      this.game.showVictoryPopup(winner, finishTime);
    }
  }
}

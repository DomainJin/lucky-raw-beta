// Import modules
import {
  FINISH_LINE_OFFSET,
  MINIMUM_PARTICIPANTS,
  safeElementAction,
} from "./src/utils/constants.js";
import { SoundManager } from "./src/audio/SoundManager.js";
import { Duck } from "./src/entities/Duck.js";
import { PrizeManager } from "./src/game/PrizeManager.js";
import { UIManager } from "./src/ui/UIManager.js";
import { HistoryManager } from "./src/game/HistoryManager.js";
import { RaceController } from "./src/game/RaceController.js";
import { FileManager } from "./src/utils/FileManager.js";
import { ImageLoader } from "./src/utils/ImageLoader.js";

console.log(
  "Modules loaded successfully - using imported SoundManager and Duck classes",
);

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
    this.winnerCount = 3; // For topN mode
    this.winners = []; // Array to store accumulated winners across races
    this.currentRaceWinners = []; // Array to store winners for current race only (topN mode)

    // Prize management - Delegate to PrizeManager
    this.prizeManager = new PrizeManager();

    // Keep references for backward compatibility
    this.prizeRaceList = this.prizeManager.prizeRaceList;
    this.prizeResultAssignments = this.prizeManager.prizeResultAssignments;
    this.usedPrizesCount = this.prizeManager.usedPrizesCount;
    this.raceScripts = this.prizeManager.raceScripts;

    // UI management - Delegate to UIManager
    this.uiManager = new UIManager(this);

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
              "ðŸ“¢ Sound toggle changed:",
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
              alert("âœ“ Custom sound loaded: " + file.name);

              // Share with display.html via BroadcastChannel
              const reader = new FileReader();
              reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                // Convert to base64 for transmission
                const base64 = btoa(
                  new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    "",
                  ),
                );

                if (this.displayChannel) {
                  this.displayChannel.postMessage({
                    type: "CUSTOM_AUDIO_LOADED",
                    data: {
                      audioData: base64,
                      fileName: file.name,
                    },
                  });
                  console.log("ðŸ“¢ Custom audio sent to display:", file.name);
                }
              };
              reader.readAsArrayBuffer(file);
            } catch (error) {
              alert("âŒ Error loading audio file: " + error.message);
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

    // Initialize managers
    this.historyManager = new HistoryManager(this);
    this.raceController = new RaceController(this);
    this.fileManager = new FileManager(this);
    this.imageLoader = new ImageLoader(this);

    this.stats = this.historyManager.loadStats();
    this.raceHistory = [];

    this.duckNames = [];
    this.duckCodes = []; // Store employee codes
    this.activeDuckNames = []; // Danh sÃ¡ch vá»‹t Ä‘ang tham gia (sáº½ giáº£m dáº§n)
    this.winners = this.historyManager.loadWinners(); // Danh sách các vịt đã thắng
    this.winners = this.loadWinners(); // Danh sÃ¡ch cÃ¡c vá»‹t Ä‘Ã£ tháº¯ng
    this.excludedDucks = []; // Danh sÃ¡ch cÃ¡c vá»‹t bá»‹ loáº¡i

    this.winnerAnimationFrame = 0;
    this.winnerAnimationInterval = null;

    this.duckImages = []; // Má»—i pháº§n tá»­ sáº½ lÃ  array 3 áº£nh [frame1, frame2, frame3]
    this.iconCount = 44; // output_3 cÃ³ 44 folders
    this.imagesLoaded = false;
    this.displayIconsLoaded = false; // Track if display has loaded icons
    this.currentTheme = "output_3"; // Sá»­ dá»¥ng output_3

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
        console.log("âœ… Display window is READY to receive messages");
        this.displayReady = true;
      } else if (type === "DISPLAY_ICONS_LOADED") {
        const iconCount = data.iconCount || 0;
        console.log(
          "âœ… Display icons loaded successfully -",
          iconCount,
          "icons",
        );

        // Only accept if display has actually loaded icons
        if (iconCount === 0) {
          console.warn(
            "âš ï¸ Display reported icons loaded but iconCount is 0 - ignoring",
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
            "âœ… Both control (" +
              this.iconCount +
              ") and display (" +
              iconCount +
              ") icons ready - enabling Start button",
          );
          this.enableStartButton();
        } else {
          console.log(
            "â³ Control icons not ready yet. Control:",
            this.imagesLoaded,
            this.iconCount,
          );
        }
      } else if (type === "FORCE_CLUSTER_CAMERA") {
        // Remote toggle from control or display - set local flag
        const enabled = !!(data && data.enabled);
        this.forceClusterCamera = enabled;
        console.log("ðŸ“¢ FORCE_CLUSTER_CAMERA received - enabled:", enabled);
      } else if (type === "DISPLAY_RACE_FINISHED") {
        // Display has detected winner and sent it back
        console.log("âœ… Received DISPLAY_RACE_FINISHED from display");
        this.handleDisplayRaceFinished(data);
      } else if (type === "SHOW_RESULTS_ASSIGNED") {
        // Display custom assigned results on display screen
        console.log("âœ… Received SHOW_RESULTS_ASSIGNED for display");
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
    // Update history after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.updateHistoryWin();
      });
    } else {
      this.updateHistoryWin();
    }

    // Load result panel settings for both control and display mode
    this.loadResultPanelSettings();

    // Only detect themes and load images if NOT in display mode
    // Display mode will load icons immediately to be ready
    if (!this.isDisplayMode) {
      this.detectAvailableThemes();
      this.detectAndLoadDuckImages();
    } else {
      console.log("Display mode: Loading icons immediately...");
      this.detectAndLoadDuckImages();
    }
  }

  checkBothIconsLoaded() {
    // Only enable Start Race if both control and display have loaded icons
    if (this.imagesLoaded && this.displayIconsLoaded) {
      console.log(
        "âœ… Both control and display icons loaded - enabling Start Race",
      );
      this.enableStartButton();
    } else {
      console.log(
        "â³ Waiting for icons... Control:",
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

  // Result Panel Appearance Settings
  getPrizeTitle() {
    const savedTitle = localStorage.getItem("customPrizeTitle");
    return savedTitle || "Prize Results";
  }

  savePrizeTitle() {
    const titleInput = document.getElementById("prizeTitleInput");
    if (titleInput) {
      const title = titleInput.value.trim() || "Prize Results";
      this.prizeManager.savePrizeTitle(title);
    }
  }

  // Prize Name Fields - delegate to PrizeManager
  addPrizeNameField(position = null) {
    this.prizeManager.addPrizeNameField();
  }

  removePrizeNameField(fieldId) {
    this.prizeManager.removePrizeNameField(fieldId);
  }

  sortPrizeNames(direction) {
    this.prizeManager.sortPrizeNames(direction);
  }

  savePrizeNames() {
    this.prizeManager.savePrizeNames();
  }

  getPrizeName(position) {
    return this.prizeManager.getPrizeName(position);
  }

  loadPrizeNames() {
    this.prizeManager.loadPrizeNames();
  }

  // Prize Race Management - delegate to PrizeManager
  addPrizeField(type) {
    if (type === "race") {
      this.prizeManager.addRacePrizeField();
      this.syncPrizeReferences();
    }
  }

  addPrizeGroup() {
    const nameInput = document.getElementById("prizeGroupName");
    const countInput = document.getElementById("prizeGroupCount");

    if (!nameInput || !countInput) {
      alert("KhÃ´ng tÃ¬m tháº¥y input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lÃ²ng nháº­p tÃªn giáº£i!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Sá»‘ ngÆ°á»i pháº£i lá»›n hÆ¡n 0!");
      countInput.focus();
      return;
    }

    if (count > 100) {
      if (
        !confirm(
          `Báº¡n cÃ³ cháº¯c muá»‘n táº¡o ${count} giáº£i? Sá»‘ lÆ°á»£ng khÃ¡ lá»›n.`,
        )
      ) {
        return;
      }
    }

    // Add N prizes
    for (let i = 0; i < count; i++) {
      this.prizeManager.prizeRaceList.push(prizeName);
    }

    this.prizeManager.savePrizeRaceList();
    this.syncPrizeReferences();
    this.prizeManager.renderPrizeRaceUI();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    // Auto-show the prizes list
    const displayContainer = document.getElementById("racePrizesDisplay");
    if (displayContainer) {
      displayContainer.style.display = "block";
      this.showRacePrizes();
    }

    alert(
      `âœ“ ÄÃ£ thÃªm ${count} giáº£i "${prizeName}"!\nTá»•ng sá»‘ giáº£i: ${this.prizeManager.prizeRaceList.length}`,
    );
    console.log(`âœ“ Added ${count} prizes:`, prizeName);
  }

  renderPrizeRaceUI() {
    this.prizeManager.renderPrizeRaceUI();
  }

  updatePrizeRaceName(index, value) {
    this.prizeManager.updateRacePrize(index, value);
  }

  removePrizeRace(index) {
    this.prizeManager.removeRacePrize(index);
    this.syncPrizeReferences();
  }

  applyPrizeRace() {
    this.prizeManager.savePrizeRaceList();
    alert("âœ“ ÄÃ£ Ã¡p dá»¥ng danh sÃ¡ch giáº£i thÆ°á»Ÿng cho cuá»™c Ä‘ua!");
    console.log("âœ“ Prize race list saved:", this.prizeManager.prizeRaceList);
  }

  clearAllPrizes() {
    // Check if any prizes have been awarded
    if (this.prizeManager.usedPrizesCount > 0) {
      alert(
        `KhÃ´ng thá»ƒ xÃ³a táº¥t cáº£ giáº£i vÃ¬ Ä‘Ã£ cÃ³ ${this.prizeManager.usedPrizesCount} giáº£i Ä‘Æ°á»£c trao!\nVui lÃ²ng Reset History trÆ°á»›c.`,
      );
      return;
    }

    if (this.prizeManager.prizeRaceList.length === 0) {
      alert("Danh sÃ¡ch giáº£i Ä‘ang trá»‘ng!");
      return;
    }

    if (
      !confirm(
        `Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a táº¥t cáº£ ${this.prizeManager.prizeRaceList.length} giáº£i?`,
      )
    ) {
      return;
    }

    this.prizeManager.prizeRaceList = [];
    this.prizeManager.savePrizeRaceList();
    this.syncPrizeReferences();
    this.prizeManager.renderPrizeRaceUI();

    alert("âœ“ ÄÃ£ xÃ³a táº¥t cáº£ giáº£i thÆ°á»Ÿng!");
    console.log("âœ“ Cleared all prizes");
  }

  // Race Scripts - delegate to PrizeManager
  addRaceScript() {
    this.prizeManager.createRaceScript();
    this.syncPrizeReferences();
  }

  renderRaceScripts() {
    this.prizeManager.renderRaceScripts();
  }

  deleteRaceScript(scriptId) {
    this.prizeManager.deleteRaceScript(scriptId);
    this.syncPrizeReferences();
  }

  markScriptCompleted(scriptId) {
    this.prizeManager.markScriptCompleted(scriptId);
  }

  // Result Assignments - delegate to PrizeManager
  addPrizeAssignmentField() {
    this.prizeManager.addResultAssignmentField();
  }

  addPrizeResultGroup() {
    const nameInput = document.getElementById("prizeResultGroupName");
    const countInput = document.getElementById("prizeResultGroupCount");

    if (!nameInput || !countInput) {
      alert("KhÃ´ng tÃ¬m tháº¥y input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    if (!prizeName) {
      alert("Vui lÃ²ng nháº­p tÃªn giáº£i!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Sá»‘ ngÆ°á»i pháº£i lá»›n hÆ¡n 0!");
      countInput.focus();
      return;
    }

    if (count > 50) {
      if (
        !confirm(
          `Báº¡n cÃ³ cháº¯c muá»‘n táº¡o ${count} hÃ ng gÃ¡n giáº£i? Sá»‘ lÆ°á»£ng khÃ¡ lá»›n.`,
        )
      ) {
        return;
      }
    }

    for (let i = 0; i < count; i++) {
      this.prizeManager.prizeResultAssignments.push({
        prizeName: prizeName,
        winnerId: "",
      });
    }

    this.syncPrizeReferences();
    this.prizeManager.renderPrizeAssignmentUI(this.winners);

    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    alert(`âœ“ ÄÃ£ thÃªm ${count} hÃ ng gÃ¡n giáº£i "${prizeName}"!`);
  }

  renderPrizeAssignmentUI() {
    this.prizeManager.renderPrizeAssignmentUI(this.winners);
  }

  savePrizeResultAssignments() {
    this.prizeManager.savePrizeResultAssignments();
  }

  clearResultAssignments() {
    this.prizeManager.clearResultAssignments();
    this.syncPrizeReferences();
  }

  addBulkResultAssignments() {
    this.prizeManager.addBulkResultAssignments();
    this.syncPrizeReferences();
  }

  // Simplified Prize Methods (legacy)
  addSimplePrize() {
    const nameInput = document.getElementById("simplePrizeName");
    const countInput = document.getElementById("simplePrizeCount");

    if (!nameInput || !countInput) {
      alert("KhÃ´ng tÃ¬m tháº¥y input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    if (!prizeName) {
      alert("Vui lÃ²ng nháº­p tÃªn giáº£i!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Sá»‘ ngÆ°á»i pháº£i lá»›n hÆ¡n 0!");
      countInput.focus();
      return;
    }

    if (count > 100) {
      if (
        !confirm(
          `Báº¡n cÃ³ cháº¯c muá»‘n táº¡o ${count} giáº£i? Sá»‘ lÆ°á»£ng khÃ¡ lá»›n.`,
        )
      ) {
        return;
      }
    }

    for (let i = 0; i < count; i++) {
      this.prizeManager.prizeRaceList.push(prizeName);
    }

    this.winnerCount = this.prizeManager.prizeRaceList.length;
    const winnerCountInput = document.getElementById("winnerCount");
    if (winnerCountInput) {
      winnerCountInput.value = this.winnerCount;
    }

    this.prizeManager.savePrizeRaceList();
    this.syncPrizeReferences();
    this.prizeManager.renderPrizeRaceUI();

    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    console.log(
      `âœ“ Added ${count} prizes: "${prizeName}". Total winners: ${this.winnerCount}`,
    );
  }

  renderSimplePrizeUI() {
    const container = document.getElementById("simplePrizeList");
    if (!container) return;

    if (this.prizeManager.prizeRaceList.length === 0) {
      container.innerHTML =
        '<i style="color: #888;">ChÆ°a cÃ³ giáº£i nÃ o Ä‘Æ°á»£c thÃªm...</i>';
      return;
    }

    let html = `
      <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #444;">
        <span style="color: #ffd700;">Tá»•ng sá»‘ giáº£i:</span> <b>${this.prizeManager.prizeRaceList.length}</b> | 
        <span style="color: #e74c3c;">ÄÃ£ trao:</span> <b>${this.prizeManager.usedPrizesCount}</b> | 
        <span style="color: #2ecc71;">CÃ²n láº¡i:</span> <b>${this.prizeManager.prizeRaceList.length - this.prizeManager.usedPrizesCount}</b>
      </div>
    `;

    this.prizeManager.prizeRaceList.forEach((prize, index) => {
      const isUsed = index < this.prizeManager.usedPrizesCount;
      const opacity = isUsed ? "opacity: 0.5;" : "";
      const status = isUsed ? '<span style="color: #2ecc71;">âœ“</span>' : "";

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding: 5px 0; ${opacity}">
          <span>${index + 1}. <b>${prize}</b> ${status}</span>
          <button 
            onclick="game.removeSimplePrize(${index})" 
            style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size: 16px;"
            ${isUsed ? 'disabled title="KhÃ´ng thá»ƒ xÃ³a giáº£i Ä‘Ã£ trao"' : ""}
          >âœ•</button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  removeSimplePrize(index) {
    if (index < this.prizeManager.usedPrizesCount) {
      alert(
        "KhÃ´ng thá»ƒ xÃ³a giáº£i Ä‘Ã£ Ä‘Æ°á»£c trao!\nVui lÃ²ng Reset History náº¿u muá»‘n xÃ³a táº¥t cáº£.",
      );
      return;
    }

    if (confirm(`XÃ³a giáº£i "${this.prizeManager.prizeRaceList[index]}"?`)) {
      this.prizeManager.prizeRaceList.splice(index, 1);

      this.winnerCount = this.prizeManager.prizeRaceList.length;
      const winnerCountInput = document.getElementById("winnerCount");
      if (winnerCountInput) {
        winnerCountInput.value = this.winnerCount;
      }

      this.prizeManager.savePrizeRaceList();
      this.syncPrizeReferences();
      this.prizeManager.renderPrizeRaceUI();

      console.log(
        `âœ“ Removed prize at index ${index}. Total winners: ${this.winnerCount}`,
      );
    }
  }

  // Helper: Sync references between Game and PrizeManager
  syncPrizeReferences() {
    this.prizeRaceList = this.prizeManager.prizeRaceList;
    this.prizeResultAssignments = this.prizeManager.prizeResultAssignments;
    this.usedPrizesCount = this.prizeManager.usedPrizesCount;
    this.raceScripts = this.prizeManager.raceScripts;
  }

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

  toggleResultPanelSettings() {
    const container = document.getElementById("resultPanelSettingsContainer");
    if (container) {
      container.classList.toggle("hidden");
    }
  }

  // --- RESULT PRIZE ASSIGNMENT (CUSTOM WINNER SELECTION) ---
  addPrizeAssignmentField() {
    this.prizeResultAssignments.push({
      prizeName: "TÃªn giáº£i",
      winnerId: "",
    });
    this.renderPrizeAssignmentUI();
  }

  addPrizeResultGroup() {
    const nameInput = document.getElementById("prizeResultGroupName");
    const countInput = document.getElementById("prizeResultGroupCount");

    if (!nameInput || !countInput) {
      alert("KhÃ´ng tÃ¬m tháº¥y input fields!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    // Validation
    if (!prizeName) {
      alert("Vui lÃ²ng nháº­p tÃªn giáº£i!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Sá»‘ ngÆ°á»i pháº£i lá»›n hÆ¡n 0!");
      countInput.focus();
      return;
    }

    if (count > 50) {
      if (
        !confirm(
          `Báº¡n cÃ³ cháº¯c muá»‘n táº¡o ${count} hÃ ng gÃ¡n giáº£i? Sá»‘ lÆ°á»£ng khÃ¡ lá»›n.`,
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

    alert(`âœ“ ÄÃ£ thÃªm ${count} hÃ ng gÃ¡n giáº£i "${prizeName}"!`);
    console.log(`âœ“ Added ${count} result assignment rows:`, prizeName);
  }

  clearAllResultAssignments() {
    if (this.prizeResultAssignments.length === 0) {
      alert("Danh sÃ¡ch gÃ¡n giáº£i Ä‘ang trá»‘ng!");
      return;
    }

    if (
      !confirm(
        `Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a táº¥t cáº£ ${this.prizeResultAssignments.length} hÃ ng gÃ¡n giáº£i?`,
      )
    ) {
      return;
    }

    // Clear all assignments
    this.prizeResultAssignments = [];
    localStorage.removeItem("prizeResultAssignments");

    // Update UI
    this.renderPrizeAssignmentUI();

    alert("âœ“ ÄÃ£ xÃ³a táº¥t cáº£ hÃ ng gÃ¡n giáº£i!");
    console.log("âœ“ Cleared all result assignments");
  }

  renderPrizeAssignmentUI() {
    const container = document.getElementById("prizeAssignmentResultContainer");
    if (!container) return;

    // Auto-sync with winners: add new winners AND update prize names
    if (this.winners.length > 0) {
      // Get existing winner IDs in assignments
      const existingWinnerIds = new Set(
        this.prizeResultAssignments.map((a) => a.winnerId),
      );

      // Add new winners that aren't in the list yet
      this.winners.forEach((winner, index) => {
        if (!existingWinnerIds.has(winner.id)) {
          const prizeName = this.prizeRaceList[index] || `Giáº£i ${index + 1}`;
          this.prizeResultAssignments.push({
            prizeName: prizeName,
            winnerId: winner.id,
          });
          console.log(`âœ“ Added new winner to assignments: ${winner.name}`);
        }
      });

      // Update prize names for existing assignments to match current prizeRaceList
      this.prizeResultAssignments.forEach((assign, index) => {
        const newPrizeName = this.prizeRaceList[index] || `Giáº£i ${index + 1}`;
        if (assign.prizeName !== newPrizeName) {
          assign.prizeName = newPrizeName;
          console.log(
            `âœ“ Updated prize name for assignment ${index}: "${newPrizeName}"`,
          );
        }
      });

      // Save updated assignments
      localStorage.setItem(
        "prizeResultAssignments",
        JSON.stringify(this.prizeResultAssignments),
      );
    }

    // Load checkbox states from localStorage
    const prizeAssignStates = JSON.parse(
      localStorage.getItem("prizeAssignStates") || "{}",
    );

    // Láº¥y danh sÃ¡ch ngÆ°á»i tháº¯ng tá»« this.winners vá»›i note (váº¯ng) náº¿u unchecked
    const winnerOptions = this.winners
      .map((w, idx) => {
        const winnerId = `winner_${idx}_${w.name}`;
        const isPresent = prizeAssignStates[winnerId] !== false; // Default true if not set
        const label = `${w.code ? w.code + " - " : ""}${w.name}${!isPresent ? " (váº¯ng)" : ""}`;
        return `<option value="${w.id}">${label}</option>`;
      })
      .join("");

    container.innerHTML = this.prizeResultAssignments
      .map(
        (assign, index) => `
        <div style="display: flex; gap: 10px; align-items: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 5px;">
            <input type="text" placeholder="TÃªn giáº£i" value="${assign.prizeName}" 
                   onchange="game.prizeResultAssignments[${index}].prizeName = this.value"
                   style="flex: 1; padding: 5px; background: #111; color: #ffd700; border: 1px solid #333; border-radius: 3px;">
            <span style="color: white;">âžœ</span>
            <select onchange="game.prizeResultAssignments[${index}].winnerId = this.value"
                    style="flex: 1; padding: 5px; background: #111; color: white; border: 1px solid #333; border-radius: 3px;">
                <option value="">-- Chá»n ngÆ°á»i nháº­n --</option>
                ${winnerOptions}
            </select>
            <button onclick="game.removePrizeAssignment(${index});" 
                    style="background: #c0392b; border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">X</button>
        </div>
    `,
      )
      .join("");

    // Set láº¡i giÃ¡ trá»‹ Ä‘Ã£ chá»n cho cÃ¡c select sau khi render
    this.prizeResultAssignments.forEach((assign, index) => {
      const selects = container.querySelectorAll("select");
      if (selects[index]) selects[index].value = assign.winnerId;
    });
  }

  removePrizeAssignment(index) {
    this.prizeResultAssignments.splice(index, 1);
    this.renderPrizeAssignmentUI();
  }

  applyPrizeResultAssignment() {
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );

    // Hiá»ƒn thá»‹ Result Panel dá»±a trÃªn dá»¯ liá»‡u Ä‘Ã£ gÃ¡n
    this.showFinalAssignedResults();
  }

  // UI Methods - Delegate to UIManager
  showCurrentSettings() {
    this.uiManager.showCurrentSettings();
  }

  showRacePrizes() {
    this.uiManager.showRacePrizes();
  }

  showPrizeAssignments() {
    this.uiManager.showPrizeAssignments();
  }

  showFinalAssignedResults() {
    this.uiManager.showFinalAssignedResults();
  }

  displayCustomAssignedResults(data) {
    this.uiManager.displayCustomAssignedResults(data);
  }

  applyRaceTrackAspectRatio(width, height) {
    this.uiManager.applyRaceTrackAspectRatio(width, height);
  }

  toggleResultBackground() {
    this.uiManager.toggleResultBackground();
  }

  loadResultBackgroundImage(event) {
    this.uiManager.loadResultBackgroundImage(event);
  }

  applyResultPanelSettings() {
    this.uiManager.applyResultPanelSettings();
  }

  applyResultPanelBackgroundToDisplay(data) {
    this.uiManager.applyResultPanelBackgroundToDisplay(data);
  }

  resetResultPanelSettings() {
    this.uiManager.resetResultPanelSettings();
  }

  loadResultPanelSettings() {
    this.uiManager.loadResultPanelSettings();
  }

  // ==================== History Manager Delegation ====================

  loadStats() {
    return this.historyManager.loadStats();
  }

  saveStats() {
    this.historyManager.saveStats();
  }

  loadWinners() {
    return this.historyManager.loadWinners();
  }

  saveWinners() {
    this.historyManager.saveWinners();
  }

  showTopNVictoryPopup() {
    this.historyManager.showTopNVictoryPopup();
  }

  closeTopNVictoryPopup() {
    this.historyManager.closeTopNVictoryPopup();
  }

  continueRace() {
    this.historyManager.continueRace();
  }

  showWinnersPanel() {
    this.historyManager.showWinnersPanel();
  }

  sendResultsToDisplay() {
    this.historyManager.sendResultsToDisplay();
  }

  resetHistory() {
    this.historyManager.resetHistory();
  }

  // ==================== Race Controller Delegation ====================

  startRace() {
    this.raceController.startRace();
  }

  setupRaceOnly() {
    this.raceController.setupRaceOnly();
  }

  pauseRace() {
    this.raceController.pauseRace();
  }

  resumeRace() {
    this.raceController.resumeRace();
  }

  endRace() {
    this.raceController.endRace();
  }

  processRaceResults(winner, finishTime) {
    this.raceController.processRaceResults(winner, finishTime);
  }

  // ==================== File Manager Delegation ====================

  loadDuckNames(event) {
    this.fileManager.loadDuckNames(event);
  }

  loadSavedData() {
    this.fileManager.loadSavedData();
  }

  updateFileStatus(fileName) {
    this.fileManager.updateFileStatus(fileName);
  }

  clearLoadedFile() {
    this.fileManager.clearLoadedFile();
  }

  // ==================== ImageLoader Delegation ====================

  preloadDuckImages() {
    this.imageLoader.preloadDuckImages();
  }

  enableStartButton() {
    this.imageLoader.enableStartButton();
  }

  showLoading(message, progress) {
    this.imageLoader.showLoading(message, progress);
  }

  updateLoadingProgress(message, progress) {
    this.imageLoader.updateLoadingProgress(message, progress);
  }

  hideLoading() {
    this.imageLoader.hideLoading();
  }

  updateGameSpeed(speed) {
    this.imageLoader.updateGameSpeed(speed);
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
    // Tá»± Ä‘á»™ng phÃ¡t hiá»‡n cÃ¡c thÆ° má»¥c output_X
    const themeSelect = document.getElementById("iconTheme");

    // Skip if element doesn't exist (display mode)
    if (!themeSelect) {
      console.log("iconTheme element not found, skipping theme detection");
      return;
    }

    themeSelect.innerHTML = ""; // XÃ³a cÃ¡c option cÅ©

    let themeIndex = 1;
    let consecutiveFails = 0;
    const maxFails = 2;

    const checkTheme = (index) => {
      const testImg = new Image();
      const themeName = `output_${index}`;
      testImg.src = `${themeName}/Input_Icon_01.webp`;

      testImg.onload = () => {
        // ThÆ° má»¥c tá»“n táº¡i, thÃªm vÃ o dropdown
        const option = document.createElement("option");
        option.value = themeName;
        option.textContent = `Chá»§ Ä‘á» ${index}`;
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

  // toggleRaceMode khÃ´ng cÃ²n cáº§n thiáº¿t, giá»¯ láº¡i cho tÆ°Æ¡ng thÃ­ch cÅ© náº¿u bá»‹ gá»i ngoÃ i, nhÆ°ng khÃ´ng lÃ m gÃ¬
  toggleRaceMode() {}

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
                <p class="toast-time"> ${finishTime}</p>
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
      `ðŸ“¢ Toast shown: ${getPositionSuffix(position)} - ${winner.name}`,
    );
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
    // Tá»± Ä‘á»™ng detect sá»‘ folder cÃ³ sáºµn trong theme
    console.log(`Starting icon detection for theme: ${this.currentTheme}`);

    const iconCountEl = document.getElementById("iconCount");
    if (iconCountEl) {
      iconCountEl.textContent = "Detecting icons...";
    }

    // Only show loading UI if element exists (not in display mode)
    if (document.getElementById("loadingContainer")) {
      this.showLoading("Detecting icons...", 0);
    }

    const maxFolders = 50; // Kiá»ƒm tra tá»‘i Ä‘a 50 folders
    let detectedCount = 0;
    let consecutiveFails = 0;
    const maxFails = 3;

    const checkFolder = (folderNum) => {
      const testImg = new Image();
      const testPath = `${this.currentTheme}/${folderNum}/compressed_final_${folderNum}_1.webp`;
      testImg.src = testPath;

      testImg.onload = () => {
        console.log(`âœ“ Found folder ${folderNum}`);
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
        console.log(`âœ— Folder ${folderNum} not found (path: ${testPath})`);
        consecutiveFails++;
        if (consecutiveFails < maxFails && folderNum < maxFolders) {
          checkFolder(folderNum + 1);
        } else {
          // Káº¿t thÃºc detection
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

    // Load 3 frames tá»« má»—i folder
    let loadedFolders = 0;
    const totalFolders = this.iconCount;

    this.updateLoadingProgress(`Loading ${totalFolders} animated icons...`, 50);

    for (let folderNum = 1; folderNum <= totalFolders; folderNum++) {
      const frames = [];
      let loadedFrames = 0;

      // Load 3 frames cho má»—i folder
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

    // Cáº­p nháº­t UI ngay láº­p tá»©c
    const iconCountEl = document.getElementById("iconCount");
    if (iconCountEl) {
      iconCountEl.textContent = `Loading ${totalFolders} animated ducks...`;
    }
  }

  loadDuckNames(event) {
    // Now actually start the race
    console.log("controlStartRace: Beginning race from control panel");
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
      };

      console.log("Race data to send:", raceData);

      this.displayChannel.postMessage({
        type: "START_RACE",
        data: raceData,
      });

      console.log("START_RACE message posted to channel");
      console.log("âœ… Message sent to display tab (if open)");
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

      // Láº¥y mode tá»« winnerCount
      if (winnerCountEl) {
        const n = parseInt(winnerCountEl.value);
        // Always use topN mode
        this.raceMode = "topN";
        this.winnerCount = n;
      }

      console.log(
        `ðŸ Race Setup - Mode: ${this.raceMode}, Winner Count: ${this.winnerCount}, Duration: ${this.raceDuration}s, Speed: ${this.gameSpeed}x`,
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
          console.log(
            "ðŸ“¢ Initial sound state:",
            enabled,
            "- sent to display",
          );
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

    // TÃ­nh trackLength dá»±a trÃªn tá»‘c Ä‘á»™ thá»±c táº¿ vá»›i delta time normalization
    // baseSpeed: 3.2-4.0 px/frame (avg 3.6) @ 60 FPS vá»›i deltaTime = 1.0
    // Tá»‘c Ä‘á»™ thá»±c táº¿: 3.6 px/frame * 60 fps = 216 px/s
    // Rubber-banding lÃ m giáº£m tá»‘c Ä‘á»™ trung bÃ¬nh ~30% (leaders bá»‹ slow down)
    // Turbo boost tÄƒng tá»‘c Ä‘á»™ cho laggers ~20%
    // => Tá»‘c Ä‘á»™ hiá»‡u quáº£: 216 * 0.85 = ~183 px/s (balanced)
    // UPDATE: Quan sÃ¡t thá»±c táº¿ cho tháº¥y vá»‹t cháº¡y NHANH Gáº¤P 2 Láº¦N â†’ giáº£m xuá»‘ng 1/2
    const baseEffectiveSpeed = 366; // px/s - doubled from observation (183 * 2)
    // Race dÃ i hÆ¡n cáº§n track dÃ i hÆ¡n má»™t chÃºt do dynamic khÃ´ng á»•n Ä‘á»‹nh
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

    // áº¨n finish line tá»« race trÆ°á»›c
    const finishLineEl = document.getElementById("finishLine");
    if (finishLineEl) {
      finishLineEl.classList.add("hidden");
      finishLineEl.classList.remove("visible");
    }

    // Rebuild activeDuckNames from duckNames, excluding winners
    // This ensures we always start with correct list after mode changes
    if (this.duckNames.length > 0) {
      // CÃ³ file CSV Ä‘Ã£ upload - rebuild tá»« full list
      this.activeDuckNames = [...this.duckNames];
      this.activeDuckCodes = [...this.duckCodes];
    } else {
      // KhÃ´ng cÃ³ file - rebuild full list vá»›i sá»‘ lÆ°á»£ng duckCount má»›i
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

    // Láº¥y danh sÃ¡ch vá»‹t hiá»‡n táº¡i (limited by duckCount setting)
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
      console.log(`ðŸŽ¨ Canvas mode ENABLED for ${actualDuckCount} ducks`);
      this.setupCanvasRendering();
    } else {
      console.log(`ðŸ“¦ DOM mode for ${actualDuckCount} ducks`);
      this.cleanupCanvas();
    }

    // Enable Web Workers for very large races (>1000 ducks)
    this.useWorkers = actualDuckCount > 1000;
    if (this.useWorkers) {
      console.log(
        `âš¡ Multi-threaded mode ENABLED for ${actualDuckCount} ducks (${this.workerCount} workers)`,
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
        startBtn.textContent = "ðŸš€ Start Race";
      }
      if (controlStartBtn) {
        controlStartBtn.disabled = false;
        controlStartBtn.textContent = "ðŸš€ Start";
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
    if (fullscreenBtn) fullscreenBtn.textContent = "ðŸš€ Start";

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
    if (fullscreenBtn) fullscreenBtn.textContent = "ðŸ”² Fullscreen";

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

    console.log(`âœ“ Canvas initialized: ${canvas.width}x${canvas.height}`);
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
    console.log(`âœ“ Created ${this.workers.length} worker threads`);
  }

  cleanupWorkers() {
    if (this.workers.length > 0) {
      this.workers.forEach((w) => w.terminate());
      this.workers = [];
      console.log("âœ“ Workers terminated");
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
    // Sá»­a: khÃ´ng trá»« duckHeight Ä‘á»ƒ lane Ä‘áº§u/cuá»‘i sÃ¡t mÃ©p trÃªn/dÆ°á»›i
    const availableHeight = this.trackHeight - topPadding - bottomPadding;
    // Náº¿u chá»‰ cÃ³ 1 vá»‹t thÃ¬ Ä‘áº·t laneHeight = 0 Ä‘á»ƒ khÃ´ng chia
    const laneHeight =
      this.duckCount > 1 ? availableHeight / (this.duckCount - 1) : 0;

    const duckEl = document.createElement("div");
    duckEl.className = "duck-element";
    duckEl.style.width = `${duckHeight}px`;
    duckEl.style.height = `${duckHeight}px`;
    // Lane 0 sÃ¡t Ä‘Ã¡y river-race, lane N-1 sÃ¡t Ä‘á»‰nh, chia Ä‘á»u tá»« dÆ°á»›i lÃªn
    const laneIdx = index - 1;
    const laneCount = this.duckCount;
    const y = (this.trackHeight - duckHeight) * (1 - laneIdx / (laneCount - 1));
    duckEl.style.top = `${y}px`;
    duckEl.style.left = "0px";

    if (this.imagesLoaded && this.duckImages.length > 0) {
      const iconIndex = (duck.id - 1) % this.duckImages.length;
      const img = document.createElement("img");
      // Sá»­ dá»¥ng frame Ä‘áº§u tiÃªn (index 0)
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
    // Ban Ä‘áº§u duck-name á»Ÿ sau icon
    duckEl.appendChild(nameLabel);
    // Náº¿u Ä‘Ã£ vá» Ä‘Ã­ch thÃ¬ chuyá»ƒn dáº§n duck-name ra trÆ°á»›c icon
    if (duck.finished) {
      // Náº¿u cÃ³ img (icon) thÃ¬ chuyá»ƒn nameLabel ra trÆ°á»›c icon
      const img = duckEl.querySelector(".duck-icon");
      if (img) {
        // ThÃªm class Ä‘á»ƒ animate dá»‹ch chuyá»ƒn
        nameLabel.classList.add("duck-name-move-front");
        // ÄÆ°a nameLabel ra trÆ°á»›c icon
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
    // Sá»­a: khÃ´ng trá»« duckHeight Ä‘á»ƒ lane Ä‘áº§u/cuá»‘i sÃ¡t mÃ©p trÃªn/dÆ°á»›i
    const availableHeight = this.trackHeight - topPadding - bottomPadding;
    const laneHeight =
      this.duckCount > 1 ? availableHeight / (this.duckCount - 1) : 0;

    this.ducks.forEach((duck, index) => {
      const duckEl = this.duckElements.get(duck.id);
      if (duckEl) {
        // Lane 0 sÃ¡t Ä‘Ã¡y river-race, lane N-1 sÃ¡t Ä‘á»‰nh, chia Ä‘á»u tá»« dÆ°á»›i lÃªn
        const laneCount = this.duckCount;
        const y =
          (this.trackHeight - duckHeight) * (1 - index / (laneCount - 1));
        duckEl.style.top = `${y}px`;
        // Animate duck-name náº¿u Ä‘Ã£ vá» Ä‘Ã­ch
        const nameLabel = duckEl.querySelector(".duck-name");
        const duckImg = duckEl.querySelector(".duck-icon");
        if (duck.finished && nameLabel && duckImg) {
          nameLabel.classList.add("duck-name-move-front");
          if (duckEl.firstChild !== nameLabel) {
            duckEl.insertBefore(nameLabel, duckImg);
          }
        } else if (nameLabel && duckImg) {
          // Náº¿u chÆ°a vá» Ä‘Ã­ch, Ä‘áº£m báº£o nameLabel á»Ÿ sau icon
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
    // Accept percent (10â€“100) or ratio (0.1â€“1.0)
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
        "ðŸ“¢ Sent FORCE_CLUSTER_CAMERA to channel:",
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
      // GÃ¡n prizePosition cho tá»«ng winner theo thá»© tá»± giáº£i
      this.currentRaceWinners = winners.map((w, idx) => ({
        ...w,
        prizePosition: idx + 1,
      }));
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

      // Send different messages for normal vs Top N mode
      // Both modes now use SHOW_TOPN_WINNER for consistency
      setTimeout(() => {
        this.displayChannel.postMessage({
          type: "SHOW_TOPN_WINNER",
          data: {
            winners: this.currentRaceWinners, // Array of winners (1 or more)
            finishTime: parseFloat(finishTime),
          },
        });
        console.log(
          "Control: Sent SHOW_TOPN_WINNER to display with",
          this.currentRaceWinners.length,
          "winner(s)",
        );
      }, 3000); // 3 second delay to see racers finish clearly
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

    // Save winners to accumulated list and update UI
    if (raceMode === "topN") {
      // Top N mode: Merge current race winners into historical winners
      if (this.currentRaceWinners && this.currentRaceWinners.length > 0) {
        const startPosition = this.winners.length; // Continue numbering from last position

        this.currentRaceWinners.forEach((w, index) => {
          w._controlFinishTime = parseFloat(finishTime);
          w.position = startPosition + index + 1; // Tá»•ng sá»‘ winner
          w.raceNumber = this.currentRaceNumber;
          w.prizePosition = w.prizePosition || index + 1; // Äáº£m báº£o cÃ³ prizePosition
          // Add to accumulated winners
          this.winners.push(w);
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
        this.updateHistoryWin();

        // Update prize assignment UI with new winners
        if (this.renderPrizeAssignmentUI) {
          this.renderPrizeAssignmentUI();
        }

        // Show Top N victory popup after delay (ONLY on control, not display)
        if (!this.isDisplayMode) {
          setTimeout(() => {
            this.showTopNVictoryPopup();
          }, 3000); // 3 second delay to see racers finish clearly
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
            console.log(`ðŸ Display: Duck finished:`, duck.name);
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

            this.currentRaceWinners.push({
              id: duck.id,
              name: duck.name,
              code: duck.code, // Include employee code
              iconSrc: duck.iconSrc,
              finishTime: duck.finishTime,
              position: duck.position,
            });

            console.log(
              `ðŸ† Winner #${this.currentRaceWinners.length}:`,
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
              `ðŸ First finisher: ${duck.name}, Time: ${duck.finishTime}`,
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

      // Log thÃ´ng tin vá»‹t dáº«n Ä‘áº§u real-time vá»›i tá»‘c Ä‘á»™ vÃ  delta time
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
      const finishLineRevealDistance = this.viewportWidth * 2.0; // Hiá»ƒn sá»›m hÆ¡n (2.0 thay vÃ¬ 1.5)

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
          `ðŸ“¹ Camera | Vel: ${this.cameraVelocity.toFixed(2)} (Î”${velocityChange.toFixed(2)}) | Offset: ${this.cameraOffset.toFixed(0)} (Î”${offsetChange.toFixed(2)}) | Target: ${targetVelocity.toFixed(2)} | DeltaT: ${this.deltaTime.toFixed(3)}/${this.smoothedDeltaTime.toFixed(3)}`,
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
            `%c[Finish Line] ðŸ REVEALED! Distance: ${distanceToFinish.toFixed(0)}px | Leader will shift from 40% to 20%`,
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
            `ðŸ Finish Line | Screen X: ${finishScreenX.toFixed(0)}px | Viewport: ${this.viewportWidth}px | Visible: ${finishScreenX >= -100 && finishScreenX <= this.viewportWidth + 100}`,
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
              `ðŸŽ¯ Lane switch: ${duck.name} | ${laneIndex} â†’ ${bestLane} | Cooldown: ${duck.laneChangeCooldown}ms`,
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
          // Äáº£o ngÆ°á»£c: lane 0 á»Ÿ dÆ°á»›i, lane N-1 á»Ÿ trÃªn
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
        // Äáº£o ngÆ°á»£c: lane 0 á»Ÿ dÆ°á»›i, lane N-1 á»Ÿ trÃªn
        const newTop =
          topPadding + (NUM_DISPLAY_LANES - 1 - targetLane) * laneHeight;

        // Update top position if lane changed

        if (!duck._lastTop || Math.abs(newTop - duck._lastTop) > 1) {
          domUpdates.push(() => {
            duckEl.style.top = `${newTop}px`;
          });
          duck._lastTop = newTop;
        }

        // Xá»­ lÃ½ hiá»‡u á»©ng chuyá»ƒn duck-name ra trÆ°á»›c icon khi vá»«a cÃ¡n Ä‘Ã­ch (cháº¯c cháº¯n)
        const nameLabel = duckEl.querySelector(".duck-name");
        // TÃ¬m icon: img (duck-icon) hoáº·c div (circle)
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
    // LuÃ´n láº¥y duckHeight tá»« this.duckSizeRatio hiá»‡n táº¡i
    const duckHeight = this.trackHeight * this.duckSizeRatio;
    // Log Ä‘á»ƒ debug live update
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
    // Cáº­p nháº­t danh sÃ¡ch lá»‹ch sá»­ chiáº¿n tháº¯ng
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
        index === 0 ? "ðŸ¥‡" : index === 1 ? "ðŸ¥ˆ" : index === 2 ? "ðŸ¥‰" : "";
      const colorDot = winner.color
        ? `<span style="display:inline-block;width:12px;height:12px;background:${winner.color};border-radius:50%;margin-right:5px;"></span>`
        : "";

      // Get prize name from prizeRaceList using index
      let prizeName = this.prizeRaceList[index] || "";
      // Fallback if prize name is empty or just a number
      if (!prizeName || prizeName.trim() === "" || !isNaN(prizeName)) {
        prizeName = `Giáº£i ${index + 1}`;
      }

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
            title="ÄÃ£ gÃ¡n giáº£i thÆ°á»Ÿng"
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
        `âœ“ Prize assignment state saved for ${winnerId}:`,
        checkbox.checked,
      );

      // Re-render prize assignment UI to update "(váº¯ng)" labels
      this.renderPrizeAssignmentUI();
    }
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

  //   // Set winner icon vá»›i animation
  //   if (this.imagesLoaded && this.duckImages.length > 0) {
  //     const iconIndex = (winner.id - 1) % this.duckImages.length;
  //     // Táº¡o img element vá»›i frame Ä‘áº§u tiÃªn
  //     const imgEl = document.createElement("img");
  //     imgEl.src = this.duckImages[iconIndex][0].src;
  //     imgEl.alt = winner.name;
  //     imgEl.id = "winnerAnimatedIcon";
  //     winnerIconEl.innerHTML = "";
  //     winnerIconEl.appendChild(imgEl);

  //     // Báº¯t Ä‘áº§u animation cho winner icon (nhanh hÆ¡n - má»—i 100ms)
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
  //       <p><strong>ðŸ† Prize:</strong> ${prizeName}</p>
  //       <p><strong>ðŸ•’ Time:</strong> ${finishTime}s</p>
  //       <p><strong>ðŸ“ Position:</strong> ${winnerPos}${this.getPositionSuffix(winnerPos)}</p>
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

    // Dá»«ng winner animation
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

  fullReset() {
    // Reset hoÃ n toÃ n bao gá»“m cáº£ winners
    localStorage.clear(); // XÃ³a toÃ n bá»™ localStorage khi restart

    // Reset all variables
    this.winners = [];
    this.excludedDucks = [];
    this.activeDuckNames = [...this.duckNames]; // Reset vá» danh sÃ¡ch ban Ä‘áº§u
    this.activeDuckCodes = [...this.duckCodes]; // Reset codes as well
    this.usedPrizesCount = 0; // Reset prize counter
    this.prizeResultAssignments = []; // Reset result assignments
    this.prizeRaceList = ["Giáº£i Nháº¥t", "Giáº£i NhÃ¬", "Giáº£i Ba"]; // Reset to default
    this.raceScripts = []; // Clear all scripts

    // ÄÃ³ng popup victory náº¿u cÃ²n hiá»ƒn thá»‹
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
    // Reset nhÆ°ng giá»¯ láº¡i winners vÃ  excludedDucks náº¿u cÃ³
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

// Export for ES modules
export { Game };

// Create global instance for backward compatibility
const game = new Game();
window.game = game; // Make it globally accessible
console.log("Game instance created and exposed globally");

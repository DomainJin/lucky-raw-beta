// ImageLoader - Handles duck icon preloading and loading UI
export class ImageLoader {
  constructor(game) {
    this.game = game;
  }

  /**
   * Preload all duck images
   */
  preloadDuckImages() {
    let loadedCount = 0;
    const totalImages = this.game.iconCount;

    for (let i = 1; i <= totalImages; i++) {
      const img = new Image();
      const paddedNum = String(i).padStart(2, "0");
      img.src = `output/Input_Icon_${paddedNum}.webp`;

      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          this.game.imagesLoaded = true;
          console.log("All duck icons loaded!");
        }
      };

      img.onerror = () => {
        console.warn(`Failed to load: ${img.src}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          this.game.imagesLoaded = true;
        }
      };

      this.game.duckImages.push(img);
    }
  }

  /**
   * Enable start button after icons are loaded
   */
  enableStartButton() {
    // Only enable if display window is open and has loaded icons
    if (
      !this.game.isDisplayMode &&
      this.game.displayWindow &&
      !this.game.displayWindow.closed
    ) {
      if (!this.game.displayIconsLoaded) {
        console.log("⏳ Display icons not loaded yet, waiting...");
        return;
      }
    }

    // Enable Display link
    const displayBtn = document.getElementById("openDisplayBtn");
    if (displayBtn) {
      displayBtn.style.pointerEvents = "auto";
      displayBtn.style.opacity = "1";
      displayBtn.textContent = "Open Display";
    }

    // Show success notification only if loading container exists (not in display mode)
    if (document.getElementById("loadingContainer")) {
      this.updateLoadingProgress("All icons loaded successfully!", 100);
      setTimeout(() => {
        this.hideLoading();
      }, 1500);
    }

    // Send display channel info: control icons are ready
    // Display can proceed even if it loaded icons first
    if (this.game.displayChannel) {
      this.game.displayChannel.postMessage({
        type: "CONTROL_ICONS_READY",
        data: { iconCount: this.game.iconCount },
      });
      console.log(
        "✅ Sent CONTROL_ICONS_READY - iconCount:",
        this.game.iconCount,
      );
    }

    // Enable start button on control panel
    const startRaceBtn = document.getElementById("startRaceBtn");
    if (startRaceBtn) {
      startRaceBtn.disabled = false;
      startRaceBtn.classList.remove("disabled");
      console.log(
        "✅ Start Race button enabled - control icons loaded:",
        this.game.iconCount,
      );
    }
  }

  /**
   * Show loading UI
   * @param {string} message - Loading message
   * @param {number} progress - Progress percentage
   */
  showLoading(message, progress) {
    const loadingContainer = document.getElementById("loadingContainer");
    const loadingText = document.getElementById("loadingText");
    const loadingProgress = document.getElementById("loadingProgress");

    if (loadingContainer) loadingContainer.classList.remove("hidden");
    if (loadingText) loadingText.textContent = message;
    if (loadingProgress) loadingProgress.textContent = `${progress}%`;
  }

  /**
   * Update loading progress
   * @param {string} message - Loading message
   * @param {number} progress - Progress percentage
   */
  updateLoadingProgress(message, progress) {
    const loadingText = document.getElementById("loadingText");
    const loadingProgress = document.getElementById("loadingProgress");

    if (loadingText) loadingText.textContent = message;
    if (loadingProgress) loadingProgress.textContent = `${progress}%`;
  }

  /**
   * Hide loading UI
   */
  hideLoading() {
    const loadingContainer = document.getElementById("loadingContainer");
    if (loadingContainer) loadingContainer.classList.add("hidden");
  }

  /**
   * Update game speed
   * @param {number} speed - Speed multiplier
   */
  updateGameSpeed(speed) {
    this.game.gameSpeed = speed;
    console.log(`🎮 Game speed updated to: ${speed}x`);
  }
}

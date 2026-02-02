import { safeElementAction } from "../utils/constants.js";

export class UIManager {
  constructor(game) {
    this.game = game;
    console.log("UIManager initialized");
  }

  // Current Settings Display
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
   Total: ${this.game.prizeManager.prizeRaceList.length} prizes
   Used: ${this.game.prizeManager.usedPrizesCount} prizes
${this.game.prizeManager.prizeRaceList.length > 0 ? this.game.prizeManager.prizeRaceList.map((p, i) => `   ${i + 1}. ${p}${i < this.game.prizeManager.usedPrizesCount ? " ✓" : ""}`).join("\n") : "   (No prizes configured)"}

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
      prizeRaceList: this.game.prizeManager.prizeRaceList,
      usedPrizesCount: this.game.prizeManager.usedPrizesCount,
    });
  }

  // Prize Display Methods
  showRacePrizes() {
    const displayContainer = document.getElementById("racePrizesDisplay");
    const contentDiv = document.getElementById("racePrizesContent");

    if (!displayContainer || !contentDiv) return;

    if (displayContainer.style.display === "none") {
      if (this.game.prizeManager.prizeRaceList.length === 0) {
        contentDiv.innerHTML = `<div style="color: #888; font-style: italic;">No race prizes configured yet. Add prizes using the input above.</div>`;
      } else {
        let html = `
          <div style="margin-bottom: 8px;">
            <span style="color: #ffd700;">Total:</span> ${this.game.prizeManager.prizeRaceList.length} | 
            <span style="color: #e74c3c;">Used:</span> ${this.game.prizeManager.usedPrizesCount} | 
            <span style="color: #2ecc71;">Available:</span> ${this.game.prizeManager.prizeRaceList.length - this.game.prizeManager.usedPrizesCount}
          </div>
          <div style="border-top: 1px solid #444; padding-top: 8px;">
        `;

        this.game.prizeManager.prizeRaceList.forEach((prize, index) => {
          const status =
            index < this.game.prizeManager.usedPrizesCount
              ? `<span style="color: #2ecc71;">✓ Awarded</span>`
              : `<span style="color: #888;">○ Available</span>`;
          const opacity =
            index < this.game.prizeManager.usedPrizesCount
              ? "opacity: 0.6;"
              : "";
          html += `<div style="${opacity} padding: 3px 0;">${index + 1}. ${prize} ${status}</div>`;
        });

        html += `</div>`;
        contentDiv.innerHTML = html;
      }
      displayContainer.style.display = "block";
      console.log("Race Prizes shown:", {
        prizeRaceList: this.game.prizeManager.prizeRaceList,
        usedPrizesCount: this.game.prizeManager.usedPrizesCount,
        available:
          this.game.prizeManager.prizeRaceList.length -
          this.game.prizeManager.usedPrizesCount,
      });
    } else {
      displayContainer.style.display = "none";
    }
  }

  showPrizeAssignments() {
    const displayContainer = document.getElementById(
      "resultAssignmentsDisplay",
    );
    const contentDiv = document.getElementById("resultAssignmentsContent");

    if (!displayContainer || !contentDiv) return;

    if (displayContainer.style.display === "none") {
      if (this.game.prizeManager.prizeResultAssignments.length === 0) {
        contentDiv.innerHTML = `<div style="color: #888; font-style: italic;">No prize assignments configured yet. Add prizes using the input above.</div>`;
      } else {
        let html = `
          <div style="margin-bottom: 8px;">
            <span style="color: #667eea;">Total Assignments:</span> ${this.game.prizeManager.prizeResultAssignments.length}
          </div>
          <div style="border-top: 1px solid #444; padding-top: 8px;">
        `;

        this.game.prizeManager.prizeResultAssignments.forEach(
          (assign, index) => {
            const winnerInfo = this.game.winners.find(
              (w) => w.id == assign.winnerId,
            );
            const winnerName = winnerInfo
              ? `${winnerInfo.code ? winnerInfo.code + " - " : ""}${winnerInfo.name}`
              : `<span style="color: #e74c3c;">(Not selected)</span>`;

            html += `
            <div style="padding: 5px 0; border-bottom: 1px solid #333;">
              <div style="color: #ffd700;">${index + 1}. ${assign.prizeName}</div>
              <div style="padding-left: 15px; color: #67e8f9; font-size: 12px;">→ ${winnerName}</div>
            </div>
          `;
          },
        );

        html += `</div>`;
        contentDiv.innerHTML = html;
      }
      displayContainer.style.display = "block";
    } else {
      displayContainer.style.display = "none";
    }
  }

  showFinalAssignedResults() {
    const displayContainer = document.getElementById(
      "finalAssignedResultsDisplay",
    );
    const contentDiv = document.getElementById("finalAssignedResultsContent");

    if (!displayContainer || !contentDiv) return;

    if (displayContainer.style.display === "none") {
      const assignments = this.game.prizeManager.prizeResultAssignments.filter(
        (a) => a.winnerId,
      );

      if (assignments.length === 0) {
        contentDiv.innerHTML = `<div style="color: #888; font-style: italic;">No winners assigned yet.</div>`;
      } else {
        let html = `
          <div style="margin-bottom: 12px;">
            <span style="color: #2ecc71;">✓ Assigned Winners:</span> ${assignments.length}
          </div>
          <div style="border-top: 1px solid #444; padding-top: 8px;">
        `;

        assignments.forEach((assign, index) => {
          const winnerInfo = this.game.winners.find(
            (w) => w.id == assign.winnerId,
          );
          const winnerName = winnerInfo
            ? `${winnerInfo.code ? winnerInfo.code + " - " : ""}${winnerInfo.name}`
            : "Unknown";

          html += `
            <div style="padding: 8px; border-bottom: 1px solid #333; background: rgba(46, 204, 113, 0.1);">
              <div style="color: #ffd700; font-weight: bold;">${index + 1}. ${assign.prizeName}</div>
              <div style="padding-left: 15px; color: #2ecc71; font-size: 13px;">🏆 ${winnerName}</div>
            </div>
          `;
        });

        html += `</div>`;
        contentDiv.innerHTML = html;
      }
      displayContainer.style.display = "block";
    } else {
      displayContainer.style.display = "none";
    }
  }

  displayCustomAssignedResults(data) {
    const resultPanel = document.getElementById("resultPanel");
    if (!resultPanel) return;

    const prizeTitle =
      localStorage.getItem("customPrizeTitle") || "Prize Results";

    let html = `
      <div class="custom-prize-results" style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-sizing: border-box;
      ">
        <h1 style="text-align: center; margin-bottom: 30px; color: #ffd700; font-size: 2.5em;">${prizeTitle}</h1>
        <div class="prize-list" style="flex: 1; overflow-y: auto;">
    `;

    data.forEach((entry, index) => {
      html += `
        <div style="
          border-bottom: 2px solid #444;
          padding: 15px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="flex: 1;">
            <div style="color: #ffd700; font-size: 1.3em; font-weight: bold;">${index + 1}. ${entry.prizeName}</div>
          </div>
          <div style="flex: 1; text-align: right;">
            <div style="color: #2ecc71; font-size: 1.2em;">🏆 ${entry.winnerName}</div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    resultPanel.innerHTML = html;
    resultPanel.classList.remove("hidden");
    resultPanel.classList.add("fullscreen");

    console.log("✓ Display showing custom assigned results");
  }

  // Result Panel Background & Settings
  applyRaceTrackAspectRatio(width, height) {
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
    const bgType = document.getElementById("resultBgType")?.value;
    const bgColorGroup = document.getElementById("resultBgColorGroup");
    const bgImageGroup = document.getElementById("resultBgImageGroup");

    if (bgColorGroup) bgColorGroup.style.display = "none";
    if (bgImageGroup) bgImageGroup.style.display = "none";

    if (bgType === "color" && bgColorGroup) {
      bgColorGroup.style.display = "block";
    } else if (bgType === "image" && bgImageGroup) {
      bgImageGroup.style.display = "block";
    }
  }

  loadResultBackgroundImage(event) {
    const file = event.target.files[0];
    if (!file) {
      localStorage.setItem("resultPanelBackgroundImage", "static/lucky.png");
      console.log(
        "No file selected. Set result panel background to static/lucky.png",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      localStorage.setItem("resultPanelBackgroundImage", imageData);
      console.log("Result panel background image loaded");
    };
    reader.readAsDataURL(file);
  }

  applyResultPanelSettings() {
    this.game.prizeManager.savePrizeTitle();
    this.game.prizeManager.savePrizeNames();

    const bgType = document.getElementById("resultBgType")?.value;
    const bgColor = document.getElementById("resultBgColor")?.value;
    const bgImage = localStorage.getItem("resultPanelBackgroundImage");
    const prizeTitle =
      localStorage.getItem("customPrizeTitle") || "Prize Results";
    const prizeNames = JSON.parse(
      localStorage.getItem("customPrizeNames") || "{}",
    );

    const winnersGridWidth =
      document.getElementById("winnersGridWidth")?.value || "95";
    const cardGap = document.getElementById("cardGap")?.value || "1.5";

    const raceTrackAspectRatio =
      document.getElementById("raceTrackAspectRatio")?.value || "20:5";
    const [raceTrackWidth, raceTrackHeight] = raceTrackAspectRatio
      .split(":")
      .map((v) => parseInt(v.trim()));

    localStorage.setItem("resultPanelBackgroundType", bgType);
    localStorage.setItem("resultPanelBackgroundColor", bgColor);
    localStorage.setItem("winnersGridWidth", winnersGridWidth);
    localStorage.setItem("cardGap", cardGap);
    localStorage.setItem("raceTrackWidth", raceTrackWidth.toString());
    localStorage.setItem("raceTrackHeight", raceTrackHeight.toString());

    this.applyRaceTrackAspectRatio(raceTrackWidth, raceTrackHeight);

    const data = {
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

    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "UPDATE_RESULT_PANEL_SETTINGS",
        data: data,
      });
      console.log("Result panel settings sent to display:", data);
    }

    if (this.game.isDisplayMode) {
      this.applyResultPanelBackgroundToDisplay(data);
    }

    alert("✓ Result panel settings updated!");
  }

  applyResultPanelBackgroundToDisplay(data) {
    const resultPanel = document.getElementById("resultPanel");
    if (!resultPanel) return;

    resultPanel.classList.remove("custom-background");

    if (data.type === "color") {
      resultPanel.style.background = data.color;
      resultPanel.style.removeProperty("background-image");
      resultPanel.classList.add("custom-background");
    } else if (data.type === "image" && data.image) {
      resultPanel.style.backgroundImage = `url(${data.image})`;
      resultPanel.style.backgroundSize = "cover";
      resultPanel.style.backgroundPosition = "center";
      resultPanel.style.backgroundRepeat = "no-repeat";
      resultPanel.classList.add("custom-background");
    } else {
      resultPanel.style.removeProperty("background");
      resultPanel.style.removeProperty("background-image");
      resultPanel.style.removeProperty("background-size");
      resultPanel.style.removeProperty("background-position");
      resultPanel.style.removeProperty("background-repeat");
    }

    console.log("Result panel background applied:", data);
  }

  resetResultPanelSettings() {
    const resultPanel = document.getElementById("resultPanel");

    document.getElementById("resultBgType").value = "default";
    document.getElementById("resultBgColor").value = "#1a1a2e";

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

    const titleInput = document.getElementById("prizeTitleInput");
    if (titleInput) titleInput.value = "Prize Results";

    for (let i = 1; i <= 10; i++) {
      const input = document.getElementById(`prizeName${i}`);
      if (input) input.value = "";
    }

    localStorage.removeItem("resultPanelBackgroundType");
    localStorage.removeItem("resultPanelBackgroundColor");
    localStorage.removeItem("resultPanelBackgroundImage");
    localStorage.removeItem("customPrizeTitle");
    localStorage.removeItem("customPrizeNames");
    localStorage.removeItem("winnersGridWidth");
    localStorage.removeItem("cardGap");
    localStorage.removeItem("raceTrackWidth");
    localStorage.removeItem("raceTrackHeight");

    this.applyRaceTrackAspectRatio(20, 5);

    if (resultPanel) {
      resultPanel.style.removeProperty("background");
      resultPanel.style.removeProperty("background-image");
      resultPanel.style.removeProperty("background-size");
      resultPanel.style.removeProperty("background-position");
      resultPanel.style.removeProperty("background-repeat");
      resultPanel.style.removeProperty("background-color");
      resultPanel.classList.remove("custom-background");
    }

    this.toggleResultBackground();

    if (this.game.displayChannel) {
      this.game.displayChannel.postMessage({
        type: "UPDATE_RESULT_PANEL_SETTINGS",
        data: { type: "default" },
      });
      console.log("Result panel reset sent to display");
    }

    console.log("Result panel settings reset to default");
    alert("✓ Settings reset to default!");
  }

  loadResultPanelSettings() {
    const savedTitle = localStorage.getItem("customPrizeTitle");
    const titleInput = document.getElementById("prizeTitleInput");
    if (titleInput && savedTitle) {
      titleInput.value = savedTitle;
    }

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

    this.applyRaceTrackAspectRatio(savedTrackWidth, savedTrackHeight);

    this.game.prizeManager.loadPrizeNames();

    const savedBgType = localStorage.getItem("resultPanelBackgroundType");
    const bgTypeEl = document.getElementById("resultBgType");
    if (bgTypeEl && savedBgType) {
      bgTypeEl.value = savedBgType;
      this.toggleResultBackground();
    }

    const savedBgColor = localStorage.getItem("resultPanelBackgroundColor");
    const bgColorEl = document.getElementById("resultBgColor");
    if (bgColorEl && savedBgColor) {
      bgColorEl.value = savedBgColor;
    }

    console.log("Result panel settings loaded");
  }
}

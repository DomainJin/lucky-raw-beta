/**
 * HistoryManager Module
 *
 * Manages winner history, statistics, victory popups and results display
 * - Load/save stats and winners from localStorage
 * - Show victory popups (Top N winners)
 * - Display winners panel with results
 * - Handle history reset and result synchronization
 */

export class HistoryManager {
  constructor(game) {
    this.game = game;
  }

  // ==================== Stats Management ====================

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
    localStorage.setItem("duckRaceStats", JSON.stringify(this.game.stats));
  }

  // ==================== Winners Management ====================

  loadWinners() {
    const saved = localStorage.getItem("duckRaceWinners");
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  }

  saveWinners() {
    localStorage.setItem("duckRaceWinners", JSON.stringify(this.game.winners));
  }

  // ==================== Victory Popup (Top N Winners) ====================

  showTopNVictoryPopup() {
    // Show only current race winners, not accumulated winners
    const winnersToShow = this.game.currentRaceWinners || [];
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
      // Lấy giải theo thứ tự index từ usedPrizesCount
      const prizeIndex = this.game.usedPrizesCount + index;
      const medal =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

      // Use prizeRaceList với index tự động tăng
      let prizeName = this.game.prizeRaceList[prizeIndex];

      // Fallback if prize name is empty, just a number, or undefined
      if (!prizeName || prizeName.trim() === "" || !isNaN(prizeName)) {
        prizeName = `Giải ${prizeIndex + 1}`;
      }

      console.log(
        `Winner ${index}: usedPrizesCount=${this.game.usedPrizesCount}, prizeIndex=${prizeIndex}, prizeName="${prizeName}", prizeRaceList=`,
        this.game.prizeRaceList,
      );

      // Create winner icon
      let iconHTML = "";
      if (this.game.imagesLoaded && this.game.duckImages.length > 0) {
        const iconIndex = (winner.id - 1) % this.game.duckImages.length;
        if (
          this.game.duckImages[iconIndex] &&
          this.game.duckImages[iconIndex][0]
        ) {
          iconHTML = `<img src="${this.game.duckImages[iconIndex][0].src}" alt="${winner.name}">`;
        }
      }

      winnersHTML += `
            <div class="topn-winner-card">
              <div class="topn-winner-medal">${medal}</div>
              <div class="topn-winner-icon">${iconHTML}</div>
              <div class="topn-winner-position">${prizeName}</div>
              <div class="topn-winner-name">${this.game.getDisplayName(winner)}</div>
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
    if (!this.game.isDisplayMode) {
      this.game.usedPrizesCount += winnersToShow.length;
      localStorage.setItem(
        "usedPrizesCount",
        this.game.usedPrizesCount.toString(),
      );
      console.log(`✓ Updated usedPrizesCount: ${this.game.usedPrizesCount}`);

      // Re-render prize UI to disable used prizes
      if (this.game.renderPrizeRaceUI) {
        this.game.renderPrizeRaceUI();
      }

      // Sync Result assignments with popup content to ensure names match
      this.game.prizeResultAssignments = popupAssignments;
      localStorage.setItem(
        "prizeResultAssignments",
        JSON.stringify(this.game.prizeResultAssignments),
      );
      if (this.game.renderPrizeAssignmentUI) {
        this.game.renderPrizeAssignmentUI();
      }

      // Mark race script as completed after popup is shown and prizes updated
      if (this.game.raceScripts) {
        const runningScript = this.game.raceScripts.find(
          (s) => s.status === "running",
        );
        if (runningScript) {
          console.log(
            `✓ Found running script to complete:`,
            runningScript.id,
            runningScript.prizeName,
          );
          this.game.markScriptCompleted(runningScript.id);
          console.log(
            `✓ Script "${runningScript.prizeName}" marked as completed`,
          );
        } else {
          console.warn("⚠️ No running script found to mark as completed");
          console.log("All scripts:", this.game.raceScripts);
        }
      }
    } else {
      console.log(
        `📺 Display showing popup (usedPrizesCount NOT changed): ${this.game.usedPrizesCount}`,
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
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "CLOSE_TOPN_POPUP",
        data: {},
      });
    }
  }

  // ==================== Continue Race ====================

  continueRace() {
    // Winner already saved in endRace() - just close popup and prepare for next race
    console.log(
      "Continue Race - Winner already saved. Total winners:",
      this.game.winners.length,
    );

    // Đóng victory popup
    this.game.closeVictoryPopup();

    // Send message to display to close victory popup
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "CLOSE_VICTORY",
        data: {},
      });
    }

    // Ẩn result panel
    const resultPanel = document.getElementById("resultPanel");
    if (resultPanel) resultPanel.classList.add("hidden");

    // Check if enough racers remain
    const MINIMUM_PARTICIPANTS = this.game.MINIMUM_PARTICIPANTS || 2;
    if (this.game.activeDuckNames.length < MINIMUM_PARTICIPANTS) {
      alert(
        `Only ${this.game.activeDuckNames.length} racers left! Not enough to continue (need at least ${MINIMUM_PARTICIPANTS} racers).`,
      );
      this.showWinnersPanel();
      return;
    }

    // Reset và bắt đầu đua mới với số vịt còn lại
    this.game.ducks = [];
    this.game.duckElements.clear();
    this.game.raceStarted = false;
    this.game.raceFinished = false;
    this.game.racePaused = false;
    this.game.rankings = [];

    // Send RESET_RACE message to display to clear old race
    if (this.game.displayChannel && !this.game.isDisplayMode) {
      this.game.displayChannel.postMessage({
        type: "RESET_RACE",
        data: {},
      });
    }

    // Reset canvas and reinitialize
    this.game.ctx.clearRect(
      0,
      0,
      this.game.canvas.width,
      this.game.canvas.height,
    );
    this.game.initDucks();
    this.game.render();

    console.log(
      "Race reset. Remaining racers:",
      this.game.activeDuckNames.length,
    );
  }

  // ==================== Winners Panel ====================

  showWinnersPanel() {
    const resultPanel = document.getElementById("resultPanel");
    resultPanel.classList.remove("hidden");

    const prizeTitle = this.game.getPrizeTitle();
    document.getElementById("resultTitle").innerHTML = `🏆 ${prizeTitle}`;

    // Get saved layout settings
    const winnersGridWidth = localStorage.getItem("winnersGridWidth") || "95";
    const cardGap = localStorage.getItem("cardGap") || "1.5";

    let html = '<div class="winners-list">';

    if (this.game.winners.length > 0) {
      html += `<div class="winners-grid" style="width: ${winnersGridWidth}%; gap: ${cardGap}%;">`;
      this.game.winners.forEach((winner, index) => {
        const medal =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `🏅`;
        const position = index + 1;
        const prizeName = this.game.getPrizeName(position);
        html += `
                    <div class="winner-card">
                        <div class="winner-medal">${medal}</div>
                        <div class="winner-position">${prizeName}</div>
                        <div class="winner-duck-name">${this.game.getDisplayName(winner)}</div>
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
      '<button class="btn btn-primary" onclick="game.fullReset()">🔄 Play Again</button>';
    html +=
      '<button class="btn btn-secondary" onclick="game.viewHistory()">📜 View History</button>';
    html +=
      '<button class="btn btn-secondary" onclick="game.toggleFullscreenResult()">🔍 View Fullscreen</button>';
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
    if (!this.game.displayChannel) {
      alert("Display channel not available. Please open display tab first.");
      return;
    }

    if (!this.game.winners || this.game.winners.length === 0) {
      alert("No results to send!");
      return;
    }

    console.log("📤 Sending results to display...");

    // Send SHOW_RESULTS message with data
    this.game.displayChannel.postMessage({
      type: "SHOW_RESULTS",
      data: {
        winners: this.game.winners,
        totalRaces: this.game.stats.totalRaces,
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
      this.game.winners = [];
      this.game.activeDuckNames = [...this.game.duckNames];
      this.game.usedPrizesCount = 0; // Reset prize counter

      // Clear all scripts
      this.game.raceScripts = [];
      localStorage.removeItem("raceScripts");

      // Reset prize list to default
      this.game.prizeRaceList = ["Giải Nhất", "Giải Nhì", "Giải Ba"];
      localStorage.setItem(
        "prizeRaceList",
        JSON.stringify(this.game.prizeRaceList),
      );

      // Clear all prize-related localStorage
      localStorage.setItem("usedPrizesCount", "0"); // Force set to 0
      localStorage.removeItem("prizeResultAssignments");
      localStorage.removeItem("duckRaceWinners");
      localStorage.removeItem("prizeAssignStates"); // Clear checkbox states

      this.saveWinners(); // Save empty winners array
      this.game.prizeResultAssignments = []; // Reset result assignments

      // Send reset message to display
      if (this.game.displayChannel && !this.game.isDisplayMode) {
        this.game.displayChannel.postMessage({
          type: "RESET_HISTORY",
          data: {},
        });
        console.log("📤 Sent RESET_HISTORY to display");
      }

      // Đóng popup victory nếu còn hiển thị
      if (this.game.closeVictoryPopup) this.game.closeVictoryPopup();
      this.closeTopNVictoryPopup();

      // Re-render prize UI immediately before reload
      if (this.game.renderPrizeRaceUI) {
        this.game.renderPrizeRaceUI();
      }
      if (this.game.renderPrizeAssignmentUI) {
        this.game.renderPrizeAssignmentUI();
      }

      alert("History reset! Reloading page...");
      location.reload();
    }
  }
}

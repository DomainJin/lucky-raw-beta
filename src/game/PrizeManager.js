import { safeElementAction } from "../utils/constants.js";

export class PrizeManager {
  constructor() {
    // Load from localStorage
    this.prizeRaceList = JSON.parse(localStorage.getItem("prizeRaceList")) || [
      "Giải Nhất",
      "Giải Nhì",
      "Giải Ba",
    ];
    this.prizeResultAssignments =
      JSON.parse(localStorage.getItem("prizeResultAssignments")) || [];
    this.usedPrizesCount =
      parseInt(localStorage.getItem("usedPrizesCount")) || 0;
    this.raceScripts = JSON.parse(localStorage.getItem("raceScripts")) || [];

    console.log("PrizeManager initialized:", {
      prizeRaceList: this.prizeRaceList.length,
      prizeResultAssignments: this.prizeResultAssignments.length,
      usedPrizesCount: this.usedPrizesCount,
      raceScripts: this.raceScripts.length,
    });
  }

  // Prize Title Management
  getPrizeTitle() {
    return localStorage.getItem("customPrizeTitle") || "Prize Results";
  }

  savePrizeTitle(title) {
    localStorage.setItem("customPrizeTitle", title);
  }

  // Prize Names Management
  addPrizeNameField() {
    const container = document.getElementById("prizeNamesContainer");
    if (!container) return;

    const existingFields = container.querySelectorAll("input[id^='prizeName']");
    const nextIndex = existingFields.length + 1;

    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    div.innerHTML = `
      <input 
        type="text" 
        id="prizeName${nextIndex}"
        placeholder="Position ${nextIndex} Prize Name"
        style="width: calc(100% - 40px); padding: 6px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #fff;"
      >
      <button onclick="game.prizeManager.removePrizeNameField('prizeName${nextIndex}')" style="margin-left: 4px; padding: 6px 10px; background: #e74c3c; border: none; border-radius: 4px; color: #fff; cursor: pointer;">✕</button>
    `;
    container.appendChild(div);
  }

  removePrizeNameField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field && field.parentElement) {
      field.parentElement.remove();
    }
  }

  sortPrizeNames(direction) {
    const container = document.getElementById("prizeNamesContainer");
    if (!container) return;

    const inputs = Array.from(
      container.querySelectorAll("input[id^='prizeName']"),
    );
    const values = inputs
      .map((input) => input.value.trim())
      .filter((v) => v !== "");

    if (direction === "asc") {
      values.sort((a, b) => a.localeCompare(b, "vi"));
    } else {
      values.sort((a, b) => b.localeCompare(a, "vi"));
    }

    inputs.forEach((input, index) => {
      input.value = values[index] || "";
    });

    console.log(`Sorted prize names ${direction}:`, values);
  }

  savePrizeNames() {
    const container = document.getElementById("prizeNamesContainer");
    if (!container) return;

    const inputs = container.querySelectorAll("input[id^='prizeName']");
    const prizeNames = Array.from(inputs)
      .map((input) => input.value.trim())
      .filter((v) => v !== "");

    localStorage.setItem("customPrizeNames", JSON.stringify(prizeNames));
    console.log("Prize names saved:", prizeNames);
  }

  getPrizeName(position) {
    const savedNames = JSON.parse(
      localStorage.getItem("customPrizeNames") || "[]",
    );
    const sortOrder = localStorage.getItem("prizeNameSortOrder");

    let names = [...savedNames];
    if (sortOrder === "asc") {
      names.sort((a, b) => a.localeCompare(b, "vi"));
    } else if (sortOrder === "desc") {
      names.sort((a, b) => b.localeCompare(a, "vi"));
    }

    if (names.length > 0 && position > 0 && position <= names.length) {
      return names[position - 1];
    }

    // Fallback
    if (position === 1) return "Giải Nhất";
    if (position === 2) return "Giải Nhì";
    if (position === 3) return "Giải Ba";
    return `Giải ${position}`;
  }

  loadPrizeNames() {
    const savedNames = JSON.parse(
      localStorage.getItem("customPrizeNames") || "[]",
    );
    const container = document.getElementById("prizeNamesContainer");

    if (!container) return;

    container.innerHTML = "";

    if (savedNames.length === 0) {
      for (let i = 1; i <= 3; i++) {
        const div = document.createElement("div");
        div.style.marginBottom = "8px";
        div.innerHTML = `
          <input 
            type="text" 
            id="prizeName${i}"
            placeholder="Position ${i} Prize Name"
            value=""
            style="width: calc(100% - 40px); padding: 6px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #fff;"
          >
          <button onclick="game.prizeManager.removePrizeNameField('prizeName${i}')" style="margin-left: 4px; padding: 6px 10px; background: #e74c3c; border: none; border-radius: 4px; color: #fff; cursor: pointer;">✕</button>
        `;
        container.appendChild(div);
      }
      return;
    }

    savedNames.forEach((name, index) => {
      const i = index + 1;
      const div = document.createElement("div");
      div.style.marginBottom = "8px";
      div.innerHTML = `
        <input 
          type="text" 
          id="prizeName${i}"
          placeholder="Position ${i} Prize Name"
          value="${name}"
          style="width: calc(100% - 40px); padding: 6px; border: 1px solid #444; border-radius: 4px; background: #2a2a2a; color: #fff;"
        >
        <button onclick="game.prizeManager.removePrizeNameField('prizeName${i}')" style="margin-left: 4px; padding: 6px 10px; background: #e74c3c; border: none; border-radius: 4px; color: #fff; cursor: pointer;">✕</button>
      `;
      container.appendChild(div);
    });
  }

  // Race Prize List Management
  addRacePrizeField() {
    this.prizeRaceList.push(`Giải mới ${this.prizeRaceList.length + 1}`);
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    this.renderPrizeRaceUI();
  }

  renderPrizeRaceUI() {
    const container = document.getElementById("prizeRaceList");
    if (!container) return;

    if (this.prizeRaceList.length === 0) {
      container.innerHTML = '<i style="color: #888;">Chưa có giải nào...</i>';
      return;
    }

    container.innerHTML = this.prizeRaceList
      .map((prize, index) => {
        const isUsed = index < this.usedPrizesCount;
        const opacity = isUsed ? "opacity: 0.5;" : "";
        const status = isUsed
          ? `<span style="color: #2ecc71;">✓ Đã trao</span>`
          : `<span style="color: #888;">○ Chưa trao</span>`;

        return `
          <div style="${opacity} display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #333;">
            <input 
              type="text" 
              value="${prize}" 
              onchange="game.prizeManager.updateRacePrize(${index}, this.value)"
              ${isUsed ? "disabled" : ""}
              style="flex: 1; padding: 6px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: ${isUsed ? "#888" : "#fff"};"
            />
            <span style="min-width: 80px; font-size: 12px;">${status}</span>
            <button 
              onclick="game.prizeManager.removeRacePrize(${index})" 
              ${isUsed ? "disabled" : ""}
              style="padding: 6px 10px; background: ${isUsed ? "#555" : "#e74c3c"}; border: none; border-radius: 4px; color: #fff; cursor: ${isUsed ? "not-allowed" : "pointer"};"
            >✕</button>
          </div>
        `;
      })
      .join("");
  }

  addBulkRacePrize() {
    const nameInput = document.getElementById("bulkPrizeName");
    const countInput = document.getElementById("bulkPrizeCount");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const count = parseInt(countInput.value);

    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!count || count < 1) {
      alert("Số lượng phải >= 1!");
      countInput.focus();
      return;
    }

    // Add N prizes
    for (let i = 0; i < count; i++) {
      this.prizeRaceList.push(prizeName);
    }

    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    this.renderPrizeRaceUI();

    // Clear inputs
    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    alert(
      `✓ Đã thêm ${count} giải "${prizeName}"!\nTổng số giải: ${this.prizeRaceList.length}`,
    );
  }

  updateRacePrize(index, newValue) {
    this.prizeRaceList[index] = newValue;
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
  }

  removeRacePrize(index) {
    if (index < this.usedPrizesCount) {
      alert("Không thể xóa giải đã trao!");
      return;
    }

    this.prizeRaceList.splice(index, 1);
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
    this.renderPrizeRaceUI();
  }

  savePrizeRaceList() {
    localStorage.setItem("prizeRaceList", JSON.stringify(this.prizeRaceList));
  }

  // Result Prize Assignments
  addResultAssignmentField() {
    this.prizeResultAssignments.push({ prizeName: "", winnerId: null });
    this.renderPrizeAssignmentUI();
  }

  addBulkResultAssignments() {
    const count = parseInt(prompt("Nhập số lượng giải cần thêm:", "3"));
    if (!count || count < 1) return;

    for (let i = 0; i < count; i++) {
      this.prizeResultAssignments.push({
        prizeName: `Giải ${this.prizeResultAssignments.length + 1}`,
        winnerId: null,
      });
    }

    this.renderPrizeAssignmentUI();
    alert(`✓ Đã thêm ${count} giải!`);
  }

  clearResultAssignments() {
    if (!confirm("Xóa toàn bộ assignments?")) return;

    this.prizeResultAssignments = [];
    localStorage.removeItem("prizeResultAssignments");
    this.renderPrizeAssignmentUI();
    alert("✓ Đã xóa toàn bộ!");
  }

  renderPrizeAssignmentUI(winners = null) {
    const container = document.getElementById("prizeAssignmentList");
    if (!container) return;

    // Auto-add assignments to match number of winners if provided
    if (
      winners &&
      winners.length > 0 &&
      this.prizeResultAssignments.length < winners.length
    ) {
      while (this.prizeResultAssignments.length < winners.length) {
        const index = this.prizeResultAssignments.length;
        this.prizeResultAssignments.push({
          prizeName: this.prizeRaceList[index] || `Giải ${index + 1}`,
          winnerId: null,
        });
      }
    }

    if (this.prizeResultAssignments.length === 0) {
      container.innerHTML =
        '<i style="color: #888;">Chưa có assignment nào...</i>';
      return;
    }

    // Get winner list for dropdown (from parent Game instance if available)
    const winnersList = winners || (window.game ? window.game.winners : []);

    container.innerHTML = this.prizeResultAssignments
      .map((assign, index) => {
        // Auto-update prize name from prizeRaceList if available
        if (
          this.prizeRaceList[index] &&
          this.prizeRaceList[index] !== assign.prizeName
        ) {
          assign.prizeName = this.prizeRaceList[index];
        }

        const winnerOptions = winnersList
          .map((w) => {
            const selected = w.id == assign.winnerId ? "selected" : "";
            const displayName = `${w.code ? w.code + " - " : ""}${w.name}`;
            return `<option value="${w.id}" ${selected}>${displayName}</option>`;
          })
          .join("");

        return `
          <div style="display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid #333; align-items: center;">
            <span style="min-width: 30px; color: #ffd700;">#${index + 1}</span>
            <input 
              type="text" 
              value="${assign.prizeName}"
              onchange="game.prizeManager.prizeResultAssignments[${index}].prizeName = this.value; game.prizeManager.savePrizeResultAssignments();"
              placeholder="Tên giải"
              style="flex: 1; padding: 6px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: #fff;"
            />
            <select 
              onchange="game.prizeManager.prizeResultAssignments[${index}].winnerId = this.value; game.prizeManager.savePrizeResultAssignments();"
              style="flex: 1; padding: 6px; background: #1a1a1a; border: 1px solid #444; border-radius: 4px; color: #fff;"
            >
              <option value="">-- Chọn người thắng --</option>
              ${winnerOptions}
            </select>
            <button 
              onclick="game.prizeManager.removeResultAssignment(${index})"
              style="padding: 6px 10px; background: #e74c3c; border: none; border-radius: 4px; color: #fff; cursor: pointer;"
            >✕</button>
          </div>
        `;
      })
      .join("");

    // Save changes
    this.savePrizeResultAssignments();
  }

  removeResultAssignment(index) {
    this.prizeResultAssignments.splice(index, 1);
    this.savePrizeResultAssignments();
    this.renderPrizeAssignmentUI();
  }

  savePrizeResultAssignments() {
    localStorage.setItem(
      "prizeResultAssignments",
      JSON.stringify(this.prizeResultAssignments),
    );
  }

  // Race Scripts Management
  createRaceScript() {
    const nameInput = document.getElementById("raceScriptName");
    const countInput = document.getElementById("raceScriptWinners");

    if (!nameInput || !countInput) {
      alert("Không tìm thấy input!");
      return;
    }

    const prizeName = nameInput.value.trim();
    const winnerCount = parseInt(countInput.value);

    if (!prizeName) {
      alert("Vui lòng nhập tên giải!");
      nameInput.focus();
      return;
    }

    if (!winnerCount || winnerCount < 1) {
      alert("Số người phải >= 1!");
      countInput.focus();
      return;
    }

    const script = {
      id: Date.now(),
      prizeName,
      winnerCount,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    this.raceScripts.push(script);
    localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));
    this.renderRaceScripts();

    nameInput.value = "";
    countInput.value = "1";
    nameInput.focus();

    console.log("✓ Created race script:", script);
  }

  renderRaceScripts() {
    const container = document.getElementById("raceScriptsList");
    if (!container) return;

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

    this.raceScripts.forEach((script) => {
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
              onclick="game.startRaceWithScript(${script.id})" 
              style="
                background: ${isCompleted ? "#95a5a6" : isRunning ? "#e67e22" : "#27ae60"};
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 5px;
                cursor: ${isCompleted || isRunning ? "not-allowed" : "pointer"};
                font-size: 13px;
                font-weight: bold;
              "
              ${isCompleted || isRunning ? "disabled" : ""}
            >
              ${isCompleted ? "✓ Done" : isRunning ? "Running..." : "▶ START"}
            </button>
            <button 
              onclick="game.prizeManager.deleteRaceScript(${script.id})" 
              style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size: 16px;"
              ${isRunning ? 'disabled title="Không thể xóa script đang chạy"' : ""}
            >✕</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
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
      this.renderRaceScripts();
      console.log(`✓ Marked script as completed:`, script);
    }
  }

  getScriptById(scriptId) {
    return this.raceScripts.find((s) => s.id === scriptId);
  }

  updateScriptStatus(scriptId, status) {
    const script = this.raceScripts.find((s) => s.id === scriptId);
    if (script) {
      script.status = status;
      if (status === "running") {
        script.startedAt = new Date().toISOString();
      }
      localStorage.setItem("raceScripts", JSON.stringify(this.raceScripts));
      this.renderRaceScripts();
    }
  }

  // Utility: Reset prize counter
  resetUsedPrizesCount() {
    this.usedPrizesCount = 0;
    localStorage.setItem("usedPrizesCount", "0");
    this.renderPrizeRaceUI();
  }

  incrementUsedPrizes(count = 1) {
    this.usedPrizesCount += count;
    localStorage.setItem("usedPrizesCount", this.usedPrizesCount.toString());
  }
}

/**
 * FileManager Module
 *
 * Manages CSV/Excel file loading for racer names and codes
 * - Load and parse CSV/Excel files
 * - Save/load data from localStorage
 * - Update file status UI
 * - Clear loaded file data
 */

export class FileManager {
  constructor(game) {
    this.game = game;
  }

  // ==================== File Loading ====================

  loadDuckNames(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop().toLowerCase();

    if (fileExt === "xlsx" || fileExt === "xls") {
      this.loadExcelFile(file);
    } else {
      this.loadCSVFile(file);
    }
  }

  loadExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        this.game.duckNames = [];
        this.game.duckCodes = [];

        // Bỏ qua header (dòng 0), đọc từ dòng 1
        // Cột 0: STT, Cột 1: Mã NV, Cột 2: Họ và tên
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length >= 3 && row[1] && row[2]) {
            const code = String(row[1]).trim();
            const name = String(row[2]).trim();
            if (code && name) {
              this.game.duckNames.push(name);
              this.game.duckCodes.push(code);
              console.log(`Loaded row ${i}: Code=${code}, Name=${name}`);
            }
          }
        }

        this.finalizeLoad(file.name);
      } catch (error) {
        console.error("Error reading Excel:", error);
        alert("Lỗi khi đọc file Excel: " + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  loadCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");

      this.game.duckNames = [];
      this.game.duckCodes = [];

      // Cột 0: STT, Cột 1: Mã NV, Cột 2: Họ và tên
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const columns = line.split(",");
        if (columns.length >= 3) {
          const code = columns[1].trim();
          const name = columns[2].trim();
          if (code && name) {
            this.game.duckNames.push(name);
            this.game.duckCodes.push(code);
          }
        }
      }

      this.finalizeLoad(file.name);
    };

    // Chỉ định encoding UTF-8 để đọc tiếng Việt đúng
    reader.readAsText(file, "UTF-8");
  }

  finalizeLoad(fileName) {
    if (this.game.duckNames.length > 0) {
      this.game.activeDuckNames = [...this.game.duckNames];
      this.game.activeDuckCodes = [...this.game.duckCodes];

      if (this.game.winners.length > 0) {
        const winnerNames = this.game.winners.map((w) => w.name);
        const filteredData = this.game.duckNames
          .map((name, index) => ({ name, code: this.game.duckCodes[index] }))
          .filter((item) => !winnerNames.includes(item.name));
        this.game.activeDuckNames = filteredData.map((item) => item.name);
        this.game.activeDuckCodes = filteredData.map((item) => item.code);
      }

      // Save to localStorage for persistence
      localStorage.setItem("duckNames", JSON.stringify(this.game.duckNames));
      localStorage.setItem("duckCodes", JSON.stringify(this.game.duckCodes));
      localStorage.setItem("excelFileName", fileName);

      document.getElementById("duckCount").value = this.game.duckNames.length;
      alert(`Đã tải ${this.game.duckNames.length} tên từ file!`);

      // Update file status UI
      this.updateFileStatus(fileName);
    } else {
      alert("Không đọc được tên từ file.");
    }
  }

  // ==================== Load Saved Data ====================

  loadSavedData() {
    try {
      const savedNames = localStorage.getItem("duckNames");
      const savedCodes = localStorage.getItem("duckCodes");
      const savedFileName = localStorage.getItem("excelFileName");

      if (savedNames && savedCodes) {
        this.game.duckNames = JSON.parse(savedNames);
        this.game.duckCodes = JSON.parse(savedCodes);
        this.game.activeDuckNames = [...this.game.duckNames];
        this.game.activeDuckCodes = [...this.game.duckCodes];

        // Filter out winners if any exist
        if (this.game.winners.length > 0) {
          const winnerNames = this.game.winners.map((w) => w.name);
          const filteredData = this.game.duckNames
            .map((name, index) => ({ name, code: this.game.duckCodes[index] }))
            .filter((item) => !winnerNames.includes(item.name));
          this.game.activeDuckNames = filteredData.map((item) => item.name);
          this.game.activeDuckCodes = filteredData.map((item) => item.code);
        }

        document.getElementById("duckCount").value = this.game.duckNames.length;
        console.log(
          `✓ Restored ${this.game.duckNames.length} names from localStorage${savedFileName ? ` (${savedFileName})` : ""}`,
        );

        // Show notification and clear button
        this.updateFileStatus(savedFileName);
      }
    } catch (e) {
      console.error("Error loading saved data:", e);
    }
  }

  // ==================== UI Updates ====================

  updateFileStatus(fileName) {
    const fileLabel = document.getElementById("fileLabel");
    const clearBtn = document.getElementById("clearFileBtn");
    const fileHelp = document.getElementById("fileHelp");

    if (fileName && this.game.duckNames.length > 0) {
      if (fileLabel)
        fileLabel.innerHTML = `Racer List File <span style="color: #4CAF50;">(✓ Loaded: ${fileName})</span>:`;
      if (clearBtn) clearBtn.style.display = "inline-block";
      if (fileHelp)
        fileHelp.innerHTML = `<span style="color: #4CAF50;">✓ Using ${this.game.duckNames.length} names from file. Click Clear to use random names instead.</span>`;
    } else {
      if (fileLabel) fileLabel.textContent = "Racer List File (CSV/Excel):";
      if (clearBtn) clearBtn.style.display = "none";
      if (fileHelp)
        fileHelp.innerHTML =
          "Upload CSV/Excel to use custom names, or leave empty for random names";
    }
  }

  // ==================== Clear File Data ====================

  clearLoadedFile() {
    if (
      !confirm(
        "Clear loaded file and use random names?\n\nThis will remove all custom names and codes.",
      )
    ) {
      return;
    }

    // Clear data
    this.game.duckNames = [];
    this.game.duckCodes = [];
    this.game.activeDuckNames = [];
    this.game.activeDuckCodes = [];

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
}

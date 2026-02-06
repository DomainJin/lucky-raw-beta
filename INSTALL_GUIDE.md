# Lucky Racer - Installation Guide for Fresh Computers

This guide helps you set up Lucky Racer on a computer that doesn't have any programming tools installed yet.

## 🎯 Quick Answer: What Do I Need?

You need **ONE** of these (choose the easiest for you):

### ✅ Option 1: Node.js (RECOMMENDED - Easiest!)

**Why choose Node.js:**

- ✅ Smaller download (~50 MB)
- ✅ Faster installation
- ✅ More common on modern computers
- ✅ Auto-opens browser

**Download:** https://nodejs.org/

- Click the big green **"LTS"** button
- Run the installer
- Keep all default settings (just click "Next")
- Restart your computer after installation

### ✅ Option 2: Python 3

**Why choose Python:**

- ✅ Simple and reliable
- ✅ Built into Mac/Linux (but not Windows)

**Download:** https://www.python.org/downloads/

- Click **"Download Python 3.x.x"**
- **IMPORTANT:** During installation, check the box:
  - ☑️ **"Add Python to PATH"** ← This is critical!
- Click "Install Now"
- Restart your computer after installation

---

## 📦 Full Setup Steps

### Step 1: Extract the Game Files

1. Copy the `lucky-raw-beta` folder to your computer
   - You can put it anywhere (Desktop, Documents, etc.)
2. Make sure all files are extracted (not inside a ZIP)

### Step 2: Install Node.js or Python

Choose one option above and install it.

### Step 3: Run the Game

**Windows:**

1. Open the `lucky-raw-beta` folder
2. **Double-click** `start.bat`
3. A black window will open with the server running
4. Your browser should automatically open to the game
5. If browser doesn't open, go to: http://localhost:8000

**Mac/Linux:**

1. Open Terminal
2. Navigate to the folder:
   ```bash
   cd /path/to/lucky-raw-beta
   ```
3. Run the launcher:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
4. Browser should open automatically
5. If not, open browser to: http://localhost:8000

---

## 🔧 Troubleshooting

### "Nothing happens when I double-click start.bat"

**Solution:**

- Right-click `start.bat` → **"Run as administrator"**
- If you see an error about Node.js or Python not found:
  - Make sure you installed one of them
  - Restart your computer after installation
  - Try running `start.bat` again

### "I installed Python but still get an error"

**Common cause:** You didn't check "Add Python to PATH" during installation.

**Solution:**

1. Uninstall Python (Windows Settings → Apps)
2. Download Python again
3. During installation, **CHECK THE BOX**: "Add Python to PATH"
4. Install again
5. Restart computer

### "Server starts but browser shows error"

**Solution:**

- Wait 5 seconds and refresh the page
- Make sure your antivirus isn't blocking the connection
- Try a different browser (Chrome, Firefox, Edge)

### "Port 8000 is already in use"

**Solution:**

1. Open `server.js` with Notepad
2. Change line 6: `const PORT = 8000;`
   - Change to: `const PORT = 3000;` (or any other number)
3. Save the file
4. Run `start.bat` again

---

## 📱 Alternative Methods

### Method A: Use Node.js Directly

If `start.bat` doesn't work, you can run manually:

```bash
node server.js
```

Then open browser to: http://localhost:8000

### Method B: Use Python Directly

```bash
python -m http.server 8000
```

Then open browser to: http://localhost:8000

### Method C: Manual Package Install (Advanced)

If Node.js is installed but `node` command doesn't work:

```bash
npm install -g http-server
http-server -p 8000
```

---

## 💾 Installation Downloads

### Node.js

- **Windows:** https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
- **Mac:** https://nodejs.org/dist/v20.11.0/node-v20.11.0.pkg
- **Linux:** https://nodejs.org/en/download/package-manager

### Python

- **Windows:** https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe
- **Mac:** Pre-installed! (or use Homebrew: `brew install python3`)
- **Linux:** Pre-installed! (or: `sudo apt install python3`)

---

## ✅ Verification Checklist

Before running the game, verify your installation:

**For Node.js users:**

1. Open Command Prompt/Terminal
2. Type: `node --version`
3. Should show: `v20.x.x` or similar
4. ✅ If you see a version number, you're good!

**For Python users:**

1. Open Command Prompt/Terminal
2. Type: `python --version`
3. Should show: `Python 3.x.x`
4. ✅ If you see a version number, you're good!

---

## 🎮 After Installation

Once the server is running:

1. **Main control panel:** Already open (index.html)
2. **Full-screen display:** Click "🎨 Open Display" button
3. **Load racers:** Click "📂 Choose XLSX/CSV File"
4. **Start racing:** Click "▶️ START!" button

See `README_OFFLINE.md` for full game instructions.

---

## 🆘 Still Having Problems?

### Check these common issues:

1. **Antivirus blocking:**
   - Add `lucky-raw-beta` folder to antivirus exceptions
2. **Windows SmartScreen:**
   - Click "More info" → "Run anyway" if Windows blocks start.bat

3. **File permissions:**
   - Right-click folder → Properties → Security
   - Make sure your user has "Full control"

4. **Corrupted download:**
   - Re-download the lucky-raw-beta folder
   - Extract again to a new location

---

## 📚 More Help

- **Full documentation:** See `README_OFFLINE.md`
- **Quick start:** See `QUICKSTART.md`
- **Technical details:** See `ARCHITECTURE.md`

---

## 🎉 You're Ready!

Once you see the server running in the terminal:

```
==========================================
  Lucky Racer - Server Running
==========================================

Server running at http://localhost:8000/

Press Ctrl+C to stop the server
==========================================
```

**You're all set!** Open http://localhost:8000 in your browser and start racing! 🏁🎮

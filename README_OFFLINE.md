# Lucky Racer - Offline Version

This is the offline-ready version of Lucky Racer that can run on any computer without internet connection (except for the initial Python installation if needed).

## 🎯 What's Changed

- ✅ **No login required** - Open and play immediately
- ✅ **No internet needed** - All resources are local
- ✅ **Removed Google Sheets authentication** - Simplified for offline use
- ✅ **Local SheetJS library** - Excel/CSV file loading works offline
- ✅ **Portable** - Copy the entire folder to any computer

## 📋 Requirements

**ONE of the following:**

- **Python 3.x** (recommended) - Usually pre-installed on Mac/Linux
- **Node.js** (alternative) - If you prefer using npx http-server

**Browser:**

- Chrome 61+ / Firefox 60+ / Safari 11+ / Edge 16+
- ❌ Internet Explorer is NOT supported

## 🚀 Quick Start

### Windows

**Double-click:** `start.bat`

That's it! The game will automatically:

1. Start a local web server on port 8000
2. Open your browser to http://localhost:8000

### Mac / Linux

**Method 1 - Double-click (if file is executable):**

```bash
./start.sh
```

**Method 2 - Terminal:**

```bash
chmod +x start.sh
./start.sh
```

The launcher will automatically:

1. Start a local web server on port 8000
2. Try to open your browser to http://localhost:8000

### Manual Start (Any OS)

If the launchers don't work, you can start manually:

**With Python:**

```bash
python -m http.server 8000
# Or on some systems:
python3 -m http.server 8000
```

**With Node.js:**

```bash
npx http-server -p 8000
```

Then open your browser to: **http://localhost:8000**

## 📂 Folder Structure

```
lucky-raw-beta/
├── index.html              # Main control interface
├── display.html            # Full-screen race display
├── game.js                 # Main game logic
├── style.css               # Styling
├── start.bat               # Windows launcher
├── start.sh                # Mac/Linux launcher
├── lib/                    # Local libraries
│   └── xlsx.full.min.js   # SheetJS for Excel/CSV loading
├── src/                    # ES6 modules
│   ├── audio/             # Sound management
│   ├── entities/          # Duck/racer physics
│   ├── game/              # Game controllers
│   ├── ui/                # UI management
│   └── utils/             # Utilities
├── static/                 # Audio & images
│   ├── *.mp3              # Sound effects
│   └── *.png              # Background images
├── output/                 # Active racer icons
├── output_1/              # Alternative icon set (PNG)
├── output_2/              # Alternative icon set (WebP)
├── output_3/              # Alternative icon set (WebP)
└── output_3_ngựa/         # Horse theme icons (WebP)
```

## 🎮 How to Use

### Basic Workflow

1. **Start the server** (see Quick Start above)
2. **Open** http://localhost:8000 in your browser
3. **Load racer names** - Click "📂 Choose XLSX/CSV File" and select your Excel/CSV file
4. **Configure race settings** - Number of racers, speed, etc.
5. **Optional: Create prize scripts** - Set up winners for different rounds
6. **Click "▶️ START!"** to begin the race
7. **Optional: Open display window** - Click "🎨 Open Display" for full-screen view

### Opening Display Window

The display window shows the race in full-screen mode without controls:

1. Click **"🎨 Open Display"** button
2. A new browser tab will open with just the race track
3. Control the race from the main window (index.html)
4. Display window automatically syncs via BroadcastChannel API

### Loading Racer Names

**Supported formats:**

- Excel files (.xlsx, .xls)
- CSV files (.csv)

**File structure:**

- One name per row
- Can have multiple columns (only first column used)
- First row can be header (will be ignored if it looks like a header)

### Creating Race Scripts

"Race Scripts" let you pre-configure multiple races with different prize levels:

1. Enter prize name (e.g., "Giải Nhất" = First Prize)
2. Enter number of winners (e.g., 1)
3. Click **"➕ Add Script"**
4. Repeat for multiple prize levels
5. Click **"🎯 Run All Scripts"** to auto-run all races

Each race will:

- Pick the specified number of winners
- Remove them from the pool
- Automatically start the next race

## 🎵 Audio Settings

The game uses three audio files:

- `static/start.mp3` - Plays when race starts
- `static/race.mp3` - Plays during the race (30 seconds)
- `static/end.mp3` - Plays when race finishes

You can replace these files with your own sounds (keep the same filenames).

## 🎨 Customization

### Change Background Images

Replace files in `static/` folder:

- `background.png` - Main track background
- `lucky.png` - Results panel background
- `race.png`, `race-1.png`, etc. - Alternative backgrounds

### Change Racer Icons

The game supports multiple icon sets in different folders:

- `output/` - Current active set
- `output_1/` - PNG icons (30 icons)
- `output_2/` - WebP animations (5 sets)
- `output_3/` - WebP animations (12 sets)
- `output_3_ngựa/` - Horse theme (21 sets)

To change icon set, modify `game.js` around line 3359 where it loads icons.

### Edit Colors & Styles

Modify `style.css` to change:

- Colors, fonts, sizes
- Button styles
- Panel layouts
- Animations

## ⚙️ Technical Notes

### Why HTTP Server Required?

The game uses **ES6 JavaScript modules** which require HTTP/HTTPS protocol. They cannot load from `file://` URLs due to browser security restrictions.

### Port Already in Use?

If port 8000 is occupied:

**Windows:**

```batch
start.bat
```

Then edit the script and change `8000` to another port like `8080` or `3000`.

**Mac/Linux:**

```bash
python3 -m http.server 3000
```

Then open http://localhost:3000

### Browser Compatibility

**Required features:**

- ES6 Modules
- Web Audio API
- BroadcastChannel API (for display sync)
- Canvas API
- Web Workers

**Tested on:**

- ✅ Chrome 100+
- ✅ Firefox 95+
- ✅ Safari 15+
- ✅ Edge 100+

## 🐛 Troubleshooting

### "Failed to load module script" error

**Cause:** Opened index.html directly with `file://` protocol.

**Solution:** Use HTTP server (see Quick Start).

### Icons not loading / Blank ducks

**Cause:** Icon files missing or path incorrect.

**Solution:**

1. Verify `output/` folder contains icon files
2. Check browser console for 404 errors
3. Ensure icon filenames match expected format

### Display window not syncing

**Cause:** BroadcastChannel API not supported or different origin.

**Solution:**

1. Make sure both windows use the same URL (same port)
2. Try Chrome/Firefox (better BroadcastChannel support)
3. Disable browser extensions that might block cross-tab communication

### Audio not playing

**Cause:** Browser autoplay policy.

**Solution:**

1. Click anywhere on the page first (user interaction required)
2. Check browser allows audio autoplay
3. Verify audio files exist in `static/` folder

### Python not found

**Windows:**

```
Download from: https://www.python.org/downloads/
✅ Check "Add Python to PATH" during installation
```

**Mac:**

```bash
brew install python3
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install python3
```

## 📦 Distributing to Other Computers

### Option 1: Copy Entire Folder

1. Copy the entire `lucky-raw-beta/` folder
2. Transfer via USB drive, network share, or cloud storage
3. On target computer, run `start.bat` (Windows) or `start.sh` (Mac/Linux)

### Option 2: Create ZIP Archive

1. Right-click folder → Send to → Compressed (zipped) folder
2. Share the ZIP file
3. Extract on target computer
4. Run launcher script

### Option 3: Network Share

If computers are on the same network:

1. Start server on one computer
2. Find computer's IP address:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. Other computers open: `http://<IP-ADDRESS>:8000`

**Example:** `http://192.168.1.100:8000`

## 🔒 Security Notes

- This version has **NO authentication** - anyone who can access the HTTP server can use the game
- Suitable for offline environments, LAN parties, or trusted networks
- For online deployment, consider adding authentication back

## 📚 Additional Documentation

- `README.md` - Main project documentation
- `QUICKSTART.md` - Quick start guide
- `ARCHITECTURE.md` - Code architecture overview
- `MODULES.md` - Module structure details
- `PHASE1_SUMMARY.md` - Phase 1 development summary

## 💡 Tips

1. **Test before the event** - Run a full test race to ensure everything works
2. **Close other apps** - Free up system resources for smooth animation
3. **Use Chrome/Firefox** - Best performance and compatibility
4. **Full-screen display** - Press F11 in display window for true full-screen
5. **Backup racer list** - Keep a copy of your Excel/CSV file
6. **Prepare playlists** - Replace audio files with your preferred sounds before the event

## 🎯 Quick Reference Card

| Action         | Button/File               |
| -------------- | ------------------------- |
| Start Server   | `start.bat` or `start.sh` |
| Main Control   | http://localhost:8000     |
| Display Screen | Click "🎨 Open Display"   |
| Load Names     | "📂 Choose XLSX/CSV File" |
| Start Race     | "▶️ START!" button        |
| Reset Race     | "🔄 RESET" button         |
| View Results   | Automatic after race ends |

## ✨ Enjoy Your Offline Lucky Racer!

For questions or issues, check the troubleshooting section or review the main documentation files.

**Have fun! 🎉🏁🎮**

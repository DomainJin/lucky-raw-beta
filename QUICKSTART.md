# Quick Start Guide - Modular Architecture

## 🚀 Getting Started

### For Regular Users

**Nothing has changed!** The game works exactly as before:

1. Open `index.html` in your browser
2. Use the game normally
3. All features work the same

### For Developers

#### View the Module Structure

```bash
src/
├── audio/
│   └── SoundManager.js          # Sound management (393 lines)
├── entities/
│   └── Duck.js                  # Duck physics & animation (259 lines)
├── game/                        # (Future modules - Phase 2)
├── ui/                          # (Future modules - Phase 2)
└── utils/
    └── constants.js             # Constants & helpers (14 lines)
```

#### Import and Use Modules

**Option 1: Import in HTML**

```html
<script type="module">
  import { SoundManager } from "./src/audio/SoundManager.js";
  import { Duck } from "./src/entities/Duck.js";
  import { FINISH_LINE_OFFSET } from "./src/utils/constants.js";

  const sound = new SoundManager();
  sound.playStartSound();

  const duck = new Duck(1, 1000, "Test Duck");
</script>
```

**Option 2: Import in JavaScript file**

```javascript
// my-script.js
import { SoundManager } from "./src/audio/SoundManager.js";
import { Duck } from "./src/entities/Duck.js";

export class MyCustomGame {
  constructor() {
    this.sound = new SoundManager();
    this.ducks = [];
  }

  addDuck() {
    const duck = new Duck(this.ducks.length + 1, 1000);
    this.ducks.push(duck);
  }
}
```

#### Access Game Instance

```javascript
// Global instance still available
window.game.startRace();
window.game.soundManager.playBeep(440, 0.3, 0.5);
```

## 🧪 Testing

### Run Automated Tests

1. Open `test-modules.html` in browser
2. View automatic test results
3. Click test buttons for interactive tests

### Expected Results

- ✅ All tests should show green checkmarks
- ✅ No console errors
- ✅ Test log shows "success" messages

## 📚 Documentation

### Read First

1. **[PHASE1_SUMMARY.md](PHASE1_SUMMARY.md)** - What was done and why
2. **[MODULES.md](MODULES.md)** - Detailed module documentation
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Visual diagrams

### Module APIs

#### SoundManager

```javascript
const sound = new SoundManager();

// Play sounds
sound.playStartSound(); // Play start.mp3
sound.playFinishSound(); // Play end.mp3
sound.startRacingAmbiance(30); // Play race.mp3 (30s)
sound.stopRacingAmbiance(); // Stop race music

// Custom audio
await sound.loadAudioFile(file); // Load mp3/wav/ogg
sound.playCustomAudio(); // Play custom audio

// Enable/disable
sound.setEnabled(true); // Enable sounds
sound.setEnabled(false); // Mute all sounds
```

#### Duck

```javascript
const duck = new Duck(id, trackLength, name);

// Update physics (call every frame)
duck.update(time, rank, totalDucks, deltaTime, inSlowdownZone);

// Properties
duck.position; // Current position (pixels)
duck.speed; // Current speed
duck.finished; // Has crossed finish line
duck.finishTime; // Timestamp of finish
duck.currentFrame; // Animation frame (0-2)

// Methods
duck.getSpeedIndicator(); // Returns emoji: 🔥⚡💤
duck.randomizeSpeed(); // Reset to base speed
```

#### Constants

```javascript
import {
  FINISH_LINE_OFFSET,
  MINIMUM_PARTICIPANTS,
  safeElementAction,
} from "./src/utils/constants.js";

FINISH_LINE_OFFSET; // 75 pixels
MINIMUM_PARTICIPANTS; // 5 racers

safeElementAction("myElement", (el) => {
  el.style.color = "red"; // Only runs if element exists
});
```

## 🔧 Development Workflow

### Adding New Features

**Before (Old Way):**

```javascript
// Edit game.js (6890 lines)
// Find the right section
// Hope you don't break something else
```

**After (New Way):**

```javascript
// 1. Find the right module
import { SoundManager } from "./src/audio/SoundManager.js";

// 2. Edit only that module
// 3. Changes are isolated
// 4. Easier to test
```

### Extending a Module

**Example: Add new sound to SoundManager**

```javascript
// src/audio/SoundManager.js

export class SoundManager {
  // ... existing code ...

  // Add new method
  playVictoryFanfare() {
    if (!this.enabled || !this.initialized) return;

    // Your custom sound logic
    this.playBeep(1000, 0.3, 0.5);
    setTimeout(() => this.playBeep(1200, 0.3, 0.5), 500);
  }
}
```

Then use it:

```javascript
game.soundManager.playVictoryFanfare();
```

## 🐛 Troubleshooting

### Module not found error

```
Failed to resolve module specifier "src/audio/SoundManager.js"
```

**Solution:** Add `./` prefix:

```javascript
import { SoundManager } from "./src/audio/SoundManager.js";
//                              ^^ Don't forget this!
```

### CORS error

```
Access to script at 'file:///.../game.js' has been blocked by CORS policy
```

**Solution:** Use a web server:

```bash
# Python 3
python -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server

# VS Code extension
# Install "Live Server" extension and click "Go Live"
```

Then open `http://localhost:8000`

### Game doesn't work

**Check:**

1. ✅ Browser console for errors
2. ✅ Script tag has `type="module"`
3. ✅ Files served via HTTP (not file://)
4. ✅ Browser supports ES modules (Chrome 61+)

## 💡 Tips

### Development

- Use browser DevTools to set breakpoints in modules
- Each module can be tested independently
- Import only what you need

### Performance

- Modules are cached by browser
- No performance penalty vs single file
- Can add bundler later if needed

### Best Practices

- Keep modules focused (single responsibility)
- Export only what's needed (minimal API)
- Document your changes
- Test after modifying a module

## 🎓 Learning Resources

### ES6 Modules

- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [ES6 Modules Guide](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)

### Architecture Patterns

- Single Responsibility Principle
- Dependency Injection
- Module Pattern

## 📞 Support

### Issues

- Check `test-modules.html` for module status
- Review browser console for errors
- Read error messages carefully

### Debugging

```javascript
// Check if modules loaded
console.log(window.moduleTests);

// Test individual module
import { Duck } from "./src/entities/Duck.js";
const testDuck = new Duck(1, 1000);
console.log(testDuck);
```

## ✅ Checklist

Before deploying:

- [ ] All tests pass in `test-modules.html`
- [ ] No console errors
- [ ] Game functions normally
- [ ] Both control and display modes work
- [ ] Sounds play correctly
- [ ] Duck animation works

## 🎉 Success!

If you can:

1. ✅ Open the game
2. ✅ Start a race
3. ✅ Hear sounds
4. ✅ See ducks moving
5. ✅ See winner popup

**Then the modularization is working perfectly!** 🚀

---

**Happy coding!** 👨‍💻👩‍💻

For questions or issues, refer to the documentation files or create an issue in your repository.

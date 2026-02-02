# Module Architecture Documentation

## Overview

The Lucky Draw game has been refactored from a single monolithic `game.js` file (6890 lines) into a modular architecture using ES6 modules. This improves maintainability, testability, and code organization.

## Current Status

### Phase 1: Core Modules ✅ COMPLETED

The following independent modules have been extracted:

#### 1. Constants & Utilities (`src/utils/constants.js`)

- **Exports:**
  - `FINISH_LINE_OFFSET` - Distance from duck center to finish line (75px)
  - `MINIMUM_PARTICIPANTS` - Minimum racers required (5)
  - `safeElementAction(id, action)` - Safe DOM element access helper
- **Dependencies:** None
- **Status:** ✅ Extracted & Working

#### 2. Sound Management (`src/audio/SoundManager.js`)

- **Exports:** `SoundManager` class
- **Responsibilities:**
  - Audio context management
  - Loading static audio files (start.mp3, race.mp3, end.mp3)
  - Custom audio file loading (mp3/wav/ogg)
  - Base64 audio loading for BroadcastChannel sharing
  - Sound playback (start, race ambiance, finish, crowd cheer)
  - Procedural sound generation (beep, noise)
- **Dependencies:** None (uses Web Audio API)
- **Status:** ✅ Extracted & Working

#### 3. Physics & Entities (`src/entities/Duck.js`)

- **Exports:** `Duck` class
- **Responsibilities:**
  - Individual racer physics and movement
  - Speed variation with rubber-banding logic
  - Lane management and positioning
  - Animation frame management (3-frame sprite animation)
  - Particle effects during turbo boost
  - Finish line detection and deceleration
- **Dependencies:**
  - `FINISH_LINE_OFFSET` from `src/utils/constants.js`
- **Status:** ✅ Extracted & Working

### Phase 2: Planned Modules (Not Yet Implemented)

The following modules are planned for extraction in future phases:

#### 4. Prize Management (`src/game/PrizeManager.js`)

- **Planned Responsibilities:**
  - Prize configuration (add, remove, sort)
  - Race scripts management (create, delete, mark completed)
  - Result prize assignments
  - localStorage persistence for prizes
- **Estimated Lines:** ~1,032 lines
- **Dependencies:** `safeElementAction`
- **Status:** ⏳ Not Started

#### 5. Rendering Engine (`src/game/Renderer.js`)

- **Planned Responsibilities:**
  - Canvas rendering for large races (100+ ducks)
  - DOM rendering for standard races
  - Duck position updates
  - Background parallax rendering
  - Viewport culling optimization
- **Estimated Lines:** ~547 lines
- **Dependencies:** `Duck`, `FINISH_LINE_OFFSET`
- **Status:** ⏳ Not Started

#### 6. UI Management (`src/ui/UIManager.js`)

- **Planned Responsibilities:**
  - Result panel settings (aspect ratio, background)
  - Theme switching and icon management
  - File loading UI (Excel/CSV)
  - Settings panel management
- **Estimated Lines:** ~1,107 lines
- **Dependencies:** Multiple DOM elements
- **Status:** ⏳ Not Started

#### 7. History Manager (`src/ui/HistoryManager.js`)

- **Planned Responsibilities:**
  - Victory popups (single winner & Top N)
  - Results display
  - Winner history tracking
  - Stats management
- **Estimated Lines:** ~446 lines
- **Dependencies:** `safeElementAction`, DOM elements
- **Status:** ⏳ Not Started

#### 8. Race Controller (`src/game/RaceController.js`)

- **Planned Responsibilities:**
  - Race lifecycle (setup, start, pause, resume, end)
  - Main animation loop
  - Camera system (smooth scrolling, finish line reveal)
  - Lane conflict management near finish
  - Delta time normalization
- **Estimated Lines:** ~1,428 lines
- **Dependencies:** `Duck`, `SoundManager`, `Renderer`
- **Status:** ⏳ Not Started

#### 9. Display Synchronization (`src/game/DisplaySync.js`)

- **Planned Responsibilities:**
  - BroadcastChannel setup and management
  - Message handlers for control/display communication
  - Icon loading synchronization
  - Race state synchronization
- **Estimated Lines:** ~387 lines
- **Dependencies:** `SoundManager`
- **Status:** ⏳ Not Started

## File Structure

```
TheLuckyDraw-VisionX/
├── src/
│   ├── audio/
│   │   └── SoundManager.js          ✅ Extracted (393 lines)
│   ├── entities/
│   │   └── Duck.js                  ✅ Extracted (259 lines)
│   ├── game/
│   │   ├── PrizeManager.js          ⏳ Planned
│   │   ├── RaceController.js        ⏳ Planned
│   │   ├── Renderer.js              ⏳ Planned
│   │   └── DisplaySync.js           ⏳ Planned
│   ├── ui/
│   │   ├── UIManager.js             ⏳ Planned
│   │   └── HistoryManager.js        ⏳ Planned
│   └── utils/
│       └── constants.js             ✅ Extracted (14 lines)
├── game.js                          🔄 Main orchestrator (still contains all Game class logic)
├── index.html                       ✅ Updated to use ES modules
├── display.html                     ✅ Updated to use ES modules
└── MODULES.md                       📄 This file
```

## Usage

### Importing Modules

```javascript
// Import individual modules
import { SoundManager } from "./src/audio/SoundManager.js";
import { Duck } from "./src/entities/Duck.js";
import {
  FINISH_LINE_OFFSET,
  MINIMUM_PARTICIPANTS,
  safeElementAction,
} from "./src/utils/constants.js";

// Import main Game class
import { Game } from "./game.js";
```

### Browser Compatibility

The modular architecture uses ES6 modules, which require:

- Modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 16+)
- `type="module"` attribute on script tags
- HTTPS or localhost for CORS (cannot use `file://` protocol)

### HTML Integration

**index.html:**

```html
<script type="module" src="game.js?v=61"></script>
```

**display.html:**

```html
<script type="module" src="game.js?v=61"></script>
<script type="module">
  import { Game } from "./game.js?v=61";
  // ... initialization code
</script>
```

## Migration Strategy

### Completed Steps (Phase 1)

1. ✅ Created `src/` directory structure
2. ✅ Extracted `SoundManager` class to separate module
3. ✅ Extracted `Duck` class to separate module
4. ✅ Extracted constants and utilities to separate module
5. ✅ Updated `game.js` to import extracted modules
6. ✅ Updated `index.html` to use ES modules
7. ✅ Updated `display.html` to use ES modules
8. ✅ Maintained backward compatibility via global `window.game` instance

### Next Steps (Phase 2)

1. ⏳ Extract PrizeManager from Game class
2. ⏳ Extract Renderer from Game class
3. ⏳ Extract UIManager from Game class
4. ⏳ Extract HistoryManager from Game class
5. ⏳ Extract RaceController from Game class
6. ⏳ Extract DisplaySync from Game class
7. ⏳ Refactor Game class to become a thin orchestrator
8. ⏳ Add unit tests for each module
9. ⏳ Consider adding a build step (optional)

## Benefits

### Already Achieved

- ✅ **Separation of Concerns:** Sound logic isolated from game logic
- ✅ **Reusability:** SoundManager and Duck can be reused in other projects
- ✅ **Testability:** Individual modules can be unit tested
- ✅ **Code Organization:** Clear file structure with logical grouping
- ✅ **Maintainability:** Smaller files easier to understand and modify

### Future Benefits (Phase 2+)

- ⏳ **Reduced Coupling:** Game class will delegate to specialized managers
- ⏳ **Team Collaboration:** Multiple developers can work on different modules
- ⏳ **Performance:** Potential for lazy loading non-critical modules
- ⏳ **Build Optimization:** Tree-shaking and minification possible

## Backward Compatibility

The refactoring maintains 100% backward compatibility:

1. **Global Access:** `window.game` instance still available for inline HTML event handlers
2. **Same API:** All public methods remain unchanged
3. **No Breaking Changes:** Existing HTML/CSS continue to work without modification
4. **Progressive Enhancement:** Old code continues working while new modular code is gradually introduced

## Testing Checklist

### Phase 1 Testing

- ✅ Sound system works (start.mp3, race.mp3, end.mp3)
- ✅ Custom audio loading works
- ✅ Duck animation and movement work
- ✅ Race can start and finish
- ✅ Display mode synchronization works
- ⏳ All game features tested end-to-end

### Phase 2 Testing (Planned)

- ⏳ Prize management UI works
- ⏳ Race scripts function correctly
- ⏳ Result assignments display properly
- ⏳ Theme switching works
- ⏳ File loading (Excel/CSV) works
- ⏳ Victory popups display correctly
- ⏳ History tracking works
- ⏳ Canvas rendering works for large races
- ⏳ Web Workers physics simulation works

## Known Limitations

1. **Module Loading:** Requires a web server (cannot use `file://` protocol)
2. **Legacy Browser Support:** IE11 and older browsers not supported
3. **Partial Refactoring:** Game class still contains most logic (6,214 lines) - requires Phase 2
4. **No Build Process:** Currently using raw ES modules (could add bundler later)

## Future Considerations

1. **TypeScript Migration:** Consider adding TypeScript for type safety
2. **Build Tooling:** Add Vite or Webpack for production optimization
3. **Testing Framework:** Add Jest or Vitest for unit tests
4. **Documentation:** Add JSDoc comments to all modules
5. **Performance Monitoring:** Add metrics to track module loading performance

## Version History

- **v61** (2026-02-02): Initial modularization - extracted SoundManager, Duck, and constants
- **v60**: Previous monolithic version (6890 lines in single file)

---

**Last Updated:** February 2, 2026  
**Status:** Phase 1 Complete, Phase 2 Planned

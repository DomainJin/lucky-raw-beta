# Module Architecture Diagram

## Current Structure (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                               │
│                         display.html                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │ type="module"
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         game.js                                  │
│                    (Main Orchestrator)                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Game Class (6,214 lines)                       │ │
│  │  - Race lifecycle management                                │ │
│  │  - Prize management (to be extracted)                       │ │
│  │  - UI management (to be extracted)                          │ │
│  │  - Rendering (to be extracted)                              │ │
│  │  - Display sync (to be extracted)                           │ │
│  │  - History management (to be extracted)                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Imports:                                                        │
│  ├─ SoundManager from src/audio/SoundManager.js                │
│  ├─ Duck from src/entities/Duck.js                             │
│  └─ constants from src/utils/constants.js                      │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   src/audio/ │ │src/entities│ │  src/utils/  │
│              │ │            │ │              │
│ SoundManager │ │    Duck    │ │  constants   │
│   (393 L)    │ │  (259 L)   │ │   (14 L)     │
└──────────────┘ └──────────┘ └──────────────┘
```

## Target Structure (Phase 2 - Planned)

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html & display.html                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         game.js                                  │
│                    (Thin Orchestrator)                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Game Class (~500 lines)                        │ │
│  │  - Dependency injection                                     │ │
│  │  - Module coordination                                      │ │
│  │  - Event delegation                                         │ │
│  │  - State management                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Imports & Composes:                                             │
│  ├─ SoundManager (audio)                                        │
│  ├─ Duck (entities)                                             │
│  ├─ PrizeManager (game)                                         │
│  ├─ RaceController (game)                                       │
│  ├─ Renderer (game)                                             │
│  ├─ DisplaySync (game)                                          │
│  ├─ UIManager (ui)                                              │
│  ├─ HistoryManager (ui)                                         │
│  └─ constants (utils)                                           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬─────────────┬─────────────┐
        │              │              │             │             │
        ▼              ▼              ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
│   src/audio/ │ │src/entities│ │  src/game/  │ │ src/ui/  │ │src/utils/│
│              │ │            │ │             │ │          │ │          │
│ SoundManager │ │    Duck    │ │PrizeManager │ │UIManager │ │constants │
│   ✅ Done    │ │  ✅ Done   │ │             │ │          │ │ ✅ Done  │
│              │ │            │ │RaceController│ │ History  │ │          │
│              │ │            │ │             │ │ Manager  │ │          │
│              │ │            │ │  Renderer   │ │          │ │          │
│              │ │            │ │             │ │          │ │          │
│              │ │            │ │ DisplaySync │ │          │ │          │
└──────────────┘ └──────────┘ └─────────────┘ └──────────┘ └──────────┘
```

## Module Dependencies (Planned)

```
                         constants.js
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │                   │
                SoundManager.js      Duck.js
                    ▲                   ▲
                    │                   │
        ┌───────────┼───────────────────┼───────────┐
        │           │                   │           │
        │           │                   │           │
   Renderer.js  DisplaySync.js  RaceController.js  │
        ▲           ▲                   ▲           │
        │           │                   │           │
        └───────────┴─────────┬─────────┴───────────┘
                              │
                              │
                    ┌─────────┴─────────┐
                    │                   │
              UIManager.js      HistoryManager.js
                    ▲                   ▲
                    │                   │
                    └─────────┬─────────┘
                              │
                        PrizeManager.js
                              ▲
                              │
                           Game.js
                              ▲
                              │
                      index.html/display.html
```

## Data Flow

```
User Interaction (HTML)
         │
         ▼
    Game Class
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
   RaceController ◄──► DisplaySync      UIManager
         │                   │                 │
         ├───────┐           │                 │
         ▼       ▼           ▼                 ▼
     Renderer  Duck     BroadcastChannel  HistoryManager
         │       │           │                 │
         ▼       ▼           ▼                 ▼
    Canvas/DOM  Physics   display.html   Results Panel
                 │
                 ▼
           SoundManager
                 │
                 ▼
             Web Audio API
```

## Key Principles

1. **Single Responsibility:** Each module has one clear purpose
2. **Dependency Injection:** Game class injects dependencies
3. **Interface Segregation:** Modules expose minimal public APIs
4. **Loose Coupling:** Modules communicate through well-defined interfaces
5. **High Cohesion:** Related functionality grouped together

## Legend

- ✅ = Implemented & Working
- ⏳ = Planned but not implemented
- ▲ = Depends on
- ◄──► = Bidirectional communication
- → = Unidirectional data flow

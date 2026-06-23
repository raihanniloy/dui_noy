# 29 (dui_noy)

The 29 card game (Bengali/South Asian trick-taking game) — 1 human vs 3 bots, built for web and Android from one TypeScript codebase.

Architecture: a pure, headless game engine (reducer + seeded RNG, fully replayable) with heuristic bots layered on top. The UI (Phaser 3) and packaging (Capacitor) are later phases.

## Status

| Phase | What | State |
|-------|------|-------|
| Plan 1 | Headless engine — deck, bidding, trump, tricks, scoring, state machine | ✅ Done |
| Plan 2 | Heuristic bots (easy/hard) + bot-vs-bot simulator | ✅ Done |
| Plan 3 | Phaser UI (Boot/Menu/Table scenes, GameClient) | ✅ Done |
| Plan 4 | Capacitor Android + web packaging | ✅ Done |
| Plan 5 | DOM UI flow (Cupertino redesign) — 8 core screens | ✅ Done |

The game is fully playable on web and Android. Run `npm run dev` and open the printed URL. `src/main.ts` boots a Phaser **table** scene (the live card play) beneath a DOM **overlay layer** (`src/ui/dom/`) that renders the Cupertino-styled menus and dialogs: splash → menu → setup → bidding → trump → table → round summary → game over. `UIController` (`src/ui/dom/UIController.ts`) owns the turn loop and bridges the engine, the DOM screens, and the Phaser table. See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the design and implementation plans.

## Requirements

- Node.js 20+ and npm

## Setup

```bash
npm install
```

## Commands

```bash
npm test              # run the test suite in watch mode (vitest)
npm run test:run      # run the full suite once (106 tests)
npm run build         # type-check (tsc --noEmit) then production build (vite build)
npm run dev           # start the Vite dev server (Phaser app: Boot → Menu → Table)
```

### Heavy bot simulation

The bot-vs-bot simulator runs 200 full games by default. Raise the count with `SIM_GAMES`:

```bash
SIM_GAMES=1000 npx vitest run tests/engine/simulate-bots.test.ts
```

## Android build (debug APK)

One-time setup:
- Install a JDK 17+ and export `JAVA_HOME`.
- Install the Android SDK (Android Studio or command-line tools) and export
  `ANDROID_HOME` (or `ANDROID_SDK_ROOT`); accept SDK licenses with `sdkmanager --licenses`.
- Verify: `npm run check:android` (prints "Android environment OK").

Build and run:
```bash
npm run build:android                       # check env, build web, sync into android/
cd android && ./gradlew assembleDebug       # -> app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

The app locks to portrait, runs fullscreen, and maps the hardware back button
(in-game → menu, menu → exit). Launcher icon and splash are generated from
`resources/icon.png` / `resources/splash.png` via `npx capacitor-assets generate --android`.

## Project layout

```
src/
  engine/        # pure TS game engine (no UI deps)
    types.ts     # cards, actions, events
    deck.ts      # 32-card deck, seeded shuffle
    bidding.ts   # auction (16–28, forced opener, 3-pass close)
    trump.ts     # suit / 7th-card / joker modes
    tricks.ts    # rank strength, legal plays, trick winner
    scoring.ts   # card points, marriage/stake/all-rounds
    game.ts      # state machine: applyAction, legalActions, playerView
  bots/          # heuristic bots — consume PlayerView + legalActions only
    cardMemory.ts  # public-info tracking (played cards, voids, trumps-played)
    heuristics.ts  # bid / trump / double / card-play scoring
    bot.ts         # makeBot(difficulty, rng): decideAction
  ui/
    GameClient.ts  # headless turn driver around engine + bots
    scenes/        # Phaser: BootScene (preload) + TableScene (card table render + play input)
    dom/           # Cupertino DOM overlay UI
      UIController.ts  # turn loop; bridges GameClient <-> DOM screens <-> Phaser table
      Screen.ts        # show/hide router over #ui-root
      screens/         # splash, menu, setup, bid, trump, double, summary, game over
      styles/          # tokens.css + components.css (design tokens)
  main.ts        # entry point: boots Phaser table under the DOM overlay layer
tests/
  engine/        # engine unit tests + random-playout & bot-vs-bot simulators
  bots/          # bot unit tests
  ui/            # DOM screen/router + UIController unit tests
docs/superpowers/
  specs/         # design docs
  plans/         # task-by-task implementation plans
```

## Design notes

- The engine never throws mid-game: `applyAction(state, action)` returns either `{ ok: true, state, events }` or `{ ok: false, reason }`. `legalActions(state, seat)` lists every legal move; UIs/bots use it to avoid illegal input.
- All randomness flows through a seeded RNG, so games are deterministic and replayable from a seed + action log.
- Hidden information: each seat sees only a `PlayerView` (own hand + public info). Bots consume the same view a future network client would — no peeking at full state.
- Match ends when a team reaches ±6 game points (`WIN_TARGET`).

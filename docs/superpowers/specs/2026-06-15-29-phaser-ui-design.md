# 29 (dui_noy) — Plan 3: Phaser UI Design

**Status:** Approved design. Plan 3 of 4 (Phaser UI). Builds on the headless engine (Plan 1) and heuristic bots (Plan 2).

## Goal

A full playable game of 29: one human (seat 0) versus three bots, rendered with Phaser 3, playing a complete match (first team to ±6 game points). Web-first, portrait orientation, sized for Android phones (packaging is Plan 4).

## Scope

In scope:

- Boot, Menu, and Table scenes.
- `GameClient`: a headless turn driver wrapping the engine + bots.
- Full hand flow: bidding → trump selection → double window → card play → scoring, repeated until match end.
- Card art, suit symbols, and sounds from the bundled Kenney packs (already in `public/assets`, indexed by `assets.js`).
- Snappy tween animations and a mute toggle.
- Opponent difficulty selection in the Menu.

Out of scope (deferred):

- Capacitor / Android packaging (Plan 4).
- Settings persistence, per-seat difficulty, landscape/responsive layout, online play, tutorials.

## Key decisions

| Decision | Choice |
|----------|--------|
| Deliverable | Full playable game (Boot/Menu/Table + GameClient, art + sound, match to ±6) |
| Orientation | Portrait (720×1280 virtual, `Scale.FIT`) |
| Table layout | "B" — minimal corner HUD, open felt, bottom action strip |
| Animation | Snappy tweens (~200ms card slide, ~500ms pause between bot moves, trick-win sweep) |
| Phase decisions | Center modals for trump pick + double window; bottom strip for bidding + in-play helpers |
| Difficulty | Menu Easy/Hard toggle for the 2 opponents; partner (seat 2) always Hard |

## Architecture

### GameClient (`src/ui/GameClient.ts`) — headless, no Phaser

Wraps the engine loop already proven in `tests/engine/simulate-bots.test.ts`. Kept free of Phaser so it is unit-testable like the engine.

State held:

- `GameState` (from `newGame(seed)`).
- `mem: CardMemory[4]` — one per seat, via `emptyMemory()`.
- Three bots via `makeBot(difficulty, rng)` for seats 1, 2, 3. Seat 2 (partner) = `'hard'`; seats 1 and 3 = the chosen opponent difficulty. Each bot gets its own seeded `mulberry32` rng.
- Human is seat 0 (no bot).

API:

- `currentSeat(): Seat` — whose turn (delegates to the engine helper, see below).
- `isHumanTurn(): boolean` — `currentSeat() === 0`.
- `isOver(): boolean` — `state.phase === 'done'`.
- `view(): PlayerView` — `playerView(state, 0)`.
- `legal(): Action[]` — `legalActions(state, 0)`.
- `scores(): readonly [number, number]`.
- `stepBot(): GameEvent[]` — precondition: current seat is a bot. Runs `bot.decideAction(playerView(state, seat), legalActions(state, seat), mem[seat])`, computes `ledSuit` (the trick's first card suit during `playing`, else `null`), `applyAction`, then folds events into all four memories (reset all on `HandStarted`, else `observe(mem[i], ev, ledSuit)`). Returns the events. Throws if the bot returns an illegal action (a bug, as in the simulator).
- `applyHuman(action: Action): ApplyResult` — precondition: human turn. Same `ledSuit`/`observe` memory update on success. Returns the engine's `ApplyResult` so the UI can reject illegal input gracefully (the UI should only ever submit moves from `legal()`, so failure indicates a UI bug).

### Engine improvement: `currentSeat`

The "whose turn" logic currently lives as a private `actingSeat` helper duplicated in `simulate-bots.test.ts`:

```ts
if (phase === 'bidding') return bidding.turn;
if (phase === 'trumpSelection') return bid!.seat;
if (phase === 'doubleWindow') return doubleQueue[0]!;
return ((leader + trick.length) % 4) as Seat;   // playing
```

Export `currentSeat(state: GameState): Seat` from `src/engine/game.ts`, have `GameClient` and the simulator test use it, and remove the duplication. (`done` has no acting seat; callers guard with `isOver()` first.)

### Turn driver — in `TableScene`

Phaser timing stays with the tweens; `GameClient` stays pure. The scene runs the loop:

1. If `client.isOver()` → show match-result overlay, stop.
2. If `client.isHumanTurn()` → enable the controls appropriate to `client.view().phase` (built from `client.legal()`) and wait for the player. On submit, call `client.applyHuman(action)`, animate the resulting events, then continue to step 1.
3. Else (bot turn) → `client.stepBot()`, animate the events, ~500ms pause, continue to step 1.

"Animate the events" walks the returned `GameEvent[]` and plays the matching tween/sound (card slide for `CardPlayed`, sweep for `TrickWon`, toast for `HandScored`, etc.), chaining so the loop only advances once animation settles.

## Scenes

Phaser config in `src/main.ts`: portrait 720×1280 virtual canvas, `Scale.FIT` + `CENTER_BOTH`, scene list `[BootScene, MenuScene, TableScene]`.

### BootScene

Preloads what the game needs (not all 894 assets): the 32 playing-card textures from `cardsMedium`, `card_back`, the four `card_<suit>_suit` symbols, and the handful of chosen UI sounds. Shows a progress bar. On complete → `MenuScene`.

### MenuScene

Title "29", an Easy/Hard toggle for the opponents, and a Play button (with click sound). Starts `TableScene` with `{ difficulty }`. A fresh match seed is generated per Play.

### TableScene

Owns rendering, the turn driver, animations, and modals. Receives `{ difficulty }`, constructs a `GameClient`, runs the loop.

## Table layout (B)

- Felt-green background.
- Corner HUD: top-left `Us X · Them Y` (game points, range −6…+6); top-right trump indicator (suit symbol once revealed, `?` until then) and the current winning bid. A mute toggle sits in a corner.
- Seats: you at bottom (hand fanned face-up, cards overlapped); partner top; opponents left and right (face-down `card_back` count + a simple avatar). The seat whose turn it is gets a yellow glow.
- Center trick zone: up to four played cards, each offset toward the seat that played it.
- Bottom action strip: bidding controls and in-play helpers (Marriage / Reveal Trump) when legal.

## Phase UX

All controls are derived from `client.legal()` for seat 0, so the UI never offers an illegal move.

- **Bidding** — bottom strip: a value stepper clamped to the legal bid values (16–28), plus Bid and Pass.
- **Trump selection** (only when the human won the bid) — center modal dimming the felt: four suit chips + a 7th-card option + a Joker option, matching `TrumpMode`.
- **Double window** — center modal: Double / Redouble / Decline (whichever are legal).
- **Playing** — tap a legal card in the fan to play it; illegal cards are dimmed and non-interactive. Marriage and Reveal Trump appear in the strip when `legal()` includes them.
- **Hand end** — `HandScored` shows a toast (bid met or lost, and the game-point delta).
- **Match end** — on `GameOver` (a team hit ±6), an overlay shows the result and a Rematch button that returns to the Menu.

## Assets and sound

`assets.js` already indexes everything web-root-relative.

- **Cards:** `cardKey(card: Card): string` (`src/ui/cardKey.ts`) maps an engine `Card` to a Kenney texture key: `card_${suit}_${rankCode}`, where `rankCode` zero-pads number ranks (`7`→`07`, `8`→`08`, `9`→`09`, `10`→`10`) and passes faces through (`J`, `Q`, `K`, `A`). Hand and trick use `cardsMedium`; the card back is `card_back`.
- **Suit symbols:** `card_<suit>_suit` for the trump indicator.
- **Sound:** a `playSound(key)` wrapper (`src/ui/sound.ts`) with a mute flag. Mapping: card play → a `drop`/`click` sound, trick win → `confirmation`, button → `click`, illegal/error → `back`, match win → `bong`.

## Testing

- **`tests/ui/gameClient.test.ts`** (vitest, headless): drive a full match where the human seat is played by an internal bot, asserting the match completes, no action is illegal, the engine invariants from `simulate-bots.test.ts` hold (e.g. 29 points per hand), and memories reset each hand.
- **`tests/ui/cardKey.test.ts`**: every one of the 32 deck cards maps to a key present in `assets.js`.
- **Scenes** (Phaser/canvas) are not unit-tested. Verified manually via the Playwright MCP browser: screenshot the Menu and Table and play a hand end-to-end.

## File structure

```
src/
  engine/game.ts        # + export currentSeat(state)
  ui/
    GameClient.ts        # headless turn driver
    cardKey.ts           # Card -> texture key
    sound.ts             # playSound + mute
    scenes/
      BootScene.ts
      MenuScene.ts
      TableScene.ts      # layout, tweens, modals, turn loop
  main.ts                # Phaser config + scene list
tests/ui/
  gameClient.test.ts
  cardKey.test.ts
```

`index.html` already mounts `#game` and loads `/src/main.ts`; no change needed.

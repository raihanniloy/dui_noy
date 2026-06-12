# 29 Card Game — Design Spec

Date: 2026-06-12
Status: Approved by user

## Goal

Build the 29 card game (Bengali/South Asian trick-taking game) for **web and Android** from one codebase. Version 1: single human vs 3 heuristic bots. Architecture must allow online multiplayer later without rewriting the game core.

## Game Rules (v1 scope — full ruleset)

Source: https://zlevellabs.com/blog/29-card-game-rules/

- **Deck**: 32 cards — 7, 8, 9, 10, J, Q, K, A in each suit.
- **Players**: 4, in 2 fixed teams (seats 0+2 vs 1+3).
- **Card rank** (high→low): J, 9, A, 10, K, Q, 8, 7.
- **Points**: J=3, 9=2, A=1, 10=1, others=0. Total 28; +1 bonus for winning the last (8th) trick → max 29.
- **Deal**: 4 cards each → bidding → 4 more cards each.
- **Bidding**: minimum 16, maximum 28 (bid of 29 means claiming every point incl. last-trick bonus). Players bid or pass; ends when three players pass. Bid winner's team must take ≥ bid points.
- **Trump selection** (bidder chooses one):
  - **Suit trump**: pick any suit; trump hidden until first revealed per standard 29 reveal rules (trump concealed until a player cannot follow suit and asks for reveal).
  - **7th-card trump**: trump = suit of bidder's 7th dealt card, revealed when trump is first needed.
  - **Joker / no-trump**: no trump suit; highest card of led suit wins every trick.
- **Trick play**: must follow led suit if able. (House rule per source: if unable to follow, must play trump if holding trump.) Highest trump wins; otherwise highest card of led suit.
- **Pair / Marriage**: K+Q of trump suit held by one player, declared after the team has won at least one trick and trump is revealed. Bidding team holds it → target bid reduced by 4, floor 16. Opponents hold it → target bid increased by 4, cap 28.
- **Double / Redouble**: after trump selection, an opponent may double (set stake ×2 → ±2 game points); bidding team may redouble (×4 → ±4).
- **Game scoring**: bidding team meets target → +1 game point (±2 doubled, ±4 redoubled); fails → −1 (−2/−4). **All rounds**: bidding team takes all 8 tricks or loses all 8 → extra ±1.
- **Match**: running team score; first to a configurable target (default +6 / −6 elimination style, configurable) — exact match-end convention configurable, default simple running score displayed.

## Architecture (Approach A — approved)

```
Phaser 3 view (scenes, sprites, sound)      ← assets.js index
        │ events down / actions up
GameClient (event bus, seat adapter)        ← swap point for websocket later
        │
Engine (pure TS, headless)                  ← state machine + rules + scoring
Bots (consume same action API as humans)
```

- **Engine**: pure TypeScript module, zero Phaser imports. Reducer style: `applyAction(state, action) → { state', events[] }`. Immutable state, deterministic with seedable RNG. Replayable from action log.
- **Hidden information**: each seat receives a `PlayerView` (own hand + public info only). Bots and UI consume views, never full state. Same contract as future network clients.
- **Phases**: `dealing → bidding → trumpSelection → doubleWindow → playing(8 tricks) → scoring → done`.
- **Online later**: engine + bots run on Node server; `GameClient` swaps in-process calls for websocket. View unchanged.

## File Layout

```
src/
  engine/
    types.ts       # Card, Suit, Seat, Bid, TrumpMode, GameState, PlayerView, Action, GameEvent
    deck.ts        # 32-card deck, seeded shuffle, two-stage deal
    bidding.ts     # bid validation 16–28, pass logic, auction resolution
    trump.ts       # suit / 7th-card / joker modes, reveal rules
    tricks.ts      # follow-suit + must-trump legality, trick winner resolution
    scoring.ts     # card points, last-trick bonus, marriage adjustment, set score, all-rounds
    game.ts        # state machine orchestrator; applyAction; legalActions(view)
  bots/
    heuristics.ts  # hand evaluation, bid decision, card-play scoring, card counting
    bot.ts         # Bot interface: decideAction(view): Action; difficulty knob
  client/
    gameClient.ts  # local game driver: human seat 0, bots seats 1–3; event bus
  ui/
    scenes/        # BootScene (preload via assets.js), MenuScene, TableScene, (ScoreScene or HUD overlay)
    components/    # hand fan, trick area, bid panel, trump picker, score HUD
  main.ts          # Phaser game config + scene registration
tests/
  engine/          # Vitest unit tests per engine module
  simulate.ts      # N full bot-vs-bot games with invariant assertions
assets.js          # existing asset index (regenerate if assets change)
public/assets/     # Kenney packs (cards, UI tiles, interface sounds)
```

## Engine Design Details

- `applyAction` returns typed `IllegalAction` result for invalid input — never throws mid-game. UI prevents illegal input proactively via `legalActions(view)`; rejection is backstop.
- All randomness through injected seeded RNG → reproducible tests and replays.
- Events are the only channel to the view: `CardsDealt`, `BidPlaced`, `BiddingWon`, `TrumpChosen`, `TrumpRevealed`, `MarriageDeclared`, `Doubled`, `Redoubled`, `CardPlayed`, `TrickWon`, `HandScored`, `GameOver`, etc.

## Bot Design

Single heuristic module, difficulty = noise on move scoring:

- **Bidding**: hand-strength evaluation (J/9 density, suit length, control cards) → bid value or pass. Double when opponent bid looks unmakeable.
- **Trump choice**: longest/strongest suit; 7th-card gamble when hand is balanced-weak.
- **Card play**: enumerate legal moves, score each — win trick cheaply, conserve trump, throw points to partner-winning tricks, lead from strength; maintain per-suit played-card counts and trump-out tracking.
- **Difficulty**: easy bots add randomness to move scores; hard bots play best-scored move.

## UI Design (Phaser 3)

- **Scenes**: Boot (asset preload from assets.js) → Menu → Table. Table scene hosts bidding panel, trump picker, double prompt, trick area, hand fan, score HUD as Phaser containers (no scene churn mid-hand).
- **Assets**: `Cards (large)` for player hand, `Cards (medium)` for trick area/opponents; `kenney_ui-pack-pixel-adventure` tiles for panels/buttons; `kenney_interface-sounds` for click/select/confirmation/error feedback.
- **Layout**: portrait-first (Android primary), responsive scale for landscape/web desktop.

## Platform Packaging

- **Bundler**: Vite + TypeScript.
- **Web**: `vite build` → static `dist/`, deployable to any static host.
- **Android**: Capacitor wraps `dist/` (`npx cap add android`); Gradle builds APK/AAB.

## Testing Strategy

- **Vitest** on engine modules: bidding edge cases, must-trump legality, trump reveal timing, marriage declaration windows, double/redouble windows, 7th-card reveal, scoring including all-rounds and last-trick bonus.
- **Simulator** (`tests/simulate.ts`): run 1000 full bot-vs-bot games per CI run; assert invariants — total points per hand ∈ {28, 29}, no illegal action ever accepted, score bookkeeping consistent, every game terminates.
- **UI**: manual play-testing + screenshot verification at milestones (kept rare — image tokens are expensive).

## Development Model Assignment (token-cost strategy)

| Task | Model | Rationale |
|---|---|---|
| Spec + implementation plans | Opus 4.8 | Architecture/rule errors cost most downstream |
| Engine modules (rules, scoring, state machine) | Opus 4.8 | Correctness-critical, subtle rules |
| Bot heuristics | Opus 4.8 | Strategy reasoning |
| Phaser scenes, UI wiring, layouts | Sonnet 4.6 | Pattern-heavy implementation against a precise spec |
| Vite/Capacitor config, asset preloading | Sonnet 4.6 | Mechanical setup |
| Codebase searches, lookups | Haiku 4.5 (Explore subagent) | Cheap fan-out |
| Repetitive edits, manifest regeneration | Haiku 4.5 | Trivial work |

Cost levers:
1. **Spec-first** — this doc + per-phase plans keep implementation sessions short.
2. **Headless test loop** — engine bugs caught by Vitest, not browser/screenshot loops.
3. **Fresh session per phase** — plan docs carry context; avoid dragging long histories.
4. Switch main session model per phase: `/model opus` for engine/bots, `/model sonnet` for UI/config phases.

## Build Phases

1. **Scaffold**: Vite + TS + Vitest + Phaser; `engine/types.ts` complete.
2. **Engine** (TDD): deck → bidding → trump → tricks → scoring → game orchestrator.
3. **Bots + simulator**: heuristics, 1000-game invariant validation.
4. **UI**: Table scene end-to-end — full playable game vs bots in browser.
5. **Polish**: sounds, card animations, menu, score history, difficulty setting.
6. **Package**: Capacitor Android APK; web deploy.
7. **(Later, out of v1 scope)** Online multiplayer: engine to Node server, wsClient, rooms/matchmaking.

## Out of Scope (v1)

- Online multiplayer, accounts, matchmaking (architecture prepared, not built).
- Single Hand (±3) advanced rule — deferred (uncommon variant).
- iOS packaging.
- Localization (UI text in English; Bengali later).

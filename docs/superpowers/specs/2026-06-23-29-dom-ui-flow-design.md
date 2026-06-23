# 29 — DOM UI Flow (Cupertino redesign), Plan 5 Design

Redesign the player-facing UI to match the imported **Twenty-Nine Game Flow**
mockup (Cupertino / iOS design language, single blue accent, parchment-light and
charcoal-dark surfaces). Source design: claude.ai/design project
`129f2e34-9bc3-4a1c-ab85-a25d374f7e47`, file `Twenty-Nine Game Flow.dc.html`
(12 screens). This pass implements the **core play loop (8 screens)**.

## Goals

- Render the 8 core-loop screens with the Cupertino look, driven by the existing
  headless engine + bots.
- Keep the live card table in Phaser; move menus, dialogs, and bid/trump/summary
  to DOM overlays.
- Keep the 99 existing engine/bot tests green.

## Scope

**In (8 screens):** 01 Splash, 02 Main menu, 03 Setup, 05 Bidding, 06 Choose
trump, 07 Play table, 08 Round summary, 09 Game over.

**Out (follow-up):** 04 How to play, 10 Pause, 11 Settings, 12 Exit confirm. The
Menu's "How to play" and "Settings" pills are present but stub to a no-op
placeholder this pass.

**Engine edge case in scope:** the engine's `doubleWindow` phase is not a mockup
screen but must be handled. It gets a small DOM dialog (`DoubleOverlay`) in the
same visual style so the flow never falls back to legacy Phaser prompts.

## Architecture

DOM overlay + Phaser table (hybrid):

- `index.html` gains a `#ui-root` DOM layer stacked above the existing `#game`
  Phaser canvas via z-index. Full-screen DOM screens (splash/menu/setup) cover
  the canvas; overlays (bid/trump/double/summary/gameover) sit on top of the
  visible charcoal Phaser table.
- Phaser `TableScene` shrinks to **rendering + card-play input only**: seats,
  trick stack, fanned hand, blue-ring playable card. Its bidding/trump/double/
  summary prompt code is removed (now DOM).
- `src/ui/dom/UIController.ts` owns the turn loop (moved out of TableScene). On
  each step it queries `GameClient` for phase / `PlayerView` / `legalActions`:
  - bot turn → `stepBot()`, then animate the result on the Phaser table;
  - human turn → show the matching DOM overlay, or enable Phaser hand input for
    `playCard`.
  DOM screens return the chosen `Action` to the controller via callbacks; the
  controller calls `applyHuman()` and re-renders.

### Modules

```
index.html                     # + #ui-root layer; link tokens.css + components.css
src/ui/dom/
  styles/tokens.css            # extracted Cupertino vars (color/type/space/radius/shadow)
  styles/components.css        # pill buttons, seat avatars, mini-cards, list rows, overlays
  Screen.ts                    # show/hide router over #ui-root (one screen visible)
  UIController.ts              # GameClient <-> DOM <-> Phaser table loop
  screens/SplashScreen.ts      # 01
  screens/MenuScreen.ts        # 02
  screens/SetupScreen.ts       # 03
  screens/BidOverlay.ts        # 05
  screens/TrumpOverlay.ts      # 06
  screens/DoubleOverlay.ts     # doubleWindow
  screens/SummaryOverlay.ts    # 08
  screens/GameOverOverlay.ts   # 09
public/fonts/Inter-{300,400,600,700}.woff2   # from design project
src/ui/scenes/TableScene.ts    # shrink to render + card-play input
src/main.ts                    # boot UIController; Phaser table mounts under DOM
tests/ui/                      # Screen, UIController, bid-clamp, setup-chips
```

### Design tokens (extracted from the Cupertino design system)

`tokens.css` ports these vars (full set in source CSS); key values:

- Accent: `--color-primary:#0066cc`, `--color-primary-on-dark:#2997ff`.
- Surfaces: `--color-canvas:#ffffff`, `--color-canvas-parchment:#f5f5f7`,
  dark tiles `#272729 / #2a2a2c / #252527`, table charcoal `#1d1d1f`.
- Text: `--color-ink:#1d1d1f`, `--color-ink-muted-48:#7a7a7a`,
  `--color-body-muted:#cccccc` (on dark).
- Hairline `#e0e0e0`; radius pill `9999px`, card `8px`, sheet `18px`;
  shadow `rgba(0,0,0,.22) 3px 5px 30px 0`.
- Fonts: `--font-display` / `--font-text` = `system-ui, -apple-system, …, 'Inter',
  sans-serif`. Self-host Inter 300/400/600/700 for non-Apple (Android) parity.
- Type classes ported as needed: `display-md`, `body-strong`, `caption`,
  `caption-strong`, `fine-print`, `tagline`.

Do **not** ship the design project's `support.js` / `_ds_bundle.js` runtime — those
are claude.ai preview tooling. Rebuild components as plain CSS.

## Screen behaviors

- **01 Splash** — parchment, large "29", "The trick game.", shuffling progress
  bar; auto-advances to Menu after a short delay.
- **02 Menu** — fanned suit cards, "29" wordmark, blue **Play** pill →
  Setup. "Continue last game" / "How to play" / "Settings" quiet pills
  (How-to + Settings stub this pass; Continue hidden if no saved game).
- **03 Setup** — seating diagram (You bottom, Partner top, West/East sides),
  Difficulty chips (Easy/Medium/Hard), points-to-win chips (4/6/11). Selecting a
  chip highlights it blue. **Deal cards** → seed a `GameClient(seed, difficulty)`,
  hand off to UIController, reveal Phaser table.
- **05 Bidding** — overlay on charcoal table. Central dialed bid ring; −/Pass/+
  controls; "Bid N" primary. Bid value clamps to the legal `bid` actions
  (min/max from `legalActions`). Seat chips show opponents' bids/passes.
- **06 Choose trump** — white sheet over dimmed table; 4 suit tiles; first tap
  selects (blue ring), confirm commits `chooseTrump`.
- **doubleWindow** — small DOM dialog: Double / Redouble / No, from legal actions.
- **07 Play table (Phaser)** — four seats, active seat pulses blue, trick stack
  centers, hand fans up, playable card lifts with blue ring; tap to play.
  `revealTrump` available as a styled button when legal.
- **08 Round summary** — overlay sheet: made/missed verdict (+1 / −1), US vs THEM
  captured points, running game score, **Next hand** → next deal (or Game over).
- **09 Game over** — win/lose headline, final US/THEM score, **Rematch** → new
  `GameClient` with a fresh seed, back to bidding.

## Data flow

`UIController.run()` loops until `GameClient.isOver()`:

1. Read `client.view()` (phase) and `client.legal()`.
2. If `client.isHumanTurn()`: dispatch by phase to the matching DOM overlay
   (bidding/trumpSelection/doubleWindow) or Phaser hand input (playing). Await the
   chosen `Action`, `client.applyHuman(action)`, re-render table.
3. Else `client.stepBot()`, animate events on the table, small delay.
4. On hand end → SummaryOverlay; on match end → GameOverOverlay.

DOM screens are pure view + callback: they take a small data object and an
`onAction` callback; they own no game state.

## Testing

- **Untouched:** all engine/bot tests stay green (99).
- **New (vitest + jsdom env):**
  - `Screen` router: showing one screen hides the others; unknown id throws.
  - Bid clamp: given legal bid values, −/+ never exceed min/max; Pass emits the
    `pass` action.
  - `UIController` phase→screen mapping: bidding→Bid, trumpSelection→Trump,
    doubleWindow→Double, done→GameOver.
  - Setup chip state: selecting a difficulty/points chip updates selection and the
    Deal payload.
- **Visual:** Playwright MCP screenshots of each of the 8 screens for parity check.
- **Gate:** `npm run test:run` green, `npx tsc --noEmit` exit 0, `npm run build` ok.

## Done criteria

- 8 core screens render in the Cupertino style and drive a full human-vs-3-bots
  match end to end (deal → bid → trump → tricks → summary → next hand → game over
  → rematch).
- Phaser `TableScene` reduced to render + card-play input.
- New UI unit tests pass; engine/bot suite unchanged; typecheck + build clean.

## Follow-up (next plan)

How to play (04), Pause (10), Settings (11), Exit confirm (12); persistence for
"Continue last game"; Android re-verification of the DOM layer under Capacitor.

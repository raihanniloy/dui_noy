# Plan 4 — Capacitor Android Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing Vite + Phaser web build as an installable Android debug APK with portrait lock, hardware back handling, immersive fullscreen, and custom icon/splash.

**Architecture:** Add Capacitor (`core`/`cli`/`android`) using `dist/` as `webDir`. A single thin module `src/platform/native.ts` wraps all Capacitor calls behind a platform-agnostic API that no-ops on web; only `main.ts` and the Phaser scenes' back-handling touch it. Engine, bots, and UI logic are unchanged.

**Tech Stack:** Capacitor 6, `@capacitor/screen-orientation`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/assets`; Vitest for unit tests; Gradle for the APK.

---

## File structure

```
capacitor.config.ts            # Capacitor config (appId, appName, webDir, splash)
src/platform/native.ts         # thin Capacitor wrapper (isNative/initNative/onBackButton)
tests/platform/native.test.ts  # unit tests for native.ts (Capacitor mocked)
scripts/check-android-env.mjs  # local-env setup check
tests/platform/check-android-env.test.ts  # unit tests for the check logic
android/                       # generated native project (committed)
src/main.ts                    # MODIFY: call initNative + register back handler
src/ui/scenes/TableScene.ts    # MODIFY: handleBack() -> confirm-quit
src/ui/scenes/MenuScene.ts     # MODIFY: handleBack() -> exit app
README.md                      # MODIFY: Android build + setup docs
package.json                   # MODIFY: deps + build:android script
```

Notes for the engineer:
- Scene keys are `Boot`, `Menu`, `Table` (set via `super('Boot')` etc. in each scene's constructor).
- The Phaser game is created in `src/main.ts`. Scene size is 720×1280 portrait.
- The repo uses ESM (`"type": "module"`), TypeScript, Vitest. Tests live under `tests/`, mirroring `src/`. Run a single test file with `npx vitest run <path>`.
- Local env at planning time: Node 24, JDK 21 present, but **no** `ANDROID_HOME`/`ANDROID_SDK_ROOT`/`JAVA_HOME` exported. The setup check exists precisely for this.

---

## Task 1: Platform wrapper `native.ts` (web no-op path)

**Files:**
- Create: `src/platform/native.ts`
- Test: `tests/platform/native.test.ts`

- [ ] **Step 1: Write the failing test (web path)**

```ts
// tests/platform/native.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all Capacitor modules. Default isNativePlatform = false (web).
const isNativePlatform = vi.fn(() => false);
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }));

const lockOrientation = vi.fn(async () => {});
vi.mock('@capacitor/screen-orientation', () => ({ ScreenOrientation: { lock: (o: unknown) => lockOrientation(o) } }));

const hideStatusBar = vi.fn(async () => {});
vi.mock('@capacitor/status-bar', () => ({ StatusBar: { hide: () => hideStatusBar() } }));

const hideSplash = vi.fn(async () => {});
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: () => hideSplash() } }));

const addListener = vi.fn(async () => ({ remove: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: { addListener: (e: string, cb: unknown) => addListener(e, cb) } }));

import { isNative, initNative, onBackButton } from '../../src/platform/native';

describe('native (web)', () => {
  beforeEach(() => { isNativePlatform.mockReturnValue(false); vi.clearAllMocks(); });

  it('isNative is false on web', () => {
    expect(isNative()).toBe(false);
  });

  it('initNative touches no plugin on web', async () => {
    await initNative();
    expect(lockOrientation).not.toHaveBeenCalled();
    expect(hideStatusBar).not.toHaveBeenCalled();
    expect(hideSplash).not.toHaveBeenCalled();
  });

  it('onBackButton registers no listener on web', () => {
    onBackButton(() => {});
    expect(addListener).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/platform/native.test.ts`
Expected: FAIL — cannot resolve `../../src/platform/native`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/platform/native.ts — thin wrapper over Capacitor. No-ops on web.
import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export type BackHandler = () => void;

export async function initNative(): Promise<void> {
  if (!isNative()) return;
  const { ScreenOrientation } = await import('@capacitor/screen-orientation');
  const { StatusBar } = await import('@capacitor/status-bar');
  const { SplashScreen } = await import('@capacitor/splash-screen');
  try { await ScreenOrientation.lock({ orientation: 'portrait' }); } catch (e) { console.warn('orientation lock failed', e); }
  try { await StatusBar.hide(); } catch (e) { console.warn('status bar hide failed', e); }
  try { await SplashScreen.hide(); } catch (e) { console.warn('splash hide failed', e); }
}

export function onBackButton(handler: BackHandler): void {
  if (!isNative()) return;
  void import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', () => handler());
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/platform/native.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/platform/native.ts tests/platform/native.test.ts
git commit -m "feat(native): add platform wrapper with web no-op path"
```

---

## Task 2: `native.ts` native path

**Files:**
- Modify: `tests/platform/native.test.ts`
- (no `src` change expected — implementation from Task 1 already covers native; this task proves it)

- [ ] **Step 1: Add failing native-path tests**

Append to `tests/platform/native.test.ts`:

```ts
describe('native (device)', () => {
  beforeEach(() => { isNativePlatform.mockReturnValue(true); vi.clearAllMocks(); });

  it('isNative is true on device', () => {
    expect(isNative()).toBe(true);
  });

  it('initNative locks portrait, hides status bar and splash', async () => {
    await initNative();
    expect(lockOrientation).toHaveBeenCalledWith({ orientation: 'portrait' });
    expect(hideStatusBar).toHaveBeenCalledTimes(1);
    expect(hideSplash).toHaveBeenCalledTimes(1);
  });

  it('onBackButton registers a backButton listener', async () => {
    onBackButton(() => {});
    await Promise.resolve(); // let the dynamic import resolve
    expect(addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('invoking the registered listener calls the handler', async () => {
    const handler = vi.fn();
    onBackButton(handler);
    await Promise.resolve();
    const cb = addListener.mock.calls[0][1] as () => void;
    cb();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify behavior**

Run: `npx vitest run tests/platform/native.test.ts`
Expected: PASS for all. If the "invoking the registered listener" test flakes on import timing, add another `await Promise.resolve();` before reading `addListener.mock.calls`. If a native assertion fails, fix `src/platform/native.ts` to match the contract (it should already).

- [ ] **Step 3: Commit**

```bash
git add tests/platform/native.test.ts
git commit -m "test(native): cover device path (orientation/statusbar/splash/back)"
```

---

## Task 3: Wire `native.ts` into `main.ts` and scenes

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/scenes/TableScene.ts`
- Modify: `src/ui/scenes/MenuScene.ts`

Design: each scene that should react to hardware-back exposes a public `handleBack()` method. `main.ts` registers one back handler that dispatches to the currently-active scene's `handleBack()`. Menu exits the app; Table returns to Menu (debug-simple confirm: immediate return to Menu is acceptable for the debug build — no modal required, keeping scope tight).

- [ ] **Step 1: Add `handleBack()` to MenuScene**

In `src/ui/scenes/MenuScene.ts`, add a public method to the class:

```ts
  // Hardware back on the menu: exit the app (native only).
  handleBack(): void {
    void import('@capacitor/app').then(({ App }) => App.exitApp());
  }
```

- [ ] **Step 2: Add `handleBack()` to TableScene**

In `src/ui/scenes/TableScene.ts`, add a public method to the class:

```ts
  // Hardware back during a game: abandon and return to the menu.
  handleBack(): void {
    this.scene.start('Menu');
  }
```

- [ ] **Step 3: Register the back dispatcher and init native in `main.ts`**

Replace the contents of `src/main.ts` with:

```ts
// src/main.ts — Phaser entry point.
import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { MenuScene } from './ui/scenes/MenuScene';
import { TableScene } from './ui/scenes/TableScene';
import { initNative, onBackButton } from './platform/native';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b3d2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  scene: [BootScene, MenuScene, TableScene],
});

void initNative();

// Dispatch hardware back to the active scene's handleBack(), if any.
onBackButton(() => {
  for (const scene of game.scene.getScenes(true)) {
    const s = scene as Phaser.Scene & { handleBack?: () => void };
    if (typeof s.handleBack === 'function') { s.handleBack(); return; }
  }
});
```

- [ ] **Step 4: Verify build + existing tests still pass**

Run: `npm run build`
Expected: PASS (tsc clean, vite build emits `dist/`).

Run: `npx vitest run`
Expected: all existing tests + the new `native` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/ui/scenes/MenuScene.ts src/ui/scenes/TableScene.ts
git commit -m "feat(native): wire portrait/fullscreen init and hardware back into scenes"
```

---

## Task 4: Android environment setup check

**Files:**
- Create: `scripts/check-android-env.mjs`
- Test: `tests/platform/check-android-env.test.ts`

Design: a pure function `checkAndroidEnv(env)` returns `{ ok, problems }` given an env object, so it is unit-testable without touching the real environment. The script calls it with `process.env`, prints problems, and exits non-zero when not ok.

- [ ] **Step 1: Write the failing test**

```ts
// tests/platform/check-android-env.test.ts
import { describe, it, expect } from 'vitest';
import { checkAndroidEnv } from '../../scripts/check-android-env.mjs';

describe('checkAndroidEnv', () => {
  it('flags missing JAVA_HOME and Android SDK', () => {
    const r = checkAndroidEnv({});
    expect(r.ok).toBe(false);
    expect(r.problems.some((p: string) => /JAVA_HOME/.test(p))).toBe(true);
    expect(r.problems.some((p: string) => /ANDROID_HOME|ANDROID_SDK_ROOT/.test(p))).toBe(true);
  });

  it('passes when JAVA_HOME and ANDROID_HOME are set', () => {
    const r = checkAndroidEnv({ JAVA_HOME: '/jdk', ANDROID_HOME: '/sdk' });
    expect(r.ok).toBe(true);
    expect(r.problems).toEqual([]);
  });

  it('accepts ANDROID_SDK_ROOT as an alternative to ANDROID_HOME', () => {
    const r = checkAndroidEnv({ JAVA_HOME: '/jdk', ANDROID_SDK_ROOT: '/sdk' });
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/platform/check-android-env.test.ts`
Expected: FAIL — cannot resolve `check-android-env.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/check-android-env.mjs — verify local Android build prerequisites.
export function checkAndroidEnv(env) {
  const problems = [];
  if (!env.JAVA_HOME) {
    problems.push('JAVA_HOME is not set. Point it at a JDK 17+ install (Capacitor/Gradle need it).');
  }
  if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
    problems.push('Neither ANDROID_HOME nor ANDROID_SDK_ROOT is set. Install the Android SDK and export one of them.');
  }
  return { ok: problems.length === 0, problems };
}

// Run directly: `node scripts/check-android-env.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, problems } = checkAndroidEnv(process.env);
  if (ok) {
    console.log('Android environment OK.');
  } else {
    console.error('Android build prerequisites missing:\n' + problems.map((p) => '  - ' + p).join('\n'));
    console.error('\nSee README "Android build" for one-time setup.');
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/platform/check-android-env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/check-android-env.mjs tests/platform/check-android-env.test.ts
git commit -m "feat(android): add setup-check for JAVA_HOME and Android SDK"
```

---

## Task 5: Install Capacitor, add config, add scripts

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`

This task installs dependencies and writes config. No unit test — verification is `npm run build` staying green and `npx cap --version` working.

- [ ] **Step 1: Install Capacitor and plugins**

```bash
npm install @capacitor/core @capacitor/app @capacitor/screen-orientation @capacitor/status-bar @capacitor/splash-screen
npm install -D @capacitor/cli @capacitor/android @capacitor/assets
```

- [ ] **Step 2: Create `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duinoy.game',
  appName: '29',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0b3d2e',
    },
  },
};

export default config;
```

- [ ] **Step 3: Add npm scripts**

In `package.json` `"scripts"`, add:

```json
    "check:android": "node scripts/check-android-env.mjs",
    "build:android": "npm run check:android && npm run build && npx cap sync android"
```

- [ ] **Step 4: Verify**

Run: `npx vitest run` → all PASS.
Run: `npm run build` → PASS.
Run: `npx cap --version` → prints a version.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts
git commit -m "feat(android): add Capacitor deps, config, and build scripts"
```

---

## Task 6: Add Android platform + icon/splash assets

**Files:**
- Create: `android/` (generated)
- Create: `resources/icon.png`, `resources/splash.png` (source art for asset generation)

This task creates the native project and generates launcher icon + splash. It requires the Android SDK; if the setup check fails, the engineer must complete the README setup first.

- [ ] **Step 1: Run the setup check**

Run: `npm run check:android`
Expected: prints "Android environment OK." If it lists problems, stop and follow README "Android build" setup, then retry.

- [ ] **Step 2: Add the Android platform**

```bash
npm run build          # ensure dist/ exists
npx cap add android
```
Expected: creates `android/` and runs an initial sync.

- [ ] **Step 3: Provide source art and generate assets**

Create `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732, artwork centered) from existing game art (reuse a Kenney card/suit image composed on the `#0b3d2e` background; a simple centered logo is fine for debug). Then:

```bash
npx capacitor-assets generate --android
```
Expected: writes launcher icons + splash resources under `android/app/src/main/res/`.

- [ ] **Step 4: Sync and verify the project assembles**

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```
Expected: BUILD SUCCESSFUL; APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add android resources
git commit -m "feat(android): add Android platform with icon and splash"
```

Note: add `android/app/build/`, `android/.gradle/`, `android/build/`, `android/local.properties`, and `android/app/release/` to `.gitignore` if `cap add` did not already (it usually adds an `android/.gitignore`). Commit the gitignore change with this task if needed.

---

## Task 7: Manual device verification + README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Build the debug APK end to end**

```bash
npm run build:android
cd android && ./gradlew assembleDebug
```
Expected: BUILD SUCCESSFUL, `app-debug.apk` produced.

- [ ] **Step 2: Install and verify on emulator/device**

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Manually verify on the device/emulator:
- App launches to the menu; custom icon shows in launcher; splash shows on start.
- Orientation locked to portrait (rotate device → stays portrait).
- Status bar hidden (immersive).
- Hardware back: in Table → returns to Menu; in Menu → exits app.
Record the result (pass/fail per item) in the task notes.

- [ ] **Step 3: Document in README**

Add an "Android build" section to `README.md` covering:

````markdown
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
(in-game → menu, menu → exit).
````

- [ ] **Step 4: Final full verification**

Run: `npx vitest run` → all PASS.
Run: `npm run build` → PASS.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(android): document debug APK build and device verification"
```

---

## Self-review notes

- **Spec coverage:** Capacitor+android deps/config (Task 5), portrait lock + status-bar + splash (Tasks 1–3), back button (Task 3), icon/splash (Task 6), setup check (Task 4), `src/platform/native.ts` isolation + web no-op (Tasks 1–2), debug APK + README (Tasks 6–7). All spec sections mapped.
- **Scope:** No signing/release/iOS — matches spec "Out".
- **Type consistency:** `isNative`/`initNative`/`onBackButton`/`BackHandler` used identically across `native.ts`, its tests, and `main.ts`. `handleBack()` defined on Menu/Table and called by the dispatcher in `main.ts`. `checkAndroidEnv(env) -> {ok, problems}` consistent between script and test.
- **Decision:** Table back returns to Menu directly (no confirm modal) to keep the debug build simple; spec allowed picking one approach.

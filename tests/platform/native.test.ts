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

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

describe('native (device)', () => {
  beforeEach(() => { vi.clearAllMocks(); isNativePlatform.mockReturnValue(true); });

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
    // flush multiple microtask ticks so the dynamic import and .then() both resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('invoking the registered listener calls the handler', async () => {
    const handler = vi.fn();
    onBackButton(handler);
    await new Promise(resolve => setTimeout(resolve, 0));
    const call = addListener.mock.calls.find((c) => c[0] === 'backButton');
    expect(call).toBeDefined();
    const cb = call![1] as () => void;
    cb();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

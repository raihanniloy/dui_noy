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

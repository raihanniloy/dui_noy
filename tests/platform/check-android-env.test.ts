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

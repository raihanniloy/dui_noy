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

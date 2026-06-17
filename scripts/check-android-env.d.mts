export function checkAndroidEnv(env: Record<string, string | undefined>): {
  ok: boolean;
  problems: string[];
};

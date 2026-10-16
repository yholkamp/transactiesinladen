const PREFIX = 'mb-cc-import:pref:';

export function readPref(name: string): string {
  try {
    return globalThis.localStorage?.getItem(PREFIX + name) ?? '';
  } catch {
    return '';
  }
}

export function writePref(name: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + name, value);
  } catch {
    // ignore
  }
}

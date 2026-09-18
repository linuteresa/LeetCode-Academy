export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'algocourse-theme';

/** What the OS is asking for, when the user has expressed no preference. */
export function systemTheme(): ThemePreference {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function storedTheme(): ThemePreference | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* a blocked store just means the choice lasts for this visit */
  }
}

/**
 * The stylesheet reads `data-theme` on the root element. Setting it explicitly
 * overrides the `prefers-color-scheme` media query, so a chosen theme wins over
 * the system one.
 */
export function applyTheme(theme: ThemePreference): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

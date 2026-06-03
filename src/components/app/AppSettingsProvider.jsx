import React from 'react';

import {
  APP_SETTINGS_STORAGE_KEY,
  DEFAULT_APP_SETTINGS,
  getAccentOption,
} from '@/lib/app-settings';

const AppSettingsContext = React.createContext(null);

const readStoredSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      themeMode: ['dark', 'light', 'system'].includes(parsed?.themeMode) ? parsed.themeMode : DEFAULT_APP_SETTINGS.themeMode,
      accentId: typeof parsed?.accentId === 'string' ? parsed.accentId : DEFAULT_APP_SETTINGS.accentId,
      subAccentId: typeof parsed?.subAccentId === 'string' ? parsed.subAccentId : DEFAULT_APP_SETTINGS.subAccentId,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
};

const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = React.useState(() => readStoredSettings());
  const [systemTheme, setSystemTheme] = React.useState(() => getSystemTheme());

  const effectiveTheme = settings.themeMode === 'system' ? systemTheme : settings.themeMode;
  const accentOption = React.useMemo(() => getAccentOption(settings.accentId), [settings.accentId]);
  const subAccentOption = React.useMemo(() => getAccentOption(settings.subAccentId), [settings.subAccentId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const updateTheme = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark');
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  React.useEffect(() => {
    const root = document.documentElement;
    const primary = accentOption?.hsl || '262 60% 50%';
    const primaryForeground = accentOption?.foreground || '0 0% 100%';
    const accent = subAccentOption?.hsl || primary;
    const accentForeground = subAccentOption?.foreground || primaryForeground;

    root.classList.toggle('light', effectiveTheme === 'light');
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-foreground', primaryForeground);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--chart-1', primary);
    root.style.setProperty('--sidebar-ring', primary);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-foreground', accentForeground);
    root.style.setProperty('--sidebar-accent', accent);
    root.style.setProperty('--sidebar-accent-foreground', accentForeground);
    root.style.colorScheme = effectiveTheme;
  }, [effectiveTheme, accentOption, subAccentOption]);

  const value = React.useMemo(
    () => ({
      settings,
      effectiveTheme,
      accentOption,
      subAccentOption,
      setThemeMode: (themeMode) => setSettings((current) => ({ ...current, themeMode })),
      setAccentId: (accentId) => setSettings((current) => ({ ...current, accentId })),
      setSubAccentId: (subAccentId) => setSettings((current) => ({ ...current, subAccentId })),
      resetSettings: () => setSettings(DEFAULT_APP_SETTINGS),
    }),
    [settings, effectiveTheme, accentOption, subAccentOption]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export const useAppSettings = () => {
  const context = React.useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider.');
  }
  return context;
};

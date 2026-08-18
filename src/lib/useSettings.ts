import { useEffect, useState, useCallback } from 'react';
import { getSettings, updateSettings } from './api';
import type { AppSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--accent', settings.accent_color);
    const fontPx = settings.font_size === 'small' ? '14px' : settings.font_size === 'large' ? '18px' : '16px';
    root.style.fontSize = fontPx;
  }, [settings, loaded]);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      updateSettings(patch);
      return next;
    });
  }, []);

  return { settings, update, loaded };
}

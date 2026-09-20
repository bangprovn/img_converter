import { useCallback, useEffect, useRef, useState } from 'react';

import { sanitizeWatermarkSettings } from '@/lib/watermark';
import {
  DEFAULT_WATERMARK_SETTINGS,
  type WatermarkSettings,
} from '@/types/watermark';

const STORAGE_KEY = 'img-converter-watermark-settings-v1';

function readStoredSettings(): WatermarkSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_WATERMARK_SETTINGS };
    return sanitizeWatermarkSettings(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to load watermark settings from localStorage:', error);
    return { ...DEFAULT_WATERMARK_SETTINGS };
  }
}

export interface UseWatermarkSettingsResult {
  settings: WatermarkSettings;
  /** Merge a partial patch into the current settings (values are sanitised). */
  updateSettings: (patch: Partial<WatermarkSettings>) => void;
  resetSettings: () => void;
  /** Non-null when persisting failed; the session keeps working regardless. */
  storageError: string | null;
  clearStorageError: () => void;
}

/**
 * Settings are read synchronously so there is no restore race, and the write
 * effect skips the very first pass to avoid overwriting stored values with
 * defaults if the initial read failed.
 */
export function useWatermarkSettings(): UseWatermarkSettingsResult {
  const [settings, setSettings] = useState<WatermarkSettings>(readStoredSettings);
  const [storageError, setStorageError] = useState<string | null>(null);
  const isFirstPersist = useRef(true);

  useEffect(() => {
    if (isFirstPersist.current) {
      isFirstPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save watermark settings to localStorage:', error);
      setStorageError(
        'Watermark settings could not be saved to this browser. They will still apply to the current session.'
      );
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<WatermarkSettings>) => {
    setSettings((previous) => sanitizeWatermarkSettings({ ...previous, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_WATERMARK_SETTINGS });
  }, []);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  return { settings, updateSettings, resetSettings, storageError, clearStorageError };
}

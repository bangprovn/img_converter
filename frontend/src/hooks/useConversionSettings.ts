import { useState, useEffect } from 'react';
import { ImageFormat } from '@/lib/imageConverter';
import { FormatSettings, DEFAULT_SETTINGS, SettingsMode } from '@/types/conversionSettings';

const STORAGE_KEY = 'img-converter-settings';
const SETTINGS_MODE_KEY = 'img-converter-settings-mode';
const TARGET_FORMAT_KEY = 'img-converter-target-format';

export function useConversionSettings() {
  const [settings, setSettings] = useState<FormatSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return {
          jpeg: { ...DEFAULT_SETTINGS.jpeg, ...parsed.jpeg },
          png: { ...DEFAULT_SETTINGS.png, ...parsed.png },
          webp: { ...DEFAULT_SETTINGS.webp, ...parsed.webp },
          avif: { ...DEFAULT_SETTINGS.avif, ...parsed.avif },
        };
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  });

  const [settingsMode, setSettingsMode] = useState<SettingsMode>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_MODE_KEY);
      if (stored) {
        return stored as SettingsMode;
      }
    } catch (error) {
      console.error('Failed to load settings mode from localStorage:', error);
    }
    return 'global';
  });

  const [targetFormat, setTargetFormat] = useState<ImageFormat>(() => {
    try {
      const stored = localStorage.getItem(TARGET_FORMAT_KEY);
      if (stored && ['jpeg', 'png', 'webp', 'avif'].includes(stored)) {
        return stored as ImageFormat;
      }
    } catch (error) {
      console.error('Failed to load target format from localStorage:', error);
    }
    return 'webp';
  });

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  // Persist settings mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_MODE_KEY, settingsMode);
    } catch (error) {
      console.error('Failed to save settings mode to localStorage:', error);
    }
  }, [settingsMode]);

  // Persist target format to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TARGET_FORMAT_KEY, targetFormat);
    } catch (error) {
      console.error('Failed to save target format to localStorage:', error);
    }
  }, [targetFormat]);

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setSettingsMode('global');
    setTargetFormat('webp');
  };

  const exportSettings = () => {
    const data = {
      settings,
      settingsMode,
      targetFormat,
      version: '1.0',
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'img-converter-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          if (data.settings) {
            setSettings({
              jpeg: { ...DEFAULT_SETTINGS.jpeg, ...data.settings.jpeg },
              png: { ...DEFAULT_SETTINGS.png, ...data.settings.png },
              webp: { ...DEFAULT_SETTINGS.webp, ...data.settings.webp },
              avif: { ...DEFAULT_SETTINGS.avif, ...data.settings.avif },
            });
          }

          if (data.settingsMode) {
            setSettingsMode(data.settingsMode);
          }

          if (data.targetFormat) {
            setTargetFormat(data.targetFormat);
          }

          resolve();
        } catch (error) {
          reject(new Error('Invalid settings file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    settings,
    setSettings,
    settingsMode,
    setSettingsMode,
    targetFormat,
    setTargetFormat,
    resetSettings,
    exportSettings,
    importSettings,
  };
}

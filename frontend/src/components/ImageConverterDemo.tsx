/**
 * Image Converter Demo Component
 * Simplified batch processing with advanced settings toggle
 */

import { useState, useMemo } from 'react';
import { useConversionSettings } from '@/hooks/useConversionSettings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConversionOptions } from '@/components/conversion-options';
import { BatchProcessing } from '@/components/batch';
import { formatSettingsToConversionOptions } from '@/types/conversionSettings';
import { Download, Upload, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export function ImageConverterDemo() {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const {
    settings,
    setSettings,
    settingsMode,
    setSettingsMode,
    targetFormat,
    setTargetFormat,
    resetSettings,
    exportSettings,
    importSettings,
  } = useConversionSettings();

  const conversionOptions = useMemo(
    () => formatSettingsToConversionOptions(targetFormat, settings),
    [targetFormat, settings]
  );

  const handleImportSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importSettings(file);
      } catch (err) {
        console.error('Failed to import settings:', err);
      }
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Image Converter
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert and optimize your images with advanced compression
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            variant="outline"
            size="sm"
            className="border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            {showAdvancedSettings ? (
              <ChevronUp className="h-4 w-4 mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            Advanced Settings
          </Button>
          <Button
            onClick={resetSettings}
            variant="outline"
            size="sm"
            className="border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={exportSettings}
            variant="outline"
            size="sm"
            className="border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="hidden"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Advanced Settings Panel (Collapsible) */}
      {showAdvancedSettings && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
          <ConversionOptions
            targetFormat={targetFormat}
            onFormatChange={setTargetFormat}
            settings={settings}
            onSettingsChange={setSettings}
            settingsMode={settingsMode}
            onSettingsModeChange={setSettingsMode}
          />
        </Card>
      )}

      {/* Main Batch Processing Area */}
      <div className="rounded-lg border border-purple-100 dark:border-purple-900 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 dark:from-blue-950/10 dark:via-indigo-950/5 dark:to-purple-950/10 p-6">
        <BatchProcessing targetFormat={targetFormat} options={conversionOptions} />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ImageFormat } from '@/lib/imageConverter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormatSettings, PRESETS, SettingsMode } from '@/types/conversionSettings';
import { JPEGOptions } from './JPEGOptions';
import { PNGOptions } from './PNGOptions';
import { WebPOptions } from './WebPOptions';
import { AVIFOptions } from './AVIFOptions';
import { Settings2 } from 'lucide-react';

interface ConversionOptionsProps {
  targetFormat: ImageFormat;
  onFormatChange: (format: ImageFormat) => void;
  settings: FormatSettings;
  onSettingsChange: (settings: FormatSettings) => void;
  settingsMode: SettingsMode;
  onSettingsModeChange: (mode: SettingsMode) => void;
}

export function ConversionOptions({
  targetFormat,
  onFormatChange,
  settings,
  onSettingsChange,
  settingsMode,
  onSettingsModeChange,
}: ConversionOptionsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetChange = (presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      onSettingsChange(preset.settings);
      setActivePreset(presetName);
    }
  };

  const handleSettingsChange = (format: ImageFormat, formatSettings: any) => {
    onSettingsChange({
      ...settings,
      [format]: formatSettings,
    });
    setActivePreset(null); // Clear preset when manually changing settings
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Conversion Settings
          </CardTitle>
        </div>
        <CardDescription>
          Configure compression and quality settings for image conversion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selector */}
        <div className="space-y-2">
          <Label htmlFor="target-format">Target Format</Label>
          <Select value={targetFormat} onValueChange={(value) => onFormatChange(value as ImageFormat)}>
            <SelectTrigger id="target-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
              <SelectItem value="avif">AVIF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Settings Mode Toggle */}
        <div className="flex items-center justify-between rounded-lg border border-purple-200 dark:border-purple-800 p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
          <div className="space-y-0.5">
            <Label htmlFor="settings-mode" className="font-semibold">Apply to All Images</Label>
            <p className="text-sm text-muted-foreground">
              {settingsMode === 'global'
                ? 'Same settings for all images'
                : 'Configure settings per image'}
            </p>
          </div>
          <Switch
            id="settings-mode"
            checked={settingsMode === 'global'}
            onCheckedChange={(checked) =>
              onSettingsModeChange(checked ? 'global' : 'per-image')
            }
          />
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <Label className="font-semibold">Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant={activePreset === preset.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetChange(preset.name)}
                className={`h-auto flex-col items-start p-3 transition-all duration-300 ${
                  activePreset === preset.name
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0'
                    : 'border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                }`}
              >
                <span className="font-semibold">{preset.name}</span>
              </Button>
            ))}
          </div>
          {activePreset && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
              <p className="text-sm text-muted-foreground">
                {PRESETS.find((p) => p.name === activePreset)?.description}
              </p>
            </div>
          )}
        </div>

        {/* Format-Specific Settings */}
        <Tabs value={targetFormat} onValueChange={(value) => onFormatChange(value as ImageFormat)}>
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 p-1">
            <TabsTrigger value="jpeg" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">JPEG</TabsTrigger>
            <TabsTrigger value="png" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">PNG</TabsTrigger>
            <TabsTrigger value="webp" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">WebP</TabsTrigger>
            <TabsTrigger value="avif" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">AVIF</TabsTrigger>
          </TabsList>

          <TabsContent value="jpeg" className="mt-4">
            <JPEGOptions
              settings={settings.jpeg}
              onChange={(jpegSettings) => handleSettingsChange('jpeg', jpegSettings)}
            />
          </TabsContent>

          <TabsContent value="png" className="mt-4">
            <PNGOptions
              settings={settings.png}
              onChange={(pngSettings) => handleSettingsChange('png', pngSettings)}
            />
          </TabsContent>

          <TabsContent value="webp" className="mt-4">
            <WebPOptions
              settings={settings.webp}
              onChange={(webpSettings) => handleSettingsChange('webp', webpSettings)}
            />
          </TabsContent>

          <TabsContent value="avif" className="mt-4">
            <AVIFOptions
              settings={settings.avif}
              onChange={(avifSettings) => handleSettingsChange('avif', avifSettings)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

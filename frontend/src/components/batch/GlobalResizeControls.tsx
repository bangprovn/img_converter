/**
 * Global Resize Controls Component
 * Allows applying resize settings to all queued images at once
 */

import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RESIZE_PRESETS, type ResizePreset } from '@/lib/imageConverter';
import type { ImageResizeConfig } from '@/types/batchProcessing';

interface GlobalResizeControlsProps {
  onApply: (config: ImageResizeConfig) => void;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function GlobalResizeControls({
  onApply,
  defaultWidth = 1920,
  defaultHeight = 1080
}: GlobalResizeControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [preset, setPreset] = useState<ResizePreset>('original');
  const [width, setWidth] = useState<number>(defaultWidth);
  const [height, setHeight] = useState<number>(defaultHeight);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [dpi, setDpi] = useState<number>(72);

  const handlePresetChange = (value: ResizePreset) => {
    setPreset(value);
    if (value !== 'custom' && value !== 'original') {
      const { width: w, height: h } = RESIZE_PRESETS[value];
      setWidth(w);
      setHeight(h);
      setMaintainAspectRatio(false);
    }
  };

  const handleWidthChange = (value: number) => {
    setPreset('custom');
    setWidth(value);
    if (maintainAspectRatio && defaultWidth && defaultHeight) {
      const aspectRatio = defaultHeight / defaultWidth;
      setHeight(Math.round(value * aspectRatio));
    }
  };

  const handleHeightChange = (value: number) => {
    setPreset('custom');
    setHeight(value);
    if (maintainAspectRatio && defaultWidth && defaultHeight) {
      const aspectRatio = defaultWidth / defaultHeight;
      setWidth(Math.round(value * aspectRatio));
    }
  };

  const handleApply = () => {
    onApply({
      preset,
      width,
      height,
      maintainAspectRatio,
      dpi,
    });
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <Button
        onClick={() => setIsExpanded(true)}
        variant="outline"
        size="sm"
        className="border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
      >
        <Maximize2 className="h-4 w-4 mr-2" />
        Resize All Images
      </Button>
    );
  }

  return (
    <Card className="p-4 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Resize All Images
          </h3>
          <Button
            onClick={() => setIsExpanded(false)}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Resolution Preset</Label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RESIZE_PRESETS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Width (px)</Label>
              <Input
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                min={1}
                max={7680}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height (px)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                min={1}
                max={4320}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="global-aspect-ratio"
              checked={maintainAspectRatio}
              onCheckedChange={(checked) => setMaintainAspectRatio(checked as boolean)}
            />
            <Label htmlFor="global-aspect-ratio" className="text-xs cursor-pointer">
              Maintain aspect ratio
            </Label>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">DPI (dots per inch)</Label>
            <Input
              type="number"
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
              min={72}
              max={600}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Standard: 72 (web), 300 (print)
            </p>
          </div>

          <Button
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="sm"
          >
            Apply to All Images
          </Button>
        </div>
      </div>
    </Card>
  );
}

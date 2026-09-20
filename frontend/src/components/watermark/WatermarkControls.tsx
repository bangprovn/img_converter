import { AlignCenter, LayoutGrid, Move, RotateCcw, Slash, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  WATERMARK_POSITIONS,
  type WatermarkLayout,
  type WatermarkOutputFormat,
  type WatermarkPosition,
  type WatermarkSettings,
} from '@/types/watermark';

interface WatermarkControlsProps {
  settings: WatermarkSettings;
  disabled?: boolean;
  onChange: (patch: Partial<WatermarkSettings>) => void;
  onReset: () => void;
}

const LAYOUT_OPTIONS: ReadonlyArray<{
  value: WatermarkLayout;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'corner', label: 'Corner', icon: Move },
  { value: 'center', label: 'Center', icon: AlignCenter },
  { value: 'tiled', label: 'Tiled', icon: LayoutGrid },
  { value: 'diagonal', label: 'Diagonal', icon: Slash },
];

const POSITION_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  'middle-left': 'Middle left',
  center: 'Center',
  'middle-right': 'Middle right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

const POSITION_SHORT: Record<WatermarkPosition, string> = {
  'top-left': '↖',
  'top-center': '↑',
  'top-right': '↗',
  'middle-left': '←',
  center: '•',
  'middle-right': '→',
  'bottom-left': '↙',
  'bottom-center': '↓',
  'bottom-right': '↘',
};

interface SliderRowProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function SliderRow({ id, label, value, min, max, step, display, disabled, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <span className="text-xs tabular-nums text-muted-foreground">{display}</span>
      </div>
      <Slider
        id={id}
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) => {
          const first = next[0];
          if (typeof first === 'number') onChange(first);
        }}
        className="h-11 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
      />
    </div>
  );
}

export function WatermarkControls({
  settings,
  disabled = false,
  onChange,
  onReset,
}: WatermarkControlsProps) {
  const isLossy = settings.outputFormat === 'jpeg' || settings.outputFormat === 'webp';
  const showSpacing = settings.layout === 'tiled' || settings.layout === 'diagonal';

  return (
    <Card className="p-4 sm:p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Watermark style</h2>
        <Button
          type="button"
          variant="ghost"
          className="h-11 min-h-[44px]"
          onClick={onReset}
          disabled={disabled}
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Layout</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => {
            const isActive = settings.layout === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ layout: value })}
                disabled={disabled}
                aria-pressed={isActive}
                className={cn(
                  'flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
        {settings.layout === 'diagonal' && (
          <p className="text-xs text-muted-foreground">
            Diagonal uses a 45° base angle; the rotation slider offsets it.
          </p>
        )}
      </div>

      {settings.layout === 'corner' && (
        <div className="space-y-2">
          <Label className="text-sm">Position</Label>
          <div
            role="group"
            aria-label="Watermark position"
            className="grid grid-cols-3 gap-2 w-fit max-w-full"
          >
            {WATERMARK_POSITIONS.map((position) => {
              const isActive = settings.position === position;
              return (
                <button
                  key={position}
                  type="button"
                  onClick={() => onChange({ position })}
                  disabled={disabled}
                  aria-pressed={isActive}
                  aria-label={POSITION_LABELS[position]}
                  title={POSITION_LABELS[position]}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-md border text-base transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <span aria-hidden="true">{POSITION_SHORT[position]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <SliderRow
          id="watermark-opacity"
          label="Opacity"
          value={settings.opacity}
          min={0.05}
          max={1}
          step={0.01}
          display={`${Math.round(settings.opacity * 100)}%`}
          disabled={disabled}
          onChange={(opacity) => onChange({ opacity })}
        />
        <SliderRow
          id="watermark-size"
          label="Size"
          value={settings.size}
          min={1}
          max={100}
          step={1}
          display={`${Math.round(settings.size)}%`}
          disabled={disabled}
          onChange={(size) => onChange({ size })}
        />
        <SliderRow
          id="watermark-rotation"
          label="Rotation"
          value={settings.rotation}
          min={-180}
          max={180}
          step={1}
          display={`${Math.round(settings.rotation)}°`}
          disabled={disabled}
          onChange={(rotation) => onChange({ rotation })}
        />
        {showSpacing && (
          <SliderRow
            id="watermark-spacing"
            label="Spacing"
            value={settings.spacing}
            min={0}
            max={200}
            step={1}
            display={`${Math.round(settings.spacing)}%`}
            disabled={disabled}
            onChange={(spacing) => onChange({ spacing })}
          />
        )}
        {settings.layout === 'corner' && (
          <SliderRow
            id="watermark-margin"
            label="Margin"
            value={settings.margin}
            min={0}
            max={40}
            step={1}
            display={`${Math.round(settings.margin)}%`}
            disabled={disabled}
            onChange={(margin) => onChange({ margin })}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="watermark-output-format" className="text-sm">
            Output format
          </Label>
          <Select
            value={settings.outputFormat}
            disabled={disabled}
            onValueChange={(value) => onChange({ outputFormat: value as WatermarkOutputFormat })}
          >
            <SelectTrigger id="watermark-output-format" aria-label="Output format" className="h-11 min-h-[44px]">
              <SelectValue placeholder="PNG" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png" className="min-h-[44px]">
                PNG · transparency
              </SelectItem>
              <SelectItem value="jpeg" className="min-h-[44px]">
                JPEG · smaller file
              </SelectItem>
              <SelectItem value="webp" className="min-h-[44px]">
                WebP · modern
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.outputFormat === 'jpeg' && (
          <div className="space-y-2">
            <Label htmlFor="watermark-background" className="text-sm">
              Background
            </Label>
            <input
              id="watermark-background"
              type="color"
              value={settings.backgroundColor}
              disabled={disabled}
              onChange={(event) => onChange({ backgroundColor: event.target.value })}
              className="h-11 min-h-[44px] w-20 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {isLossy && (
        <SliderRow
          id="watermark-quality"
          label="Quality"
          value={settings.quality}
          min={0.1}
          max={1}
          step={0.01}
          display={`${Math.round(settings.quality * 100)}%`}
          disabled={disabled}
          onChange={(quality) => onChange({ quality })}
        />
      )}
    </Card>
  );
}

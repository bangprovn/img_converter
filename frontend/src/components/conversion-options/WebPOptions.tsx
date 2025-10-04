import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { WebPSettings } from '@/types/conversionSettings';

interface WebPOptionsProps {
  settings: WebPSettings;
  onChange: (settings: WebPSettings) => void;
}

export function WebPOptions({ settings, onChange }: WebPOptionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="webp-lossless">Lossless Mode</Label>
        <Switch
          id="webp-lossless"
          checked={settings.lossless}
          onCheckedChange={(checked) =>
            onChange({ ...settings, lossless: checked })
          }
        />
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Enable for perfect quality preservation (larger file size)
      </p>

      {!settings.lossless && (
        <div className="space-y-2">
          <Label htmlFor="webp-quality">Quality: {settings.quality}</Label>
          <Slider
            id="webp-quality"
            min={1}
            max={100}
            step={1}
            value={[settings.quality]}
            onValueChange={([value]) =>
              onChange({ ...settings, quality: value })
            }
          />
          <p className="text-sm text-muted-foreground">
            Higher quality = larger file size
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="webp-effort">
          Effort Level: {settings.effort}
        </Label>
        <Slider
          id="webp-effort"
          min={0}
          max={6}
          step={1}
          value={[settings.effort]}
          onValueChange={([value]) =>
            onChange({ ...settings, effort: value })
          }
        />
        <p className="text-sm text-muted-foreground">
          Higher = better compression, slower (0 = fastest, 6 = best)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webp-method">
          Compression Method: {settings.method}
        </Label>
        <Slider
          id="webp-method"
          min={0}
          max={6}
          step={1}
          value={[settings.method]}
          onValueChange={([value]) =>
            onChange({ ...settings, method: value })
          }
        />
        <p className="text-sm text-muted-foreground">
          Higher = better quality/compression ratio (0 = fastest, 6 = slowest)
        </p>
      </div>
    </div>
  );
}

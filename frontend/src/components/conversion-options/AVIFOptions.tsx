import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AVIFSettings } from '@/types/conversionSettings';
import { AlertCircle } from 'lucide-react';

interface AVIFOptionsProps {
  settings: AVIFSettings;
  onChange: (settings: AVIFSettings) => void;
  estimatedTime?: number;
}

export function AVIFOptions({ settings, onChange, estimatedTime }: AVIFOptionsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <AlertCircle className="h-4 w-4" />
        <span>AVIF encoding is slower than other formats</span>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="avif-lossless">Lossless Mode</Label>
        <Switch
          id="avif-lossless"
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
          <Label htmlFor="avif-quality">Quality: {settings.quality}</Label>
          <Slider
            id="avif-quality"
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
        <div className="flex items-center justify-between">
          <Label htmlFor="avif-speed">
            Speed Level: {settings.speed}
          </Label>
          {estimatedTime && (
            <span className="text-sm text-muted-foreground">
              Est. time: {estimatedTime.toFixed(1)}s
            </span>
          )}
        </div>
        <Slider
          id="avif-speed"
          min={0}
          max={9}
          step={1}
          value={[settings.speed]}
          onValueChange={([value]) =>
            onChange({ ...settings, speed: value })
          }
        />
        <p className="text-sm text-muted-foreground">
          Higher = faster encoding, larger files (0 = slowest/best, 9 = fastest)
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="text-sm font-medium">Speed Guide</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 0-3: Best quality, very slow</li>
          <li>• 4-6: Balanced (recommended)</li>
          <li>• 7-9: Fast encoding, larger files</li>
        </ul>
      </div>
    </div>
  );
}

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { PNGSettings } from '@/types/conversionSettings';

interface PNGOptionsProps {
  settings: PNGSettings;
  onChange: (settings: PNGSettings) => void;
  estimatedTime?: number;
}

export function PNGOptions({ settings, onChange, estimatedTime }: PNGOptionsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="png-compression">
            Compression Level: {settings.compressionLevel}
          </Label>
          {estimatedTime && (
            <span className="text-sm text-muted-foreground">
              Est. time: {estimatedTime.toFixed(1)}s
            </span>
          )}
        </div>
        <Slider
          id="png-compression"
          min={0}
          max={9}
          step={1}
          value={[settings.compressionLevel]}
          onValueChange={([value]) =>
            onChange({ ...settings, compressionLevel: value })
          }
        />
        <p className="text-sm text-muted-foreground">
          Higher = smaller file, slower compression (0 = no compression, 9 = maximum)
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="png-interlace"
          checked={settings.interlace}
          onCheckedChange={(checked) =>
            onChange({ ...settings, interlace: checked as boolean })
          }
        />
        <Label htmlFor="png-interlace" className="cursor-pointer">
          Interlacing
        </Label>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Progressive loading for PNG images (Adam7 interlacing)
      </p>

      <div className="rounded-lg border p-4 space-y-2">
        <h4 className="text-sm font-medium">Compression Tips</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Level 0-3: Fast compression, larger files</li>
          <li>• Level 4-6: Balanced (recommended)</li>
          <li>• Level 7-9: Best compression, slower</li>
        </ul>
      </div>
    </div>
  );
}

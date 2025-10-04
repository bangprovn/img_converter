import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JPEGSettings } from '@/types/conversionSettings';

interface JPEGOptionsProps {
  settings: JPEGSettings;
  onChange: (settings: JPEGSettings) => void;
  estimatedSize?: number;
}

export function JPEGOptions({ settings, onChange, estimatedSize }: JPEGOptionsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="jpeg-quality">Quality: {settings.quality}</Label>
          {estimatedSize && (
            <span className="text-sm text-muted-foreground">
              Est. size: {formatFileSize(estimatedSize)}
            </span>
          )}
        </div>
        <Slider
          id="jpeg-quality"
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

      <div className="flex items-center space-x-2">
        <Checkbox
          id="jpeg-progressive"
          checked={settings.progressive}
          onCheckedChange={(checked) =>
            onChange({ ...settings, progressive: checked as boolean })
          }
        />
        <Label htmlFor="jpeg-progressive" className="cursor-pointer">
          Progressive encoding
        </Label>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Loads gradually from low to high quality
      </p>

      <div className="space-y-2">
        <Label htmlFor="jpeg-chroma">Chroma Subsampling</Label>
        <Select
          value={settings.chromaSubsampling}
          onValueChange={(value: JPEGSettings['chromaSubsampling']) =>
            onChange({ ...settings, chromaSubsampling: value })
          }
        >
          <SelectTrigger id="jpeg-chroma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4:4:4">4:4:4 (Best quality, larger size)</SelectItem>
            <SelectItem value="4:2:2">4:2:2 (Balanced)</SelectItem>
            <SelectItem value="4:2:0">4:2:0 (Smaller size)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Controls color information compression
        </p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * ImagePreview Component
 * Shows individual image with preview thumbnail, status, progress bar, and actions
 */

import { memo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Download, RotateCcw, X, Maximize2 } from 'lucide-react';
import type { ImageProcessingItem, ImageResizeConfig } from '@/types/batchProcessing';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileSize, getCompressionRatio } from '@/lib/imageProcessing';
import type { ImageFormat, ResizePreset } from '@/lib/imageConverter';
import { RESIZE_PRESETS, getImageDimensions } from '@/lib/imageConverter';
import type { ConversionOptions } from '@/lib/imageProcessing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ImagePreviewProps {
  item: ImageProcessingItem;
  onDownload?: (item: ImageProcessingItem) => void;
  onRetry?: (id: string, targetFormat: ImageFormat, options: ConversionOptions) => void;
  onCancel?: (id: string) => void;
  onResizeConfigChange?: (id: string, config: ImageResizeConfig) => void;
  targetFormat?: ImageFormat;
  options?: ConversionOptions;
}

export const ImagePreview = memo(function ImagePreview({
  item,
  onDownload,
  onRetry,
  onCancel,
  onResizeConfigChange,
  targetFormat,
  options,
}: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [preset, setPreset] = useState<ResizePreset>(item.resizeConfig?.preset || 'original');
  const [width, setWidth] = useState<number>(item.resizeConfig?.width || item.originalDimensions?.width || 0);
  const [height, setHeight] = useState<number>(item.resizeConfig?.height || item.originalDimensions?.height || 0);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(item.resizeConfig?.maintainAspectRatio ?? true);
  const [dpi, setDpi] = useState<number>(item.resizeConfig?.dpi || 72);

  useEffect(() => {
    // Create a preview URL from the file
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);

    // Load original dimensions if not already set
    if (!item.originalDimensions) {
      getImageDimensions(item.file).then(dims => {
        if (!width || !height) {
          setWidth(dims.width);
          setHeight(dims.height);
        }
      }).catch(console.error);
    }

    return () => {
      // Clean up the URL when component unmounts
      URL.revokeObjectURL(url);
    };
  }, [item.file]);

  const handlePresetChange = (value: ResizePreset) => {
    setPreset(value);
    if (value === 'original') {
      if (item.originalDimensions) {
        setWidth(item.originalDimensions.width);
        setHeight(item.originalDimensions.height);
      }
      setMaintainAspectRatio(true);
    } else if (value !== 'custom') {
      const { width: w, height: h } = RESIZE_PRESETS[value];
      setWidth(w);
      setHeight(h);
      setMaintainAspectRatio(false);
    }
  };

  const handleWidthChange = (value: number) => {
    setPreset('custom');
    setWidth(value);
    if (maintainAspectRatio && item.originalDimensions) {
      const aspectRatio = item.originalDimensions.height / item.originalDimensions.width;
      setHeight(Math.round(value * aspectRatio));
    }
  };

  const handleHeightChange = (value: number) => {
    setPreset('custom');
    setHeight(value);
    if (maintainAspectRatio && item.originalDimensions) {
      const aspectRatio = item.originalDimensions.width / item.originalDimensions.height;
      setWidth(Math.round(value * aspectRatio));
    }
  };

  const handleAspectRatioToggle = (checked: boolean) => {
    setMaintainAspectRatio(checked);
    if (checked && item.originalDimensions) {
      setPreset('custom');
      const aspectRatio = item.originalDimensions.height / item.originalDimensions.width;
      setHeight(Math.round(width * aspectRatio));
    }
  };

  const handleApplyResize = () => {
    if (onResizeConfigChange) {
      onResizeConfigChange(item.id, {
        preset,
        width,
        height,
        maintainAspectRatio,
        dpi,
      });
    }
    setResizeDialogOpen(false);
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
      case 'processing':
        return 'Processing';
      default:
        return 'Queued';
    }
  };

  const getStatusColor = () => {
    switch (item.status) {
      case 'complete':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const compressionRatio = item.result ? getCompressionRatio(item.result) : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-indigo-100 dark:border-indigo-900">
      {/* Image Preview Thumbnail */}
      {previewUrl && (
        <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
          <img
            src={previewUrl}
            alt={item.file.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Status Badge Overlay */}
          <div className="absolute top-2 left-2">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
              {getStatusIcon()}
            </div>
          </div>
          {/* Actions Overlay */}
          <div className="absolute top-2 right-2 flex gap-1">
            {(item.status === 'queued' || item.status === 'processing') && onResizeConfigChange && (
              <Dialog open={resizeDialogOpen} onOpenChange={setResizeDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
                    title="Resize Settings"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Resize Image</DialogTitle>
                    <DialogDescription>
                      Configure dimensions and DPI for {item.file.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Resolution Preset</Label>
                      <Select value={preset} onValueChange={handlePresetChange}>
                        <SelectTrigger>
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

                    {item.originalDimensions && (
                      <div className="text-xs text-muted-foreground">
                        Original: {item.originalDimensions.width}x{item.originalDimensions.height}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Width (px)</Label>
                        <Input
                          type="number"
                          value={width}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          min={1}
                          max={7680}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (px)</Label>
                        <Input
                          type="number"
                          value={height}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          min={1}
                          max={4320}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`aspect-ratio-${item.id}`}
                        checked={maintainAspectRatio}
                        onCheckedChange={(checked) => handleAspectRatioToggle(checked as boolean)}
                      />
                      <Label htmlFor={`aspect-ratio-${item.id}`} className="text-sm cursor-pointer">
                        Maintain aspect ratio
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label>DPI (dots per inch)</Label>
                      <Input
                        type="number"
                        value={dpi}
                        onChange={(e) => setDpi(Number(e.target.value))}
                        min={72}
                        max={600}
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard: 72 (web), 300 (print)
                      </p>
                    </div>

                    <Button
                      onClick={handleApplyResize}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Apply Resize Settings
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {item.status === 'complete' && onDownload && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDownload(item)}
                className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {item.status === 'error' && onRetry && targetFormat && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onRetry(item.id, targetFormat, options || {})}
                className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
                title="Retry"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            {item.status === 'queued' && onCancel && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onCancel(item.id)}
                className="h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h4 className="text-sm font-medium truncate" title={item.file.name}>
            {item.file.name}
          </h4>
          <p className={`text-xs ${getStatusColor()}`}>{getStatusText()}</p>
        </div>

        {/* Progress Bar */}
        {item.status === 'processing' && (
          <div className="mb-3">
            <Progress value={item.progress} className="h-2" />
          </div>
        )}

        {/* Info */}
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          {/* Original size */}
          <div className="flex justify-between">
            <span>Original:</span>
            <span className="font-medium">{formatFileSize(item.file.size)}</span>
          </div>

          {/* Original dimensions */}
          {item.originalDimensions && (
            <div className="flex justify-between">
              <span>Size:</span>
              <span className="font-medium">
                {item.originalDimensions.width}x{item.originalDimensions.height}
              </span>
            </div>
          )}

          {/* Resize config */}
          {item.resizeConfig && item.resizeConfig.preset !== 'original' && (
            <div className="flex justify-between">
              <span>Resize to:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {item.resizeConfig.width}x{item.resizeConfig.height}
              </span>
            </div>
          )}

          {/* Converted size and compression */}
          {item.result && (
            <>
              <div className="flex justify-between">
                <span>Converted:</span>
                <span className="font-medium">{formatFileSize(item.result.convertedSize)}</span>
              </div>
              {compressionRatio !== null && (
                <div className="flex justify-between">
                  <span>Saved:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {compressionRatio.toFixed(2)}%
                  </span>
                </div>
              )}
            </>
          )}

          {/* Processing time */}
          {item.processingTime && (
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-medium">{(item.processingTime / 1000).toFixed(2)}s</span>
            </div>
          )}

          {/* Error message */}
          {item.error && (
            <div className="text-red-600 dark:text-red-400 mt-1 text-xs">{item.error}</div>
          )}
        </div>
      </div>
    </Card>
  );
});

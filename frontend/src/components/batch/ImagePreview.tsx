/**
 * ImagePreview Component
 * Shows individual image with preview thumbnail, status, progress bar, and actions
 */

import { memo, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Download, RotateCcw, X } from 'lucide-react';
import type { ImageProcessingItem } from '@/types/batchProcessing';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatFileSize, getCompressionRatio } from '@/lib/imageProcessing';
import type { ImageFormat } from '@/lib/imageConverter';
import type { ConversionOptions } from '@/lib/imageProcessing';

interface ImagePreviewProps {
  item: ImageProcessingItem;
  onDownload?: (item: ImageProcessingItem) => void;
  onRetry?: (id: string, targetFormat: ImageFormat, options: ConversionOptions) => void;
  onCancel?: (id: string) => void;
  targetFormat?: ImageFormat;
  options?: ConversionOptions;
}

export const ImagePreview = memo(function ImagePreview({
  item,
  onDownload,
  onRetry,
  onCancel,
  targetFormat,
  options,
}: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Create a preview URL from the file
    const url = URL.createObjectURL(item.file);
    setPreviewUrl(url);

    return () => {
      // Clean up the URL when component unmounts
      URL.revokeObjectURL(url);
    };
  }, [item.file]);

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

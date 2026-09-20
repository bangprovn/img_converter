import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Images, Loader2, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/watermark';
import {
  MAX_SOURCE_BYTES,
  WATERMARK_IMAGE_ACCEPT,
  type WatermarkSourceImage,
} from '@/types/watermark';

interface SourceImagesPanelProps {
  sources: WatermarkSourceImage[];
  activeId: string | null;
  busy?: boolean;
  onFiles: (files: File[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function describeRejections(rejections: FileRejection[]): string {
  const names = rejections.slice(0, 3).map((rejection) => rejection.file.name);
  const suffix = rejections.length > names.length ? ` +${rejections.length - names.length} more` : '';
  return `${names.join(', ')}${suffix}`;
}

export function SourceImagesPanel({
  sources,
  activeId,
  busy = false,
  onFiles,
  onSelect,
  onRemove,
  onClear,
}: SourceImagesPanelProps) {
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some files were rejected',
          description: `${describeRejections(fileRejections)} — use PNG, JPG, WebP, AVIF, GIF or BMP under ${formatBytes(
            MAX_SOURCE_BYTES
          )}.`,
        });
      }
      if (acceptedFiles.length > 0) {
        onFiles(acceptedFiles);
      }
    },
    [onFiles, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: WATERMARK_IMAGE_ACCEPT,
    maxSize: MAX_SOURCE_BYTES,
    multiple: true,
    disabled: busy,
  });

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Images className="h-5 w-5 text-blue-500 shrink-0" />
          <h2 className="text-base font-semibold">Source images</h2>
          {sources.length > 0 && (
            <span className="text-xs text-muted-foreground">({sources.length})</span>
          )}
        </div>
        {sources.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 min-h-[44px] border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={onClear}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Clear all</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600',
          busy && 'opacity-50 pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        {busy ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Reading images…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="h-8 w-8 text-blue-500" />
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop images here' : 'Drag & drop images, or tap to browse'}
            </p>
            <p className="text-xs text-muted-foreground break-words">
              PNG, JPG, WebP, AVIF, GIF, BMP · up to {formatBytes(MAX_SOURCE_BYTES)} each
            </p>
          </div>
        )}
      </div>

      {sources.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sources.map((source) => {
            const isActive = source.id === activeId;
            return (
              <div
                key={source.id}
                className={cn(
                  'relative min-w-0 rounded-lg border bg-card overflow-hidden',
                  isActive ? 'border-primary ring-2 ring-primary/40' : 'border-border'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(source.id)}
                  aria-pressed={isActive}
                  aria-label={`Select ${source.name}`}
                  className="block w-full text-left"
                >
                  <div className="aspect-square bg-muted">
                    <img
                      src={source.previewUrl}
                      alt={source.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2 min-w-0">
                    <p className="truncate text-xs font-medium" title={source.name}>
                      {source.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {source.width}×{source.height} · {formatBytes(source.size)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(source.id)}
                  aria-label={`Remove ${source.name}`}
                  disabled={busy}
                  className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/80 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

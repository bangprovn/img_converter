import { useCallback } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { AlertTriangle, ImagePlus, Loader2, RefreshCw, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/watermark';
import {
  MAX_LOGO_BYTES,
  WATERMARK_IMAGE_ACCEPT,
  type WatermarkLogoState,
} from '@/types/watermark';
import { CHECKERBOARD_STYLE } from './checkerboard';

interface LogoPanelProps {
  logo: WatermarkLogoState | null;
  busy?: boolean;
  storageNotice: string | null;
  onDismissNotice: () => void;
  onSelect: (file: File) => void;
  onDelete: () => void;
}

export function LogoPanel({
  logo,
  busy = false,
  storageNotice,
  onDismissNotice,
  onSelect,
  onDelete,
}: LogoPanelProps) {
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const [first] = fileRejections;
        toast({
          variant: 'destructive',
          title: 'Logo was rejected',
          description: `${first.file.name} must be a PNG, JPG, WebP, AVIF, GIF or BMP under ${formatBytes(
            MAX_LOGO_BYTES
          )}.`,
        });
      }
      const [file] = acceptedFiles;
      if (file) onSelect(file);
    },
    [onSelect, toast]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: WATERMARK_IMAGE_ACCEPT,
    maxSize: MAX_LOGO_BYTES,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: busy,
  });

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2 min-w-0">
        <ImagePlus className="h-5 w-5 text-purple-500 shrink-0" />
        <h2 className="text-base font-semibold">Logo</h2>
        {logo && !storageNotice && (
          <span className="text-xs text-muted-foreground">(saved)</span>
        )}
      </div>

      {storageNotice && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{storageNotice}</p>
          <button
            type="button"
            onClick={onDismissNotice}
            aria-label="Dismiss storage notice"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'rounded-lg border-2 border-dashed p-4 transition-colors',
          isDragActive
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
            : 'border-gray-300 dark:border-gray-700',
          busy && 'opacity-50'
        )}
      >
        <input {...getInputProps()} />

        {logo ? (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border"
              style={CHECKERBOARD_STYLE}
            >
              <img src={logo.url} alt={logo.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium" title={logo.name}>
                {logo.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {logo.width}×{logo.height} · {formatBytes(logo.size)}
              </p>
              <p className="text-xs text-muted-foreground break-words">
                Transparency is preserved when exporting to PNG or WebP.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-[44px]"
                  onClick={open}
                  disabled={busy}
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-[44px] border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={onDelete}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <ImagePlus className="h-8 w-8 text-purple-500" />
            <p className="text-sm text-muted-foreground break-words">
              {isDragActive
                ? 'Drop the logo here'
                : `Drag & drop a logo, or choose a file (max ${formatBytes(MAX_LOGO_BYTES)})`}
            </p>
            <Button type="button" variant="outline" className="h-11 min-h-[44px]" onClick={open} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1.5" />}
              Choose logo
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG with transparency gives the best results.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

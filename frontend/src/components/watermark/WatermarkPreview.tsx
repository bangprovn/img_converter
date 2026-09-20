import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { canvasToBlob, renderWatermark } from '@/lib/watermark';
import type { WatermarkLogoState, WatermarkSettings, WatermarkSourceImage } from '@/types/watermark';
import { CHECKERBOARD_STYLE } from './checkerboard';

/** Longest preview side in px; the download is always rendered at full resolution. */
const PREVIEW_MAX_DIMENSION = 1280;
const PREVIEW_DEBOUNCE_MS = 120;

interface WatermarkPreviewProps {
  source: WatermarkSourceImage | null;
  logo: WatermarkLogoState | null;
  settings: WatermarkSettings;
  /** Reports the current render error (or null) so the page can gate downloads. */
  onError?: (message: string | null) => void;
}

export function WatermarkPreview({ source, logo, settings, onError }: WatermarkPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const replacePreview = useCallback((next: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = next;
    setPreviewUrl(next);
  }, []);

  useEffect(() => {
    if (!source || !logo) {
      replacePreview(null);
      setError(null);
      onErrorRef.current?.(null);
      setIsRendering(false);
      return;
    }

    let cancelled = false;
    setIsRendering(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const longestSide = Math.max(source.width, source.height);
          const scale =
            longestSide > PREVIEW_MAX_DIMENSION ? PREVIEW_MAX_DIMENSION / longestSide : 1;
          const canvas = renderWatermark({
            source: source.image,
            sourceWidth: Math.max(1, Math.round(source.width * scale)),
            sourceHeight: Math.max(1, Math.round(source.height * scale)),
            logo: logo.image,
            logoWidth: logo.width,
            logoHeight: logo.height,
            settings,
            outputFormat: 'png',
          });
          const blob = await canvasToBlob(canvas, 'image/png');
          if (cancelled) return;
          replacePreview(URL.createObjectURL(blob));
          setError(null);
          onErrorRef.current?.(null);
        } catch (renderError) {
          if (cancelled) return;
          const message =
            renderError instanceof Error ? renderError.message : 'Failed to render the preview.';
          replacePreview(null);
          setError(message);
          onErrorRef.current?.(message);
        } finally {
          if (!cancelled) setIsRendering(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [source, logo, settings, replacePreview]);

  // Revoke the final URL when the component unmounts.
  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    },
    []
  );

  const canRender = Boolean(source && logo);

  return (
    <Card className="p-4 sm:p-5 space-y-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-5 w-5 text-emerald-500 shrink-0" />
        <h2 className="text-base font-semibold">Live preview</h2>
        {source && (
          <span className="truncate text-xs text-muted-foreground">
            {source.width}×{source.height}
          </span>
        )}
      </div>

      <div
        className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border"
        style={CHECKERBOARD_STYLE}
      >
        {canRender && previewUrl ? (
          <img
            src={previewUrl}
            alt="Watermarked preview"
            className="block max-h-[60vh] w-auto max-w-full object-contain"
          />
        ) : (
          <p className="max-w-full break-words px-4 py-10 text-center text-sm text-muted-foreground">
            {!source
              ? 'Add a source image to see the watermark preview.'
              : 'Add a logo to see the watermark preview.'}
          </p>
        )}

        {canRender && isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{error}</p>
        </div>
      )}
    </Card>
  );
}

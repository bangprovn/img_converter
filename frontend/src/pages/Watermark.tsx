import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, FileArchive, Loader2, X } from 'lucide-react';
import JSZip from 'jszip';

import { Button } from '@/components/ui/button';
import { LogoPanel } from '@/components/watermark/LogoPanel';
import { SourceImagesPanel } from '@/components/watermark/SourceImagesPanel';
import { WatermarkControls } from '@/components/watermark/WatermarkControls';
import { WatermarkPreview } from '@/components/watermark/WatermarkPreview';
import { useToast } from '@/hooks/use-toast';
import { useWatermarkSettings } from '@/hooks/useWatermarkSettings';
import { deleteLogo, isIndexedDBAvailable, loadLogo, saveLogo } from '@/lib/logoStore';
import {
  buildOutputFilename,
  downloadBlob,
  formatBytes,
  loadImage,
  renderWatermarkToBlob,
} from '@/lib/watermark';
import type { WatermarkLogoState, WatermarkSourceImage } from '@/types/watermark';

let idSequence = 0;

function createId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now()}-${idSequence}`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function Watermark() {
  const { toast } = useToast();
  const { settings, updateSettings, resetSettings, storageError, clearStorageError } =
    useWatermarkSettings();

  const [sources, setSources] = useState<WatermarkSourceImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logo, setLogo] = useState<WatermarkLogoState | null>(null);
  const [isReadingSources, setIsReadingSources] = useState(false);
  const [isReadingLogo, setIsReadingLogo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [logoStorageNotice, setLogoStorageNotice] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Refs used for object-URL cleanup on unmount.
  const sourcesRef = useRef<WatermarkSourceImage[]>(sources);
  sourcesRef.current = sources;
  const logoUrlRef = useRef<string | null>(null);
  // Set as soon as the user touches the logo so the async IDB restore cannot clobber it.
  const logoUserOverrideRef = useRef(false);

  const setLogoState = useCallback((next: WatermarkLogoState | null) => {
    if (logoUrlRef.current && logoUrlRef.current !== next?.url) {
      URL.revokeObjectURL(logoUrlRef.current);
    }
    logoUrlRef.current = next?.url ?? null;
    setLogo(next);
  }, []);

  // Restore the saved logo on mount. The override ref + cancel flag make this race safe.
  useEffect(() => {
    let cancelled = false;

    if (!isIndexedDBAvailable()) {
      setLogoStorageNotice(
        'This browser cannot save the logo for later visits. It will still work for the current session.'
      );
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const record = await loadLogo();
        if (cancelled || logoUserOverrideRef.current || !record) return;
        const image = await loadImage(record.blob);
        if (cancelled || logoUserOverrideRef.current) return;
        const url = URL.createObjectURL(record.blob);
        setLogoState({
          name: record.name,
          type: record.type,
          size: record.size,
          width: record.width || image.naturalWidth,
          height: record.height || image.naturalHeight,
          url,
          blob: record.blob,
          image,
        });
        setLogoStorageNotice(null);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to restore watermark logo:', error);
        setLogoStorageNotice(
          'The previously saved logo could not be restored. You can still add one for this session.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setLogoState]);

  // Revoke every object URL owned by the page when it unmounts.
  useEffect(
    () => () => {
      sourcesRef.current.forEach((source) => URL.revokeObjectURL(source.previewUrl));
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
    },
    []
  );

  const activeSource = useMemo(
    () => sources.find((source) => source.id === activeId) ?? sources[0] ?? null,
    [sources, activeId]
  );

  const handleAddSources = useCallback(
    async (files: File[]) => {
      setIsReadingSources(true);
      const decoded: WatermarkSourceImage[] = [];
      const failures: string[] = [];

      for (const file of files) {
        try {
          const image = await loadImage(file);
          if (!image.naturalWidth || !image.naturalHeight) {
            throw new Error('Empty image');
          }
          decoded.push({
            id: createId('source'),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            previewUrl: URL.createObjectURL(file),
            width: image.naturalWidth,
            height: image.naturalHeight,
            image,
          });
        } catch (error) {
          console.error(`Failed to read ${file.name}:`, error);
          failures.push(file.name);
        }
      }

      if (decoded.length > 0) {
        setSources((previous) => [...previous, ...decoded]);
        setActiveId((current) => current ?? decoded[0].id);
        toast({
          title: decoded.length === 1 ? 'Image added' : 'Images added',
          description: `${decoded.length} image${decoded.length === 1 ? '' : 's'} ready to watermark.`,
        });
      }

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Could not read some files',
          description: `${failures.slice(0, 3).join(', ')}${
            failures.length > 3 ? ` +${failures.length - 3} more` : ''
          } could not be decoded.`,
        });
      }

      setIsReadingSources(false);
    },
    [toast]
  );

  const handleSelectSource = useCallback((id: string) => setActiveId(id), []);

  const handleRemoveSource = useCallback(
    (id: string) => {
      const target = sources.find((source) => source.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const remaining = sources.filter((source) => source.id !== id);
      setSources(remaining);
      setActiveId((current) => (current === id ? remaining[0]?.id ?? null : current));
    },
    [sources]
  );

  const handleClearSources = useCallback(() => {
    sources.forEach((source) => URL.revokeObjectURL(source.previewUrl));
    setSources([]);
    setActiveId(null);
  }, [sources]);

  const handleSelectLogo = useCallback(
    async (file: File) => {
      logoUserOverrideRef.current = true;
      setIsReadingLogo(true);
      try {
        const image = await loadImage(file);
        if (!image.naturalWidth || !image.naturalHeight) {
          throw new Error('The logo file appears to be empty.');
        }
        setLogoState({
          name: file.name,
          type: file.type,
          size: file.size,
          width: image.naturalWidth,
          height: image.naturalHeight,
          url: URL.createObjectURL(file),
          blob: file,
          image,
        });

        try {
          await saveLogo({
            name: file.name,
            type: file.type,
            size: file.size,
            width: image.naturalWidth,
            height: image.naturalHeight,
            updatedAt: Date.now(),
            blob: file,
          });
          setLogoStorageNotice(null);
        } catch (storageFailure) {
          console.error('Failed to persist watermark logo:', storageFailure);
          setLogoStorageNotice(
            `The logo works for this session, but it could not be saved to this browser: ${errorMessage(
              storageFailure,
              'storage error'
            )}`
          );
        }

        toast({ title: 'Logo ready', description: file.name });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Invalid logo',
          description: errorMessage(error, 'The selected file could not be used as a logo.'),
        });
      } finally {
        setIsReadingLogo(false);
      }
    },
    [setLogoState, toast]
  );

  const handleDeleteLogo = useCallback(async () => {
    logoUserOverrideRef.current = true;
    setLogoState(null);
    setLogoStorageNotice(null);
    try {
      await deleteLogo();
    } catch (error) {
      console.error('Failed to delete watermark logo:', error);
      setLogoStorageNotice(
        'The logo was removed for this session, but it could not be deleted from browser storage.'
      );
    }
  }, [setLogoState]);

  const renderSource = useCallback(
    async (source: WatermarkSourceImage) => {
      if (!logo) {
        throw new Error('Add a logo before exporting.');
      }
      return renderWatermarkToBlob({
        source: source.image,
        sourceWidth: source.width,
        sourceHeight: source.height,
        logo: logo.image,
        logoWidth: logo.width,
        logoHeight: logo.height,
        settings,
        outputFormat: settings.outputFormat,
        backgroundColor: settings.backgroundColor,
      });
    },
    [logo, settings]
  );

  const canDownload = Boolean(activeSource && logo && !previewError && !isDownloading);

  const handleDownload = useCallback(async () => {
    if (!activeSource || !logo) return;
    setIsDownloading(true);
    try {
      const blob = await renderSource(activeSource);
      downloadBlob(blob, buildOutputFilename(activeSource.name, settings.outputFormat));
      toast({
        title: 'Download ready',
        description: `${buildOutputFilename(activeSource.name, settings.outputFormat)} · ${formatBytes(
          blob.size
        )}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: errorMessage(error, 'The image could not be exported.'),
      });
    } finally {
      setIsDownloading(false);
    }
  }, [activeSource, logo, renderSource, settings.outputFormat, toast]);

  const handleDownloadAll = useCallback(async () => {
    if (sources.length === 0 || !logo) return;
    setIsDownloading(true);
    try {
      if (sources.length === 1) {
        const blob = await renderSource(sources[0]);
        downloadBlob(blob, buildOutputFilename(sources[0].name, settings.outputFormat));
        toast({ title: 'Download ready', description: formatBytes(blob.size) });
        return;
      }

      const zip = new JSZip();
      const seen = new Map<string, number>();

      for (let index = 0; index < sources.length; index++) {
        setDownloadProgress(`Rendering ${index + 1} of ${sources.length}…`);
        const blob = await renderSource(sources[index]);
        let filename = buildOutputFilename(sources[index].name, settings.outputFormat);
        const duplicateCount = seen.get(filename) ?? 0;
        seen.set(filename, duplicateCount + 1);
        if (duplicateCount > 0) {
          filename = filename.replace(/(\.[^.]+)$/, `-${duplicateCount + 1}$1`);
        }
        zip.file(filename, blob);
      }

      setDownloadProgress('Packaging ZIP…');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'watermarked-images.zip');
      toast({
        title: 'Download ready',
        description: `${sources.length} images · ${formatBytes(zipBlob.size)}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: errorMessage(error, 'The images could not be exported.'),
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, [logo, renderSource, settings.outputFormat, sources, toast]);

  const disabledReason = !activeSource
    ? 'Add a source image to enable download.'
    : !logo
      ? 'Add a logo to enable download.'
      : previewError
        ? 'Resolve the preview error to enable download.'
        : null;

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
            Watermark
          </h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground break-words">
            Stamp a logo onto your images at full resolution — everything runs locally in your browser.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button
            type="button"
            className="h-11 min-h-[44px]"
            onClick={handleDownload}
            disabled={!canDownload}
          >
            {isDownloading && !downloadProgress ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Download
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-[44px]"
            onClick={handleDownloadAll}
            disabled={sources.length === 0 || !logo || isDownloading || Boolean(previewError)}
          >
            <FileArchive className="h-4 w-4 mr-1.5" />
            Download all
          </Button>
        </div>
      </div>

      {disabledReason && (
        <p className="text-xs text-muted-foreground break-words" role="status">
          {disabledReason}
        </p>
      )}

      {downloadProgress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="min-w-0 break-words">{downloadProgress}</span>
        </div>
      )}

      {storageError && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{storageError}</p>
          <button
            type="button"
            onClick={clearStorageError}
            aria-label="Dismiss settings notice"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <WatermarkPreview
            source={activeSource}
            logo={logo}
            settings={settings}
            onError={setPreviewError}
          />
          <SourceImagesPanel
            sources={sources}
            activeId={activeSource?.id ?? null}
            busy={isReadingSources}
            onFiles={handleAddSources}
            onSelect={handleSelectSource}
            onRemove={handleRemoveSource}
            onClear={handleClearSources}
          />
        </div>
        <div className="min-w-0 space-y-4">
          <LogoPanel
            logo={logo}
            busy={isReadingLogo}
            storageNotice={logoStorageNotice}
            onDismissNotice={() => setLogoStorageNotice(null)}
            onSelect={handleSelectLogo}
            onDelete={() => {
              void handleDeleteLogo();
            }}
          />
          <WatermarkControls
            settings={settings}
            disabled={isDownloading}
            onChange={updateSettings}
            onReset={resetSettings}
          />
        </div>
      </div>
    </div>
  );
}

export default Watermark;

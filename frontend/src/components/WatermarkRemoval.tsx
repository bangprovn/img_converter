import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Brush, Download, Eraser, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import {
  getInpaintingModelInfo,
  inpaint,
  MASK_HOLE,
  MASK_KNOWN,
  type InpaintingProgress,
} from '@/lib/inpainting';

/** Longest edge used for editing/inference (keeps memory predictable). */
const MAX_WORK_DIMENSION = 2048;
/** Overlay tint used to preview the region that will be inpainted. */
const MARK_FILL = 'rgba(239, 68, 68, 0.45)';

type Tool = 'brush' | 'erase';
type Status = 'idle' | 'processing' | 'done' | 'error';

interface LoadedImage {
  name: string;
  width: number;
  height: number;
  url: string;
  /** Decoded pixels, consumed (and closed) by the canvas-mount effect. */
  bitmap: ImageBitmap;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export function WatermarkRemoval() {
  const { toast } = useToast();

  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const markCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const runTokenRef = useRef(0);
  const processingRef = useRef(false);
  const pendingBitmapRef = useRef<ImageBitmap | null>(null);

  const [image, setImage] = useState<LoadedImage | null>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(48);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<InpaintingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hasMarks, setHasMarks] = useState(false);

  const modelInfo = useMemo(() => getInpaintingModelInfo(), []);

  useEffect(() => {
    return () => {
      if (image?.url) URL.revokeObjectURL(image.url);
    };
  }, [image?.url]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const syncOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const mark = markCanvasRef.current;
    if (!overlay || !mark) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.drawImage(mark, 0, 0);
  }, []);

  // The canvas workspace only mounts once `image` is set, so the canvases do not
  // exist while the async loader runs. Populate them here, after the commit that
  // mounted them, then release the decoded bitmap.
  useEffect(() => {
    if (!image) {
      pendingBitmapRef.current?.close?.();
      pendingBitmapRef.current = null;
      return;
    }
    const base = baseCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    const mask = maskCanvasRef.current;
    const mark = markCanvasRef.current;
    if (!base || !overlay || !mask || !mark) return;

    const { width, height } = image;
    base.width = width;
    base.height = height;
    overlay.width = width;
    overlay.height = height;
    mask.width = width;
    mask.height = height;
    mark.width = width;
    mark.height = height;

    const baseCtx = base.getContext('2d');
    const maskCtx = mask.getContext('2d');
    const markCtx = mark.getContext('2d');
    if (!baseCtx || !maskCtx || !markCtx) return;

    baseCtx.clearRect(0, 0, width, height);
    baseCtx.drawImage(image.bitmap, 0, 0, width, height);
    image.bitmap.close?.();
    if (pendingBitmapRef.current === image.bitmap) pendingBitmapRef.current = null;

    // 255 (white) = keep original, 0 (black) = inpaint hole.
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, width, height);

    markCtx.clearRect(0, 0, width, height);
    syncOverlay();
    setHasMarks(false);
  }, [image, syncOverlay]);

  // Release a decoded bitmap that never reached the effect (e.g. unmount).
  useEffect(
    () => () => {
      pendingBitmapRef.current?.close?.();
    },
    []
  );

  const resetResult = useCallback(() => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setShowResult(false);
    setStatus('idle');
    setError(null);
  }, []);

  const loadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Unsupported file',
          description: 'Please choose an image file',
          variant: 'destructive',
        });
        return;
      }

      const token = ++runTokenRef.current;
      resetResult();

      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch (error) {
        if (runTokenRef.current === token) {
          toast({
            title: 'Could not read image',
            description:
              error instanceof Error ? error.message : 'The selected image could not be decoded.',
            variant: 'destructive',
          });
        }
        return;
      }

      // A newer selection superseded this one while the bitmap was decoding —
      // never let the older decode clobber the newer image/canvases.
      if (runTokenRef.current !== token) {
        bitmap.close?.();
        return;
      }

      const scale = Math.min(1, MAX_WORK_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      // Hand the decoded bitmap to the canvas-mount effect via state. Drop any
      // earlier bitmap that never got consumed.
      pendingBitmapRef.current?.close?.();
      pendingBitmapRef.current = bitmap;

      setImage({
        name: file.name,
        width,
        height,
        url: URL.createObjectURL(file),
        bitmap,
      });
      setShowResult(false);
    },
    [resetResult, toast],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) void loadImage(file);
    },
    [loadImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
  });

  const pointerToCanvas = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const paintSegment = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const mask = maskCanvasRef.current;
      const mark = markCanvasRef.current;
      if (!mask || !mark) return;
      const maskCtx = mask.getContext('2d');
      const markCtx = mark.getContext('2d');
      if (!maskCtx || !markCtx) return;

      const lineWidth = Math.max(1, brushSize);

      maskCtx.save();
      maskCtx.lineWidth = lineWidth;
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';
      maskCtx.strokeStyle = tool === 'brush' ? '#000000' : '#ffffff';
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.beginPath();
      maskCtx.moveTo(from.x, from.y);
      maskCtx.lineTo(to.x, to.y);
      maskCtx.stroke();
      maskCtx.restore();

      markCtx.save();
      markCtx.lineWidth = lineWidth;
      markCtx.lineCap = 'round';
      markCtx.lineJoin = 'round';
      if (tool === 'brush') {
        markCtx.globalCompositeOperation = 'source-over';
        markCtx.strokeStyle = MARK_FILL;
      } else {
        markCtx.globalCompositeOperation = 'destination-out';
        markCtx.strokeStyle = '#000000';
      }
      markCtx.beginPath();
      markCtx.moveTo(from.x, from.y);
      markCtx.lineTo(to.x, to.y);
      markCtx.stroke();
      markCtx.restore();

      syncOverlay();
    },
    [brushSize, syncOverlay, tool],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (status === 'processing' || !image) return;
      const point = pointerToCanvas(event);
      if (!point) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;
      lastPointRef.current = point;
      paintSegment(point, point);
      setHasMarks(true);
      if (resultUrl) resetResult();
    },
    [image, paintSegment, pointerToCanvas, resetResult, resultUrl, status],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const point = pointerToCanvas(event);
      const last = lastPointRef.current;
      if (!point || !last) return;
      paintSegment(last, point);
      lastPointRef.current = point;
    },
    [paintSegment, pointerToCanvas],
  );

  const finishStroke = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const mask = maskCanvasRef.current;
    const mark = markCanvasRef.current;
    if (!mask || !mark || !image) return;
    const maskCtx = mask.getContext('2d');
    const markCtx = mark.getContext('2d');
    if (!maskCtx || !markCtx) return;
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    markCtx.clearRect(0, 0, mark.width, mark.height);
    syncOverlay();
    setHasMarks(false);
    resetResult();
  }, [image, resetResult, syncOverlay]);

  const runInpainting = useCallback(async () => {
    if (!image || processingRef.current) return;
    const base = baseCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!base || !mask) return;

    const baseCtx = base.getContext('2d', { willReadFrequently: true });
    const maskCtx = mask.getContext('2d', { willReadFrequently: true });
    if (!baseCtx || !maskCtx) return;

    const imageData = baseCtx.getImageData(0, 0, image.width, image.height);
    const maskData = maskCtx.getImageData(0, 0, image.width, image.height);
    const maskBytes = new Uint8Array(image.width * image.height);
    let holes = 0;
    for (let i = 0; i < maskBytes.length; i += 1) {
      // Red channel is 0 for holes, 255 for the preserved region.
      const value = maskData.data[i * 4] >= 128 ? MASK_KNOWN : MASK_HOLE;
      maskBytes[i] = value;
      if (value === MASK_HOLE) holes += 1;
    }

    if (holes === 0) {
      toast({
        title: 'Nothing to remove',
        description: 'Paint over the watermark or object first.',
        variant: 'destructive',
      });
      return;
    }

    const token = ++runTokenRef.current;
    processingRef.current = true;
    setStatus('processing');
    setError(null);
    setProgress(null);

    try {
      const result = await inpaint(
        {
          image: { data: imageData.data, width: image.width, height: image.height },
          mask: maskBytes,
        },
        (next) => {
          if (runTokenRef.current !== token) return;
          setProgress(next);
        },
      );

      if (runTokenRef.current !== token) return;

      const out = document.createElement('canvas');
      out.width = result.width;
      out.height = result.height;
      const outCtx = out.getContext('2d');
      if (!outCtx) throw new Error('Could not create the result canvas');
      outCtx.putImageData(
        new ImageData(new Uint8ClampedArray(result.data), result.width, result.height),
        0,
        0,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        out.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Failed to encode the result'))),
          'image/png',
        ),
      );

      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setShowResult(true);
      setStatus('done');
      setProgress(null);
    } catch (err) {
      if (runTokenRef.current !== token) return;
      setStatus('error');
      setProgress(null);
      const message = err instanceof Error ? err.message : 'Inpainting failed';
      setError(message);
      toast({ title: 'Inpainting failed', description: message, variant: 'destructive' });
    } finally {
      if (runTokenRef.current === token) processingRef.current = false;
    }
  }, [image, toast]);

  const handleDownload = useCallback(() => {
    if (!resultUrl || !image) return;
    const base = image.name.replace(/\.[^.]+$/, '');
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `${base}-watermark-removed.png`;
    link.click();
  }, [image, resultUrl]);

  const isProcessing = status === 'processing';
  const downloadPercent =
    progress?.phase === 'download' && progress.progress >= 0
      ? Math.round(progress.progress * 100)
      : null;

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Watermark &amp; Object Removal
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Paint over a watermark or unwanted object and remove it locally with MI-GAN
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Model: {modelInfo.modelId} · {modelInfo.license} · {modelInfo.attribution}
        </p>
      </div>

      {!image ? (
        <Card
          {...getRootProps()}
          className={`p-8 sm:p-12 border-2 border-dashed transition-all cursor-pointer ${
            isDragActive
              ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-rose-400 dark:hover:border-rose-600'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4 text-center">
            <Upload className="h-12 w-12 text-rose-500" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop an image here' : 'Drag & drop an image here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse (PNG, JPG, JPEG, WebP, BMP)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Processed locally on your device · max {MAX_WORK_DIMENSION}px working size
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Canvas workspace */}
          <Card className="p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={tool === 'brush' ? 'default' : 'outline'}
                onClick={() => setTool('brush')}
                disabled={isProcessing}
              >
                <Brush className="h-4 w-4 mr-2" /> Remove
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tool === 'erase' ? 'default' : 'outline'}
                onClick={() => setTool('erase')}
                disabled={isProcessing}
              >
                <Eraser className="h-4 w-4 mr-2" /> Restore
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClear}
                disabled={isProcessing || !hasMarks}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  runTokenRef.current += 1;
                  processingRef.current = false;
                  resetResult();
                  setImage(null);
                }}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" /> New image
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="brush-size" className="text-xs whitespace-nowrap">
                Brush {brushSize}px
              </Label>
              <Slider
                id="brush-size"
                min={4}
                max={200}
                step={2}
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0] ?? 24)}
                disabled={isProcessing}
                className="max-w-xs"
              />
            </div>

            {/* Both canvases share the intrinsic image size; CSS scales them together. */}
            <div className="relative inline-block max-w-full select-none">
              <canvas
                ref={baseCanvasRef}
                className="block max-w-full h-auto rounded-md"
                style={{ touchAction: 'none' }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute left-0 top-0 w-full h-full rounded-md cursor-crosshair"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerLeave={finishStroke}
                onPointerCancel={finishStroke}
              />
              {showResult && resultUrl && (
                <img
                  src={resultUrl}
                  alt="Inpainting result"
                  className="absolute left-0 top-0 w-full h-full rounded-md bg-white pointer-events-none"
                />
              )}
            </div>

            {/* Offscreen working canvases required by the editor: `mask` holds the
                inpaint holes and `mark` the red preview tint. They must be mounted
                for the canvas-mount effect to size/paint the visible layers. */}
            <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />
            <canvas ref={markCanvasRef} className="hidden" aria-hidden="true" />

            {isProcessing && (
              <div className="space-y-1">
                {downloadPercent !== null ? (
                  <>
                    <Progress value={downloadPercent} />
                    <p className="text-xs text-muted-foreground">
                      Downloading MI-GAN model… {downloadPercent}%
                      {progress?.loadedBytes
                        ? ` (${formatBytes(progress.loadedBytes)}${progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''})`
                        : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <Progress value={undefined} className="animate-pulse" />
                    <p className="text-xs text-muted-foreground">Running MI-GAN inpainting…</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="break-words">{error}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => void runInpainting()}
                    disabled={isProcessing}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Sidebar */}
          <Card className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium truncate">{image.name}</p>
              <p className="text-xs text-muted-foreground">
                {image.width} × {image.height}px
              </p>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => void runInpainting()}
              disabled={isProcessing || !hasMarks}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
                </>
              ) : (
                'Remove selected area'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDownload}
              disabled={!resultUrl || isProcessing}
            >
              <Download className="h-4 w-4 mr-2" /> Download result
            </Button>

            {resultUrl && (
              <div className="space-y-2">
                <Label className="text-xs">Preview</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={showResult ? 'outline' : 'default'}
                    onClick={() => setShowResult(false)}
                    className="flex-1"
                  >
                    Mask view
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showResult ? 'default' : 'outline'}
                    onClick={() => setShowResult(true)}
                    className="flex-1"
                  >
                    Result
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Paint over the watermark with <strong>Remove</strong>, then run the removal. Pixels
              outside the painted area are copied from the original image unchanged.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

export default WatermarkRemoval;

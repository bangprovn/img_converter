import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Download, Upload, Loader2, FileImage, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';

interface GifOptimizationOptions {
  level: number;
  lossy: number;
  colors: number;
  scale: number;
}

export function GifOptimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [options, setOptions] = useState<GifOptimizationOptions>({
    level: 2,
    lossy: 20,
    colors: 256,
    scale: 1,
  });
  const [result, setResult] = useState<{ file: File; originalSize: number } | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const gifFile = acceptedFiles[0];
    if (gifFile && gifFile.type === 'image/gif') {
      setFile(gifFile);
      setResult(null);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a GIF file',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/gif': ['.gif'] },
    multiple: false,
  });

  const optimizeGif = async (gifFile: File, opts: GifOptimizationOptions): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;

        try {
          const gif = parseGIF(arrayBuffer);
          const frames = decompressFrames(gif, true);

          if (frames.length === 0) {
            reject(new Error('No frames found in GIF'));
            return;
          }

          // Create canvas for processing frames
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Apply scaling
          const scaleFactor = opts.scale;
          const width = Math.round(frames[0].dims.width * scaleFactor);
          const height = Math.round(frames[0].dims.height * scaleFactor);

          canvas.width = width;
          canvas.height = height;

          // Initialize GIF encoder
          const encoder = new GIF({
            workers: 2,
            quality: opts.level === 1 ? 20 : opts.level === 2 ? 10 : 1,
            workerScript: '/gif.worker.js',
            width,
            height,
          });

          // Process each frame
          for (const frame of frames) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) continue;

            tempCanvas.width = frame.dims.width;
            tempCanvas.height = frame.dims.height;

            const imageData = tempCtx.createImageData(frame.dims.width, frame.dims.height);
            imageData.data.set(frame.patch);
            tempCtx.putImageData(imageData, 0, 0);

            // Scale to target size
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(tempCanvas, 0, 0, width, height);

            encoder.addFrame(ctx, { copy: true, delay: frame.delay || 100 });
          }

          encoder.on('finished', (blob: Blob) => {
            const optimizedFile = new File([blob], gifFile.name, { type: 'image/gif' });
            resolve(optimizedFile);
          });

          encoder.on('error', (error: Error) => {
            reject(error);
          });

          encoder.render();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read GIF file'));
      reader.readAsArrayBuffer(gifFile);
    });
  };

  const handleOptimize = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const originalSize = file.size;
      const optimized = await optimizeGif(file, options);

      setResult({ file: optimized, originalSize });
      toast({
        title: 'Success',
        description: `GIF optimized successfully! ${formatFileSize(originalSize)} → ${formatFileSize(optimized.size)}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to optimize GIF',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const compressionRatio = result
    ? Math.round((1 - result.file.size / result.originalSize) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20'
            : 'border-pink-200 dark:border-pink-800 hover:border-pink-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-pink-400 mb-4" />
        {file ? (
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-2">
              Drop your GIF here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported format: GIF
            </p>
          </div>
        )}
      </div>

      {file && (
        <>
          <div className="space-y-6 p-4 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg border border-pink-200 dark:border-pink-800">
            <div className="flex items-center gap-2 text-pink-600">
              <Settings2 className="h-5 w-5" />
              <h3 className="font-medium">Optimization Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Optimization Level</Label>
                  <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {options.level}
                  </span>
                </div>
                <Slider
                  value={[options.level]}
                  onValueChange={(v) => setOptions({ ...options, level: v[0] })}
                  min={1}
                  max={3}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher levels apply more aggressive optimization
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Lossy Compression</Label>
                  <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {options.lossy}
                  </span>
                </div>
                <Slider
                  value={[options.lossy || 0]}
                  onValueChange={(v) => setOptions({ ...options, lossy: v[0] })}
                  min={0}
                  max={200}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values = smaller file size but lower quality
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Color Palette Size</Label>
                  <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {options.colors}
                  </span>
                </div>
                <Slider
                  value={[options.colors || 256]}
                  onValueChange={(v) => setOptions({ ...options, colors: v[0] })}
                  min={2}
                  max={256}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Fewer colors = smaller file size
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Scale</Label>
                  <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {options.scale}x
                  </span>
                </div>
                <Slider
                  value={[options.scale || 1]}
                  onValueChange={(v) => setOptions({ ...options, scale: v[0] })}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Resize the GIF dimensions
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleOptimize}
            disabled={processing}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              'Optimize GIF'
            )}
          </Button>
        </>
      )}

      {result && (
        <div className="space-y-4 pt-4 border-t border-pink-200 dark:border-pink-800">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg">
            <div className="flex items-center gap-3">
              <FileImage className="h-10 w-10 text-pink-600" />
              <div>
                <p className="font-medium text-sm">{result.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(result.file.size)} ({compressionRatio}% smaller)
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex gap-2">
            {file && (
              <img
                src={URL.createObjectURL(file)}
                alt="Original"
                className="w-1/2 rounded border border-pink-200 dark:border-pink-800"
              />
            )}
            <img
              src={URL.createObjectURL(result.file)}
              alt="Optimized"
              className="w-1/2 rounded border border-pink-200 dark:border-pink-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Original</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Optimized</p>
              <p className="font-medium text-green-600">{formatFileSize(result.file.size)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload, Loader2, Grid3x3, Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { parseGIF, decompressFrames } from 'gifuct-js';
import JSZip from 'jszip';

type ImageFormat = 'png' | 'webp';

export function GifToSpritesheet() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [columns, setColumns] = useState(8);
  const [compressionLevel, setCompressionLevel] = useState(6);
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [scale, setScale] = useState(100);
  const [fps, setFps] = useState(12);
  const [spritesheet, setSpritesheet] = useState<{
    image: string;
    blob: Blob;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    cols: number;
    rows: number;
    format: ImageFormat;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const spritesheetImageRef = useRef<HTMLImageElement>();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const gifFile = acceptedFiles[0];
    if (gifFile && gifFile.type === 'image/gif') {
      setFile(gifFile);
      setSpritesheet(null);
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

  const extractFrames = async (gifFile: File): Promise<ImageData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;

        try {
          const gif = parseGIF(arrayBuffer);
          const frames = decompressFrames(gif, true);

          if (frames.length === 0) {
            reject(new Error('No frames found in GIF'));
            return;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = frames[0].dims.width;
          canvas.height = frames[0].dims.height;

          const imageDataFrames: ImageData[] = [];

          // Convert each frame to ImageData
          frames.forEach((frame) => {
            const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
            imageData.data.set(frame.patch);
            imageDataFrames.push(imageData);
          });

          resolve(imageDataFrames);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read GIF file'));
      reader.readAsArrayBuffer(gifFile);
    });
  };

  const handleGenerate = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      // Load GIF and extract frames
      const frames = await extractFrames(file);

      if (frames.length === 0) {
        throw new Error('No frames extracted from GIF');
      }

      const originalWidth = frames[0].width;
      const originalHeight = frames[0].height;

      // Apply scaling
      const scaleFactor = scale / 100;
      const frameWidth = Math.round(originalWidth * scaleFactor);
      const frameHeight = Math.round(originalHeight * scaleFactor);

      const cols = Math.min(columns, frames.length);
      const rows = Math.ceil(frames.length / cols);

      // Create spritesheet canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      canvas.width = frameWidth * cols;
      canvas.height = frameHeight * rows;

      // Draw frames onto spritesheet with scaling
      frames.forEach((frame, index) => {
        const x = (index % cols) * frameWidth;
        const y = Math.floor(index / cols) * frameHeight;

        // Create temporary canvas for scaling
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        tempCtx.putImageData(frame, 0, 0);

        // Draw scaled frame to main canvas
        ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, x, y, frameWidth, frameHeight);
      });

      // Convert to blob with compression
      const mimeType = imageFormat === 'webp' ? 'image/webp' : 'image/png';
      const quality = imageFormat === 'webp' ? compressionLevel / 10 : compressionLevel / 9;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          mimeType,
          quality
        );
      });

      const dataUrl = URL.createObjectURL(blob);

      setSpritesheet({
        image: dataUrl,
        blob,
        frames: frames.length,
        frameWidth,
        frameHeight,
        cols,
        rows,
        format: imageFormat,
      });

      // Preload spritesheet image for animation
      const img = new Image();
      img.onload = () => {
        spritesheetImageRef.current = img;
        setCurrentFrame(0);
        setIsPlaying(true);
      };
      img.src = dataUrl;

      toast({
        title: 'Success',
        description: `Spritesheet created with ${frames.length} frames`,
      });
    } catch (error) {
      console.error('Spritesheet generation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate spritesheet',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };


  // Animation loop for preview
  useEffect(() => {
    if (!spritesheet || !canvasRef.current || !spritesheetImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameDelay = 1000 / fps;
    let localFrame = currentFrame;
    let isAnimating = true;

    const animate = (timestamp: number) => {
      if (!isAnimating) return;

      const elapsed = timestamp - lastFrameTimeRef.current;

      if (isPlaying && elapsed > frameDelay && spritesheetImageRef.current?.complete) {
        lastFrameTimeRef.current = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const col = localFrame % spritesheet.cols;
        const row = Math.floor(localFrame / spritesheet.cols);

        ctx.drawImage(
          spritesheetImageRef.current,
          col * spritesheet.frameWidth,
          row * spritesheet.frameHeight,
          spritesheet.frameWidth,
          spritesheet.frameHeight,
          0,
          0,
          spritesheet.frameWidth,
          spritesheet.frameHeight
        );

        localFrame = (localFrame + 1) % spritesheet.frames;
        setCurrentFrame(localFrame);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation with a slight delay to ensure image is loaded
    const timeoutId = setTimeout(() => {
      lastFrameTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 100);

    return () => {
      isAnimating = false;
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [spritesheet, isPlaying, fps]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentFrame(0);
  };

  const handleDownloadSpritesheet = () => {
    if (!spritesheet) return;

    const extension = spritesheet.format === 'webp' ? 'webp' : 'png';
    const a = document.createElement('a');
    a.href = spritesheet.image;
    a.download = `spritesheet.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadZip = async () => {
    if (!spritesheet) return;

    try {
      const zip = new JSZip();
      const extension = spritesheet.format === 'webp' ? 'webp' : 'png';
      const filename = `spritesheet.${extension}`;

      // Add spritesheet image
      zip.file(filename, spritesheet.blob);

      // Add HTML file
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spritesheet Animation</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #1a1a1a;
            font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
            text-align: center;
        }

        canvas {
            border: 2px solid #666;
            background: #000;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
        }

        .controls {
            margin-top: 20px;
            color: #fff;
        }

        button {
            padding: 8px 16px;
            margin: 0 5px;
            background: #ec4899;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        button:hover {
            background: #db2777;
        }

        .info {
            margin-top: 10px;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <canvas id="canvas" width="${spritesheet.frameWidth}" height="${spritesheet.frameHeight}"></canvas>
        <div class="controls">
            <button id="playPause">Pause</button>
            <button id="reset">Reset</button>
            <div class="info">
                Frame: <span id="frameNum">1</span> / ${spritesheet.frames} |
                FPS: <span id="fps">${fps}</span>
            </div>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Load spritesheet
        const spritesheet = new Image();
        spritesheet.src = '${filename}';

        const frameWidth = ${spritesheet.frameWidth};
        const frameHeight = ${spritesheet.frameHeight};
        const totalFrames = ${spritesheet.frames};
        const cols = ${spritesheet.cols};

        let currentFrame = 0;
        let isPlaying = true;
        let fps = ${fps};
        let lastFrameTime = 0;

        spritesheet.onload = () => {
            animate(0);
        };

        function animate(timestamp) {
            requestAnimationFrame(animate);

            if (!isPlaying) return;

            const elapsed = timestamp - lastFrameTime;
            const frameDelay = 1000 / fps;

            if (elapsed > frameDelay) {
                lastFrameTime = timestamp;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const col = currentFrame % cols;
                const row = Math.floor(currentFrame / cols);

                ctx.drawImage(
                    spritesheet,
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight,
                    0,
                    0,
                    frameWidth,
                    frameHeight
                );

                document.getElementById('frameNum').textContent = currentFrame + 1;

                currentFrame = (currentFrame + 1) % totalFrames;
            }
        }

        document.getElementById('playPause').addEventListener('click', () => {
            isPlaying = !isPlaying;
            document.getElementById('playPause').textContent = isPlaying ? 'Pause' : 'Play';
        });

        document.getElementById('reset').addEventListener('click', () => {
            currentFrame = 0;
        });
    </script>
</body>
</html>`;

      zip.file('animation.html', htmlContent);

      // Add README
      const readme = `# Spritesheet Animation

## Files
- ${filename}: The spritesheet image (${spritesheet.frames} frames)
- animation.html: HTML file with canvas animation

## Usage
1. Open animation.html in your web browser
2. The animation will play automatically
3. Use the controls to pause/play and reset

## Spritesheet Details
- Format: ${spritesheet.format.toUpperCase()}
- Frames: ${spritesheet.frames}
- Grid: ${spritesheet.cols} × ${spritesheet.rows}
- Frame Size: ${spritesheet.frameWidth} × ${spritesheet.frameHeight}px
- Total Size: ${spritesheet.frameWidth * spritesheet.cols} × ${spritesheet.frameHeight * spritesheet.rows}px
- FPS: ${fps}

## Integration
To use in your own project, reference the ${filename} and use the animation code from animation.html.
`;

      zip.file('README.md', readme);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'spritesheet-animation.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'ZIP file downloaded successfully',
      });
    } catch (error) {
      console.error('ZIP generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate ZIP file',
        variant: 'destructive',
      });
    }
  };

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
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Output Format</Label>
              <RadioGroup value={imageFormat} onValueChange={(v) => setImageFormat(v as ImageFormat)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="png" id="format-png" />
                  <Label htmlFor="format-png" className="font-normal cursor-pointer">
                    PNG (Lossless, larger file)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="webp" id="format-webp" />
                  <Label htmlFor="format-webp" className="font-normal cursor-pointer">
                    WebP (Lossy, smaller file, better compression)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Spritesheet Columns</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value) || 8)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Number of frames per row in the spritesheet
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Scale: {scale}%
                </Label>
              </div>
              <Slider
                min={10}
                max={200}
                step={10}
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
              />
              <p className="text-xs text-muted-foreground">
                Resize the spritesheet resolution (100% = original size)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Quality: {compressionLevel}
                </Label>
              </div>
              <Slider
                min={0}
                max={9}
                step={1}
                value={[compressionLevel]}
                onValueChange={([value]) => setCompressionLevel(value)}
              />
              <p className="text-xs text-muted-foreground">
                {imageFormat === 'webp'
                  ? 'Higher = better quality, larger file (0 = low quality, 9 = high quality)'
                  : 'Higher = smaller file, slower compression (0 = no compression, 9 = maximum)'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Animation FPS: {fps}
                </Label>
              </div>
              <Slider
                min={1}
                max={60}
                step={1}
                value={[fps]}
                onValueChange={([value]) => setFps(value)}
              />
              <p className="text-xs text-muted-foreground">
                Frames per second for the animation (1-60 fps)
              </p>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={processing}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Spritesheet...
              </>
            ) : (
              <>
                <Grid3x3 className="mr-2 h-4 w-4" />
                Generate Spritesheet
              </>
            )}
          </Button>
        </>
      )}

      {spritesheet && (
        <div className="space-y-4 pt-4 border-t border-pink-200 dark:border-pink-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Animation Preview</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePlayPause}
                  className="h-8"
                >
                  {isPlaying ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  className="h-8"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="border border-pink-200 dark:border-pink-800 rounded-lg p-4 bg-gray-900 flex justify-center">
              <canvas
                ref={canvasRef}
                width={spritesheet.frameWidth}
                height={spritesheet.frameHeight}
                className="border border-pink-300 dark:border-pink-700"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Frame: {currentFrame + 1} / {spritesheet.frames} | FPS: {fps}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Full Spritesheet</Label>
            <div className="border border-pink-200 dark:border-pink-800 rounded-lg p-4 bg-gray-900 overflow-auto">
              <img
                src={spritesheet.image}
                alt="Spritesheet"
                className="max-w-full h-auto"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Frames: {spritesheet.frames}</div>
              <div>Grid: {spritesheet.cols} × {spritesheet.rows}</div>
              <div>Frame Size: {spritesheet.frameWidth} × {spritesheet.frameHeight}</div>
              <div>Total Size: {spritesheet.frameWidth * spritesheet.cols} × {spritesheet.frameHeight * spritesheet.rows}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownloadSpritesheet}
              variant="outline"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {spritesheet.format.toUpperCase()} Only
            </Button>
            <Button
              onClick={handleDownloadZip}
              className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download ZIP ({spritesheet.format.toUpperCase()} + HTML)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

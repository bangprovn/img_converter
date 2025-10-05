import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileVideo, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Checkbox } from '@/components/ui/checkbox';

type ResizePreset = 'custom' | '1920x1080' | '1280x720' | '854x480' | '640x360' | '426x240';

const RESIZE_PRESETS: Record<ResizePreset, { label: string; width: number; height: number }> = {
  custom: { label: 'Custom', width: 0, height: 0 },
  '1920x1080': { label: '1920x1080 (Full HD)', width: 1920, height: 1080 },
  '1280x720': { label: '1280x720 (HD)', width: 1280, height: 720 },
  '854x480': { label: '854x480 (480p)', width: 854, height: 480 },
  '640x360': { label: '640x360 (360p)', width: 640, height: 360 },
  '426x240': { label: '426x240 (240p)', width: 426, height: 240 },
};

export function VideoResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [preset, setPreset] = useState<ResizePreset>('1280x720');
  const [width, setWidth] = useState<number>(1280);
  const [height, setHeight] = useState<number>(720);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [result, setResult] = useState<{ file: Blob; originalSize: number } | null>(null);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const ffmpegRef = useRef(new FFmpeg());
  const { toast } = useToast();
  const startTimeRef = useRef<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>('');

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg.loaded) {
        setFfmpegReady(true);
        return;
      }

      setLoadingFFmpeg(true);
      try {
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

        ffmpeg.on('log', ({ message }) => {
          setLogs(prev => [...prev, message]);
          console.log('[FFmpeg]', message);
        });

        ffmpeg.on('progress', ({ progress: p, time }) => {
          const percentage = Math.round(p * 100);
          setProgress(percentage);

          if (percentage % 10 === 0 || percentage === 100) {
            const logMsg = `Progress: ${percentage}% (time: ${(time / 1000000).toFixed(2)}s)`;
            setLogs(prev => {
              const last = prev[prev.length - 1];
              if (last?.startsWith('Progress:') && last.includes(`${percentage}%`)) {
                return prev;
              }
              return [...prev, logMsg];
            });
          }

          if (startTimeRef.current > 0 && percentage > 0) {
            const elapsed = Date.now() - startTimeRef.current;
            const total = (elapsed / percentage) * 100;
            const remaining = Math.max(0, total - elapsed);
            setTimeLeft(remaining);
          }
        });

        setLogs(prev => [...prev, 'Loading FFmpeg core...']);
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLogs(prev => [...prev, 'FFmpeg core loaded successfully!']);
        setFfmpegReady(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load FFmpeg';
        setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
        console.error('Failed to load FFmpeg:', error);
        toast({
          title: 'Error',
          description: 'Failed to load video resizer engine',
          variant: 'destructive',
        });
      } finally {
        setLoadingFFmpeg(false);
      }
    };

    loadFFmpeg();
  }, [toast]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Get video dimensions when file is loaded
  useEffect(() => {
    if (file && videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        setOriginalWidth(video.videoWidth);
        setOriginalHeight(video.videoHeight);
      };
    }
  }, [file]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFile = acceptedFiles[0];
    if (videoFile && videoFile.type.startsWith('video/')) {
      // Revoke old URL
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }

      videoUrlRef.current = URL.createObjectURL(videoFile);
      setFile(videoFile);
      setResult(null);
      setLogs([]);
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a video file',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v'] },
    multiple: false,
  });

  const handlePresetChange = (value: ResizePreset) => {
    setPreset(value);
    if (value !== 'custom') {
      const { width: w, height: h } = RESIZE_PRESETS[value];
      setWidth(w);
      setHeight(h);
      setMaintainAspectRatio(false);
    }
  };

  const handleAspectRatioToggle = (checked: boolean) => {
    setMaintainAspectRatio(checked);
    if (checked && originalWidth > 0 && originalHeight > 0) {
      // Recalculate height based on current width and original aspect ratio
      setPreset('custom');
      const aspectRatio = originalHeight / originalWidth;
      setHeight(Math.round(width * aspectRatio));
    }
  };

  const handleWidthChange = (value: number) => {
    setPreset('custom');
    setWidth(value);
    if (maintainAspectRatio && originalWidth > 0 && originalHeight > 0) {
      const aspectRatio = originalHeight / originalWidth;
      setHeight(Math.round(value * aspectRatio));
    }
  };

  const handleHeightChange = (value: number) => {
    setPreset('custom');
    setHeight(value);
    if (maintainAspectRatio && originalWidth > 0 && originalHeight > 0) {
      const aspectRatio = originalWidth / originalHeight;
      setWidth(Math.round(value * aspectRatio));
    }
  };

  const handleResize = async () => {
    if (!file || !ffmpegReady || width <= 0 || height <= 0) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, `Resizing video to ${width}x${height}...`]);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const originalSize = file.size;

      setLogs(prev => [...prev, 'Writing input file...']);
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      setLogs(prev => [...prev, 'Input file written successfully']);

      setLogs(prev => [...prev, 'Executing FFmpeg resize operation...']);

      // Ensure dimensions are even numbers (required for some codecs)
      const evenWidth = Math.floor(width / 2) * 2;
      const evenHeight = Math.floor(height / 2) * 2;

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `scale=${evenWidth}:${evenHeight}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-c:a', 'copy',
        '-y',
        'output.mp4'
      ]);

      setLogs(prev => [...prev, 'FFmpeg resizing complete']);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });

      setResult({ file: blob, originalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Resizing complete! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`]);

      toast({
        title: 'Success',
        description: `Video resized to ${evenWidth}x${evenHeight} successfully! ${formatFileSize(blob.size)}`,
      });

      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to resize video';
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      console.error('Resizing error:', error);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setProgress(0);
      setTimeLeft(null);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resized.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const compressionRatio = result
    ? Math.round((1 - result.file.size / result.originalSize) * 100)
    : 0;

  if (loadingFFmpeg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading video resizer engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileVideo className="h-12 w-12 text-blue-400" />
        <div>
          <p className="font-medium mb-2">Video resizer engine unavailable</p>
          <p className="text-sm text-muted-foreground">Please refresh the page to try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-blue-200 dark:border-blue-800 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-blue-400 mb-4" />
        {file ? (
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(file.size)}
              {originalWidth > 0 && ` • ${originalWidth}x${originalHeight}`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium mb-2">
              Drop your video here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: MP4, WebM, AVI, MOV, MKV, FLV, WMV
            </p>
          </div>
        )}
      </div>

      {file && (
        <>
          <div className="space-y-2">
            <video
              ref={videoRef}
              src={videoUrlRef.current}
              controls
              className="w-full rounded border border-blue-200 dark:border-blue-800"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Resolution Preset</Label>
              <Select value={preset} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Width (px)</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  min={1}
                  max={3840}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Height (px)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  min={1}
                  max={2160}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="aspect-ratio"
                checked={maintainAspectRatio}
                onCheckedChange={(checked) => handleAspectRatioToggle(checked as boolean)}
              />
              <Label htmlFor="aspect-ratio" className="text-sm cursor-pointer">
                Maintain aspect ratio
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResize}
              disabled={processing || width <= 0 || height <= 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resizing...
                </>
              ) : (
                <>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Resize to {width}x{height}
                </>
              )}
            </Button>

            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                {timeLeft !== null && timeLeft > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Estimated time left: {Math.ceil(timeLeft / 1000)}s
                  </p>
                )}
              </div>
            )}
          </div>

          {logs.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Console Output</Label>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className={log.startsWith('ERROR:') ? 'text-red-400' : log.startsWith('Progress:') ? 'text-green-400' : 'text-gray-300'}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="space-y-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg">
            <div className="flex items-center gap-3">
              <FileVideo className="h-10 w-10 text-blue-600" />
              <div>
                <p className="font-medium text-sm">resized.mp4</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(result.file.size)} • {width}x{height}
                  {compressionRatio > 0 && ` (${compressionRatio}% smaller)`}
                  {compressionRatio < 0 && ` (${Math.abs(compressionRatio)}% larger)`}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex gap-2">
            {file && (
              <div className="w-1/2">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  Original ({originalWidth}x{originalHeight})
                </p>
                <video
                  src={URL.createObjectURL(file)}
                  controls
                  loop
                  muted
                  className="w-full rounded border border-blue-200 dark:border-blue-800"
                />
              </div>
            )}
            <div className="w-1/2">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                Resized ({width}x{height})
              </p>
              <video
                src={URL.createObjectURL(result.file)}
                controls
                loop
                autoPlay
                muted
                className="w-full rounded border border-blue-200 dark:border-blue-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

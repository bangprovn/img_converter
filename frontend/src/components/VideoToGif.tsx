import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function VideoToGif() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fps, setFps] = useState<number>(15);
  const [width, setWidth] = useState<number>(480);
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

        // Set up log listener
        ffmpeg.on('log', ({ message }) => {
          setLogs(prev => [...prev, message]);
          console.log('[FFmpeg]', message);
        });

        // Set up progress listener
        ffmpeg.on('progress', ({ progress: p, time }) => {
          const percentage = Math.round(p * 100);
          setProgress(percentage);

          // Only log every 10% to reduce console spam
          if (percentage % 10 === 0 || percentage === 100) {
            const logMsg = `Progress: ${percentage}% (time: ${(time / 1000000).toFixed(2)}s)`;
            setLogs(prev => {
              const last = prev[prev.length - 1];
              // Avoid duplicate progress logs
              if (last?.startsWith('Progress:') && last.includes(`${percentage}%`)) {
                return prev;
              }
              return [...prev, logMsg];
            });
          }

          // Calculate estimated time left
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
          description: 'Failed to load video conversion engine',
          variant: 'destructive',
        });
      } finally {
        setLoadingFFmpeg(false);
      }
    };

    loadFFmpeg();
  }, [toast]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFile = acceptedFiles[0];
    if (videoFile && videoFile.type.startsWith('video/')) {
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

  const handleConvert = async () => {
    if (!file || !ffmpegReady) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, 'Starting conversion to GIF...']);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const originalSize = file.size;

      // Write the input file
      setLogs(prev => [...prev, 'Writing input file...']);
      await ffmpeg.writeFile('input', await fetchFile(file));
      setLogs(prev => [...prev, 'Input file written successfully']);

      setLogs(prev => [...prev, `Executing FFmpeg conversion to GIF (${fps}fps, ${width}px width)...`]);

      // Generate palette for better color quality
      setLogs(prev => [...prev, 'Generating color palette...']);
      await ffmpeg.exec([
        '-i', 'input',
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        '-y',
        'palette.png'
      ]);

      setLogs(prev => [...prev, 'Converting to GIF using palette...']);
      await ffmpeg.exec([
        '-i', 'input',
        '-i', 'palette.png',
        '-lavfi', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
        '-y',
        'output.gif'
      ]);

      setLogs(prev => [...prev, 'FFmpeg conversion complete']);

      // Read the output file
      const data = await ffmpeg.readFile('output.gif');
      const blob = new Blob([data as BlobPart], { type: 'image/gif' });

      setResult({ file: blob, originalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Conversion complete! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`]);

      toast({
        title: 'Success',
        description: `Video converted to GIF successfully! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`,
      });

      // Cleanup
      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      await ffmpeg.deleteFile('input');
      await ffmpeg.deleteFile('palette.png');
      await ffmpeg.deleteFile('output.gif');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to convert video to GIF';
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      console.error('Conversion error:', error);
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
    a.download = 'converted.gif';
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
        <p className="text-sm text-muted-foreground">Loading video conversion engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileImage className="h-12 w-12 text-blue-400" />
        <div>
          <p className="font-medium mb-2">Video conversion engine unavailable</p>
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
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Frame Rate (FPS)</Label>
                <span className="text-sm text-muted-foreground">{fps} fps</span>
              </div>
              <Slider
                value={[fps]}
                onValueChange={(value) => setFps(value[0])}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower FPS = smaller file size, smoother = higher FPS
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Width (pixels)</Label>
                <span className="text-sm text-muted-foreground">{width}px</span>
              </div>
              <Slider
                value={[width]}
                onValueChange={(value) => setWidth(value[0])}
                min={240}
                max={1920}
                step={40}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Smaller width = smaller file size (height scales proportionally)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleConvert}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                'Convert to GIF'
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
              <FileImage className="h-10 w-10 text-blue-600" />
              <div>
                <p className="font-medium text-sm">converted.gif</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(result.file.size)}
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
                <p className="text-xs text-muted-foreground mb-2 text-center">Original Video</p>
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
              <p className="text-xs text-muted-foreground mb-2 text-center">Converted GIF</p>
              <img
                src={URL.createObjectURL(result.file)}
                alt="Converted GIF"
                className="w-full rounded border border-blue-200 dark:border-blue-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Original (Video)</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Converted (GIF)</p>
              <p className={`font-medium ${compressionRatio > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatFileSize(result.file.size)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

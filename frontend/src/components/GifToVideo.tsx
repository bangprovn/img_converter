import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type VideoFormat = 'mp4' | 'webm';

export function GifToVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState<VideoFormat>('mp4');
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
        // toBlobURL is used to bypass CORS issue
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
    const gifFile = acceptedFiles[0];
    if (gifFile && gifFile.type === 'image/gif') {
      setFile(gifFile);
      setResult(null);
      setLogs([]);
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

  const handleConvert = async () => {
    if (!file || !ffmpegReady) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, `Starting conversion to ${format.toUpperCase()}...`]);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const originalSize = file.size;

      // Write the input file
      setLogs(prev => [...prev, 'Writing input file...']);
      await ffmpeg.writeFile('input.gif', await fetchFile(file));
      setLogs(prev => [...prev, 'Input file written successfully']);

      // Convert based on format
      const outputFile = format === 'mp4' ? 'output.mp4' : 'output.webm';

      setLogs(prev => [...prev, `Executing FFmpeg conversion to ${format}...`]);

      if (format === 'mp4') {
        await ffmpeg.exec([
          '-i', 'input.gif',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-movflags', 'faststart',
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-y', // Overwrite output file
          outputFile
        ]);
      } else {
        await ffmpeg.exec([
          '-i', 'input.gif',
          '-c:v', 'libvpx',
          '-quality', 'realtime',
          '-cpu-used', '5',
          '-crf', '10',
          '-b:v', '1M',
          '-pix_fmt', 'yuv420p',
          '-y', // Overwrite output file
          outputFile
        ]);
      }

      setLogs(prev => [...prev, 'FFmpeg conversion complete']);

      // Read the output file
      const data = await ffmpeg.readFile(outputFile);
      const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
      const blob = new Blob([data as BlobPart], { type: mimeType });

      setResult({ file: blob, originalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Conversion complete! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`]);

      toast({
        title: 'Success',
        description: `GIF converted to ${format.toUpperCase()} successfully! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`,
      });

      // Cleanup
      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      await ffmpeg.deleteFile('input.gif');
      await ffmpeg.deleteFile(outputFile);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to convert GIF to video';
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
    a.download = `converted.${format}`;
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
        <Loader2 className="h-12 w-12 animate-spin text-pink-600" />
        <p className="text-sm text-muted-foreground">Loading video conversion engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileVideo className="h-12 w-12 text-pink-400" />
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
          <div className="space-y-3">
            <Label className="text-sm font-medium">Output Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as VideoFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mp4" id="mp4" />
                <Label htmlFor="mp4" className="font-normal cursor-pointer">
                  MP4 (Better compatibility, smaller file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webm" id="webm" />
                <Label htmlFor="webm" className="font-normal cursor-pointer">
                  WebM (Better quality, supports transparency)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleConvert}
              disabled={processing}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                `Convert to ${format.toUpperCase()}`
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
        <div className="space-y-4 pt-4 border-t border-pink-200 dark:border-pink-800">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg">
            <div className="flex items-center gap-3">
              <FileVideo className="h-10 w-10 text-pink-600" />
              <div>
                <p className="font-medium text-sm">converted.{format}</p>
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
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          <div className="flex gap-2">
            {file && (
              <div className="w-1/2">
                <p className="text-xs text-muted-foreground mb-2 text-center">Original GIF</p>
                <img
                  src={URL.createObjectURL(file)}
                  alt="Original"
                  className="w-full rounded border border-pink-200 dark:border-pink-800"
                />
              </div>
            )}
            <div className="w-1/2">
              <p className="text-xs text-muted-foreground mb-2 text-center">Converted Video</p>
              <video
                src={URL.createObjectURL(result.file)}
                controls
                loop
                autoPlay
                muted
                className="w-full rounded border border-pink-200 dark:border-pink-800"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Original (GIF)</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Converted ({format.toUpperCase()})</p>
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

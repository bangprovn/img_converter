import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileVideo, Gauge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type CompressionPreset = 'ultrafast' | 'veryfast' | 'fast' | 'medium' | 'slow';

const PRESET_INFO: Record<CompressionPreset, { label: string; description: string }> = {
  ultrafast: { label: 'Ultra Fast', description: 'Fastest, larger file' },
  veryfast: { label: 'Very Fast', description: 'Fast, good balance' },
  fast: { label: 'Fast', description: 'Quick, decent compression' },
  medium: { label: 'Medium', description: 'Balanced speed/quality' },
  slow: { label: 'Slow', description: 'Best compression' },
};

export function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [crf, setCrf] = useState<number>(23); // 0-51, lower = better quality
  const [preset, setPreset] = useState<CompressionPreset>('veryfast');
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
          description: 'Failed to load video compression engine',
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

  const handleCompress = async () => {
    if (!file || !ffmpegReady) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, `Compressing video with CRF ${crf} and ${preset} preset...`]);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const originalSize = file.size;

      setLogs(prev => [...prev, 'Writing input file...']);
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      setLogs(prev => [...prev, 'Input file written successfully']);

      setLogs(prev => [...prev, 'Executing FFmpeg compression...']);

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', String(crf),
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', 'faststart',
        '-y',
        'output.mp4'
      ]);

      setLogs(prev => [...prev, 'FFmpeg compression complete']);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });

      setResult({ file: blob, originalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Compression complete! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`]);

      const ratio = Math.round((1 - blob.size / originalSize) * 100);
      toast({
        title: 'Success',
        description: `Video compressed successfully! ${ratio > 0 ? `${ratio}% smaller` : `${Math.abs(ratio)}% larger`}`,
      });

      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to compress video';
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      console.error('Compression error:', error);
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
    a.download = 'compressed.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const compressionRatio = result
    ? Math.round((1 - result.file.size / result.originalSize) * 100)
    : 0;

  const getQualityLabel = (crfValue: number) => {
    if (crfValue <= 18) return 'Excellent';
    if (crfValue <= 23) return 'Good';
    if (crfValue <= 28) return 'Average';
    if (crfValue <= 35) return 'Low';
    return 'Very Low';
  };

  if (loadingFFmpeg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading video compression engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileVideo className="h-12 w-12 text-blue-400" />
        <div>
          <p className="font-medium mb-2">Video compression engine unavailable</p>
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
                <Label className="text-sm font-medium">Quality (CRF)</Label>
                <span className="text-sm text-muted-foreground">{crf} - {getQualityLabel(crf)}</span>
              </div>
              <Slider
                value={[crf]}
                onValueChange={(value) => setCrf(value[0])}
                min={0}
                max={51}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = better quality & larger file, Higher = lower quality & smaller file
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Compression Speed</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as CompressionPreset)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_INFO).map(([key, { label, description }]) => (
                    <SelectItem key={key} value={key}>
                      {label} - {description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Faster presets process quicker but produce larger files
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCompress}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Compressing...
                </>
              ) : (
                <>
                  <Gauge className="mr-2 h-4 w-4" />
                  Compress Video
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
                <p className="font-medium text-sm">compressed.mp4</p>
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
              <p className="text-xs text-muted-foreground mb-2 text-center">Compressed Video</p>
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
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Original</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Compressed</p>
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

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileVideo, Scissors, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function VideoTrimmer() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<{ file: Blob; originalSize: number } | null>(null);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const ffmpegRef = useRef(new FFmpeg());
  const { toast } = useToast();
  const startTimeRef = useRef<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
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
          description: 'Failed to load video conversion engine',
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

  // Setup video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const dur = video.duration;
      setDuration(dur);
      setEndTime(Math.min(10, dur));
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Loop within trim range when playing
      if (isPlaying && time >= endTime) {
        video.currentTime = startTime;
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Jump to start of trim range if outside
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [file, isPlaying, startTime, endTime]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
      setStartTime(0);
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
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

  const handleTrim = async () => {
    if (!file || !ffmpegReady) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, `Trimming video from ${formatTime(startTime)} to ${formatTime(endTime)}...`]);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const originalSize = file.size;

      setLogs(prev => [...prev, 'Writing input file...']);
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      setLogs(prev => [...prev, 'Input file written successfully']);

      setLogs(prev => [...prev, 'Executing FFmpeg trim operation...']);

      const trimDuration = endTime - startTime;

      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', formatTime(startTime),
        '-t', String(trimDuration),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-preset', 'veryfast',
        '-y',
        'output.mp4'
      ]);

      setLogs(prev => [...prev, 'FFmpeg trimming complete']);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });

      setResult({ file: blob, originalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Trimming complete! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`]);

      toast({
        title: 'Success',
        description: `Video trimmed successfully! ${formatFileSize(originalSize)} → ${formatFileSize(blob.size)}`,
      });

      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to trim video';
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      console.error('Trimming error:', error);
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
    a.download = 'trimmed.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !duration) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;

    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleHandleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.stopPropagation();
    setDragging(type);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current || !duration) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
      const newTime = (x / rect.width) * duration;

      if (type === 'start') {
        const newStart = Math.max(0, Math.min(newTime, endTime - 0.5));
        setStartTime(newStart);
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
        }
      } else {
        const newEnd = Math.min(duration, Math.max(newTime, startTime + 0.5));
        setEndTime(newEnd);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const compressionRatio = result
    ? Math.round((1 - result.file.size / result.originalSize) * 100)
    : 0;

  if (loadingFFmpeg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading video processing engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileVideo className="h-12 w-12 text-blue-400" />
        <div>
          <p className="font-medium mb-2">Video processing engine unavailable</p>
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
              {duration > 0 && ` • ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`}
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
            <video
              ref={videoRef}
              src={videoUrlRef.current}
              className="w-full rounded border border-blue-200 dark:border-blue-800"
            />

            {/* Video Controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlayPause}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-sm font-mono text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Timeline Trimmer */}
            {duration > 0 && (
              <div className="space-y-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Timeline</Label>
                  <span className="text-xs text-muted-foreground">
                    Trim: {formatTime(startTime)} → {formatTime(endTime)} ({formatTime(endTime - startTime)})
                  </span>
                </div>

                {/* Timeline Track */}
                <div
                  ref={timelineRef}
                  className="relative h-16 bg-gray-800 dark:bg-gray-900 rounded cursor-pointer select-none"
                  onClick={handleTimelineClick}
                >
                  {/* Full video background */}
                  <div className="absolute inset-0 bg-gray-700 dark:bg-gray-800 rounded" />

                  {/* Trimmed region */}
                  <div
                    className="absolute top-0 bottom-0 bg-blue-500/40 border-l-2 border-r-2 border-blue-500"
                    style={{
                      left: `${(startTime / duration) * 100}%`,
                      width: `${((endTime - startTime) / duration) * 100}%`
                    }}
                  />

                  {/* Start trim handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-600 cursor-ew-resize hover:bg-blue-500 transition-colors z-10 group"
                    style={{ left: `${(startTime / duration) * 100}%` }}
                    onMouseDown={handleHandleMouseDown('start')}
                  >
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 -translate-x-1/2" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {formatTime(startTime)}
                    </div>
                  </div>

                  {/* End trim handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-600 cursor-ew-resize hover:bg-blue-500 transition-colors z-10 group"
                    style={{ left: `calc(${(endTime / duration) * 100}% - 12px)` }}
                    onMouseDown={handleHandleMouseDown('end')}
                  >
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 -translate-x-1/2" />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {formatTime(endTime)}
                    </div>
                  </div>

                  {/* Current time scrubber */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                  </div>

                  {/* Time markers */}
                  <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 text-[10px] text-gray-400 pointer-events-none">
                    <span>0:00</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleTrim}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trimming...
                </>
              ) : (
                <>
                  <Scissors className="mr-2 h-4 w-4" />
                  Trim Video
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
                <p className="font-medium text-sm">trimmed.mp4</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(result.file.size)}
                  {compressionRatio > 0 && ` (${compressionRatio}% smaller)`}
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

          <div>
            <p className="text-xs text-muted-foreground mb-2 text-center">Trimmed Video Preview</p>
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
      )}
    </div>
  );
}

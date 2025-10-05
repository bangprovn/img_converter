import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Loader2, FileVideo, X, MoveUp, MoveDown, Combine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoFile {
  id: string;
  file: File;
  preview: string;
}

export function VideoMerger() {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [processing, setProcessing] = useState(false);
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
          description: 'Failed to load video merger engine',
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
    const videoFiles = acceptedFiles.filter(f => f.type.startsWith('video/'));

    if (videoFiles.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please upload video files',
        variant: 'destructive',
      });
      return;
    }

    const newFiles: VideoFile[] = videoFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setResult(null);
    setLogs([]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v'] },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === files.length - 1)
    ) {
      return;
    }

    setFiles(prev => {
      const newFiles = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      return newFiles;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2 || !ffmpegReady) return;

    setProcessing(true);
    setProgress(0);
    setTimeLeft(null);
    setLogs(prev => [...prev, `Merging ${files.length} videos...`]);
    startTimeRef.current = Date.now();
    const ffmpeg = ffmpegRef.current;

    try {
      const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

      // Write all input files
      setLogs(prev => [...prev, 'Writing input files...']);
      const inputPaths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const filename = `input${i}.mp4`;
        await ffmpeg.writeFile(filename, await fetchFile(files[i].file));
        inputPaths.push(`file ${filename}`);
      }
      setLogs(prev => [...prev, 'All input files written successfully']);

      // Create concat list file
      setLogs(prev => [...prev, 'Creating concat list...']);
      await ffmpeg.writeFile('concat_list.txt', inputPaths.join('\n'));

      setLogs(prev => [...prev, 'Executing FFmpeg merge operation...']);
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-c:a', 'aac',
        '-y',
        'output.mp4'
      ]);

      setLogs(prev => [...prev, 'FFmpeg merging complete']);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });

      setResult({ file: blob, originalSize: totalSize });
      setProgress(100);
      setLogs(prev => [...prev, `Merging complete! Total: ${formatFileSize(totalSize)} → ${formatFileSize(blob.size)}`]);

      toast({
        title: 'Success',
        description: `${files.length} videos merged successfully! ${formatFileSize(blob.size)}`,
      });

      // Cleanup
      setLogs(prev => [...prev, 'Cleaning up temporary files...']);
      for (let i = 0; i < files.length; i++) {
        await ffmpeg.deleteFile(`input${i}.mp4`);
      }
      await ffmpeg.deleteFile('concat_list.txt');
      await ffmpeg.deleteFile('output.mp4');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to merge videos';
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      console.error('Merging error:', error);
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
    a.download = 'merged.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  if (loadingFFmpeg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading video merger engine...</p>
      </div>
    );
  }

  if (!ffmpegReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
        <FileVideo className="h-12 w-12 text-blue-400" />
        <div>
          <p className="font-medium mb-2">Video merger engine unavailable</p>
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
        <div>
          <p className="text-sm font-medium mb-2">
            Drop your videos here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Add multiple videos to merge them together • Supported formats: MP4, WebM, AVI, MOV, MKV
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Videos to Merge ({files.length})</Label>
              <span className="text-xs text-muted-foreground">Total: {formatFileSize(totalSize)}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((videoFile, index) => (
                <div
                  key={videoFile.id}
                  className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium text-muted-foreground w-8">#{index + 1}</span>
                  <video
                    src={videoFile.preview}
                    className="w-24 h-16 object-cover rounded border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{videoFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(videoFile.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveFile(index, 'up')}
                      disabled={index === 0}
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveFile(index, 'down')}
                      disabled={index === files.length - 1}
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(videoFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleMerge}
              disabled={processing || files.length < 2}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Combine className="mr-2 h-4 w-4" />
                  Merge {files.length} Videos
                </>
              )}
            </Button>
            {files.length < 2 && (
              <p className="text-xs text-muted-foreground text-center">
                Add at least 2 videos to merge
              </p>
            )}

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
                <p className="font-medium text-sm">merged.mp4</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(result.file.size)}
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
            <p className="text-xs text-muted-foreground mb-2 text-center">Merged Video Preview</p>
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

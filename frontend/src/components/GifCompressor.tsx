import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Upload, Loader2, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressGif, formatFileSize } from '@/lib/gifUtils';

export function GifCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [level, setLevel] = useState<'low' | 'medium' | 'high'>('medium');
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

  const handleCompress = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);

    try {
      const originalSize = file.size;

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 300);

      const compressed = await compressGif(file, level);
      clearInterval(progressInterval);
      setProgress(100);

      if (compressed.length > 0) {
        setResult({ file: compressed[0], originalSize });
        toast({
          title: 'Success',
          description: `GIF compressed successfully! ${formatFileSize(originalSize)} → ${formatFileSize(compressed[0].size)}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to compress GIF',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
      setProgress(0);
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
          <div className="space-y-3">
            <Label className="text-sm font-medium">Compression Level</Label>
            <RadioGroup value={level} onValueChange={(v) => setLevel(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="font-normal cursor-pointer">
                  Low (Better quality, larger file)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal cursor-pointer">
                  Medium (Balanced)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="font-normal cursor-pointer">
                  High (Lower quality, smaller file)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleCompress}
              disabled={processing}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Compressing...
                </>
              ) : (
                'Compress GIF'
              )}
            </Button>

            {processing && (
              <div className="space-y-2">
                <div className="h-2 w-full bg-pink-100 dark:bg-pink-900/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-600 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">{progress}%</p>
              </div>
            )}
          </div>
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
              alt="Compressed"
              className="w-1/2 rounded border border-pink-200 dark:border-pink-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Original</p>
              <p className="font-medium">{formatFileSize(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Compressed</p>
              <p className="font-medium text-green-600">{formatFileSize(result.file.size)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

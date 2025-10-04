import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Download, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/lib/gifUtils';
import { parseGIF, decompressFrames } from 'gifuct-js';
import JSZip from 'jszip';

export function GifFrameExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [frames, setFrames] = useState<File[]>([]);
  const { toast } = useToast();

  // Create object URLs for frame previews with proper cleanup
  const frameUrls = useMemo(() => {
    return frames.map(frame => URL.createObjectURL(frame));
  }, [frames]);

  // Cleanup object URLs when component unmounts or frames change
  useEffect(() => {
    return () => {
      frameUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [frameUrls]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const gifFile = acceptedFiles[0];
    if (gifFile && gifFile.type === 'image/gif') {
      setFile(gifFile);
      setFrames([]);
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

  const extractFrames = async (gifFile: File): Promise<File[]> => {
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

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = frames[0].dims.width;
          canvas.height = frames[0].dims.height;

          const frameFiles: File[] = [];

          // Convert each frame to PNG File
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const imageData = ctx.createImageData(frame.dims.width, frame.dims.height);
            imageData.data.set(frame.patch);

            ctx.putImageData(imageData, 0, 0);

            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => resolve(blob!), 'image/png');
            });

            const frameFile = new File(
              [blob],
              `frame_${String(i + 1).padStart(3, '0')}.png`,
              { type: 'image/png' }
            );
            frameFiles.push(frameFile);
          }

          resolve(frameFiles);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read GIF file'));
      reader.readAsArrayBuffer(gifFile);
    });
  };

  const handleExtract = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const extracted = await extractFrames(file);

      if (extracted.length > 0) {
        setFrames(extracted);
        toast({
          title: 'Success',
          description: `Extracted ${extracted.length} frame${extracted.length > 1 ? 's' : ''} from GIF`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extract frames',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    if (frames.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('frames');

    frames.forEach((frame, index) => {
      folder?.file(`frame_${String(index + 1).padStart(3, '0')}.png`, frame);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gif_frames.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFrame = (frame: File, index: number) => {
    const url = URL.createObjectURL(frame);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame_${String(index + 1).padStart(3, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      {file && frames.length === 0 && (
        <Button
          onClick={handleExtract}
          disabled={processing}
          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting Frames...
            </>
          ) : (
            'Extract Frames'
          )}
        </Button>
      )}

      {frames.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-pink-200 dark:border-pink-800">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Extracted {frames.length} frame{frames.length > 1 ? 's' : ''}
            </h3>
            <Button
              onClick={handleDownloadAll}
              size="sm"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All as ZIP
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
            {frames.map((frame, index) => (
              <div
                key={index}
                className="relative group border border-pink-200 dark:border-pink-800 rounded-lg overflow-hidden"
              >
                <img
                  src={frameUrls[index]}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-32 object-contain bg-checkerboard"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    onClick={() => handleDownloadFrame(frame, index)}
                    size="sm"
                    variant="secondary"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white font-medium">
                    Frame {index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

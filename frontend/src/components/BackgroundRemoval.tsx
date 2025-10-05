import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, Loader2, X } from 'lucide-react';
import { initializeModel, processImages, getModelInfo } from '@/lib/backgroundRemoval';
import JSZip from 'jszip';

interface ProcessedImage {
  original: File;
  processed: File | null;
  previewUrl: string;
  processedUrl: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export function BackgroundRemoval() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [modelInfo, setModelInfo] = useState<ReturnType<typeof getModelInfo> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Get model info on mount (but don't initialize)
  useEffect(() => {
    setModelInfo(getModelInfo());
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      toast({
        title: 'No Images Selected',
        description: 'Please select valid image files',
        variant: 'destructive',
      });
      return;
    }

    const newImages: ProcessedImage[] = imageFiles.map((file) => ({
      original: file,
      processed: null,
      previewUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: 'pending',
    }));

    setImages((prev) => [...prev, ...newImages]);

    // Initialize model if this is the first image
    if (images.length === 0 && !isModelReady) {
      setIsInitializing(true);
      setError(null);
      try {
        const initialized = await initializeModel();
        if (!initialized) {
          throw new Error('Failed to initialize background removal model');
        }
        setIsModelReady(true);
        setModelInfo(getModelInfo());
        toast({
          title: 'Model Ready',
          description: 'Background removal model loaded successfully',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        toast({
          title: 'Initialization Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        setImages([]); // Clear images if model fails
        setIsInitializing(false);
        return;
      }
      setIsInitializing(false);
    }

    // Mark all new images as processing
    setImages((prev) =>
      prev.map((img) => {
        const isNewImage = newImages.some(ni => ni.previewUrl === img.previewUrl);
        return isNewImage ? { ...img, status: 'processing' as const } : img;
      })
    );

    // Process ALL images in a single batch call for maximum performance
    try {
      const processedFiles = await processImages(newImages.map(img => img.original));

      // Update all processed images at once
      processedFiles.forEach((processedFile, index) => {
        const newImage = newImages[index];
        const processedUrl = URL.createObjectURL(processedFile);

        setImages((prev) =>
          prev.map((img) =>
            img.previewUrl === newImage.previewUrl
              ? {
                  ...img,
                  processed: processedFile,
                  processedUrl,
                  status: 'completed' as const,
                }
              : img
          )
        );
      });
    } catch (error) {
      console.error('Error processing images:', error);
      // Mark all new images as errored
      setImages((prev) =>
        prev.map((img) => {
          const isNewImage = newImages.some(ni => ni.previewUrl === img.previewUrl);
          return isNewImage
            ? {
                ...img,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            : img;
        })
      );
    }
  }, [images.length, isModelReady, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
  });

  const handleDownload = async (image: ProcessedImage) => {
    if (!image.processed) return;

    const link = document.createElement('a');
    link.href = image.processedUrl!;
    link.download = image.processed.name;
    link.click();
  };

  const handleDownloadAll = async () => {
    const completedImages = images.filter((img) => img.status === 'completed');

    if (completedImages.length === 0) {
      toast({
        title: 'No Images to Download',
        description: 'Process some images first',
        variant: 'destructive',
      });
      return;
    }

    if (completedImages.length === 1) {
      handleDownload(completedImages[0]);
      return;
    }

    const zip = new JSZip();
    for (const image of completedImages) {
      if (image.processed) {
        zip.file(image.processed.name, image.processed);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'background-removed-images.zip';
    link.click();
  };

  const handleRemove = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      const removed = newImages[index];
      URL.revokeObjectURL(removed.previewUrl);
      if (removed.processedUrl) {
        URL.revokeObjectURL(removed.processedUrl);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleClearAll = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.previewUrl);
      if (img.processedUrl) {
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    setImages([]);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Background Removal
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Remove backgrounds from your images using AI
          </p>
          {modelInfo && (
            <p className="text-xs text-muted-foreground mt-1">
              Model: {modelInfo.currentModelId}
              {modelInfo.isIOS && ' (iOS optimized)'}
              {modelInfo.isWebGPUSupported && !modelInfo.isIOS && ' (WebGPU available)'}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {images.length > 0 && (
            <>
              <Button
                onClick={handleDownloadAll}
                disabled={images.filter((img) => img.status === 'completed').length === 0}
                variant="outline"
                size="sm"
                className="border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download All</span>
                <span className="sm:hidden">Download</span>
              </Button>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <X className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={`p-8 sm:p-12 border-2 border-dashed transition-all cursor-pointer ${
          isDragActive
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600'
        } ${isInitializing ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} disabled={isInitializing} />
        <div className="flex flex-col items-center gap-4 text-center">
          {isInitializing ? (
            <>
              <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
              <div>
                <p className="text-lg font-medium">Loading background removal model...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This may take a few moments on first load
                </p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-red-600">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please refresh the page and try again
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-purple-500" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse (PNG, JPG, JPEG, WebP, GIF)
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Images are processed locally on your device
                </p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate flex-1">
                  {image.original.name}
                </p>
                <Button
                  onClick={() => handleRemove(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Original */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Original</p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={image.previewUrl}
                      alt="Original"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Processed */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Processed</p>
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                    {image.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                      </div>
                    )}
                    {image.status === 'completed' && image.processedUrl && (
                      <img
                        src={image.processedUrl}
                        alt="Processed"
                        className="w-full h-full object-cover"
                        style={{
                          backgroundImage:
                            'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        }}
                      />
                    )}
                    {image.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center text-red-500">
                        <p className="text-xs text-center px-2">Error</p>
                      </div>
                    )}
                    {image.status === 'pending' && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <p className="text-xs">Waiting</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  {image.status === 'completed' && (
                    <span className="text-green-600 dark:text-green-400">✓ Complete</span>
                  )}
                  {image.status === 'processing' && (
                    <span className="text-blue-600 dark:text-blue-400">Processing...</span>
                  )}
                  {image.status === 'error' && (
                    <span className="text-red-600 dark:text-red-400">Error</span>
                  )}
                  {image.status === 'pending' && (
                    <span className="text-gray-600 dark:text-gray-400">Pending</span>
                  )}
                </div>
                {image.status === 'completed' && (
                  <Button
                    onClick={() => handleDownload(image)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ComparisonView Component
 * Side-by-side and slider comparison of before/after images
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { ConversionResult } from '@/lib/imageProcessing';
import { formatFileSize, getCompressionRatio } from '@/lib/imageProcessing';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ComparisonMode = 'side-by-side' | 'slider';

interface ComparisonViewProps {
  originalFile: File;
  result: ConversionResult;
}

export function ComparisonView({ originalFile, result }: ComparisonViewProps) {
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [convertedUrl, setConvertedUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Create object URLs for images
  useEffect(() => {
    const origUrl = URL.createObjectURL(originalFile);
    const convUrl = URL.createObjectURL(new Blob([result.buffer], { type: result.mimeType }));

    setOriginalUrl(origUrl);
    setConvertedUrl(convUrl);

    return () => {
      URL.revokeObjectURL(origUrl);
      URL.revokeObjectURL(convUrl);
    };
  }, [originalFile, result]);

  const compressionRatio = useMemo(() => getCompressionRatio(result), [result]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleResetZoom = () => setZoom(100);

  // Slider drag handlers
  const updateSliderPosition = (clientX: number) => {
    if (!sliderContainerRef.current) return;

    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updateSliderPosition(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Global mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Image Comparison</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{originalFile.name}</p>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoom <= 25}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
            <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoom >= 400}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleResetZoom}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Original</p>
            <p className="text-sm font-medium">{formatFileSize(result.originalSize)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Converted</p>
            <p className="text-sm font-medium">{formatFileSize(result.convertedSize)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              {compressionRatio.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Comparison Modes */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as ComparisonMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="slider">Slider</TabsTrigger>
          </TabsList>

          {/* Side-by-Side View */}
          <TabsContent value="side-by-side" className="mt-4">
            <div
              ref={containerRef}
              className="grid grid-cols-2 gap-4 overflow-auto max-h-[500px] p-4 bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Original</p>
                <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded overflow-hidden">
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="max-w-full h-auto"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Converted ({result.format})</p>
                <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded overflow-hidden">
                  <img
                    src={convertedUrl}
                    alt="Converted"
                    className="max-w-full h-auto"
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Slider View */}
          <TabsContent value="slider" className="mt-4">
            <div
              ref={sliderContainerRef}
              className="relative overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-lg cursor-ew-resize select-none"
              style={{ height: '500px' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
                {/* Converted (Background) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={convertedUrl}
                    alt="Converted"
                    className="max-h-full max-w-full"
                    style={{ transform: `scale(${zoom / 100})` }}
                  />
                </div>

                {/* Original (Overlay with clip) */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                  }}
                >
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="max-h-full max-w-full"
                    style={{ transform: `scale(${zoom / 100})` }}
                  />
                </div>

                {/* Slider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="flex gap-0.5">
                      <div className="w-0.5 h-4 bg-gray-600"></div>
                      <div className="w-0.5 h-4 bg-gray-600"></div>
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
                  Original
                </div>
                <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium">
                  {result.format.toUpperCase()}
                </div>
              </div>
          </TabsContent>
        </Tabs>

        {/* Dimensions Info */}
        {result.dimensions && (
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Dimensions: {result.dimensions.width} × {result.dimensions.height} px
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * BatchProcessing Component
 * Main component that orchestrates batch image processing
 */

import { useState, useEffect, useMemo } from 'react';
import { Upload, Play, Trash2, Eye } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { getBatchProcessingManager } from '@/lib/batchProcessingManager';
import type { ImageFormat } from '@/lib/imageConverter';
import type { ConversionOptions } from '@/lib/imageProcessing';
import type { BatchProcessingState, ImageProcessingItem } from '@/types/batchProcessing';
import { ImagePreview } from './ImagePreview';
import { DownloadManager } from './DownloadManager';
import { ComparisonView } from './ComparisonView';
import { StatisticsDashboard } from './StatisticsDashboard';
import { GlobalResizeControls } from './GlobalResizeControls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { downloadConvertedImage } from '@/lib/imageProcessing';
import { SUPPORTED_FORMATS } from '@/types/image';
import type { ImageResizeConfig } from '@/types/batchProcessing';

interface BatchProcessingProps {
  targetFormat: ImageFormat;
  options?: ConversionOptions;
}

export function BatchProcessing({ targetFormat, options = {} }: BatchProcessingProps) {
  const [state, setState] = useState<BatchProcessingState>({
    items: new Map(),
    totalItems: 0,
    completedItems: 0,
    failedItems: 0,
    isProcessing: false,
    overallProgress: 0,
  });
  const [selectedItemForComparison, setSelectedItemForComparison] =
    useState<ImageProcessingItem | null>(null);

  const manager = useMemo(() => getBatchProcessingManager(), []);

  // Subscribe to manager state updates
  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [manager]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: SUPPORTED_FORMATS as any,
    multiple: true,
    onDrop: (acceptedFiles) => {
      manager.addFiles(acceptedFiles);
    },
  });

  const handleProcessBatch = async () => {
    try {
      await manager.processBatch(targetFormat, options);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all items?')) {
      manager.clear();
    }
  };

  const handleDownload = (item: ImageProcessingItem) => {
    if (item.result) {
      downloadConvertedImage(item.result);
    }
  };

  const handleRetry = async (
    id: string,
    retryTargetFormat: ImageFormat,
    retryOptions: ConversionOptions
  ) => {
    await manager.retryItem(id, retryTargetFormat, retryOptions);
  };

  const handleCancel = (id: string) => {
    manager.cancelItem(id);
  };

  const handleResizeConfigChange = (id: string, config: ImageResizeConfig) => {
    manager.updateItemResizeConfig(id, config);
  };

  const handleGlobalResizeApply = (config: ImageResizeConfig) => {
    manager.applyResizeConfigToAll(config);
  };

  const itemsArray = useMemo(() => Array.from(state.items.values()), [state.items]);
  const completedResults = useMemo(
    () => itemsArray.filter((item) => item.result).map((item) => item.result!),
    [itemsArray]
  );

  const statistics = useMemo(() => manager.getStatistics(), [manager, state]);

  const canProcess = state.totalItems > 0 && !state.isProcessing;
  const hasCompleted = state.completedItems > 0;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!state.isProcessing && state.totalItems === 0 && (
        <Card
          {...getRootProps()}
          className={`p-12 border-2 border-dashed cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/30 scale-[1.02]'
              : 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-center space-y-4">
            <div className={`inline-block p-4 rounded-full transition-all duration-300 ${
              isDragActive
                ? 'bg-indigo-100 dark:bg-indigo-900/50 scale-110'
                : 'bg-purple-100 dark:bg-purple-900/30'
            }`}>
              <Upload className={`h-12 w-12 transition-all duration-300 ${
                isDragActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-purple-500 dark:text-purple-400'
              }`} />
            </div>
            <div>
              <p className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to select files
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Control Bar */}
      {state.totalItems > 0 && (
        <Card className="p-4 border-purple-100 dark:border-purple-900 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {state.totalItems} image{state.totalItems !== 1 ? 's' : ''} •{' '}
                  <span className="text-green-600 dark:text-green-400">{state.completedItems} completed</span> •{' '}
                  <span className="text-red-600 dark:text-red-400">{state.failedItems} failed</span>
                </p>
                {state.isProcessing && (
                  <div className="mt-2">
                    <Progress value={state.overallProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {state.overallProgress}% complete
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleProcessBatch}
                  disabled={!canProcess}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Process All
                </Button>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  size="sm"
                  disabled={state.isProcessing}
                  className="border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Global Resize Controls */}
            {!state.isProcessing && canProcess && (
              <GlobalResizeControls onApply={handleGlobalResizeApply} />
            )}
          </div>
        </Card>
      )}

      {/* Image Grid */}
      {itemsArray.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itemsArray.map((item) => (
            <div key={item.id} className="relative">
              <ImagePreview
                item={item}
                onDownload={handleDownload}
                onRetry={handleRetry}
                onCancel={handleCancel}
                onResizeConfigChange={handleResizeConfigChange}
                targetFormat={targetFormat}
                options={options}
              />
              {item.status === 'complete' && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-12 h-8 w-8 p-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900"
                  onClick={() => setSelectedItemForComparison(item)}
                  title="Compare"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {hasCompleted && <StatisticsDashboard statistics={statistics} />}

      {/* Download Manager */}
      {hasCompleted && completedResults.length > 0 && (
        <DownloadManager results={completedResults} />
      )}

      {/* Comparison Modal */}
      {selectedItemForComparison && selectedItemForComparison.result && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItemForComparison(null)}
        >
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <ComparisonView
              originalFile={selectedItemForComparison.file}
              result={selectedItemForComparison.result}
            />
            <div className="flex justify-end mt-4">
              <Button onClick={() => setSelectedItemForComparison(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload More Button */}
      {state.totalItems > 0 && (
        <Card
          {...getRootProps()}
          className="p-6 border-2 border-dashed cursor-pointer transition-all duration-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10 hover:scale-[1.01]"
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <div className="inline-block p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-2">
              <Upload className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <p className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Add more images</p>
          </div>
        </Card>
      )}
    </div>
  );
}

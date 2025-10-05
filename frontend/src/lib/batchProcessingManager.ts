/**
 * Batch Processing Manager
 * Manages batch image processing with per-image status tracking and retry logic
 */

import { convertImage, type ConversionOptions, type ConversionResult } from './imageProcessing';
import type {
  ImageProcessingItem,
  BatchProcessingState,
  BatchStatistics,
  ImageResizeConfig,
} from '@/types/batchProcessing';
import type { ImageFormat } from './imageConverter';
import { getImageDimensions, resizeImage } from './imageConverter';

export class BatchProcessingManager {
  private items = new Map<string, ImageProcessingItem>();
  private listeners: Set<(state: BatchProcessingState) => void> = new Set();
  private isProcessing = false;
  private maxRetries = 2;

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BatchProcessingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Get current state
   */
  getState(): BatchProcessingState {
    const itemsArray = Array.from(this.items.values());
    const completed = itemsArray.filter((item) => item.status === 'complete').length;
    const failed = itemsArray.filter((item) => item.status === 'error').length;
    const total = this.items.size;
    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      items: new Map(this.items),
      totalItems: total,
      completedItems: completed,
      failedItems: failed,
      isProcessing: this.isProcessing,
      overallProgress,
    };
  }

  /**
   * Add files to the batch queue
   */
  addFiles(files: File[]): string[] {
    const ids: string[] = [];

    // Add files synchronously first, then load dimensions asynchronously
    files.forEach((file) => {
      const id = crypto.randomUUID();

      const item: ImageProcessingItem = {
        id,
        file,
        status: 'queued',
        progress: 0,
      };

      this.items.set(id, item);
      ids.push(id);

      // Load dimensions asynchronously and update item
      getImageDimensions(file)
        .then((originalDimensions) => {
          this.updateItem(id, {
            originalDimensions,
            resizeConfig: {
              preset: 'original',
              width: originalDimensions.width,
              height: originalDimensions.height,
              maintainAspectRatio: true,
              dpi: 72,
            },
          });
        })
        .catch((error) => {
          console.error('Failed to get dimensions for', file.name, error);
        });
    });

    this.notifyListeners();
    return ids;
  }

  /**
   * Update item status
   */
  private updateItem(id: string, updates: Partial<ImageProcessingItem>) {
    const item = this.items.get(id);
    if (item) {
      this.items.set(id, { ...item, ...updates });
      this.notifyListeners();
    }
  }

  /**
   * Process a single item with retry logic
   */
  private async processItem(
    id: string,
    targetFormat: ImageFormat,
    options: ConversionOptions,
    retryCount = 0
  ): Promise<ConversionResult | null> {
    const item = this.items.get(id);
    if (!item) return null;

    try {
      const startTime = Date.now();
      this.updateItem(id, {
        status: 'processing',
        progress: 0,
        startTime,
      });

      // Progress callback to update item progress
      const onProgress = (progress: number) => {
        this.updateItem(id, {
          progress,
        });
      };

      // Determine which file to process
      let fileToProcess = item.file;

      // Apply resize if configured and not set to original
      if (item.resizeConfig && item.resizeConfig.preset !== 'original' && item.originalDimensions) {
        const shouldResize =
          item.resizeConfig.width !== item.originalDimensions.width ||
          item.resizeConfig.height !== item.originalDimensions.height;

        if (shouldResize) {
          onProgress(10);

          const resized = await resizeImage(item.file, {
            width: item.resizeConfig.width,
            height: item.resizeConfig.height,
            maintainAspectRatio: item.resizeConfig.maintainAspectRatio,
            dpi: item.resizeConfig.dpi,
          });

          // Create a new File from the resized blob
          fileToProcess = new File(
            [resized.blob],
            item.file.name,
            { type: item.file.type }
          );

          onProgress(20);
        }
      }

      const result = await convertImage(fileToProcess, targetFormat, options, onProgress);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      this.updateItem(id, {
        status: 'complete',
        progress: 100,
        result,
        endTime,
        processingTime,
      });

      return result;
    } catch (error) {
      // Retry logic
      if (retryCount < this.maxRetries) {
        console.warn(`Retrying ${item.file.name} (attempt ${retryCount + 1}/${this.maxRetries})`);
        return this.processItem(id, targetFormat, options, retryCount + 1);
      }

      // Final failure
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      this.updateItem(id, {
        status: 'error',
        progress: 0,
        error: errorMessage,
        endTime: Date.now(),
      });

      return null;
    }
  }

  /**
   * Process all items in the batch
   */
  async processBatch(
    targetFormat: ImageFormat,
    options: ConversionOptions = {}
  ): Promise<Map<string, ConversionResult>> {
    if (this.isProcessing) {
      throw new Error('Batch processing already in progress');
    }

    this.isProcessing = true;
    this.notifyListeners();

    const results = new Map<string, ConversionResult>();
    const itemIds = Array.from(this.items.keys());

    // Process items in parallel (worker pool handles concurrency)
    const processingPromises = itemIds.map(async (id) => {
      const result = await this.processItem(id, targetFormat, options);
      if (result) {
        results.set(id, result);
      }
    });

    await Promise.all(processingPromises);

    this.isProcessing = false;
    this.notifyListeners();

    return results;
  }

  /**
   * Cancel processing for a specific item
   */
  cancelItem(id: string) {
    const item = this.items.get(id);
    if (item && item.status === 'queued') {
      this.items.delete(id);
      this.notifyListeners();
    }
  }

  /**
   * Retry a failed item
   */
  async retryItem(id: string, targetFormat: ImageFormat, options: ConversionOptions = {}) {
    const item = this.items.get(id);
    if (!item || item.status !== 'error') {
      return;
    }

    this.updateItem(id, {
      status: 'queued',
      progress: 0,
      error: undefined,
    });

    return this.processItem(id, targetFormat, options);
  }

  /**
   * Get statistics for the batch
   */
  getStatistics(): BatchStatistics {
    const itemsArray = Array.from(this.items.values());
    const completedItems = itemsArray.filter((item) => item.status === 'complete');
    const failedItems = itemsArray.filter((item) => item.status === 'error');

    const totalSizeBefore = completedItems.reduce((sum, item) => sum + item.file.size, 0);
    const totalSizeAfter = completedItems.reduce(
      (sum, item) => sum + (item.result?.convertedSize || 0),
      0
    );
    const totalSizeSaved = totalSizeBefore - totalSizeAfter;
    const averageCompressionRatio =
      completedItems.length > 0
        ? completedItems.reduce((sum, item) => {
            const ratio = item.result
              ? (1 - item.result.convertedSize / item.result.originalSize) * 100
              : 0;
            return sum + ratio;
          }, 0) / completedItems.length
        : 0;

    const processingTimes = completedItems
      .map((item) => item.processingTime || 0)
      .filter((time) => time > 0);
    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
    const averageProcessingTime =
      processingTimes.length > 0 ? totalProcessingTime / processingTimes.length : 0;

    return {
      totalProcessed: completedItems.length,
      totalFailed: failedItems.length,
      totalSizeBefore,
      totalSizeAfter,
      totalSizeSaved,
      averageCompressionRatio,
      averageProcessingTime,
      totalProcessingTime,
    };
  }

  /**
   * Clear all items
   */
  clear() {
    this.items.clear();
    this.isProcessing = false;
    this.notifyListeners();
  }

  /**
   * Remove completed items
   */
  clearCompleted() {
    const itemsToKeep = Array.from(this.items.entries()).filter(
      ([_, item]) => item.status !== 'complete'
    );
    this.items = new Map(itemsToKeep);
    this.notifyListeners();
  }

  /**
   * Update resize configuration for an item
   */
  updateItemResizeConfig(id: string, config: ImageResizeConfig) {
    const item = this.items.get(id);
    if (item && (item.status === 'queued' || item.status === 'processing')) {
      this.updateItem(id, { resizeConfig: config });
    }
  }
}

// Singleton instance
let batchProcessingManager: BatchProcessingManager | null = null;

/**
 * Get or create the batch processing manager singleton
 */
export function getBatchProcessingManager(): BatchProcessingManager {
  if (!batchProcessingManager) {
    batchProcessingManager = new BatchProcessingManager();
  }
  return batchProcessingManager;
}

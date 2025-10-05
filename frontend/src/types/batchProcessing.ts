/**
 * Batch Processing Types
 * Extended types for batch processing with per-image status tracking
 */

import type { ConversionResult } from '@/lib/imageProcessing';
import type { ResizePreset } from '@/lib/imageConverter';

export type ImageStatus = 'queued' | 'processing' | 'complete' | 'error';

export interface ImageResizeConfig {
  preset: ResizePreset;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  dpi?: number;
}

export interface ImageProcessingItem {
  id: string;
  file: File;
  status: ImageStatus;
  progress: number;
  error?: string;
  result?: ConversionResult;
  startTime?: number;
  endTime?: number;
  processingTime?: number;
  resizeConfig?: ImageResizeConfig;
  originalDimensions?: { width: number; height: number };
}

export interface BatchProcessingState {
  items: Map<string, ImageProcessingItem>;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  isProcessing: boolean;
  overallProgress: number;
}

export interface BatchStatistics {
  totalProcessed: number;
  totalFailed: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
  totalSizeSaved: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
}

export interface DownloadOptions {
  format: 'individual' | 'zip';
  zipFilename?: string;
  organizeByFormat?: boolean;
}

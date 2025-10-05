/**
 * Image Processing Service
 * High-level API for image conversion using the worker pool
 */

import { getWorkerPool } from './workerPool';
import {
  fileToArrayBuffer,
  detectImageFormat,
  getMimeType,
  getFileExtension,
  type ImageFormat,
} from './imageConverter';

export interface ConversionOptions {
  // Common options
  quality?: number;
  lossless?: boolean;

  // JPEG options
  progressive?: boolean;
  chromaSubsampling?: '4:4:4' | '4:2:2' | '4:2:0';

  // PNG options
  compressionLevel?: number; // 0-9
  interlace?: boolean;

  // WebP options
  effort?: number; // 0-6
  method?: number; // 0-6

  // AVIF options
  speed?: number; // 0-9 (effort level for AVIF)
}

export interface ConversionResult {
  buffer: ArrayBuffer;
  format: ImageFormat;
  mimeType: string;
  filename: string;
  dimensions?: {
    width: number;
    height: number;
  };
  originalSize: number;
  convertedSize: number;
}

export interface ConversionProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Convert a single image file
 */
export async function convertImage(
  file: File,
  targetFormat: ImageFormat,
  options: ConversionOptions = {},
  onProgress?: (progress: number, stage: string) => void
): Promise<ConversionResult> {
  // Convert file to ArrayBuffer
  const buffer = await fileToArrayBuffer(file);

  // Detect source format
  const sourceFormat = detectImageFormat(buffer);
  if (!sourceFormat) {
    throw new Error('Unable to detect image format');
  }

  // Get worker pool
  const workerPool = await getWorkerPool();

  // Convert image
  const response = await workerPool.convertImage(
    buffer,
    sourceFormat,
    targetFormat,
    options,
    onProgress
  );

  if (response.type === 'error') {
    throw new Error(response.error || 'Conversion failed');
  }

  if (!response.data) {
    throw new Error('No data returned from worker');
  }

  // Generate filename
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const extension = getFileExtension(targetFormat);
  const filename = `${baseName}.${extension}`;

  return {
    buffer: response.data,
    format: targetFormat,
    mimeType: getMimeType(targetFormat),
    filename,
    dimensions: response.dimensions,
    originalSize: file.size,
    convertedSize: response.data.byteLength,
  };
}

/**
 * Convert multiple images with progress tracking
 */
export async function convertImages(
  files: File[],
  targetFormat: ImageFormat,
  options: ConversionOptions = {},
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const result = await convertImage(file, targetFormat, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to convert ${file.name}:`, error);
      throw error;
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
      });
    }
  }

  return results;
}

/**
 * Batch convert images in parallel (respects worker pool size)
 */
export async function batchConvertImages(
  files: File[],
  targetFormat: ImageFormat,
  options: ConversionOptions = {},
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult[]> {
  const total = files.length;
  let completed = 0;

  const conversionPromises = files.map(async (file) => {
    try {
      const result = await convertImage(file, targetFormat, options);

      completed++;
      if (onProgress) {
        onProgress({
          current: completed,
          total,
          percentage: Math.round((completed / total) * 100),
        });
      }

      return result;
    } catch (error) {
      console.error(`Failed to convert ${file.name}:`, error);
      throw error;
    }
  });

  return Promise.all(conversionPromises);
}

/**
 * Download a converted image
 */
export function downloadConvertedImage(result: ConversionResult) {
  const blob = new Blob([result.buffer], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download multiple converted images as individual files
 */
export function downloadConvertedImages(results: ConversionResult[]) {
  results.forEach((result) => {
    downloadConvertedImage(result);
  });
}

/**
 * Get compression ratio
 */
export function getCompressionRatio(result: ConversionResult): number {
  return (1 - result.convertedSize / result.originalSize) * 100;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

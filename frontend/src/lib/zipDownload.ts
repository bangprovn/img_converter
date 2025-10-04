/**
 * ZIP Download Service
 * Handles creating ZIP archives of converted images
 */

import JSZip from 'jszip';
import type { ConversionResult } from './imageProcessing';

export interface ZipOptions {
  filename?: string;
  organizeByFormat?: boolean;
  compression?: 'DEFLATE' | 'STORE';
  compressionLevel?: number;
}

/**
 * Create a ZIP file from multiple conversion results
 */
export async function createZipFromResults(
  results: ConversionResult[],
  options: ZipOptions = {}
): Promise<Blob> {
  const {
    organizeByFormat = false,
    compression = 'DEFLATE',
    compressionLevel = 6,
  } = options;

  const zip = new JSZip();

  // Add each result to the ZIP
  for (const result of results) {
    const blob = new Blob([result.buffer], { type: result.mimeType });

    if (organizeByFormat) {
      // Organize by format in folders
      const folderName = result.format.toUpperCase();
      const folder = zip.folder(folderName);
      if (folder) {
        folder.file(result.filename, blob);
      }
    } else {
      // All files in root
      zip.file(result.filename, blob);
    }
  }

  // Generate the ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression,
    compressionOptions: {
      level: compressionLevel,
    },
  });

  return zipBlob;
}

/**
 * Download a ZIP file
 */
export function downloadZip(blob: Blob, filename: string = 'converted-images.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Create and download a ZIP file from results
 */
export async function downloadResultsAsZip(
  results: ConversionResult[],
  options: ZipOptions = {}
): Promise<void> {
  const zipBlob = await createZipFromResults(results, options);
  const filename = options.filename || 'converted-images.zip';
  downloadZip(zipBlob, filename);
}

/**
 * Get the estimated size of the ZIP (approximation)
 */
export function estimateZipSize(results: ConversionResult[]): number {
  // ZIP overhead is typically 5-10% depending on compression
  const totalSize = results.reduce((sum, result) => sum + result.convertedSize, 0);
  return Math.round(totalSize * 1.05); // Add 5% overhead
}

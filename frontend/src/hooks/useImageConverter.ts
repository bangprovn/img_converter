/**
 * React Hook for Image Conversion
 * Provides a clean API for image conversion with error handling and state management
 */

import { useState, useCallback, useEffect } from 'react';
import {
  convertImage,
  batchConvertImages,
  downloadConvertedImage,
  type ConversionOptions,
  type ConversionResult,
  type ConversionProgress,
} from '@/lib/imageProcessing';
import { terminateWorkerPool } from '@/lib/workerPool';
import type { ImageFormat } from '@/lib/imageConverter';

export interface ConversionState {
  isConverting: boolean;
  progress: ConversionProgress | null;
  error: Error | null;
  results: ConversionResult[];
}

export function useImageConverter() {
  const [state, setState] = useState<ConversionState>({
    isConverting: false,
    progress: null,
    error: null,
    results: [],
  });

  /**
   * Convert a single image
   */
  const convert = useCallback(
    async (file: File, targetFormat: ImageFormat, options?: ConversionOptions) => {
      setState((prev) => ({
        ...prev,
        isConverting: true,
        error: null,
        results: [],
      }));

      try {
        const result = await convertImage(file, targetFormat, options);

        setState((prev) => ({
          ...prev,
          isConverting: false,
          results: [result],
        }));

        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Conversion failed');
        setState((prev) => ({
          ...prev,
          isConverting: false,
          error: err,
        }));
        throw err;
      }
    },
    []
  );

  /**
   * Convert multiple images in parallel
   */
  const convertBatch = useCallback(
    async (files: File[], targetFormat: ImageFormat, options?: ConversionOptions) => {
      setState((prev) => ({
        ...prev,
        isConverting: true,
        error: null,
        progress: { current: 0, total: files.length, percentage: 0 },
        results: [],
      }));

      try {
        const results = await batchConvertImages(
          files,
          targetFormat,
          options,
          (progress) => {
            setState((prev) => ({
              ...prev,
              progress,
            }));
          }
        );

        setState((prev) => ({
          ...prev,
          isConverting: false,
          progress: null,
          results,
        }));

        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Batch conversion failed');
        setState((prev) => ({
          ...prev,
          isConverting: false,
          progress: null,
          error: err,
        }));
        throw err;
      }
    },
    []
  );

  /**
   * Download a result
   */
  const download = useCallback((result: ConversionResult) => {
    downloadConvertedImage(result);
  }, []);

  /**
   * Download all results
   */
  const downloadAll = useCallback(() => {
    state.results.forEach((result) => {
      downloadConvertedImage(result);
    });
  }, [state.results]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isConverting: false,
      progress: null,
      error: null,
      results: [],
    });
  }, []);

  /**
   * Cleanup worker pool on unmount
   */
  useEffect(() => {
    return () => {
      terminateWorkerPool();
    };
  }, []);

  return {
    ...state,
    convert,
    convertBatch,
    download,
    downloadAll,
    reset,
  };
}

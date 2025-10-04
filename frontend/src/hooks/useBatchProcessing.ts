/**
 * useBatchProcessing Hook
 * Provides state management and actions for batch image processing
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getBatchProcessingManager } from '@/lib/batchProcessingManager';
import type {
  BatchProcessingState,
  BatchStatistics,
  ImageProcessingItem,
} from '@/types/batchProcessing';
import type { ImageFormat } from '@/lib/imageConverter';
import type { ConversionOptions, ConversionResult } from '@/lib/imageProcessing';

export function useBatchProcessing() {
  const [state, setState] = useState<BatchProcessingState>({
    items: new Map(),
    totalItems: 0,
    completedItems: 0,
    failedItems: 0,
    isProcessing: false,
    overallProgress: 0,
  });

  const manager = useMemo(() => getBatchProcessingManager(), []);

  // Subscribe to manager state updates
  useEffect(() => {
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    // Initialize state
    setState(manager.getState());

    return unsubscribe;
  }, [manager]);

  /**
   * Add files to the batch queue
   */
  const addFiles = useCallback(
    (files: File[]) => {
      return manager.addFiles(files);
    },
    [manager]
  );

  /**
   * Process all items in the batch
   */
  const processBatch = useCallback(
    async (targetFormat: ImageFormat, options?: ConversionOptions) => {
      return manager.processBatch(targetFormat, options);
    },
    [manager]
  );

  /**
   * Retry a failed item
   */
  const retryItem = useCallback(
    async (id: string, targetFormat: ImageFormat, options?: ConversionOptions) => {
      return manager.retryItem(id, targetFormat, options || {});
    },
    [manager]
  );

  /**
   * Cancel a queued item
   */
  const cancelItem = useCallback(
    (id: string) => {
      manager.cancelItem(id);
    },
    [manager]
  );

  /**
   * Clear all items
   */
  const clear = useCallback(() => {
    manager.clear();
  }, [manager]);

  /**
   * Clear only completed items
   */
  const clearCompleted = useCallback(() => {
    manager.clearCompleted();
  }, [manager]);

  /**
   * Get statistics
   */
  const statistics = useMemo<BatchStatistics>(() => {
    return manager.getStatistics();
  }, [manager, state]);

  /**
   * Get items as array
   */
  const items = useMemo<ImageProcessingItem[]>(() => {
    return Array.from(state.items.values());
  }, [state.items]);

  /**
   * Get completed results
   */
  const results = useMemo<ConversionResult[]>(() => {
    return items.filter((item) => item.result).map((item) => item.result!);
  }, [items]);

  /**
   * Get queued items
   */
  const queuedItems = useMemo(() => {
    return items.filter((item) => item.status === 'queued');
  }, [items]);

  /**
   * Get processing items
   */
  const processingItems = useMemo(() => {
    return items.filter((item) => item.status === 'processing');
  }, [items]);

  /**
   * Get completed items
   */
  const completedItems = useMemo(() => {
    return items.filter((item) => item.status === 'complete');
  }, [items]);

  /**
   * Get failed items
   */
  const failedItems = useMemo(() => {
    return items.filter((item) => item.status === 'error');
  }, [items]);

  return {
    // State
    state,
    items,
    results,
    queuedItems,
    processingItems,
    completedItems,
    failedItems,
    statistics,

    // Actions
    addFiles,
    processBatch,
    retryItem,
    cancelItem,
    clear,
    clearCompleted,

    // Computed
    canProcess: state.totalItems > 0 && !state.isProcessing,
    hasItems: state.totalItems > 0,
    hasCompleted: state.completedItems > 0,
    hasFailed: state.failedItems > 0,
  };
}

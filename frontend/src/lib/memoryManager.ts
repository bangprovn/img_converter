/**
 * Memory Management Utilities
 * Monitors and manages memory usage during image processing
 */

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercentage: number;
}

/**
 * Get current memory usage information
 */
export function getMemoryInfo(): MemoryInfo | null {
  // Check if performance.memory is available (Chromium-based browsers)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Check if we're approaching memory limits
 */
export function isMemoryWarning(threshold: number = 80): boolean {
  const memInfo = getMemoryInfo();
  if (!memInfo) return false;
  return memInfo.usedPercentage >= threshold;
}

/**
 * Check if we're out of memory
 */
export function isOutOfMemory(threshold: number = 95): boolean {
  const memInfo = getMemoryInfo();
  if (!memInfo) return false;
  return memInfo.usedPercentage >= threshold;
}

/**
 * Format memory size for display
 */
export function formatMemorySize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
}

/**
 * Buffer pool for reusing ArrayBuffers
 */
export class BufferPool {
  private buffers: Map<number, ArrayBuffer[]> = new Map();
  private maxBuffersPerSize: number = 3;

  /**
   * Get a buffer of at least the specified size
   */
  acquire(size: number): ArrayBuffer {
    const buffers = this.buffers.get(size);
    if (buffers && buffers.length > 0) {
      return buffers.pop()!;
    }
    return new ArrayBuffer(size);
  }

  /**
   * Return a buffer to the pool
   */
  release(buffer: ArrayBuffer) {
    const size = buffer.byteLength;
    let buffers = this.buffers.get(size);

    if (!buffers) {
      buffers = [];
      this.buffers.set(size, buffers);
    }

    if (buffers.length < this.maxBuffersPerSize) {
      buffers.push(buffer);
    }
  }

  /**
   * Clear the pool
   */
  clear() {
    this.buffers.clear();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    let totalBuffers = 0;
    let totalSize = 0;

    this.buffers.forEach((buffers, size) => {
      totalBuffers += buffers.length;
      totalSize += buffers.length * size;
    });

    return {
      totalBuffers,
      totalSize,
      formattedSize: formatMemorySize(totalSize),
    };
  }
}

// Global buffer pool instance
let bufferPoolInstance: BufferPool | null = null;

/**
 * Get or create the buffer pool singleton
 */
export function getBufferPool(): BufferPool {
  if (!bufferPoolInstance) {
    bufferPoolInstance = new BufferPool();
  }
  return bufferPoolInstance;
}

/**
 * Clear the buffer pool
 */
export function clearBufferPool() {
  if (bufferPoolInstance) {
    bufferPoolInstance.clear();
  }
}

/**
 * Force garbage collection (if available)
 */
export function triggerGC() {
  // This only works in Chrome with --expose-gc flag
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }
}

/**
 * Memory Monitor class
 */
export class MemoryMonitor {
  private interval: number | null = null;
  private warningCallback?: (info: MemoryInfo) => void;
  private errorCallback?: (info: MemoryInfo) => void;

  /**
   * Start monitoring memory
   */
  start(
    intervalMs: number = 1000,
    onWarning?: (info: MemoryInfo) => void,
    onError?: (info: MemoryInfo) => void
  ) {
    this.warningCallback = onWarning;
    this.errorCallback = onError;

    this.interval = window.setInterval(() => {
      const memInfo = getMemoryInfo();
      if (!memInfo) return;

      if (isOutOfMemory() && this.errorCallback) {
        this.errorCallback(memInfo);
      } else if (isMemoryWarning() && this.warningCallback) {
        this.warningCallback(memInfo);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

/**
 * Error class for out-of-memory errors
 */
export class OutOfMemoryError extends Error {
  constructor(message: string = 'Out of memory') {
    super(message);
    this.name = 'OutOfMemoryError';
  }
}

/**
 * Safely execute a function with memory monitoring
 */
export async function withMemoryGuard<T>(
  fn: () => Promise<T>,
  onMemoryWarning?: () => void
): Promise<T> {
  const initialMemory = getMemoryInfo();

  try {
    // Check before execution
    if (isOutOfMemory()) {
      throw new OutOfMemoryError('Insufficient memory to start operation');
    }

    const result = await fn();

    // Check after execution
    if (isMemoryWarning() && onMemoryWarning) {
      onMemoryWarning();
    }

    return result;
  } catch (error) {
    // Check if it's a memory-related error
    if (
      error instanceof Error &&
      (error.name === 'RangeError' || error.message.includes('memory'))
    ) {
      throw new OutOfMemoryError(error.message);
    }
    throw error;
  } finally {
    const finalMemory = getMemoryInfo();
    if (initialMemory && finalMemory) {
      const memoryDiff = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      if (memoryDiff > 50 * 1024 * 1024) {
        // More than 50MB leaked
        console.warn(`Potential memory leak detected: ${formatMemorySize(memoryDiff)}`);
      }
    }
  }
}

/**
 * Worker Pool Manager
 * Manages a pool of Web Workers for parallel image processing
 */

import type { WorkerMessage, WorkerResponse } from '@/workers/image-processor.worker';

export interface WorkerTask {
  id: string;
  message: WorkerMessage;
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private pendingTasks = new Map<string, WorkerTask>();
  private readonly maxWorkers: number;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.maxWorkers; i++) {
      const initPromise = new Promise<void>((resolve) => {
        const worker = new Worker(
          new URL('../workers/image-processor.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.addEventListener('message', (event: MessageEvent) => {
          // Handle ready message
          if (event.data.type === 'ready') {
            this.workers.push(worker);
            this.availableWorkers.push(worker);
            resolve();
            return;
          }

          // Handle task response
          this.handleWorkerMessage(worker, event.data as WorkerResponse);
        });

        worker.addEventListener('error', (error) => {
          console.error('Worker error:', error);
        });
      });

      initPromises.push(initPromise);
    }

    await Promise.all(initPromises);
  }

  /**
   * Handle worker message response
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse) {
    const task = this.pendingTasks.get(response.id);

    if (!task) {
      console.warn('Received response for unknown task:', response.id);
      return;
    }

    this.pendingTasks.delete(response.id);

    if (response.type === 'error') {
      task.reject(new Error(response.error || 'Worker task failed'));
    } else {
      task.resolve(response);
    }

    // Mark worker as available and process next task
    this.availableWorkers.push(worker);
    this.processNextTask();
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask() {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    const task = this.taskQueue.shift()!;
    const worker = this.availableWorkers.shift()!;

    this.pendingTasks.set(task.id, task);

    // Transfer ArrayBuffer for better performance
    if (task.message.data instanceof ArrayBuffer) {
      worker.postMessage(task.message, [task.message.data]);
    } else {
      worker.postMessage(task.message);
    }
  }

  /**
   * Execute a task using the worker pool
   */
  async execute(message: Omit<WorkerMessage, 'id'>): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const task: WorkerTask = {
        id,
        message: { ...message, id } as WorkerMessage,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Convert an image using the worker pool
   */
  async convertImage(
    buffer: ArrayBuffer,
    sourceFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    targetFormat: 'jpeg' | 'png' | 'webp' | 'avif',
    options?: { quality?: number; lossless?: boolean }
  ): Promise<WorkerResponse> {
    return this.execute({
      type: 'convert',
      data: buffer,
      sourceFormat,
      targetFormat,
      options,
    });
  }

  /**
   * Decode an image using the worker pool
   */
  async decodeImage(
    buffer: ArrayBuffer,
    format: 'jpeg' | 'png' | 'webp' | 'avif'
  ): Promise<WorkerResponse> {
    return this.execute({
      type: 'decode',
      data: buffer,
      sourceFormat: format,
    });
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size,
    };
  }

  /**
   * Terminate all workers and clear the pool
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.pendingTasks.clear();
  }
}

// Create a singleton instance
let workerPoolInstance: WorkerPool | null = null;

/**
 * Get or create the worker pool singleton
 */
export async function getWorkerPool(): Promise<WorkerPool> {
  if (!workerPoolInstance) {
    workerPoolInstance = new WorkerPool(4);
    await workerPoolInstance.initialize();
  }
  return workerPoolInstance;
}

/**
 * Terminate the worker pool singleton
 */
export function terminateWorkerPool() {
  if (workerPoolInstance) {
    workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
}

/**
 * Mask-based inpainting / object removal using MI-GAN.
 *
 * Model: MI-GAN-512-Places2 ONNX pipeline (whole pre/post-processing pipeline).
 *   Source:      https://huggingface.co/andraniksargsyan/migan  (MIT)
 *   Paper/code:  Picsart-AI-Research/MI-GAN, ICCV 2023
 *   Attribution: "MI-GAN: A Simple Baseline for Image Inpainting on Mobile
 *                 Devices", Sargsyan et al., ICCV 2023.
 *
 * Verified ONNX contract for `migan_pipeline_v2.onnx` (onnxruntime-web, runtime metadata):
 *   input  `image` : uint8 [1, 3, H, W] (NCHW, RGB)   — arbitrary H/W
 *   input  `mask`  : uint8 [1, 1, H, W] (NCHW)        — 255 = known/preserve,
 *                                                       0   = hole/to inpaint
 *   output `result`: uint8 [1, 3, H, W] (NCHW, RGB)
 * The pipeline performs its own uint8->float normalisation, crop/resize to 512,
 * blending and float->uint8 conversion, and "supports arbitrary resolution
 * inputs" (upstream README). The mask must be binary.
 */

export const INPAINTING_MODEL_ID = 'MI-GAN-512-Places2 (ONNX pipeline)';
export const INPAINTING_MODEL_ATTRIBUTION =
  'MI-GAN by Picsart AI Research (Sargsyan et al., ICCV 2023)';
export const INPAINTING_MODEL_LICENSE = 'MIT';
export const INPAINTING_DEFAULT_MODEL_URL =
  'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx';

/** 255 = keep the original pixel, 0 = replace it with the model output. */
export const MASK_KNOWN = 255;
export const MASK_HOLE = 0;

export interface InpaintingInfo {
  modelId: string;
  modelUrl: string;
  executionProvider: 'wasm' | 'webgpu' | 'unknown';
  license: string;
  attribution: string;
}

export interface InpaintingProgress {
  phase: 'download' | 'infer';
  /** 0..1 when known, otherwise -1 (indeterminate). */
  progress: number;
  loadedBytes?: number;
  totalBytes?: number;
}

export interface InpaintRequest {
  /** RGBA pixels of the source image. */
  image: { data: Uint8ClampedArray; width: number; height: number };
  /** Single-channel mask, same width/height: 255 keep, 0 inpaint. */
  mask: Uint8Array;
}

export interface InpaintResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function getInpaintingModelUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  return env.VITE_INPAINTING_MODEL_URL || INPAINTING_DEFAULT_MODEL_URL;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: InpaintingProgress) => void;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * A hung wasm worker never settles its pending request. If no message arrives
 * for this long the request is failed and the worker is terminated so the next
 * call starts a fresh session and the UI Retry button can succeed.
 */
const WORKER_SILENCE_TIMEOUT_MS = 10 * 60 * 1000;

type WorkerResponse =
  | { type: 'ready'; id: number; info: InpaintingInfo }
  | { type: 'progress'; id: number; progress: InpaintingProgress }
  | { type: 'result'; id: number; data: Uint8ClampedArray; width: number; height: number }
  | { type: 'error'; id: number; message: string };

let worker: Worker | null = null;
let activeInfo: InpaintingInfo | null = null;
let nextRequestId = 0;
const pending = new Map<number, PendingRequest>();
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function armWatchdog(id: number, request: PendingRequest): void {
  clearTimeout(request.timer);
  request.timer = setTimeout(() => {
    if (!pending.has(id)) return;
    pending.delete(id);
    request.reject(new Error('The inpainting worker stopped responding. Please try again.'));
    // A stalled wasm session cannot be reused — drop it so Retry starts clean.
    worker?.terminate();
    worker = null;
    activeInfo = null;
    rejectAll('Inpainting worker restarted after a timeout');
  }, WORKER_SILENCE_TIMEOUT_MS);
}

function registerPending(id: number, request: PendingRequest): void {
  pending.set(id, request);
  armWatchdog(id, request);
}

function rejectAll(message: string): void {
  for (const [id, request] of pending) {
    pending.delete(id);
    clearTimeout(request.timer);
    request.reject(new Error(message));
  }
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('../workers/inpainting.worker.ts', import.meta.url), {
    type: 'module',
  });

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const data = event.data;
    const request = pending.get(data.id);
    if (!request) return;

    if (data.type === 'progress') {
      armWatchdog(data.id, request);
      request.onProgress?.(data.progress);
      return;
    }
    pending.delete(data.id);
    clearTimeout(request.timer);

    if (data.type === 'ready') {
      activeInfo = data.info;
      request.resolve(data.info);
    } else if (data.type === 'result') {
      request.resolve({ data: data.data, width: data.width, height: data.height });
    } else if (data.type === 'error') {
      request.reject(new Error(data.message));
    }
  };

  worker.onerror = (event) => {
    const message = event.message || 'Inpainting worker crashed';
    rejectAll(message);
    activeInfo = null;
    worker?.terminate();
    worker = null;
  };

  return worker;
}

export function getInpaintingModelInfo(): InpaintingInfo {
  return (
    activeInfo ?? {
      modelId: INPAINTING_MODEL_ID,
      modelUrl: getInpaintingModelUrl(),
      executionProvider: 'unknown',
      license: INPAINTING_MODEL_LICENSE,
      attribution: INPAINTING_MODEL_ATTRIBUTION,
    }
  );
}

/** Lazily downloads + prepares the MI-GAN ONNX session. */
export function initializeInpaintingModel(
  onProgress?: (progress: InpaintingProgress) => void,
): Promise<InpaintingInfo> {
  if (activeInfo) return Promise.resolve(activeInfo);
  return enqueue(
    () =>
      new Promise<InpaintingInfo>((resolve, reject) => {
        const id = ++nextRequestId;
        registerPending(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
          onProgress,
        });
        // Resolve the worker inside the task so a worker that was replaced
        // (crash/timeout) while this request was queued is not used.
        getWorker().postMessage({ type: 'init', id, url: getInpaintingModelUrl() });
      }),
  );
}

/** Runs MI-GAN on the supplied pixels/mask. Only one inference runs at a time. */
export async function inpaint(
  request: InpaintRequest,
  onProgress?: (progress: InpaintingProgress) => void,
): Promise<InpaintResult> {
  const { image, mask } = request;
  if (image.width <= 0 || image.height <= 0) {
    throw new Error('Invalid image dimensions for inpainting');
  }
  if (mask.length !== image.width * image.height) {
    throw new Error('Mask size does not match the image size');
  }

  await initializeInpaintingModel();

  // Copy before transferring so the caller's buffers stay usable.
  const imageCopy = new Uint8ClampedArray(image.data);
  const maskCopy = new Uint8Array(mask);

  return enqueue(
    () =>
      new Promise<InpaintResult>((resolve, reject) => {
        const id = ++nextRequestId;
        registerPending(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
          onProgress,
        });
        getWorker().postMessage(
          {
            type: 'run',
            id,
            image: imageCopy,
            mask: maskCopy,
            width: image.width,
            height: image.height,
          },
          [imageCopy.buffer, maskCopy.buffer],
        );
      }),
  );
}

/** Terminates the worker and drops the cached session. */
export function disposeInpaintingModel(): void {
  rejectAll('Inpainting model was disposed');
  worker?.terminate();
  worker = null;
  activeInfo = null;
  queue = Promise.resolve();
}

/// <reference lib="webworker" />
/**
 * Inpainting worker — MI-GAN-512-Places2 ONNX pipeline via onnxruntime-web.
 * Keeps the model download and inference off the main thread.
 */
import * as ort from 'onnxruntime-web';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import ortWasmMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import {
  INPAINTING_MODEL_ATTRIBUTION,
  INPAINTING_MODEL_ID,
  INPAINTING_MODEL_LICENSE,
  type InpaintingInfo,
  type InpaintingProgress,
} from '@/lib/inpainting';

let session: ort.InferenceSession | null = null;
let activeInfo: InpaintingInfo | null = null;

function post(message: unknown, transfer?: Transferable[]): void {
  (self as DedicatedWorkerGlobalScope).postMessage(message, transfer ?? []);
}

function configureOrt(): void {
  ort.env.wasm.wasmPaths = {
    wasm: ortWasmUrl,
    mjs: ortWasmMjsUrl,
  };
  const crossOriginIsolated = (self as unknown as { crossOriginIsolated?: boolean })
    .crossOriginIsolated;
  ort.env.wasm.numThreads =
    crossOriginIsolated && typeof navigator !== 'undefined'
      ? Math.max(1, Math.min(4, navigator.hardwareConcurrency || 1))
      : 1;
  ort.env.wasm.proxy = false;
  ort.env.logLevel = 'warning';
}

async function fetchModelBytes(
  url: string,
  onProgress?: (progress: InpaintingProgress) => void,
): Promise<Uint8Array> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Failed to download the MI-GAN weights (HTTP ${response.status})`);
  }

  const totalHeader = response.headers.get('content-length');
  const totalBytes = totalHeader ? Number(totalHeader) : 0;

  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    onProgress?.({ phase: 'download', progress: 1, loadedBytes: buffer.length, totalBytes });
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  const single: Uint8Array | null = totalBytes > 0 ? new Uint8Array(totalBytes) : null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    if (single) {
      single.set(value, loadedBytes);
    } else {
      chunks.push(value);
    }
    loadedBytes += value.byteLength;
    onProgress?.({
      phase: 'download',
      progress: totalBytes > 0 ? loadedBytes / totalBytes : -1,
      loadedBytes,
      totalBytes,
    });
  }

  if (single) return single;
  const merged = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function ensureSession(
  url: string,
  onProgress?: (progress: InpaintingProgress) => void,
): Promise<InpaintingInfo> {
  if (session && activeInfo) return activeInfo;

  configureOrt();
  const modelBytes = await fetchModelBytes(url, onProgress);

  session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });

  activeInfo = {
    modelId: INPAINTING_MODEL_ID,
    modelUrl: url,
    executionProvider: 'wasm',
    license: INPAINTING_MODEL_LICENSE,
    attribution: INPAINTING_MODEL_ATTRIBUTION,
  };
  return activeInfo;
}

interface InitMessage {
  type: 'init';
  id: number;
  url: string;
}
interface RunMessage {
  type: 'run';
  id: number;
  image: Uint8ClampedArray;
  mask: Uint8Array;
  width: number;
  height: number;
}
type IncomingMessage = InitMessage | RunMessage;

async function runInference(message: RunMessage): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  if (!session) throw new Error('MI-GAN session is not initialized');

  const { image, mask, width, height } = message;
  const area = width * height;

  const rgb = new Uint8Array(3 * area);
  const maskBinary = new Uint8Array(area);
  for (let i = 0; i < area; i += 1) {
    rgb[i] = image[i * 4];
    rgb[area + i] = image[i * 4 + 1];
    rgb[2 * area + i] = image[i * 4 + 2];
    // The MI-GAN pipeline requires a strictly binary mask.
    maskBinary[i] = mask[i] >= 128 ? 255 : 0;
  }

  const imageName = session.inputNames.includes('image') ? 'image' : session.inputNames[0];
  const maskName = session.inputNames.includes('mask') ? 'mask' : session.inputNames[1];
  const outputName = session.outputNames.includes('result')
    ? 'result'
    : session.outputNames[0];

  const feeds: Record<string, ort.Tensor> = {
    [imageName]: new ort.Tensor('uint8', rgb, [1, 3, height, width]),
    [maskName]: new ort.Tensor('uint8', maskBinary, [1, 1, height, width]),
  };
  const outputs = await session.run(feeds);
  const result = outputs[outputName] as ort.Tensor;
  const generated = result.data as Uint8Array;

  const rgba = new Uint8ClampedArray(area * 4);
  for (let i = 0; i < area; i += 1) {
    // Preserve the original pixels everywhere the mask marks them as known.
    const keep = maskBinary[i] === 255;
    rgba[i * 4] = keep ? image[i * 4] : generated[i];
    rgba[i * 4 + 1] = keep ? image[i * 4 + 1] : generated[area + i];
    rgba[i * 4 + 2] = keep ? image[i * 4 + 2] : generated[2 * area + i];
    // MI-GAN only models RGB; keep the source alpha so transparent PNGs stay
    // transparent instead of being forced opaque.
    rgba[i * 4 + 3] = image[i * 4 + 3];
  }
  return { data: rgba, width, height };
}

self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (message.type === 'init') {
    try {
      const info = await ensureSession(message.url, (progress) =>
        post({ type: 'progress', id: message.id, progress }),
      );
      post({ type: 'ready', id: message.id, info });
    } catch (error) {
      post({
        type: 'error',
        id: message.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (message.type === 'run') {
    try {
      post(
        { type: 'progress', id: message.id, progress: { phase: 'infer', progress: 0 } },
        [],
      );
      const result = await runInference(message);
      post(
        { type: 'progress', id: message.id, progress: { phase: 'infer', progress: 1 } },
        [],
      );
      post(
        { type: 'result', id: message.id, data: result.data, width: result.width, height: result.height },
        [result.data.buffer],
      );
    } catch (error) {
      post({
        type: 'error',
        id: message.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

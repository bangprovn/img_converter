/**
 * Image Processor Web Worker
 * Handles image decoding, encoding, and conversion using jSquash WASM codecs
 * WASM codecs are lazy-loaded on-demand for optimal performance
 */

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

// Lazy-loaded codec references
let jpegCodec: any = null;
let pngCodec: any = null;
let webpCodec: any = null;
let avifCodec: any = null;

/**
 * Lazy load JPEG codec
 */
async function loadJpegCodec() {
  if (!jpegCodec) {
    jpegCodec = await import('@jsquash/jpeg');
  }
  return jpegCodec;
}

/**
 * Lazy load PNG codec
 */
async function loadPngCodec() {
  if (!pngCodec) {
    pngCodec = await import('@jsquash/png');
  }
  return pngCodec;
}

/**
 * Lazy load WebP codec
 */
async function loadWebpCodec() {
  if (!webpCodec) {
    webpCodec = await import('@jsquash/webp');
  }
  return webpCodec;
}

/**
 * Lazy load AVIF codec
 */
async function loadAvifCodec() {
  if (!avifCodec) {
    avifCodec = await import('@jsquash/avif');
  }
  return avifCodec;
}

export interface WorkerMessage {
  type: 'encode' | 'decode' | 'convert';
  id: string;
  data: ArrayBuffer;
  sourceFormat: ImageFormat;
  targetFormat?: ImageFormat;
  options?: EncodingOptions;
}

export interface EncodingOptions {
  // Common options
  quality?: number;
  lossless?: boolean;

  // JPEG options
  progressive?: boolean;
  chromaSubsampling?: '4:4:4' | '4:2:2' | '4:2:0';

  // PNG options
  compressionLevel?: number;
  interlace?: boolean;

  // WebP options
  effort?: number;
  method?: number;

  // AVIF options
  speed?: number;
}

export interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  id: string;
  data?: ArrayBuffer;
  error?: string;
  dimensions?: { width: number; height: number };
  progress?: number;
  stage?: string;
}

/**
 * Decode image from ArrayBuffer to ImageData
 * Lazy-loads the appropriate codec on demand
 */
async function decodeImage(buffer: ArrayBuffer, format: ImageFormat): Promise<ImageData> {
  let imageData: ImageData | null = null;

  switch (format) {
    case 'jpeg': {
      const codec = await loadJpegCodec();
      imageData = await codec.decode(buffer);
      break;
    }
    case 'png': {
      const codec = await loadPngCodec();
      imageData = await codec.decode(buffer);
      break;
    }
    case 'webp': {
      const codec = await loadWebpCodec();
      imageData = await codec.decode(buffer);
      break;
    }
    case 'avif': {
      const codec = await loadAvifCodec();
      imageData = await codec.decode(buffer);
      break;
    }
    default:
      throw new Error(`Unsupported decode format: ${format}`);
  }

  if (!imageData) {
    throw new Error(`Failed to decode ${format} image`);
  }

  return imageData;
}

/**
 * Encode ImageData to ArrayBuffer with target format
 * Lazy-loads the appropriate codec on demand
 */
async function encodeImage(
  imageData: ImageData,
  format: ImageFormat,
  options: EncodingOptions = {}
): Promise<ArrayBuffer> {
  switch (format) {
    case 'jpeg': {
      const codec = await loadJpegCodec();
      const jpegOptions: any = {
        quality: options.quality ?? 80,
      };

      // Add progressive encoding if specified
      if (options.progressive !== undefined) {
        jpegOptions.progressive = options.progressive;
      }

      return await codec.encode(imageData, jpegOptions);
    }

    case 'png': {
      const codec = await loadPngCodec();
      const pngOptions: any = {};

      // Add compression level if specified
      if (options.compressionLevel !== undefined) {
        pngOptions.level = options.compressionLevel;
      }

      return await codec.encode(imageData, pngOptions);
    }

    case 'webp': {
      const codec = await loadWebpCodec();
      const webpOptions: any = {};

      // Use lossless mode or quality
      if (options.lossless) {
        webpOptions.lossless = true;
      } else {
        webpOptions.quality = options.quality ?? 75;
      }

      return await codec.encode(imageData, webpOptions);
    }

    case 'avif': {
      const codec = await loadAvifCodec();
      const avifOptions: any = {};

      // Use lossless mode or quality
      if (options.lossless) {
        avifOptions.lossless = true;
      } else {
        avifOptions.quality = options.quality ?? 75;
      }

      // Automatically adjust speed for large images to prevent hanging
      // Calculate pixel count to determine image size
      const pixelCount = imageData.width * imageData.height;
      let speed = options.speed ?? 4;

      // For large images (>2MP), use faster speed settings
      if (pixelCount > 2000000 && speed < 6) {
        speed = 6; // Use faster encoding for large images
        console.log(`Large image detected (${pixelCount} pixels), using speed ${speed} for AVIF encoding`);
      }

      // For very large images (>5MP), use even faster speed
      if (pixelCount > 5000000 && speed < 7) {
        speed = 7;
        console.log(`Very large image detected (${pixelCount} pixels), using speed ${speed} for AVIF encoding`);
      }

      avifOptions.speed = speed;

      return await codec.encode(imageData, avifOptions);
    }

    default:
      throw new Error(`Unsupported encode format: ${format}`);
  }
}

/**
 * Send progress update
 */
function sendProgress(id: string, progress: number, stage: string) {
  const response: WorkerResponse = {
    type: 'progress',
    id,
    progress,
    stage,
  };
  self.postMessage(response);
}

/**
 * Convert image from one format to another
 */
async function convertImage(
  buffer: ArrayBuffer,
  sourceFormat: ImageFormat,
  targetFormat: ImageFormat,
  options: EncodingOptions = {},
  id?: string
): Promise<{ buffer: ArrayBuffer; dimensions: { width: number; height: number } }> {
  // Send initial progress
  if (id) sendProgress(id, 10, 'Loading codec');

  // Decode source image
  if (id) sendProgress(id, 30, 'Decoding image');
  const imageData = await decodeImage(buffer, sourceFormat);

  // Encode to target format
  if (id) sendProgress(id, 50, `Encoding to ${targetFormat.toUpperCase()}`);
  const encodedBuffer = await encodeImage(imageData, targetFormat, options);

  // Complete
  if (id) sendProgress(id, 90, 'Finalizing');

  return {
    buffer: encodedBuffer,
    dimensions: {
      width: imageData.width,
      height: imageData.height,
    },
  };
}

/**
 * Message handler
 */
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data, sourceFormat, targetFormat, options } = event.data;

  try {
    switch (type) {
      case 'decode': {
        const imageData = await decodeImage(data, sourceFormat);
        const response: WorkerResponse = {
          type: 'success',
          id,
          dimensions: {
            width: imageData.width,
            height: imageData.height,
          },
        };
        self.postMessage(response);
        break;
      }

      case 'encode': {
        if (!targetFormat) {
          throw new Error('Target format is required for encoding');
        }
        // First decode to get ImageData
        const imageData = await decodeImage(data, sourceFormat);
        // Then encode to target format
        const encodedBuffer = await encodeImage(imageData, targetFormat, options);

        const response: WorkerResponse = {
          type: 'success',
          id,
          data: encodedBuffer,
          dimensions: {
            width: imageData.width,
            height: imageData.height,
          },
        };
        self.postMessage(response, [encodedBuffer]);
        break;
      }

      case 'convert': {
        if (!targetFormat) {
          throw new Error('Target format is required for conversion');
        }
        const result = await convertImage(data, sourceFormat, targetFormat, options, id);

        const response: WorkerResponse = {
          type: 'success',
          id,
          data: result.buffer,
          dimensions: result.dimensions,
        };
        self.postMessage(response, [result.buffer]);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    self.postMessage(response);
  }
});

// Signal that the worker is ready
self.postMessage({ type: 'ready' });

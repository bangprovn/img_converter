import GIF from 'gif.js';
import { parseGIF, decompressFrames } from 'gifuct-js';

export interface GifProcessingOptions {
  compression?: 'low' | 'medium' | 'high';
  optimize?: boolean;
  colors?: number;
  lossy?: number;
}

export interface GifOptimizationOptions {
  level: number; // 1-3
  lossy?: number; // 0-200
  colors?: number;
  scale?: number;
}

/**
 * Compress a GIF file by re-encoding with optimized settings
 */
export async function compressGif(
  file: File,
  level: 'low' | 'medium' | 'high'
): Promise<File[]> {
  // Compression strategies
  const compressionSettings = {
    low: {
      quality: 10,
      workers: 2,
      colors: 256,
      scale: 1,
      skipFrames: 1  // Keep all frames
    },
    medium: {
      quality: 15,
      workers: 4,
      colors: 128,
      scale: 0.8,
      skipFrames: 2  // Keep every 2nd frame
    },
    high: {
      quality: 20,
      workers: 4,
      colors: 64,
      scale: 0.6,
      skipFrames: 3  // Keep every 3rd frame
    }
  };

  const settings = compressionSettings[level];

  // Load the original GIF and extract frames
  const frames = await extractGifFrames(file);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  // Get original dimensions
  const originalWidth = frames[0].canvas.width;
  const originalHeight = frames[0].canvas.height;

  // Calculate scaled dimensions
  const scaledWidth = Math.round(originalWidth * settings.scale);
  const scaledHeight = Math.round(originalHeight * settings.scale);

  // Create new GIF with optimized settings
  const gif = new GIF({
    workers: settings.workers,
    quality: settings.quality,
    width: scaledWidth,
    height: scaledHeight,
    workerScript: '/gif.worker.js',
    dither: 'FloydSteinberg',  // Better quality with reduced colors
  });

  // Add frames with skipping and scaling
  for (let i = 0; i < frames.length; i += settings.skipFrames) {
    const frame = frames[i];

    // Scale down the canvas if needed
    if (settings.scale !== 1) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = scaledWidth;
      scaledCanvas.height = scaledHeight;
      const ctx = scaledCanvas.getContext('2d');

      if (ctx) {
        // Use better image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(frame.canvas, 0, 0, scaledWidth, scaledHeight);

        // Adjust delay for skipped frames
        const adjustedDelay = frame.delay * settings.skipFrames;
        gif.addFrame(scaledCanvas, { delay: adjustedDelay });
      }
    } else {
      gif.addFrame(frame.canvas, { delay: frame.delay });
    }
  }

  // Render and return
  const blob = await new Promise<Blob>((resolve, reject) => {
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });

  const compressedFile = new File(
    [blob],
    file.name.replace(/\.gif$/i, '_compressed.gif'),
    { type: 'image/gif' }
  );

  return [compressedFile];
}

/**
 * Extract frames from a GIF file using gifuct-js
 */
async function extractGifFrames(file: File): Promise<Array<{ canvas: HTMLCanvasElement; delay: number }>> {
  const arrayBuffer = await file.arrayBuffer();
  const gifData = parseGIF(arrayBuffer);
  const frames = decompressFrames(gifData, true);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  // Get the full GIF dimensions from the logical screen descriptor
  const gifWidth = gifData.lsd.width;
  const gifHeight = gifData.lsd.height;

  const canvasFrames: Array<{ canvas: HTMLCanvasElement; delay: number }> = [];

  // Create a temporary canvas to build up the full image
  let previousCanvas: HTMLCanvasElement | null = null;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // Create a new canvas for this complete frame
    const canvas = document.createElement('canvas');
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Handle disposal method
    // 0 or 1: Do not dispose (keep previous frame)
    // 2: Restore to background
    // 3: Restore to previous
    const disposalType = frame.disposalType || 0;

    if (i > 0 && disposalType === 0 || disposalType === 1) {
      // Keep previous frame as background
      if (previousCanvas) {
        ctx.drawImage(previousCanvas, 0, 0);
      }
    } else if (disposalType === 2) {
      // Clear to transparent or background color
      ctx.clearRect(0, 0, gifWidth, gifHeight);
    } else if (disposalType === 3 && previousCanvas) {
      // Restore to previous frame
      ctx.drawImage(previousCanvas, 0, 0);
    }

    // Draw the current frame patch at its correct position
    const imageData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height
    );

    // Create a temporary canvas for the patch
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      // Draw the patch at the correct position (x, y offset)
      ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);
    }

    // Store this canvas as the previous one for the next iteration
    previousCanvas = canvas.cloneNode(true) as HTMLCanvasElement;
    const prevCtx = previousCanvas.getContext('2d');
    if (prevCtx) {
      prevCtx.drawImage(canvas, 0, 0);
    }

    canvasFrames.push({
      canvas,
      delay: frame.delay || 100
    });
  }

  return canvasFrames;
}

/**
 * Extract all frames from a GIF as PNG sequence
 * Note: This is a simplified implementation that extracts the first frame.
 * For full multi-frame support, use a dedicated GIF parsing library.
 */
export async function extractFrames(file: File): Promise<File[]> {
  const frames = await extractGifFrames(file);
  const pngFrames: File[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const pngFrame = await convertCanvasToPng(frame.canvas, i);
    pngFrames.push(pngFrame);
  }

  return pngFrames;
}

/**
 * Convert a canvas to PNG file
 */
async function convertCanvasToPng(canvas: HTMLCanvasElement, index: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create PNG blob'));
        return;
      }

      const pngFile = new File(
        [blob],
        `frame_${String(index + 1).padStart(3, '0')}.png`,
        { type: 'image/png' }
      );
      resolve(pngFile);
    }, 'image/png');
  });
}

/**
 * Optimize GIF with advanced options using gif.js
 */
export async function optimizeGif(
  file: File,
  options: GifOptimizationOptions
): Promise<File[]> {
  const { level, scale } = options;

  // Map optimization level to quality
  const quality = Math.min(30, level * 10);
  const workers = 4;

  const frames = await extractGifFrames(file);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  const gif = new GIF({
    workers,
    quality,
    workerScript: '/gif.worker.js',
  });

  for (const frame of frames) {
    // Apply scale if provided
    let canvas = frame.canvas;
    if (scale && scale !== 1) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = frame.canvas.width * scale;
      scaledCanvas.height = frame.canvas.height * scale;
      const ctx = scaledCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(frame.canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        canvas = scaledCanvas;
      }
    }

    gif.addFrame(canvas, { delay: frame.delay });
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });

  const optimizedFile = new File(
    [blob],
    file.name.replace(/\.gif$/i, '_optimized.gif'),
    { type: 'image/gif' }
  );

  return [optimizedFile];
}

/**
 * Resize a GIF using canvas scaling
 */
export async function resizeGif(
  file: File,
  width?: number,
  height?: number
): Promise<File[]> {
  const frames = await extractGifFrames(file);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  const originalWidth = frames[0].canvas.width;
  const originalHeight = frames[0].canvas.height;

  // Calculate dimensions
  let newWidth = width || originalWidth;
  let newHeight = height || originalHeight;

  if (width && !height) {
    newHeight = Math.round((originalHeight / originalWidth) * width);
  } else if (height && !width) {
    newWidth = Math.round((originalWidth / originalHeight) * height);
  }

  const gif = new GIF({
    workers: 4,
    quality: 10,
    width: newWidth,
    height: newHeight,
    workerScript: '/gif.worker.js',
  });

  for (const frame of frames) {
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = newWidth;
    resizedCanvas.height = newHeight;
    const ctx = resizedCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(frame.canvas, 0, 0, newWidth, newHeight);
      gif.addFrame(resizedCanvas, { delay: frame.delay });
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });

  const resizedFile = new File(
    [blob],
    file.name.replace(/\.gif$/i, '_resized.gif'),
    { type: 'image/gif' }
  );

  return [resizedFile];
}

/**
 * Get GIF information
 */
export async function getGifInfo(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      const info = `File: ${file.name}
Size: ${formatFileSize(file.size)}
Dimensions: ${img.naturalWidth}x${img.naturalHeight}
Type: ${file.type}`;
      resolve(info);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load GIF'));
    };

    img.src = url;
  });
}

/**
 * Crop excess transparency from GIF
 * Note: Simplified implementation
 */
export async function cropTransparency(file: File): Promise<File[]> {
  // For now, return the original file
  // A full implementation would analyze transparency and crop
  return [file];
}

/**
 * Change GIF loop count
 * Note: gif.js doesn't directly support modifying existing GIFs,
 * so we re-encode with the new loop count
 */
export async function changeLoopCount(
  file: File,
  loopCount: number
): Promise<File[]> {
  const frames = await extractGifFrames(file);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  const gif = new GIF({
    workers: 4,
    quality: 10,
    repeat: loopCount === 0 ? 0 : loopCount === -1 ? -1 : loopCount,
    workerScript: '/gif.worker.js',
  });

  for (const frame of frames) {
    gif.addFrame(frame.canvas, { delay: frame.delay });
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    gif.on('finished', resolve);
    gif.on('error', reject);
    gif.render();
  });

  const newFile = new File(
    [blob],
    file.name.replace(/\.gif$/i, '_looped.gif'),
    { type: 'image/gif' }
  );

  return [newFile];
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

/**
 * Image Converter Library
 * Handles file-to-ArrayBuffer conversion, image dimension detection, and format detection
 */

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export type ResizePreset = 'original' | 'custom' | '3840x2160' | '2560x1440' | '1920x1080' | '1280x720' | '800x600' | '640x480';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageInfo {
  format: ImageFormat;
  dimensions: ImageDimensions;
  buffer: ArrayBuffer;
}

export interface ResizeOptions {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  dpi?: number; // DPI for output image (default: 72)
}

export interface ResizePresetConfig {
  label: string;
  width: number;
  height: number;
}

export const RESIZE_PRESETS: Record<ResizePreset, ResizePresetConfig> = {
  original: { label: 'Original Size', width: 0, height: 0 },
  custom: { label: 'Custom', width: 0, height: 0 },
  '3840x2160': { label: '3840x2160 (4K UHD)', width: 3840, height: 2160 },
  '2560x1440': { label: '2560x1440 (QHD)', width: 2560, height: 1440 },
  '1920x1080': { label: '1920x1080 (Full HD)', width: 1920, height: 1080 },
  '1280x720': { label: '1280x720 (HD)', width: 1280, height: 720 },
  '800x600': { label: '800x600 (SVGA)', width: 800, height: 600 },
  '640x480': { label: '640x480 (VGA)', width: 640, height: 480 },
};

/**
 * Convert File to ArrayBuffer
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detect image format from file signature (magic bytes)
 */
export function detectImageFormat(buffer: ArrayBuffer): ImageFormat | null {
  const arr = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    arr[0] === 0x89 &&
    arr[1] === 0x50 &&
    arr[2] === 0x4E &&
    arr[3] === 0x47 &&
    arr[4] === 0x0D &&
    arr[5] === 0x0A &&
    arr[6] === 0x1A &&
    arr[7] === 0x0A
  ) {
    return 'png';
  }

  // WebP: RIFF....WEBP
  if (
    arr[0] === 0x52 && // R
    arr[1] === 0x49 && // I
    arr[2] === 0x46 && // F
    arr[3] === 0x46 && // F
    arr[8] === 0x57 && // W
    arr[9] === 0x45 && // E
    arr[10] === 0x42 && // B
    arr[11] === 0x50    // P
  ) {
    return 'webp';
  }

  // AVIF: check for ftyp box with avif brand
  // AVIF starts with ftyp box at offset 4
  if (arr.length >= 12) {
    const ftypString = String.fromCharCode(arr[4], arr[5], arr[6], arr[7]);
    if (ftypString === 'ftyp') {
      // Check for avif brand at offset 8
      const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11]);
      if (brand === 'avif' || brand === 'avis') {
        return 'avif';
      }
    }
  }

  return null;
}

/**
 * Get image dimensions using the browser's Image API
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension detection'));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions from ImageData
 */
export function getImageDataDimensions(imageData: ImageData): ImageDimensions {
  return {
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Validate image file using magic bytes and dimension check
 */
export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check file size (max 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_SIZE / (1024 * 1024)}MB limit` };
  }

  try {
    // First, validate using magic bytes to ensure it's actually an image
    const buffer = await fileToArrayBuffer(file);
    const detectedFormat = detectImageFormat(buffer);

    if (!detectedFormat) {
      return {
        valid: false,
        error: 'Unsupported file format. Only JPEG, PNG, WebP, and AVIF are supported.'
      };
    }

    // Additional validation: verify MIME type matches detected format
    const expectedMimeTypes: Record<ImageFormat, string[]> = {
      jpeg: ['image/jpeg', 'image/jpg'],
      png: ['image/png'],
      webp: ['image/webp'],
      avif: ['image/avif'],
    };

    const validMimeTypes = expectedMimeTypes[detectedFormat];
    if (!validMimeTypes.includes(file.type)) {
      console.warn(`MIME type mismatch: file type is ${file.type}, but detected format is ${detectedFormat}`);
      // Don't reject, just warn - MIME type can sometimes be incorrect
    }

    // Finally, verify the image can be loaded
    await getImageDimensions(file);

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid or corrupt image file'
    };
  }
}

/**
 * Get complete image info including format, dimensions, and buffer
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
  const buffer = await fileToArrayBuffer(file);
  const format = detectImageFormat(buffer);
  const dimensions = await getImageDimensions(file);

  if (!format) {
    throw new Error('Unsupported image format');
  }

  return {
    format,
    dimensions,
    buffer,
  };
}

/**
 * Create a download link for a converted image
 */
export function downloadImage(buffer: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get MIME type from format
 */
export function getMimeType(format: ImageFormat): string {
  const mimeTypes: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
  };
  return mimeTypes[format];
}

/**
 * Get file extension from format
 */
export function getFileExtension(format: ImageFormat): string {
  const extensions: Record<ImageFormat, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
  };
  return extensions[format];
}

/**
 * Calculate new dimensions based on aspect ratio
 */
export function calculateAspectRatioDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
  maintainAspectRatio: boolean
): ImageDimensions {
  if (!maintainAspectRatio) {
    return { width: targetWidth, height: targetHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  // If only width is changed, calculate height
  if (targetWidth !== originalWidth && targetHeight === originalHeight) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio)
    };
  }

  // If only height is changed, calculate width
  if (targetHeight !== originalHeight && targetWidth === originalWidth) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight
    };
  }

  // If both changed, maintain aspect ratio based on width
  return {
    width: targetWidth,
    height: Math.round(targetWidth / aspectRatio)
  };
}

/**
 * Resize image using canvas
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<{ blob: Blob; dimensions: ImageDimensions }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate final dimensions
        let finalWidth = options.width;
        let finalHeight = options.height;

        if (options.maintainAspectRatio) {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          finalHeight = Math.round(finalWidth / aspectRatio);
        }

        canvas.width = finalWidth;
        canvas.height = finalHeight;

        // Set DPI metadata if provided (for PNG format)
        if (options.dpi) {
          // DPI is set through canvas rendering but needs to be embedded in the image metadata
          // This is handled differently per format and may require additional libraries
          // For now, we'll add it as a note that it can be enhanced
        }

        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the resized image
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                dimensions: { width: finalWidth, height: finalHeight }
              });
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          file.type,
          0.95 // Quality for JPEG/WebP
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = url;
  });
}

/**
 * Apply resize preset to get dimensions
 */
export function applyResizePreset(
  preset: ResizePreset,
  originalDimensions: ImageDimensions
): ImageDimensions {
  if (preset === 'original') {
    return originalDimensions;
  }

  if (preset === 'custom') {
    return originalDimensions; // Return original, let user customize
  }

  const config = RESIZE_PRESETS[preset];
  return { width: config.width, height: config.height };
}

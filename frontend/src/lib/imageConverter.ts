/**
 * Image Converter Library
 * Handles file-to-ArrayBuffer conversion, image dimension detection, and format detection
 */

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageInfo {
  format: ImageFormat;
  dimensions: ImageDimensions;
  buffer: ArrayBuffer;
}

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

/**
 * Shared types, constants and defaults for the Watermark (ADD mode) feature.
 *
 * This module is intentionally free of DOM usage so it can be imported from
 * hooks, libs and components alike.
 */

export const WATERMARK_LAYOUTS = ['corner', 'center', 'tiled', 'diagonal'] as const;
export type WatermarkLayout = (typeof WATERMARK_LAYOUTS)[number];

export const WATERMARK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export const WATERMARK_OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const;
export type WatermarkOutputFormat = (typeof WATERMARK_OUTPUT_FORMATS)[number];

export type WatermarkMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * All tunable watermark parameters. Values are normalised by
 * `sanitizeWatermarkSettings` before being used or persisted.
 */
export interface WatermarkSettings {
  /** Placement strategy. */
  layout: WatermarkLayout;
  /** Anchor used by the `corner` layout (ignored by other layouts). */
  position: WatermarkPosition;
  /** Logo alpha in the range 0.05 - 1. */
  opacity: number;
  /** Logo width as a percentage of the source image width (1 - 100). */
  size: number;
  /** Extra rotation in degrees (-180 - 180). */
  rotation: number;
  /** Gap between tiles as a percentage of the logo size (0 - 200). */
  spacing: number;
  /** Edge inset as a percentage of the shorter source side (0 - 40). */
  margin: number;
  /** Encoded output format. */
  outputFormat: WatermarkOutputFormat;
  /** Encoder quality for lossy formats (0.1 - 1). */
  quality: number;
  /** Flat background painted behind the image for opaque formats (jpeg). */
  backgroundColor: string;
}

export const DEFAULT_WATERMARK_SETTINGS: WatermarkSettings = {
  layout: 'corner',
  position: 'bottom-right',
  opacity: 0.65,
  size: 22,
  rotation: 0,
  spacing: 60,
  margin: 4,
  outputFormat: 'png',
  quality: 0.92,
  backgroundColor: '#ffffff',
};

/** Limits mirrored by the UI validation. */
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024; // 50MB per source image
export const MAX_LOGO_BYTES = 20 * 1024 * 1024; // 20MB per logo

/**
 * Accept map shared by both uploaders. Deliberately excludes SVG because
 * rasterising arbitrary SVG onto a canvas can taint it in some browsers.
 */
export const WATERMARK_IMAGE_ACCEPT: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
};

/** A decoded source image that can be watermarked. */
export interface WatermarkSourceImage {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  /** Object URL used for the thumbnail; owned by the page and revoked on removal. */
  previewUrl: string;
  width: number;
  height: number;
  /** Decoded image reused across preview renders. */
  image: HTMLImageElement;
}

/** A decoded logo ready to be composited. */
export interface WatermarkLogoState {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  /** Object URL used for the checkerboard preview; owned by the page. */
  url: string;
  blob: Blob;
  image: HTMLImageElement;
}

/** Shape persisted into IndexedDB. Blobs are structured-cloneable. */
export interface WatermarkLogoRecord {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  updatedAt: number;
  blob: Blob;
}

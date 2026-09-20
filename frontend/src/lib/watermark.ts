/**
 * Canvas compositing engine for watermark ADD mode.
 *
 * Everything here is DOM based (canvas/image) but free of React so it can be
 * unit-tested or reused by the page and preview components.
 */

import {
  DEFAULT_WATERMARK_SETTINGS,
  WATERMARK_LAYOUTS,
  WATERMARK_OUTPUT_FORMATS,
  WATERMARK_POSITIONS,
  type WatermarkLayout,
  type WatermarkMimeType,
  type WatermarkOutputFormat,
  type WatermarkPosition,
  type WatermarkSettings,
} from '@/types/watermark';

/** Hard browser guard rails so we fail loudly instead of producing blank output. */
const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_AREA = 16384 * 16384;
/** Safety valve for pathological spacing/size combinations. */
const MAX_TILES = 20000;

function includes<T extends string>(values: readonly T[], candidate: unknown): candidate is T {
  return typeof candidate === 'string' && (values as readonly string[]).includes(candidate);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalises untrusted input (localStorage, imports) into valid settings so a
 * corrupted payload can never break the page.
 */
export function sanitizeWatermarkSettings(raw: unknown): WatermarkSettings {
  const base = DEFAULT_WATERMARK_SETTINGS;
  if (!raw || typeof raw !== 'object') return { ...base };
  const record = raw as Record<string, unknown>;

  const backgroundColor =
    typeof record.backgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(record.backgroundColor)
      ? record.backgroundColor.toLowerCase()
      : base.backgroundColor;

  return {
    layout: includes(WATERMARK_LAYOUTS, record.layout) ? (record.layout as WatermarkLayout) : base.layout,
    position: includes(WATERMARK_POSITIONS, record.position)
      ? (record.position as WatermarkPosition)
      : base.position,
    opacity: clampNumber(record.opacity, base.opacity, 0.05, 1),
    size: clampNumber(record.size, base.size, 1, 100),
    rotation: clampNumber(record.rotation, base.rotation, -180, 180),
    spacing: clampNumber(record.spacing, base.spacing, 0, 200),
    margin: clampNumber(record.margin, base.margin, 0, 40),
    outputFormat: includes(WATERMARK_OUTPUT_FORMATS, record.outputFormat)
      ? (record.outputFormat as WatermarkOutputFormat)
      : base.outputFormat,
    quality: clampNumber(record.quality, base.quality, 0.1, 1),
    backgroundColor,
  };
}

export function getOutputMimeType(format: WatermarkOutputFormat): WatermarkMimeType {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

export function getOutputExtension(format: WatermarkOutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

/** Builds `photo-watermarked.png` from `photo.jpg`. */
export function buildOutputFilename(originalName: string, format: WatermarkOutputFormat): string {
  const base = originalName.replace(/\.[^/.]+$/, '') || 'image';
  const safe = base.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'image';
  return `${safe}-watermarked.${getOutputExtension(format)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = Math.round((bytes / 1024 ** exponent) * 100) / 100;
  return `${value} ${units[exponent]}`;
}

/**
 * Decodes a Blob/File into an HTMLImageElement. The temporary object URL is
 * only revoked after the image has been fully decoded (`img.decode()` where
 * available) so later `drawImage` calls stay reliable on Safari.
 */
export function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();

    const settle = (error?: Error) => {
      URL.revokeObjectURL(url);
      if (error) reject(error);
      else resolve(image);
    };

    image.onload = () => {
      if (typeof image.decode === 'function') {
        image
          .decode()
          .then(() => settle())
          .catch(() => settle());
      } else {
        settle();
      }
    };
    image.onerror = () => settle(new Error('This file could not be decoded as an image.'));
    image.src = url;
  });
}

function assertPositiveDimensions(width: number, height: number, label: string): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`${label} has invalid dimensions.`);
  }
}

function validateCanvasSize(width: number, height: number): void {
  assertPositiveDimensions(width, height, 'Image');
  if (
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION ||
    width * height > MAX_CANVAS_AREA
  ) {
    throw new Error(
      `Image is too large to render at full resolution (${Math.round(width)}×${Math.round(
        height
      )}). Maximum supported is ${MAX_CANVAS_DIMENSION}px per side.`
    );
  }
}

interface LogoBox {
  width: number;
  height: number;
}

/** Resolves the drawn logo size, returning null when inputs are unusable. */
export function computeLogoBox(
  sourceWidth: number,
  sourceHeight: number,
  logoWidth: number,
  logoHeight: number,
  sizePercent: number
): LogoBox | null {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }
  if (!Number.isFinite(logoWidth) || !Number.isFinite(logoHeight) || logoWidth <= 0 || logoHeight <= 0) {
    return null;
  }
  const percent = clampValue(sizePercent, 1, 100);
  const width = (sourceWidth * percent) / 100;
  const height = width * (logoHeight / logoWidth);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

interface Point {
  x: number;
  y: number;
}

/** Center point of a single logo for the `corner` layout. */
export function resolveCornerPoint(
  position: WatermarkPosition,
  sourceWidth: number,
  sourceHeight: number,
  logoWidth: number,
  logoHeight: number,
  marginPercent: number
): Point {
  const margin =
    (clampValue(marginPercent, 0, 40) / 100) * Math.min(sourceWidth, sourceHeight);
  const left = margin + logoWidth / 2;
  const centerX = sourceWidth / 2;
  const right = sourceWidth - margin - logoWidth / 2;
  const top = margin + logoHeight / 2;
  const centerY = sourceHeight / 2;
  const bottom = sourceHeight - margin - logoHeight / 2;

  switch (position) {
    case 'top-left':
      return { x: left, y: top };
    case 'top-center':
      return { x: centerX, y: top };
    case 'top-right':
      return { x: right, y: top };
    case 'middle-left':
      return { x: left, y: centerY };
    case 'middle-right':
      return { x: right, y: centerY };
    case 'bottom-left':
      return { x: left, y: bottom };
    case 'bottom-center':
      return { x: centerX, y: bottom };
    case 'bottom-right':
      return { x: right, y: bottom };
    case 'center':
    default:
      return { x: centerX, y: centerY };
  }
}

function drawRotatedLogo(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleRad: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  if (angleRad) ctx.rotate(angleRad);
  ctx.drawImage(logo, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/**
 * Iterates tiles using the rotated bounding box as the step so consecutive
 * tiles can never overlap, and bails out if the step is not a positive finite
 * number (zero-size / NaN guard).
 */
function drawPattern(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  tileWidth: number,
  tileHeight: number,
  angleRad: number,
  spacingPercent: number,
  stagger: boolean,
  alpha: number
): void {
  if (!(tileWidth > 0) || !(tileHeight > 0)) return;
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)) return;

  const gap = (clampValue(spacingPercent, 0, 200) / 100) * Math.max(tileWidth, tileHeight);
  const cos = Math.abs(Math.cos(angleRad));
  const sin = Math.abs(Math.sin(angleRad));
  const boundingWidth = tileWidth * cos + tileHeight * sin;
  const boundingHeight = tileWidth * sin + tileHeight * cos;
  const stepX = boundingWidth + gap;
  const stepY = boundingHeight + gap;
  if (!Number.isFinite(stepX) || !Number.isFinite(stepY) || stepX <= 0 || stepY <= 0) return;

  const columns = Math.ceil(sourceWidth / stepX) + 2;
  const rows = Math.ceil(sourceHeight / stepY) + 2;
  let drawn = 0;

  for (let row = 0; row < rows && drawn < MAX_TILES; row++) {
    const centerY = -stepY + row * stepY + stepY / 2;
    const rowShift = stagger && row % 2 === 1 ? stepX / 2 : 0;
    for (let column = 0; column < columns && drawn < MAX_TILES; column++) {
      const centerX = -stepX + column * stepX + stepX / 2 + rowShift;
      drawRotatedLogo(ctx, logo, centerX, centerY, tileWidth, tileHeight, angleRad, alpha);
      drawn++;
    }
  }
}

export interface WatermarkRenderOptions {
  /** Decoded source (HTMLImageElement, ImageBitmap, canvas...). */
  source: CanvasImageSource;
  /** Intrinsic source width in px, also used as the output canvas width. */
  sourceWidth: number;
  sourceHeight: number;
  /** Decoded logo. */
  logo: CanvasImageSource;
  logoWidth: number;
  logoHeight: number;
  settings: WatermarkSettings;
  outputFormat?: WatermarkOutputFormat;
  /** Used only when the output format is opaque (jpeg). */
  backgroundColor?: string;
}

/**
 * Composites the logo over the source at the requested resolution and returns
 * the canvas. Callers choose the resolution by passing a scaled
 * `sourceWidth`/`sourceHeight`, so the same function powers the live preview
 * and the full-resolution download.
 */
export function renderWatermark(options: WatermarkRenderOptions): HTMLCanvasElement {
  const {
    source,
    sourceWidth,
    sourceHeight,
    logo,
    logoWidth,
    logoHeight,
    settings,
    outputFormat = 'png',
  } = options;

  const outWidth = Math.round(sourceWidth);
  const outHeight = Math.round(sourceHeight);
  validateCanvasSize(outWidth, outHeight);

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D is unavailable in this browser.');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (outputFormat === 'jpeg') {
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, outWidth, outHeight);
  }

  ctx.drawImage(source, 0, 0, outWidth, outHeight);

  const alpha = clampValue(settings.opacity, 0, 1);
  if (alpha <= 0) return canvas;

  const box = computeLogoBox(outWidth, outHeight, logoWidth, logoHeight, settings.size);
  if (!box) return canvas;

  const angleRad = (clampValue(settings.rotation, -180, 180) * Math.PI) / 180;

  switch (settings.layout) {
    case 'corner': {
      const point = resolveCornerPoint(
        settings.position,
        outWidth,
        outHeight,
        box.width,
        box.height,
        settings.margin
      );
      drawRotatedLogo(ctx, logo, point.x, point.y, box.width, box.height, angleRad, alpha);
      break;
    }
    case 'center': {
      drawRotatedLogo(ctx, logo, outWidth / 2, outHeight / 2, box.width, box.height, angleRad, alpha);
      break;
    }
    case 'tiled': {
      drawPattern(ctx, logo, outWidth, outHeight, box.width, box.height, angleRad, settings.spacing, false, alpha);
      break;
    }
    case 'diagonal': {
      // The diagonal preset adds a fixed 45° base angle; the rotation control offsets it.
      drawPattern(
        ctx,
        logo,
        outWidth,
        outHeight,
        box.width,
        box.height,
        angleRad + Math.PI / 4,
        settings.spacing,
        true,
        alpha
      );
      break;
    }
  }

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: WatermarkMimeType,
  quality?: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode the output image.'));
        },
        mimeType,
        quality
      );
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to encode the output image.'));
    }
  });
}

/** Full-resolution render straight to an encoded Blob. */
export async function renderWatermarkToBlob(options: WatermarkRenderOptions): Promise<Blob> {
  const format = options.outputFormat ?? 'png';
  const canvas = renderWatermark({ ...options, outputFormat: format });
  const quality = format === 'png' ? undefined : clampValue(options.settings.quality, 0.1, 1);
  return canvasToBlob(canvas, getOutputMimeType(format), quality);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a tick to start the download before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

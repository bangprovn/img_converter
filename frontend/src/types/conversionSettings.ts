import { ImageFormat } from '@/lib/imageConverter';
import { ConversionOptions } from '@/lib/imageProcessing';

export type SettingsMode = 'global' | 'per-image';

export interface FormatSettings {
  jpeg: JPEGSettings;
  png: PNGSettings;
  webp: WebPSettings;
  avif: AVIFSettings;
}

export interface JPEGSettings {
  quality: number;
  progressive: boolean;
  chromaSubsampling: '4:4:4' | '4:2:2' | '4:2:0';
}

export interface PNGSettings {
  compressionLevel: number;
  interlace: boolean;
}

export interface WebPSettings {
  quality: number;
  lossless: boolean;
  effort: number;
  method: number;
}

export interface AVIFSettings {
  quality: number;
  lossless: boolean;
  speed: number;
}

export interface PresetConfig {
  name: string;
  description: string;
  settings: FormatSettings;
}

export const DEFAULT_SETTINGS: FormatSettings = {
  jpeg: {
    quality: 80,
    progressive: false,
    chromaSubsampling: '4:2:0',
  },
  png: {
    compressionLevel: 6,
    interlace: false,
  },
  webp: {
    quality: 75,
    lossless: false,
    effort: 4,
    method: 4,
  },
  avif: {
    quality: 75,
    lossless: false,
    speed: 4,
  },
};

export const PRESETS: PresetConfig[] = [
  {
    name: 'Web',
    description: 'Optimized for web delivery with good balance of quality and file size',
    settings: {
      jpeg: { quality: 75, progressive: true, chromaSubsampling: '4:2:0' },
      png: { compressionLevel: 7, interlace: false },
      webp: { quality: 70, lossless: false, effort: 4, method: 4 },
      avif: { quality: 70, lossless: false, speed: 6 },
    },
  },
  {
    name: 'Print',
    description: 'High quality for print with minimal compression',
    settings: {
      jpeg: { quality: 95, progressive: false, chromaSubsampling: '4:4:4' },
      png: { compressionLevel: 3, interlace: false },
      webp: { quality: 95, lossless: true, effort: 6, method: 6 },
      avif: { quality: 95, lossless: true, speed: 2 },
    },
  },
  {
    name: 'Archive',
    description: 'Lossless compression for archival purposes',
    settings: {
      jpeg: { quality: 100, progressive: false, chromaSubsampling: '4:4:4' },
      png: { compressionLevel: 9, interlace: false },
      webp: { quality: 100, lossless: true, effort: 6, method: 6 },
      avif: { quality: 100, lossless: true, speed: 0 },
    },
  },
];

export function formatSettingsToConversionOptions(
  format: ImageFormat,
  settings: FormatSettings
): ConversionOptions {
  switch (format) {
    case 'jpeg': {
      const jpegSettings = settings.jpeg;
      return {
        quality: jpegSettings.quality,
        progressive: jpegSettings.progressive,
        chromaSubsampling: jpegSettings.chromaSubsampling,
      };
    }
    case 'png': {
      const pngSettings = settings.png;
      return {
        compressionLevel: pngSettings.compressionLevel,
        interlace: pngSettings.interlace,
      };
    }
    case 'webp': {
      const webpSettings = settings.webp;
      return {
        quality: webpSettings.quality,
        lossless: webpSettings.lossless,
        effort: webpSettings.effort,
        method: webpSettings.method,
      };
    }
    case 'avif': {
      const avifSettings = settings.avif;
      return {
        quality: avifSettings.quality,
        lossless: avifSettings.lossless,
        speed: avifSettings.speed,
      };
    }
  }
}

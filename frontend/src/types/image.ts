export interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  type: string
  dimensions?: {
    width: number
    height: number
  }
}

export const SUPPORTED_FORMATS = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

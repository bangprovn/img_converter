import type { CSSProperties } from 'react';

/**
 * Checkerboard used behind transparent previews so PNG logos/images with alpha
 * are distinguishable from a solid background.
 */
export const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
};

declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    workerScript?: string;
    background?: string;
    width?: number | null;
    height?: number | null;
    transparent?: string | null;
    dither?: string | boolean;
    debug?: boolean;
    repeat?: number;
  }

  export interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLImageElement | HTMLCanvasElement | CanvasRenderingContext2D,
      options?: AddFrameOptions
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    render(): void;
    abort(): void;
  }
}

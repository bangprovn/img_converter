/**
 * Browser Compatibility Detection
 * Checks for required browser features and versions
 */

export interface BrowserCompatibility {
  isCompatible: boolean;
  missingFeatures: string[];
  warnings: string[];
  browserInfo: {
    name: string;
    version: string;
  };
}

/**
 * Detect browser name and version
 */
function detectBrowser(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  if (ua.indexOf('Firefox') > -1) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('Edg') > -1) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }

  return { name, version };
}

/**
 * Check if WebAssembly is supported
 */
function checkWebAssembly(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {
    return false;
  }
  return false;
}

/**
 * Check browser compatibility
 */
export function checkBrowserCompatibility(): BrowserCompatibility {
  const browserInfo = detectBrowser();
  const missingFeatures: string[] = [];
  const warnings: string[] = [];

  // Check WebAssembly
  if (!checkWebAssembly()) {
    missingFeatures.push('WebAssembly');
  }

  // Check Web Workers
  if (typeof Worker === 'undefined') {
    missingFeatures.push('Web Workers');
  }

  // Check File API
  if (typeof File === 'undefined' || typeof FileReader === 'undefined') {
    missingFeatures.push('File API');
  }

  // Check Blob API
  if (typeof Blob === 'undefined') {
    missingFeatures.push('Blob API');
  }

  // Check Canvas API
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) {
      missingFeatures.push('Canvas API');
    }
  } catch (e) {
    missingFeatures.push('Canvas API');
  }

  // Check IndexedDB (optional, for future caching)
  if (!window.indexedDB) {
    warnings.push('IndexedDB not supported (optional feature)');
  }

  // Check browser versions
  const browserVersion = parseInt(browserInfo.version);
  if (!isNaN(browserVersion)) {
    switch (browserInfo.name) {
      case 'Chrome':
        if (browserVersion < 90) {
          warnings.push(`Chrome ${browserVersion} detected. Chrome 90+ recommended for best performance.`);
        }
        break;
      case 'Firefox':
        if (browserVersion < 88) {
          warnings.push(`Firefox ${browserVersion} detected. Firefox 88+ recommended for best performance.`);
        }
        break;
      case 'Safari':
        if (browserVersion < 15) {
          warnings.push(`Safari ${browserVersion} detected. Safari 15+ recommended for best performance.`);
        }
        break;
      case 'Edge':
        if (browserVersion < 90) {
          warnings.push(`Edge ${browserVersion} detected. Edge 90+ recommended for best performance.`);
        }
        break;
    }
  }

  return {
    isCompatible: missingFeatures.length === 0,
    missingFeatures,
    warnings,
    browserInfo,
  };
}

/**
 * Get a user-friendly compatibility message
 */
export function getCompatibilityMessage(compat: BrowserCompatibility): string {
  if (compat.isCompatible) {
    return 'Your browser is fully compatible!';
  }

  const features = compat.missingFeatures.join(', ');
  return `Your browser is missing required features: ${features}. Please use a modern browser like Chrome 90+, Firefox 88+, or Safari 15+.`;
}

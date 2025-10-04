/**
 * Browser Compatibility Warning Component
 * Displays a warning if the browser doesn't support required features
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { checkBrowserCompatibility, getCompatibilityMessage, type BrowserCompatibility } from '@/lib/browserCompat';

export function BrowserCompatWarning() {
  const [compat, setCompat] = useState<BrowserCompatibility | null>(null);

  useEffect(() => {
    const compatibility = checkBrowserCompatibility();
    setCompat(compatibility);
  }, []);

  if (!compat || (compat.isCompatible && compat.warnings.length === 0)) {
    return null;
  }

  if (!compat.isCompatible) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Browser Not Supported</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              {getCompatibilityMessage(compat)}
            </p>
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Missing features:</p>
              <ul className="list-disc list-inside">
                {compat.missingFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Detected: {compat.browserInfo.name} {compat.browserInfo.version}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (compat.warnings.length > 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Browser Warning</p>
              <ul className="text-xs mt-1">
                {compat.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

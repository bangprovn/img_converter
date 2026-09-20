import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/toaster';
import { BrowserCompatWarning } from '@/components/BrowserCompatWarning';
import { ImageConverter } from '@/pages/ImageConverter';
import { GIFConverter } from '@/pages/GIFConverter';
import { VideoConverter } from '@/pages/VideoConverter';
import { BackgroundRemoval } from '@/pages/BackgroundRemoval';

// Heavier, model-backed tools are code-split so the initial mobile bundle stays light.
const Watermark = lazy(() =>
  import('@/pages/Watermark').then((module) => ({ default: module.Watermark }))
);
const WatermarkRemoval = lazy(() =>
  import('@/pages/WatermarkRemoval').then((module) => ({ default: module.WatermarkRemoval }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading tool…</span>
    </div>
  );
}

function App() {
  return (
    <>
      <BrowserCompatWarning />
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<ImageConverter />} />
              <Route path="/gif" element={<GIFConverter />} />
              <Route path="/video" element={<VideoConverter />} />
              <Route path="/background-removal" element={<BackgroundRemoval />} />
              <Route path="/watermark" element={<Watermark />} />
              <Route path="/watermark-removal" element={<WatermarkRemoval />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;

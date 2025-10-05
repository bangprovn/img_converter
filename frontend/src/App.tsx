import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/toaster';
import { BrowserCompatWarning } from '@/components/BrowserCompatWarning';
import { ImageConverter } from '@/pages/ImageConverter';
import { GIFConverter } from '@/pages/GIFConverter';
import { VideoConverter } from '@/pages/VideoConverter';
import { BackgroundRemoval } from '@/pages/BackgroundRemoval';

function App() {
  return (
    <>
      <BrowserCompatWarning />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ImageConverter />} />
            <Route path="/gif" element={<GIFConverter />} />
            <Route path="/video" element={<VideoConverter />} />
            <Route path="/background-removal" element={<BackgroundRemoval />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;

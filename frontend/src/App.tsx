import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { BrowserCompatWarning } from '@/components/BrowserCompatWarning';
import { ImageConverter } from '@/pages/ImageConverter';
import { GIFConverter } from '@/pages/GIFConverter';
import { VideoConverter } from '@/pages/VideoConverter';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="image-converter-theme">
      <BrowserCompatWarning />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ImageConverter />} />
            <Route path="/gif" element={<GIFConverter />} />
            <Route path="/video" element={<VideoConverter />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;

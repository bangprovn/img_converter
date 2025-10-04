import { Layout } from '@/components/layout/Layout';
import { ThemeProvider } from '@/components/theme-provider';
import { ImageConverterDemo } from '@/components/ImageConverterDemo';
import { Toaster } from '@/components/ui/toaster';
import { BrowserCompatWarning } from '@/components/BrowserCompatWarning';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="image-converter-theme">
      <BrowserCompatWarning />
      <Layout>
        <ImageConverterDemo />
      </Layout>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;

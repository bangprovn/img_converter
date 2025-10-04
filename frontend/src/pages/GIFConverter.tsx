import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, FileVideo, Image, Zap, Settings2, Grid3x3 } from 'lucide-react';
import { GifCompressor } from '@/components/GifCompressor';
import { GifToVideo } from '@/components/GifToVideo';
import { GifFrameExtractor } from '@/components/GifFrameExtractor';
import { GifOptimizer } from '@/components/GifOptimizer';
import { GifToSpritesheet } from '@/components/GifToSpritesheet';

export function GIFConverter() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
            <Film className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            GIF Tools
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Convert, compress, and extract frames from GIF animations
        </p>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="compress" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 p-1">
          <TabsTrigger value="compress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Zap className="h-4 w-4 mr-2" />
            Compress
          </TabsTrigger>
          <TabsTrigger value="to-video" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <FileVideo className="h-4 w-4 mr-2" />
            To Video
          </TabsTrigger>
          <TabsTrigger value="to-frames" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Image className="h-4 w-4 mr-2" />
            To Frames
          </TabsTrigger>
          <TabsTrigger value="to-spritesheet" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Grid3x3 className="h-4 w-4 mr-2" />
            Spritesheet
          </TabsTrigger>
          <TabsTrigger value="optimize" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            <Settings2 className="h-4 w-4 mr-2" />
            Optimize
          </TabsTrigger>
        </TabsList>

        {/* Compress GIF */}
        <TabsContent value="compress" className="mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Compress GIF
              </CardTitle>
              <CardDescription>
                Reduce GIF file size by optimizing colors and compression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GifCompressor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to Video */}
        <TabsContent value="to-video" className="mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                GIF to Video (MP4/WebM)
              </CardTitle>
              <CardDescription>
                Convert GIF animations to modern video formats with better compression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GifToVideo />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to PNG Sequence */}
        <TabsContent value="to-frames" className="mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Extract Frames
              </CardTitle>
              <CardDescription>
                Extract individual frames from GIF as images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GifFrameExtractor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to Spritesheet */}
        <TabsContent value="to-spritesheet" className="mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                GIF to Spritesheet
              </CardTitle>
              <CardDescription>
                Convert GIF to spritesheet with HTML canvas animation code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GifToSpritesheet />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimize GIF */}
        <TabsContent value="optimize" className="mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Optimize GIF
              </CardTitle>
              <CardDescription>
                Advanced optimization: remove duplicate frames, reduce colors, apply dithering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GifOptimizer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="border-pink-100 dark:border-pink-900">
          <CardHeader>
            <CardTitle className="text-lg">Color Reduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Reduce color palette to minimize file size while maintaining visual quality
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900">
          <CardHeader>
            <CardTitle className="text-lg">Frame Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Remove duplicate frames and optimize frame timing for smaller files
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-100 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="text-lg">Batch Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Process multiple GIF files at once with consistent settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

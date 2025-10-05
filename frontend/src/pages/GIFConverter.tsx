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
    <div className="w-full mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
            <Film className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            GIF Tools
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
          Convert, compress, and extract frames from GIF animations
        </p>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="compress" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 p-1 h-auto">
          <TabsTrigger value="compress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Compress</span>
          </TabsTrigger>
          <TabsTrigger value="to-video" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <FileVideo className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">To Video</span>
          </TabsTrigger>
          <TabsTrigger value="to-frames" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Image className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">To Frames</span>
          </TabsTrigger>
          <TabsTrigger value="to-spritesheet" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm py-2 col-span-2 sm:col-span-1">
            <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Spritesheet</span>
          </TabsTrigger>
          <TabsTrigger value="optimize" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white text-xs sm:text-sm py-2 col-span-1 sm:col-span-1">
            <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Optimize</span>
          </TabsTrigger>
        </TabsList>

        {/* Compress GIF */}
        <TabsContent value="compress" className="mt-4 sm:mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Compress GIF
              </CardTitle>
              <CardDescription className="text-sm">
                Reduce GIF file size by optimizing colors and compression
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <GifCompressor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to Video */}
        <TabsContent value="to-video" className="mt-4 sm:mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                GIF to Video (MP4/WebM)
              </CardTitle>
              <CardDescription className="text-sm">
                Convert GIF animations to modern video formats with better compression
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <GifToVideo />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to PNG Sequence */}
        <TabsContent value="to-frames" className="mt-4 sm:mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Extract Frames
              </CardTitle>
              <CardDescription className="text-sm">
                Extract individual frames from GIF as images
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <GifFrameExtractor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GIF to Spritesheet */}
        <TabsContent value="to-spritesheet" className="mt-4 sm:mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                GIF to Spritesheet
              </CardTitle>
              <CardDescription className="text-sm">
                Convert GIF to spritesheet with HTML canvas animation code
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <GifToSpritesheet />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimize GIF */}
        <TabsContent value="optimize" className="mt-4 sm:mt-6">
          <Card className="border-pink-100 dark:border-pink-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Optimize GIF
              </CardTitle>
              <CardDescription className="text-sm">
                Advanced optimization: remove duplicate frames, reduce colors, apply dithering
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <GifOptimizer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
        <Card className="border-pink-100 dark:border-pink-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Color Reduction</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Reduce color palette to minimize file size while maintaining visual quality
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Frame Optimization</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Remove duplicate frames and optimize frame timing for smaller files
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-100 dark:border-indigo-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Batch Processing</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Process multiple GIF files at once with consistent settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

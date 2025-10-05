import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Video, FileVideo, Clapperboard, Scissors, Zap, Film, Combine, Music, Maximize2 } from 'lucide-react';
import { VideoFormatConverter } from '@/components/VideoFormatConverter';
import { VideoToGif } from '@/components/VideoToGif';
import { VideoTrimmer } from '@/components/VideoTrimmer';
import { VideoCompressor } from '@/components/VideoCompressor';
import { AudioExtractor } from '@/components/AudioExtractor';
import { VideoMerger } from '@/components/VideoMerger';
import { VideoResizer } from '@/components/VideoResizer';

export function VideoConverter() {
  return (
    <div className="w-full mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <Video className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Video Tools
          </h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
          Trim, compress, merge, resize, and convert videos with powerful FFmpeg processing
        </p>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="trim" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-1 h-auto">
          <TabsTrigger value="trim" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Scissors className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Trim</span>
          </TabsTrigger>
          <TabsTrigger value="compress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Compress</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Music className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Audio</span>
          </TabsTrigger>
          <TabsTrigger value="merge" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2">
            <Combine className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Merge</span>
          </TabsTrigger>
          <TabsTrigger value="resize" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2 col-span-1 sm:col-span-1">
            <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Resize</span>
          </TabsTrigger>
          <TabsTrigger value="convert" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2 col-span-2 sm:col-span-1">
            <FileVideo className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Convert</span>
          </TabsTrigger>
          <TabsTrigger value="to-gif" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white text-xs sm:text-sm py-2 col-span-2 sm:col-span-1">
            <Film className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">To GIF</span>
          </TabsTrigger>
        </TabsList>

        {/* Video Trimmer */}
        <TabsContent value="trim" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Trimmer
              </CardTitle>
              <CardDescription className="text-sm">
                Cut and trim videos by specifying start and end times
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoTrimmer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Compressor */}
        <TabsContent value="compress" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Compressor
              </CardTitle>
              <CardDescription className="text-sm">
                Reduce video file size with quality and speed controls
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoCompressor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio Extractor */}
        <TabsContent value="audio" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Audio Extractor
              </CardTitle>
              <CardDescription className="text-sm">
                Extract audio from videos as MP3, WAV, AAC or OGG
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <AudioExtractor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Merger */}
        <TabsContent value="merge" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Merger
              </CardTitle>
              <CardDescription className="text-sm">
                Join multiple videos into a single file
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoMerger />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Resizer */}
        <TabsContent value="resize" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Resizer
              </CardTitle>
              <CardDescription className="text-sm">
                Change video resolution with preset or custom dimensions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoResizer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Format Converter */}
        <TabsContent value="convert" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Format Converter
              </CardTitle>
              <CardDescription className="text-sm">
                Convert videos between MP4, WebM, AVI, MOV and other formats
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoFormatConverter />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video to GIF */}
        <TabsContent value="to-gif" className="mt-4 sm:mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video to GIF
              </CardTitle>
              <CardDescription className="text-sm">
                Convert any video to an animated GIF with customizable FPS and size
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <VideoToGif />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
        <Card className="border-blue-100 dark:border-blue-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Clapperboard className="h-4 w-4 sm:h-5 sm:w-5" />
              Multiple Formats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Support for MP4, WebM, AVI, MOV, MKV and many other video formats
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-100 dark:border-indigo-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              High Quality
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Preserve video quality with advanced codec options and settings
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Scissors className="h-4 w-4 sm:h-5 sm:w-5" />
              Browser-Based
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-xs sm:text-sm text-muted-foreground">
              All processing happens locally in your browser - your files never leave your device
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

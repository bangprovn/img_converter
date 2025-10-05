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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
            <Video className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Video Tools
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Trim, compress, merge, resize, and convert videos with powerful FFmpeg processing
        </p>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="trim" className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 p-1">
          <TabsTrigger value="trim" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Scissors className="h-4 w-4 mr-2" />
            Trim
          </TabsTrigger>
          <TabsTrigger value="compress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Zap className="h-4 w-4 mr-2" />
            Compress
          </TabsTrigger>
          <TabsTrigger value="audio" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Music className="h-4 w-4 mr-2" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="merge" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Combine className="h-4 w-4 mr-2" />
            Merge
          </TabsTrigger>
          <TabsTrigger value="resize" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Maximize2 className="h-4 w-4 mr-2" />
            Resize
          </TabsTrigger>
          <TabsTrigger value="convert" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <FileVideo className="h-4 w-4 mr-2" />
            Convert
          </TabsTrigger>
          <TabsTrigger value="to-gif" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
            <Film className="h-4 w-4 mr-2" />
            To GIF
          </TabsTrigger>
        </TabsList>

        {/* Video Trimmer */}
        <TabsContent value="trim" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Trimmer
              </CardTitle>
              <CardDescription>
                Cut and trim videos by specifying start and end times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoTrimmer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Compressor */}
        <TabsContent value="compress" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Compressor
              </CardTitle>
              <CardDescription>
                Reduce video file size with quality and speed controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoCompressor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audio Extractor */}
        <TabsContent value="audio" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Audio Extractor
              </CardTitle>
              <CardDescription>
                Extract audio from videos as MP3, WAV, AAC or OGG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioExtractor />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Merger */}
        <TabsContent value="merge" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Merger
              </CardTitle>
              <CardDescription>
                Join multiple videos into a single file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoMerger />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Resizer */}
        <TabsContent value="resize" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Resizer
              </CardTitle>
              <CardDescription>
                Change video resolution with preset or custom dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoResizer />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Format Converter */}
        <TabsContent value="convert" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video Format Converter
              </CardTitle>
              <CardDescription>
                Convert videos between MP4, WebM, AVI, MOV and other formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoFormatConverter />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video to GIF */}
        <TabsContent value="to-gif" className="mt-6">
          <Card className="border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Video to GIF
              </CardTitle>
              <CardDescription>
                Convert any video to an animated GIF with customizable FPS and size
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoToGif />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <Card className="border-blue-100 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clapperboard className="h-5 w-5" />
              Multiple Formats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Support for MP4, WebM, AVI, MOV, MKV and many other video formats
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-100 dark:border-indigo-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              High Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Preserve video quality with advanced codec options and settings
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Browser-Based
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All processing happens locally in your browser - your files never leave your device
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

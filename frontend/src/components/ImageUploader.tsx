import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, FileImage } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ImageFile, SUPPORTED_FORMATS, MAX_FILE_SIZE } from "@/types/image"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  onImagesSelected: (images: ImageFile[]) => void
  images: ImageFile[]
}

export function ImageUploader({ onImagesSelected, images }: ImageUploaderProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const loadImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      setIsLoading(true)

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e: any) => e.message).join(", ")
          toast({
            variant: "destructive",
            title: "File rejected",
            description: `${rejection.file.name}: ${errors}`,
          })
        })
      }

      // Process accepted files
      const newImages: ImageFile[] = []
      for (const file of acceptedFiles) {
        try {
          const dimensions = await loadImageDimensions(file)
          const imageFile: ImageFile = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
            dimensions,
          }
          newImages.push(imageFile)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error loading image",
            description: `Failed to load ${file.name}`,
          })
        }
      }

      if (newImages.length > 0) {
        onImagesSelected([...images, ...newImages])
        toast({
          title: "Images added",
          description: `${newImages.length} image(s) added successfully`,
        })
      }

      setIsLoading(false)
    },
    [images, onImagesSelected, toast]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  const removeImage = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id)
    const removedImage = images.find((img) => img.id === id)
    if (removedImage) {
      URL.revokeObjectURL(removedImage.preview)
    }
    onImagesSelected(updatedImages)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} disabled={isLoading} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop the images here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  Drag & drop images here, or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF (max 50MB per file)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">
            Uploaded Images ({images.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <FileImage className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <p className="text-sm font-medium truncate" title={image.name}>
                        {image.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(image.size)}
                    </p>
                    {image.dimensions && (
                      <p className="text-xs text-muted-foreground">
                        {image.dimensions.width} × {image.dimensions.height}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-8 text-center">
            <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Upload some images to get started with conversion
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

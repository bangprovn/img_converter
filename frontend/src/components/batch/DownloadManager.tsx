/**
 * DownloadManager Component
 * Handles downloading individual files and creating ZIP bundles
 */

import { useState, useMemo } from 'react';
import { Download, FileArchive, Folder, Loader2 } from 'lucide-react';
import type { ConversionResult } from '@/lib/imageProcessing';
import { downloadConvertedImage, formatFileSize } from '@/lib/imageProcessing';
import { downloadResultsAsZip, estimateZipSize } from '@/lib/zipDownload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DownloadManagerProps {
  results: ConversionResult[];
}

export function DownloadManager({ results }: DownloadManagerProps) {
  const [organizeByFormat, setOrganizeByFormat] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);

  const estimatedZipSize = useMemo(() => estimateZipSize(results), [results]);

  const handleDownloadAll = () => {
    results.forEach((result) => {
      downloadConvertedImage(result);
    });
  };

  const handleDownloadZip = async () => {
    setIsCreatingZip(true);
    try {
      await downloadResultsAsZip(results, {
        filename: `converted-images-${Date.now()}.zip`,
        organizeByFormat,
      });
    } catch (error) {
      console.error('Failed to create ZIP:', error);
      alert('Failed to create ZIP file. Please try again.');
    } finally {
      setIsCreatingZip(false);
    }
  };

  const totalSize = useMemo(
    () => results.reduce((sum, result) => sum + result.convertedSize, 0),
    [results]
  );

  if (results.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">No files to download</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Download Options</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {results.length} file{results.length !== 1 ? 's' : ''} ready to download (
            {formatFileSize(totalSize)})
          </p>
        </div>

        {/* Download List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={result.filename}>
                  {result.filename}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(result.convertedSize)} • {result.format.toUpperCase()}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadConvertedImage(result)}
                className="ml-2"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Download Actions */}
        <div className="space-y-3 pt-4 border-t">
          {/* Download All Individually */}
          <Button onClick={handleDownloadAll} className="w-full" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download All Separately
          </Button>

          {/* ZIP Options */}
          <div className="flex items-center space-x-2 px-2">
            <Checkbox
              id="organize-by-format"
              checked={organizeByFormat}
              onCheckedChange={(checked) => setOrganizeByFormat(checked === true)}
            />
            <Label
              htmlFor="organize-by-format"
              className="text-sm font-normal cursor-pointer flex items-center gap-2"
            >
              <Folder className="h-4 w-4" />
              Organize by format in ZIP
            </Label>
          </div>

          {/* Download as ZIP */}
          <Button
            onClick={handleDownloadZip}
            className="w-full"
            disabled={isCreatingZip}
            variant="default"
          >
            {isCreatingZip ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating ZIP...
              </>
            ) : (
              <>
                <FileArchive className="h-4 w-4 mr-2" />
                Download as ZIP ({formatFileSize(estimatedZipSize)})
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

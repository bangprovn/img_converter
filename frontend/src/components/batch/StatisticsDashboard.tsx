/**
 * StatisticsDashboard Component
 * Shows conversion statistics and allows CSV export
 */

import { useMemo } from 'react';
import { BarChart3, TrendingDown, Clock, FileCheck, Download } from 'lucide-react';
import type { BatchStatistics } from '@/types/batchProcessing';
import { formatFileSize } from '@/lib/imageProcessing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StatisticsDashboardProps {
  statistics: BatchStatistics;
}

export function StatisticsDashboard({ statistics }: StatisticsDashboardProps) {
  const savingsPercentage = useMemo(() => {
    if (statistics.totalSizeBefore === 0) return 0;
    return ((statistics.totalSizeSaved / statistics.totalSizeBefore) * 100).toFixed(2);
  }, [statistics]);

  const exportToCSV = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Processed', statistics.totalProcessed.toString()],
      ['Total Failed', statistics.totalFailed.toString()],
      ['Total Size Before', formatFileSize(statistics.totalSizeBefore)],
      ['Total Size After', formatFileSize(statistics.totalSizeAfter)],
      ['Total Size Saved', formatFileSize(statistics.totalSizeSaved)],
      ['Savings Percentage', `${savingsPercentage}%`],
      ['Average Compression Ratio', `${statistics.averageCompressionRatio.toFixed(2)}%`],
      ['Average Processing Time', `${(statistics.averageProcessingTime / 1000).toFixed(2)}s`],
      ['Total Processing Time', `${(statistics.totalProcessingTime / 1000).toFixed(2)}s`],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversion-statistics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      icon: FileCheck,
      label: 'Processed',
      value: statistics.totalProcessed.toString(),
      subValue: statistics.totalFailed > 0 ? `${statistics.totalFailed} failed` : undefined,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: TrendingDown,
      label: 'Size Saved',
      value: formatFileSize(statistics.totalSizeSaved),
      subValue: `${savingsPercentage}% reduction`,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: BarChart3,
      label: 'Avg Compression',
      value: `${statistics.averageCompressionRatio.toFixed(2)}%`,
      subValue: `${formatFileSize(statistics.totalSizeBefore)} → ${formatFileSize(statistics.totalSizeAfter)}`,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      icon: Clock,
      label: 'Processing Time',
      value: `${(statistics.totalProcessingTime / 1000).toFixed(2)}s`,
      subValue: `${(statistics.averageProcessingTime / 1000).toFixed(2)}s avg`,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  if (statistics.totalProcessed === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Conversion Statistics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Summary of your batch conversion
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="p-4 rounded-lg border bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    {stat.subValue && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {stat.subValue}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Breakdown */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
          <h4 className="text-sm font-semibold mb-3">Detailed Breakdown</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Original Size:</span>
              <span className="font-medium">{formatFileSize(statistics.totalSizeBefore)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Converted Size:</span>
              <span className="font-medium">{formatFileSize(statistics.totalSizeAfter)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
              <span className="font-medium">
                {statistics.totalProcessed > 0
                  ? (
                      (statistics.totalProcessed /
                        (statistics.totalProcessed + statistics.totalFailed)) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Avg Speed:</span>
              <span className="font-medium">
                {statistics.averageProcessingTime > 0
                  ? `${((statistics.totalSizeBefore / 1024 / 1024) / (statistics.totalProcessingTime / 1000)).toFixed(2)} MB/s`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

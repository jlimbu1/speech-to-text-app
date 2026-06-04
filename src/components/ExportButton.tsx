'use client';

import { Download } from 'lucide-react';

export default function ExportButton({
  transcriptId,
  filename,
}: {
  transcriptId: string;
  filename: string;
}) {
  const handleExport = (format: 'txt' | 'srt') => {
    const url = `/api/export/${transcriptId}?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.[^.]+$/, '')}.${format}`;
    a.click();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">Export:</span>
      <button
        onClick={() => handleExport('txt')}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600
          rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        TXT
      </button>
      <button
        onClick={() => handleExport('srt')}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600
          rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        SRT
      </button>
    </div>
  );
}

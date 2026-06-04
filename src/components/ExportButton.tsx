import React, { useState, useCallback } from 'react';

interface ExportButtonProps {
  transcriptId: string | null;
  onError?: (error: string) => void;
}

export default function ExportButton({ transcriptId, onError }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async (format: 'txt' | 'json') => {
    setExportError(null);

    if (!transcriptId) {
      const errorMsg = 'No transcript loaded to export.';
      setExportError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(`/api/export?id=${encodeURIComponent(transcriptId)}&format=${format}`);

      if (!response.ok) {
        let errorMsg = 'Failed to export transcript.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          errorMsg = `Export failed with status ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${transcriptId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during export.';
      setExportError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsExporting(false);
    }
  }, [transcriptId, onError]);

  const dismissError = useCallback(() => {
    setExportError(null);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleExport('txt')}
          disabled={isExporting || !transcriptId}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Export transcript as plain text"
        >
          {isExporting ? 'Exporting...' : 'Export as TXT'}
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={isExporting || !transcriptId}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Export transcript as JSON"
        >
          {isExporting ? 'Exporting...' : 'Export as JSON'}
        </button>
      </div>
      {exportError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{exportError}</span>
          <button
            onClick={dismissError}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            aria-label="Dismiss error"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';

interface ExportButtonProps {
  transcriptId: string;
  filename: string;
  onError: (message: string) => void;
}

export default function ExportButton({ transcriptId, filename, onError }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'txt' | 'json') => {
    setIsExporting(true);
    onError('');

    try {
      const response = await fetch(`/api/export?id=${transcriptId}&format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to export transcript (status ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred during export.';
      onError(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleExport('txt')}
        disabled={isExporting}
        className="btn-secondary"
        aria-label="Export as plain text"
      >
        {isExporting ? 'Exporting...' : 'Export TXT'}
      </button>
      <button
        onClick={() => handleExport('json')}
        disabled={isExporting}
        className="btn-secondary"
        aria-label="Export as JSON"
      >
        {isExporting ? 'Exporting...' : 'Export JSON'}
      </button>
    </div>
  );
}
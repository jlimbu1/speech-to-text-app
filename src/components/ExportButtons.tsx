import { useState, useCallback } from 'react';
import { Download, FileText, FileJson, FileCode, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonsProps {
  text: string;
  filename?: string;
}

type ExportFormat = 'txt' | 'srt' | 'json';
type ExportStatus = 'idle' | 'exporting' | 'error';

export default function ExportButtons({ text, filename = 'transcript' }: ExportButtonsProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'transcript';
  };

  const generateTxt = useCallback((content: string): string => {
    return content;
  }, []);

  const generateSrt = useCallback((content: string): string => {
    const words = content.trim().split(/\s+/);
    if (words.length === 0) return '';
    const wordsPerSegment = 10;
    const segments: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const segmentWords = words.slice(i, i + wordsPerSegment);
      const segmentText = segmentWords.join(' ');
      const startSeconds = (i / wordsPerSegment) * 5;
      const endSeconds = ((i + wordsPerSegment) / wordsPerSegment) * 5;
      const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };
      segments.push(`${segments.length + 1}\n${formatTime(startSeconds)} --> ${formatTime(endSeconds)}\n${segmentText}`);
    }
    return segments.join('\n\n');
  }, []);

  const generateJson = useCallback((content: string): string => {
    return JSON.stringify({ text: content, exportedAt: new Date().toISOString() }, null, 2);
  }, []);

  const downloadFile = useCallback((content: string, format: ExportFormat) => {
    const mimeTypes: Record<ExportFormat, string> = {
      txt: 'text/plain',
      srt: 'text/plain',
      json: 'application/json',
    };
    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(filename)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filename]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!text || text.trim().length === 0) {
      toast.error('No transcript text to export. Please transcribe or enter text first.');
      return;
    }

    setStatus('exporting');
    setErrorMessage('');

    try {
      let content: string;
      switch (format) {
        case 'txt':
          content = generateTxt(text);
          break;
        case 'srt':
          content = generateSrt(text);
          if (!content) {
            throw new Error('Failed to generate SRT content. The text may be empty.');
          }
          break;
        case 'json':
          content = generateJson(text);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      downloadFile(content, format);
      setStatus('idle');
      toast.success(`${format.toUpperCase()} file downloaded successfully.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during export.';
      setErrorMessage(message);
      setStatus('error');
      toast.error(message);
    }
  }, [text, generateTxt, generateSrt, generateJson, downloadFile]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  const isDisabled = status === 'exporting' || !text || text.trim().length === 0;

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800">Export Failed</h3>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!text || text.trim().length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <FileText className="mx-auto h-8 w-8 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Text to Export</h3>
        <p className="mt-1 text-sm text-gray-500">
          Transcribe or enter text in the editor above to enable export options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Export Transcript</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleExport('txt')}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Export as TXT"
        >
          {status === 'exporting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {status === 'exporting' ? 'Exporting...' : 'Export TXT'}
        </button>
        <button
          onClick={() => handleExport('srt')}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Export as SRT"
        >
          {status === 'exporting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileCode className="h-4 w-4" />
          )}
          {status === 'exporting' ? 'Exporting...' : 'Export SRT'}
        </button>
        <button
          onClick={() => handleExport('json')}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Export as JSON"
        >
          {status === 'exporting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileJson className="h-4 w-4" />
          )}
          {status === 'exporting' ? 'Exporting...' : 'Export JSON'}
        </button>
      </div>
    </div>
  );
}
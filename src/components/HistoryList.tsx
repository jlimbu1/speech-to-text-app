import { useState, useEffect, useCallback } from 'react';
import { History, FileText, Clock, AlertCircle, Loader2, RefreshCw, SearchX } from 'lucide-react';

interface Transcript {
  id: string;
  filename: string;
  text: string;
  createdAt: string;
}

type HistoryStatus = 'loading' | 'success' | 'error' | 'empty';

export default function HistoryList() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchHistory = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error(`Failed to fetch history (${response.status})`);
      }
      const data: Transcript[] = await response.json();
      if (data.length === 0) {
        setStatus('empty');
        setTranscripts([]);
      } else {
        setStatus('success');
        setTranscripts(data);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while loading history.';
      setErrorMessage(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTextPreview = (text: string, maxLength: number = 100): string => {
    if (!text) return 'No transcript text available.';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  };

  if (status === 'loading') {
    return (
      <div className="space-y-4" role="status" aria-label="Loading history">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">History</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white rounded-lg border border-gray-200 p-4 space-y-3"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
        <span className="sr-only">Loading transcript history...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">History</h2>
        </div>
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
          role="alert"
        >
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-1">Failed to load history</p>
          <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">History</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <SearchX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium mb-1">No transcripts yet</p>
          <p className="text-gray-500 text-sm">
            Upload an audio file or record a new one to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">History</h2>
        <span className="text-sm text-gray-500 ml-auto">
          {transcripts.length} {transcripts.length === 1 ? 'transcript' : 'transcripts'}
        </span>
      </div>
      <ul className="space-y-3" role="list">
        {transcripts.map((transcript) => (
          <li
            key={transcript.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
            role="listitem"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">
                  {transcript.filename}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Clock className="h-3 w-3" />
                <time dateTime={transcript.createdAt}>
                  {formatDate(transcript.createdAt)}
                </time>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {getTextPreview(transcript.text)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
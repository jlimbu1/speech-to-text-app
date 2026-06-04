'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Calendar, ChevronRight, Loader2 } from 'lucide-react';

interface Transcript {
  id: string;
  filename: string;
  originalName: string;
  text: string;
  createdAt: string;
}

export default function TranscriptList() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/transcripts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        setTranscripts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          No transcripts yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Upload an audio file or record from your microphone to get started.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          Go to Upload
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transcripts.map((t) => {
        const preview = t.text ? t.text.slice(0, 120).trim() + (t.text.length > 120 ? '...' : '') : '(empty)';
        const wordCount = t.text ? t.text.split(/\s+/).length : 0;

        return (
          <Link
            key={t.id}
            href={`/transcripts/${t.id}`}
            className="block p-4 border border-gray-200 dark:border-gray-700 rounded-xl
              hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm
              transition-all bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {t.originalName}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                  {preview}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                  <span>{wordCount} words</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 shrink-0 mt-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Upload, Mic, History } from 'lucide-react';
import Link from 'next/link';
import AudioUploader from '@/components/AudioUploader';
import AudioRecorder from '@/components/AudioRecorder';
import ApiKeyBanner from '@/components/ApiKeyBanner';

export default function Home() {
  const [tab, setTab] = useState<'upload' | 'record'>('upload');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Speech to Text
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload audio or record directly from your browser
          </p>
        </div>

        <ApiKeyBanner />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-8">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${tab === 'upload'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={() => setTab('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${tab === 'record'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <Mic className="h-4 w-4" />
            Record Audio
          </button>
        </div>

        {/* Content */}
        {tab === 'upload' ? <AudioUploader /> : <AudioRecorder />}

        {/* History link */}
        <div className="mt-10 text-center">
          <Link
            href="/transcripts"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <History className="h-4 w-4" />
            View transcript history
          </Link>
        </div>
      </div>
    </div>
  );
}

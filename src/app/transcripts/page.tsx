import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TranscriptList from '@/components/TranscriptList';

export default function TranscriptsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Transcript History
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View and manage your transcribed audio files
          </p>
        </div>

        {/* List */}
        <TranscriptList />
      </div>
    </div>
  );
}

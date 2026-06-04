import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TranscriptEditor from '@/components/TranscriptEditor';
import { notFound } from 'next/navigation';

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transcript = await prisma.transcript.findUnique({ where: { id } });

  if (!transcript) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/transcripts"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {transcript.originalName}
          </h1>
        </div>

        {/* Editor */}
        <TranscriptEditor
          transcript={{
            id: transcript.id,
            filename: transcript.filename,
            originalName: transcript.originalName,
            text: transcript.text,
            createdAt: transcript.createdAt.toISOString(),
            updatedAt: transcript.updatedAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}

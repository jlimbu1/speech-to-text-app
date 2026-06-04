'use client';

import { useState } from 'react';
import { Save, FileText, Clock, Calendar } from 'lucide-react';
import ExportButton from './ExportButton';

interface Transcript {
  id: string;
  filename: string;
  originalName: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export default function TranscriptEditor({ transcript }: { transcript: Transcript }) {
  const [text, setText] = useState(transcript.text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="space-y-4">
      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          {transcript.originalName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {new Date(transcript.createdAt).toLocaleDateString()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {wordCount} words &bull; {charCount} chars
        </span>
      </div>

      {/* Editor */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-xl
          font-mono text-sm leading-relaxed resize-y
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        placeholder="Transcript text will appear here..."
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700
              disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        <ExportButton transcriptId={transcript.id} filename={transcript.originalName} />
      </div>
    </div>
  );
}

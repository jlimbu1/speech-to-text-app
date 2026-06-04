import React, { useState, useEffect, useCallback } from 'react';

interface Transcript {
  id: string;
  text: string;
}

interface TranscriptEditorProps {
  transcript: Transcript | null;
  onTranscriptUpdate?: (updated: Transcript) => void;
}

export default function TranscriptEditor({ transcript, onTranscriptUpdate }: TranscriptEditorProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (transcript) {
      setText(transcript.text);
      setMessage(null);
    }
  }, [transcript]);

  const handleSave = useCallback(async () => {
    if (!transcript) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/transcript', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transcript.id, text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Save failed with status ${response.status}`);
      }

      const updated: Transcript = await response.json();
      setMessage({ type: 'success', text: 'Transcript saved successfully.' });
      if (onTranscriptUpdate) {
        onTranscriptUpdate(updated);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  }, [transcript, text, onTranscriptUpdate]);

  if (!transcript) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
        No transcript available. Upload or record audio to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Transcript text will appear here..."
        disabled={saving}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
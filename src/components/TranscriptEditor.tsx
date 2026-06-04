import React, { useState, useCallback } from 'react';

interface TranscriptEditorProps {
  transcript: { id: string; text: string } | null;
  onSave: (id: string, text: string) => Promise<void>;
  onError?: (error: string) => void;
}

export default function TranscriptEditor({ transcript, onSave, onError }: TranscriptEditorProps) {
  const [editedText, setEditedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    if (transcript) {
      setEditedText(transcript.text);
      setHasChanges(false);
      setSaveError(null);
    }
  }, [transcript]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
    setHasChanges(true);
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!transcript) {
      const errorMsg = 'No transcript loaded to save.';
      setSaveError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (!editedText.trim()) {
      const errorMsg = 'Transcript text cannot be empty.';
      setSaveError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(transcript.id, editedText);
      setHasChanges(false);
    } catch (err) {
      let errorMsg = 'Failed to save transcript.';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setSaveError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  }, [transcript, editedText, onSave, onError]);

  if (!transcript) {
    return (
      <div className="p-4 border border-gray-300 rounded-md bg-gray-50 text-gray-500 text-center">
        No transcript loaded. Upload or record audio to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="transcript-editor" className="block text-sm font-medium text-gray-700">
        Transcript
      </label>
      <textarea
        id="transcript-editor"
        className="w-full h-64 p-3 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        value={editedText}
        onChange={handleTextChange}
        disabled={isSaving}
        placeholder="Transcript text will appear here..."
      />
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm" role="alert">
          {saveError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {hasChanges ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
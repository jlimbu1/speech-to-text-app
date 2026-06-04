import { useState, useCallback, useEffect } from 'react';
import { Pencil, Save, X, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptEditorProps {
  transcriptId?: string;
  initialText?: string;
  filename?: string;
  onSave?: (text: string) => Promise<void>;
}

type EditorStatus = 'idle' | 'loading' | 'saving' | 'error' | 'empty';

export default function TranscriptEditor({
  transcriptId,
  initialText,
  filename,
  onSave,
}: TranscriptEditorProps) {
  const [text, setText] = useState<string>(initialText || '');
  const [status, setStatus] = useState<EditorStatus>(
    initialText ? 'idle' : 'empty'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (initialText !== undefined) {
      setText(initialText);
      setStatus(initialText ? 'idle' : 'empty');
    }
  }, [initialText]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setText(initialText || '');
    setIsEditing(false);
    setErrorMessage('');
  }, [initialText]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setStatus('saving');
    setErrorMessage('');
    try {
      await onSave(text);
      setIsEditing(false);
      setStatus('idle');
      toast.success('Transcript saved successfully.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while saving the transcript.';
      setErrorMessage(message);
      setStatus('error');
      toast.error(message);
    }
  }, [onSave, text]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading transcript...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive font-medium">Failed to load transcript</p>
        <p className="text-xs text-muted-foreground">{errorMessage}</p>
        <button
          onClick={() => {
            setStatus('loading');
            setErrorMessage('');
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border-2 border-dashed border-muted-foreground/20 rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-medium text-muted-foreground">No transcript yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Upload an audio file or record a message to generate a transcript. It will appear here for editing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {filename || 'Transcript'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              disabled={status === 'saving'}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'saving' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {status === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!isEditing}
        disabled={status === 'saving'}
        rows={12}
        className={`w-full p-4 border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
          isEditing
            ? 'bg-background border-input focus:border-primary'
            : 'bg-muted border-transparent cursor-default'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        placeholder="Transcript text will appear here..."
      />

      {transcriptId && (
        <p className="text-xs text-muted-foreground">
          Transcript ID: {transcriptId}
        </p>
      )}
    </div>
  );
}
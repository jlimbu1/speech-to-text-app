'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UploadState {
  status: 'idle' | 'selected' | 'uploading' | 'transcribing' | 'done' | 'error';
  file: File | null;
  error?: string;
  transcriptId?: string;
}

export default function AudioUploader() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: 'idle', file: null });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const maxSize = 50 * 1024 * 1024;
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/mp3'];
    const validExt = /\.(mp3|wav|m4a|webm|ogg|mp4)$/i;

    if (!validTypes.includes(file.type) && !validExt.test(file.name)) {
      setState({ status: 'error', file: null, error: 'Unsupported file format. Use MP3, WAV, M4A, or WebM.' });
      return;
    }

    if (file.size > maxSize) {
      setState({ status: 'error', file: null, error: 'File exceeds 50 MB limit.' });
      return;
    }

    setState({ status: 'selected', file });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = useCallback(async () => {
    if (!state.file) return;

    setState((s) => ({ ...s, status: 'uploading' }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { fileId, fileName } = await uploadRes.json();

      setState((s) => ({ ...s, status: 'transcribing' }));

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName }),
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        throw new Error(err.error || 'Transcription failed');
      }

      const transcript = await transcribeRes.json();
      setState((s) => ({ ...s, status: 'done', transcriptId: transcript.id }));
      router.push(`/transcripts/${transcript.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setState((s) => ({ ...s, status: 'error', error: message }));
    }
  }, [state.file, router]);

  const reset = useCallback(() => {
    setState({ status: 'idle', file: null });
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div className="space-y-4">
      {state.status === 'idle' || state.status === 'error' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
            }
            ${state.status === 'error' ? 'border-red-400 dark:border-red-500' : ''}`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Drop your audio file here
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports MP3, WAV, M4A, WebM &bull; Max 50 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {state.status === 'error' && (
            <p className="mt-4 text-sm text-red-500">{state.error}</p>
          )}
        </div>
      ) : state.status === 'selected' ? (
        <div className="border rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center gap-4">
            <FileAudio className="h-10 w-10 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{state.file?.name}</p>
              <p className="text-sm text-gray-500">
                {(state.file!.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={reset}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <button
            onClick={handleUpload}
            className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            Upload &amp; Transcribe
          </button>
        </div>
      ) : (
        <div className="border rounded-2xl p-10 text-center bg-white dark:bg-gray-800 shadow-sm">
          <Loader2 className="mx-auto h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {state.status === 'uploading' ? 'Uploading...' : 'Transcribing...'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {state.status === 'uploading' ? 'Sending your file' : 'Converting speech to text'}
          </p>
        </div>
      )}
    </div>
  );
}

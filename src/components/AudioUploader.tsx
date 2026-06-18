'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, X, Loader2, Globe, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/languages';

interface UploadState {
  status: 'idle' | 'selected' | 'uploading' | 'transcribing' | 'done' | 'error';
  file: File | null;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  transcriptId?: string;
}

export default function AudioUploader() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: 'idle', file: null });
  const [dragOver, setDragOver] = useState(false);
  const [language, setLanguage] = useState('auto');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const maxSize = 25 * 1024 * 1024; // Groq limit
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/mp3'];
    const validExt = /\.(mp3|wav|m4a|webm|ogg|mp4)$/i;

    if (!validTypes.includes(file.type) && !validExt.test(file.name)) {
      setState({ status: 'error', file: null, error: 'Unsupported format. Use MP3, WAV, M4A, or WebM.' });
      return;
    }

    if (file.size > maxSize) {
      setState({
        status: 'error',
        file: null,
        error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 25 MB. Try a shorter clip or compress the audio.`,
      });
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

  const handleUpload = useCallback(async (retry = false) => {
    const file = retry ? null : state.file;
    if (!file && !retry) return;

    if (!retry) {
      setState((s) => ({ ...s, status: 'uploading' }));
    } else {
      setState((s) => ({ ...s, status: 'uploading', error: undefined, errorCode: undefined }));
    }

    try {
      const uploadFile = file || state.file;
      if (!uploadFile) throw new Error('No file selected');

      const formData = new FormData();
      formData.append('file', uploadFile);

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
        body: JSON.stringify({ fileId, fileName, language: language === 'auto' ? undefined : language }),
      });

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json();
        const error = new Error(err.error || 'Transcription failed') as Error & { code?: string; retryable?: boolean };
        error.code = err.code;
        error.retryable = err.retryable;
        throw error;
      }

      const transcript = await transcribeRes.json();
      setState((s) => ({ ...s, status: 'done', transcriptId: transcript.id }));
      router.push(`/transcripts/${transcript.id}`);
    } catch (err: unknown) {
      const error = err as Error & { code?: string; retryable?: boolean };
      setState((s) => ({
        ...s,
        status: 'error',
        error: error.message || 'Something went wrong',
        errorCode: error.code,
        retryable: error.retryable,
      }));
    }
  }, [state.file, router, language]);

  const reset = useCallback(() => {
    setState({ status: 'idle', file: null });
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const hasError = state.status === 'error';

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex items-center gap-3 animate-slide-down">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          <Globe className="h-4 w-4" />
          Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100
            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none
            appearance-none cursor-pointer"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} {l.native !== l.name ? `(${l.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Upload zone */}
      {(state.status === 'idle' || hasError) && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer
            transition-all duration-300 ease-out animate-scale-in
            ${dragOver
              ? 'border-blue-400 bg-blue-50/80 dark:bg-blue-950/30 scale-[1.01] shadow-lg shadow-blue-500/10'
              : hasError
                ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
            }
          `}
        >
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-blue-50/0 to-purple-50/10 dark:from-blue-900/0 dark:via-blue-900/0 dark:to-purple-900/5 pointer-events-none" />

          <div className="relative">
            <div className={`
              mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5
              transition-all duration-300
              ${dragOver
                ? 'bg-blue-100 dark:bg-blue-900/40 scale-110'
                : 'bg-gray-100 dark:bg-gray-800'
              }
            `}>
              <Upload className={`
                h-8 w-8 transition-colors duration-300
                ${dragOver ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}
              `} />
            </div>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
              {dragOver ? 'Drop to upload' : 'Drop your audio file here'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              or click to browse
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <span>MP3</span>
              <span className="w-0.5 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <span>WAV</span>
              <span className="w-0.5 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <span>M4A</span>
              <span className="w-0.5 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
              <span>WebM</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </div>
      )}

      {/* Selected file */}
      {state.status === 'selected' && state.file && (
        <div className="glass rounded-2xl p-5 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <FileAudio className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {state.file.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(state.file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={reset}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-sm
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => handleUpload()}
              className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                text-white rounded-xl font-medium text-sm transition-all shadow-lg shadow-blue-500/25
                hover:shadow-blue-500/40 active:scale-[0.98]"
            >
              Upload &amp; Transcribe
            </button>
          </div>
        </div>
      )}

      {/* Uploading / Transcribing */}
      {(state.status === 'uploading' || state.status === 'transcribing') && (
        <div className="glass rounded-2xl p-10 text-center animate-scale-in">
          <div className="relative mx-auto w-16 h-16 mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-blue-200 dark:border-blue-800" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <div className="absolute inset-2 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
            {state.status === 'uploading' ? 'Uploading...' : 'Transcribing...'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {state.status === 'uploading'
              ? 'Sending your audio file securely'
              : 'Groq Whisper is converting speech to text. This may take a moment.'}
          </p>
        </div>
      )}

      {/* Error with typed error codes */}
      {hasError && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/30 p-5 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-red-700 dark:text-red-300 text-sm mb-1">
                {getErrorTitle(state.errorCode)}
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
                {getErrorMessage(state.errorCode, state.error || '')}
              </p>
              {getErrorHint(state.errorCode) && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-2 leading-relaxed">
                  {getErrorHint(state.errorCode)}
                </p>
              )}
            </div>
          </div>
          {state.retryable && (
            <button
              onClick={() => handleUpload(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5
                bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50
                text-red-700 dark:text-red-300 rounded-xl font-medium text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
          {!state.retryable && (
            <button
              onClick={reset}
              className="mt-4 w-full py-2.5 text-sm font-medium text-red-600 dark:text-red-400
                hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Map error code to human title. */
function getErrorTitle(code?: string): string {
  switch (code) {
    case 'missing_key': return 'API Key Not Configured';
    case 'auth_error': return 'Invalid API Key';
    case 'rate_limited': return 'Rate Limit Reached';
    case 'file_too_large': return 'File Too Large';
    case 'no_speech': return 'No Speech Detected';
    case 'network_error': return 'Connection Error';
    case 'api_error': return 'Transcription Failed';
    default: return 'Something Went Wrong';
  }
}

/** Map error code to user-friendly message. */
function getErrorMessage(code?: string, fallback: string = ''): string {
  switch (code) {
    case 'missing_key': return 'The GROQ_API_KEY environment variable is not set. Transcription requires a Groq API key.';
    case 'auth_error': return 'Your Groq API key is invalid or has been revoked. Please generate a new one.';
    case 'rate_limited': return 'Too many requests. Groq\'s free tier allows about 20 requests per minute.';
    case 'file_too_large': return 'The audio file exceeds Groq\'s 25 MB limit. Try recording a shorter clip.';
    case 'no_speech': return 'The audio file contains no detectable speech. Make sure the recording captured audio.';
    case 'network_error': return 'Could not reach the transcription service. Check your internet connection.';
    case 'api_error': return fallback || 'The transcription service encountered an error. Please try again.';
    default: return fallback || 'An unexpected error occurred. Please try again.';
  }
}

/** Actionable hint per error code. */
function getErrorHint(code?: string): string | null {
  switch (code) {
    case 'missing_key':
      return 'Get a free API key at console.groq.com (no credit card required) and add it to your .env.local file as GROQ_API_KEY=your_key';
    case 'rate_limited':
      return 'Wait about 3 seconds before trying again. The free tier has a rolling rate limit.';
    case 'file_too_large':
      return 'Trim your audio to under 25 MB. For longer recordings, split into multiple files.';
    default: return null;
  }
}

// src/app/editor/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { startTranscription, stopTranscription, TranscriptionError } from '@/lib/transcription';

interface PageParams {
  id: string;
}

interface AudioFileInfo {
  id: string;
  filename: string;
  url: string;
}

export default function EditorPage() {
  const params = useParams<PageParams>();
  const fileId = params.id;

  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const finalTextRef = useRef('');
  const interimTextRef = useRef('');

  const handleInterim = useCallback((text: string) => {
    interimTextRef.current = text;
    setInterimText(text);
  }, []);

  const handleFinal = useCallback((text: string) => {
    finalTextRef.current = text;
    setFinalText(text);
    interimTextRef.current = '';
    setInterimText('');
  }, []);

  const handleError = useCallback((error: TranscriptionError) => {
    setIsTranscribing(false);
    if (error.code === 'not-supported') {
      setIsSupported(false);
      setTranscriptionError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    } else if (error.code === 'no-speech') {
      setTranscriptionError('No speech was detected. Please ensure your microphone is enabled and audio is playing.');
    } else if (error.code === 'aborted') {
      setTranscriptionError('Transcription was stopped.');
    } else {
      setTranscriptionError(`Transcription error: ${error.message}`);
    }
  }, []);

  const fetchAudioFile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch(`/api/upload/${fileId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }
      const data: AudioFileInfo = await response.json();
      setAudioFile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchAudioFile();
  }, [fetchAudioFile]);

  const handleStartTranscription = useCallback(() => {
    if (!audioFile) return;

    setTranscriptionError(null);
    setIsTranscribing(true);
    setInterimText('');
    setFinalText('');
    finalTextRef.current = '';
    interimTextRef.current = '';

    startTranscription(audioFile.url, handleInterim, handleFinal, handleError);
  }, [audioFile, handleInterim, handleFinal, handleError]);

  const handleStopTranscription = useCallback(() => {
    stopTranscription();
    setIsTranscribing(false);
  }, []);

  const handleRestartTranscription = useCallback(() => {
    handleStopTranscription();
    setTimeout(() => {
      handleStartTranscription();
    }, 100);
  }, [handleStartTranscription, handleStopTranscription]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading audio file...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Audio</h2>
            <p className="text-red-600 mb-4">{loadError}</p>
            <button
              onClick={fetchAudioFile}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!audioFile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No audio file found.</p>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Browser Not Supported</h2>
            <p className="text-yellow-600 mb-4">
              Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.
            </p>
            <p className="text-sm text-yellow-500">
              Audio file: {audioFile.filename}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Transcription Editor</h1>
          <p className="text-sm text-gray-500 mb-4">
            Audio file: {audioFile.filename}
          </p>

          <div className="flex items-center gap-4 mb-6">
            {!isTranscribing ? (
              <button
                onClick={handleStartTranscription}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!audioFile}
              >
                Start Transcription
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleStopTranscription}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Stop Transcription
                </button>
                <button
                  onClick={handleRestartTranscription}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Restart
                </button>
              </div>
            )}
          </div>

          {isTranscribing && (
            <div className="flex items-center gap-2 mb-4 text-sm text-blue-600">
              <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Transcribing... Speak clearly into your microphone.</span>
            </div>
          )}

          {transcriptionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{transcriptionError}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Transcript
              </label>
              <textarea
                value={finalText}
                onChange={(e) => {
                  setFinalText(e.target.value);
                  finalTextRef.current = e.target.value;
                }}
                className="w-full h-64 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                placeholder="Transcribed text will appear here..."
                readOnly={false}
              />
            </div>

            {interimText && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Interim Results
                </label>
                <div className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-600 italic">
                  {interimText}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Instructions</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Ensure your microphone is enabled and working.</li>
            <li>Click &quot;Start Transcription&quot; to begin. The audio file will play through your speakers.</li>
            <li>Speak clearly or play the audio through your speakers so the microphone can capture it.</li>
            <li>Interim results appear in real-time below the final transcript area.</li>
            <li>You can edit the final transcript text directly in the textarea.</li>
            <li>Click &quot;Stop Transcription&quot; to end the session, or &quot;Restart&quot; to begin again.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
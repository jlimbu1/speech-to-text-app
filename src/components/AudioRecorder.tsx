import React, { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
  onTranscript: (transcript: { id: string; text: string }) => void;
  onError: (error: string) => void;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'uploading' | 'error';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscript, onError }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const handleError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      setRecordingState('error');
      onError(message);
      cleanup();
    },
    [cleanup, onError]
  );

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      handleError('Recording is not supported in this browser.');
      return;
    }

    setRecordingState('requesting');
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordingState('uploading');

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          onTranscript({ id: data.id, text: data.text });
          setRecordingState('idle');
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          handleError(message);
        } finally {
          cleanup();
        }
      };

      mediaRecorder.onerror = () => {
        handleError('An error occurred during recording.');
      };

      mediaRecorder.start();
      setRecordingState('recording');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        handleError('Microphone access was denied. Please allow microphone permissions.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        handleError('No microphone found. Please connect a microphone.');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to start recording';
        handleError(message);
      }
    }
  }, [isSupported, onTranscript, onError, handleError, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  if (!isSupported) {
    return (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
        <p className="text-sm font-medium">Recording not supported</p>
        <p className="mt-1 text-sm">
          Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Record Audio</h3>

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-4">
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1a3 3 0 00-3 3v5a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M5 9a5 5 0 0010 0V8a1 1 0 112 0v1a7 7 0 01-14 0V8a1 1 0 112 0v1z" />
              <path d="M9 15v2H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2a7 7 0 01-6-6V8a1 1 0 112 0v1a5 5 0 0010 0V8a1 1 0 112 0v1a7 7 0 01-6 6z" />
            </svg>
            Start Recording
          </button>
        )}

        {recordingState === 'requesting' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Requesting microphone access...
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-600">Recording...</span>
            </div>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <rect x="4" y="4" width="12" height="12" rx="1" />
              </svg>
              Stop Recording
            </button>
          </div>
        )}

        {recordingState === 'uploading' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading and transcribing...
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;
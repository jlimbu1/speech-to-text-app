'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (fileId: string) => void;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'uploading' | 'error';

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearDurationInterval();
    stopMediaTracks();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [clearDurationInterval, stopMediaTracks]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = useCallback(async () => {
    setErrorMessage(null);
    setRecordingState('requesting');

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
        clearDurationInterval();
        setRecordingState('uploading');
        setUploadProgress(0);

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, `recording-${Date.now()}.webm`);

        try {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (event: ProgressEvent) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percent);
            }
          };

          const uploadPromise = new Promise<string>((resolve, reject) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response.fileId);
                } catch {
                  reject(new Error('Invalid response from server'));
                }
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));
          });

          xhr.open('POST', '/api/upload', true);
          xhr.timeout = 120000;
          xhr.send(formData);

          const fileId = await uploadPromise;
          setRecordingState('idle');
          setDuration(0);
          setUploadProgress(0);
          onRecordingComplete(fileId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          setErrorMessage(message);
          setRecordingState('error');
        } finally {
          stopMediaTracks();
          chunksRef.current = [];
        }
      };

      mediaRecorder.onerror = () => {
        setErrorMessage('Recording error occurred');
        setRecordingState('error');
        cleanup();
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        const message = error instanceof Error ? error.message : 'Failed to start recording';
        setErrorMessage(message);
      }
      setRecordingState('error');
      cleanup();
    }
  }, [cleanup, clearDurationInterval, onRecordingComplete, stopMediaTracks]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setRecordingState('idle');
    setDuration(0);
    setUploadProgress(0);
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Record Audio</h3>

      {recordingState === 'error' && errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          <p className="font-medium">Error</p>
          <p>{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="mt-2 rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          {recordingState === 'recording' && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
              <span className="text-sm font-medium text-red-600">Recording</span>
            </div>
          )}
          <span className="font-mono text-2xl font-bold text-gray-900">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="flex gap-3">
          {(recordingState === 'idle' || recordingState === 'error') && (
            <button
              onClick={handleStartRecording}
              disabled={recordingState === 'requesting'}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recordingState === 'requesting' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Requesting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Recording
                </>
              )}
            </button>
          )}

          {recordingState === 'recording' && (
            <button
              onClick={handleStopRecording}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              Stop Recording
            </button>
          )}
        </div>

        {recordingState === 'uploading' && (
          <div className="w-full max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
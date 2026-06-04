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
    setDuration(0);
    setUploadProgress(0);
  }, [clearDurationInterval, stopMediaTracks]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
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

      mediaRecorder.onstop = () => {
        clearDurationInterval();
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        uploadAudio(audioBlob);
      };

      mediaRecorder.onerror = () => {
        setErrorMessage('Recording failed due to an unexpected error.');
        setRecordingState('error');
        cleanup();
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access to record audio.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
      } else {
        setErrorMessage('Failed to access microphone. Please check your device settings.');
      }
      setRecordingState('error');
      cleanup();
    }
  }, [cleanup, clearDurationInterval]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const uploadAudio = useCallback(async (audioBlob: Blob) => {
    setRecordingState('uploading');
    setUploadProgress(0);

    const formData = new FormData();
    const filename = `recording-${Date.now()}.webm`;
    formData.append('file', audioBlob, filename);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      const result = await new Promise<string>((resolve, reject) => {
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

        xhr.open('POST', '/api/upload');
        xhr.timeout = 30000;
        xhr.send(formData);
      });

      setRecordingState('idle');
      cleanup();
      onRecordingComplete(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMessage(message);
      setRecordingState('error');
      cleanup();
    }
  }, [cleanup, onRecordingComplete]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-gray-300 rounded-lg">
      {recordingState === 'idle' && (
        <button
          onClick={startRecording}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          type="button"
        >
          Start Recording
        </button>
      )}

      {recordingState === 'requesting' && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
          <p className="text-gray-600">Requesting microphone access...</p>
        </div>
      )}

      {recordingState === 'recording' && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-2xl font-mono font-bold text-red-600">
              {formatDuration(duration)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            type="button"
          >
            Stop Recording
          </button>
        </div>
      )}

      {recordingState === 'uploading' && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-gray-600">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {recordingState === 'error' && errorMessage && (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-sm text-center">
            {errorMessage}
          </div>
          <button
            onClick={() => {
              setRecordingState('idle');
              setErrorMessage(null);
              setUploadProgress(0);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
            type="button"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
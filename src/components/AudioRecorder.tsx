import React, { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (transcript: { id: string; text: string }) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access was denied. Please allow microphone permissions in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred while accessing the microphone.');
      }
      return;
    }

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size === 0) {
          setError('Recording produced an empty audio file. Please try again.');
          return;
        }

        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, `recording.${mimeType === 'audio/webm' ? 'webm' : 'mp4'}`);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            let errorMsg = 'Failed to upload recording.';
            try {
              const errorData = await response.json();
              if (errorData && errorData.error) {
                errorMsg = errorData.error;
              }
            } catch {
              errorMsg = `Upload failed with status ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
          }

          const data = await response.json();
          onRecordingComplete(data);
        } catch (err) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred during upload.');
          }
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.onerror = () => {
        setError('An error occurred during recording. Please try again.');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording. Please try again.');
      stream.getTracks().forEach((track) => track.stop());
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
          className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
            isRecording
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isUploading ? 'Uploading...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">Recording...</span>
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
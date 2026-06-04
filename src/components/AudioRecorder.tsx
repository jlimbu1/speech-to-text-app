import { useState, useRef, useCallback } from 'react';

interface AudioRecorderProps {
  onTranscriptCreated: (transcript: { id: string; filename: string; text: string; createdAt: string }) => void;
  onError: (message: string) => void;
}

export default function AudioRecorder({ onTranscriptCreated, onError }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>(([]));

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: mimeType });

        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `Upload failed (status ${response.status})`);
          }

          const transcript = await response.json();
          onTranscriptCreated(transcript);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to upload recording.';
          onError(message);
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not access microphone.';
      onError(message);
    }
  }, [onTranscriptCreated, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-600">
          {isRecording ? 'Recording...' : 'Ready to record'}
        </span>
      </div>

      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isUploading}
            className="btn-primary"
            aria-label="Start recording"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="btn-danger"
            aria-label="Stop recording"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop Recording
          </button>
        )}
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Uploading recording...</span>
        </div>
      )}
    </div>
  );
}
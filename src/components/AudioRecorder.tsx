import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Loader2, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
}

type RecordingStatus = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage('');
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setStatus('stopped');
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
        toast.success('Recording completed.');
      };

      mediaRecorder.onerror = () => {
        cleanup();
        setStatus('error');
        setErrorMessage('An error occurred during recording. Please try again.');
        toast.error('Recording failed due to an internal error.');
      };

      mediaRecorder.start(1000);
      setStatus('recording');

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      cleanup();
      setStatus('error');
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        const message = 'Microphone access was denied. Please allow microphone permissions in your browser settings.';
        setErrorMessage(message);
        toast.error(message);
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        const message = 'No microphone found. Please connect a microphone and try again.';
        setErrorMessage(message);
        toast.error(message);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to start recording. Please try again.';
        setErrorMessage(message);
        toast.error(message);
      }
    }
  }, [onRecordingComplete, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
    setDuration(0);
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-4">
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-blue-50 p-4">
              <Mic className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Click the button below to start recording from your microphone.</p>
            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
              Start Recording
            </button>
          </div>
        )}

        {status === 'requesting' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Requesting microphone access...</p>
          </div>
        )}

        {status === 'recording' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-600">Recording</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-4 w-4" />
              <span className="text-lg font-mono">{formatDuration(duration)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </button>
          </div>
        )}

        {status === 'stopped' && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-green-50 p-4">
              <Mic className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-500">
              Recording saved ({formatDuration(duration)}). You can now transcribe or record again.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Mic className="h-4 w-4" />
              Record Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-red-50 p-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-red-600">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
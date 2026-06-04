'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Loader2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

type RecorderState = 'idle' | 'recording' | 'stopped' | 'uploading' | 'transcribing' | 'error';

export default function AudioRecorder() {
  const router = useRouter();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgb(17, 24, 39)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(59, 130, 246)';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setState('stopped');

        // Clean up
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        analyserRef.current = null;
        cancelAnimationFrame(animFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start();
      setState('recording');
      setError('');

      // Timer
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone permission or use file upload instead.'
        : 'Could not start recording. Please check your microphone.';
      setError(message);
      setState('error');
    }
  }, [drawWaveform]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
  }, []);

  const uploadRecording = useCallback(async () => {
    if (!audioUrl) return;
    setState('uploading');

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { fileId, fileName } = await uploadRes.json();
      setState('transcribing');

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
      router.push(`/transcripts/${transcript.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setState('error');
    }
  }, [audioUrl, router]);

  const reset = useCallback(() => {
    setState('idle');
    setError('');
    setElapsed(0);
    setAudioUrl('');
    chunks.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (state === 'error') {
    return (
      <div className="border border-red-300 dark:border-red-700 rounded-2xl p-8 text-center bg-red-50 dark:bg-red-950/20">
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button onClick={reset} className="text-blue-600 hover:underline text-sm">Try again</button>
      </div>
    );
  }

  if (state === 'uploading' || state === 'transcribing') {
    return (
      <div className="border rounded-2xl p-10 text-center bg-white dark:bg-gray-800 shadow-sm">
        <Loader2 className="mx-auto h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {state === 'uploading' ? 'Uploading recording...' : 'Transcribing...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state === 'idle' && (
        <div className="border-2 border-dashed rounded-2xl p-12 text-center">
          <Mic className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Record from your microphone
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Speak clearly and your speech will be transcribed to text
          </p>
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors text-lg"
          >
            <Mic className="h-6 w-6" />
            Start Recording
          </button>
        </div>
      )}

      {state === 'recording' && (
        <div className="border rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-sm text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
              {formatTime(elapsed)}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={120}
            className="w-full h-24 rounded-lg mb-4 bg-gray-900"
          />
          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors"
          >
            <Square className="h-5 w-5 fill-white" />
            Stop Recording
          </button>
        </div>
      )}

      {state === 'stopped' && (
        <div className="border rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <Play className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-gray-500">Recording: {formatTime(elapsed)}</span>
          </div>

          {audioUrl && (
            <audio src={audioUrl} controls className="w-full mb-4 rounded-lg" />
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={uploadRecording}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors inline-flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload &amp; Transcribe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

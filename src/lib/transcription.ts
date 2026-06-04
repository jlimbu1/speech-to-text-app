// src/lib/transcription.ts

type SpeechRecognitionInstance = SpeechRecognition | webkitSpeechRecognition;

interface TranscriptionCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: TranscriptionError) => void;
}

export interface TranscriptionError {
  code: string;
  message: string;
}

interface TranscriptionState {
  recognition: SpeechRecognitionInstance | null;
  audioElement: HTMLAudioElement | null;
  isRunning: boolean;
  finalTranscript: string;
}

let state: TranscriptionState = {
  recognition: null,
  audioElement: null,
  isRunning: false,
  finalTranscript: '',
};

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const SpeechRecognitionAPI =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    return null;
  }

  return new SpeechRecognitionAPI();
}

function createAudioElement(audioUrl: string): HTMLAudioElement {
  const audio = new Audio(audioUrl);
  audio.crossOrigin = 'anonymous';
  audio.loop = false;
  audio.volume = 1.0;
  return audio;
}

function setupRecognition(
  recognition: SpeechRecognitionInstance,
  callbacks: TranscriptionCallbacks
): void {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    if (finalTranscript) {
      state.finalTranscript += finalTranscript;
      callbacks.onFinal(state.finalTranscript);
    }

    if (interimTranscript) {
      callbacks.onInterim(interimTranscript);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    let code: string;
    let message: string;

    switch (event.error) {
      case 'no-speech':
        code = 'no-speech';
        message = 'No speech was detected. Please try again.';
        break;
      case 'aborted':
        code = 'aborted';
        message = 'Transcription was aborted.';
        break;
      case 'audio-capture':
        code = 'audio-capture';
        message = 'No microphone was found. Ensure microphone is connected and permissions are granted.';
        break;
      case 'not-allowed':
        code = 'not-allowed';
        message = 'Microphone access was denied. Please allow microphone access in your browser settings.';
        break;
      case 'network':
        code = 'network';
        message = 'Network error occurred. Please check your connection.';
        break;
      default:
        code = 'unknown';
        message = `An unknown error occurred: ${event.error}`;
    }

    callbacks.onError({ code, message });
  };

  recognition.onend = () => {
    if (state.isRunning) {
      try {
        recognition.start();
      } catch {
        state.isRunning = false;
        callbacks.onError({
          code: 'restart-failed',
          message: 'Failed to restart transcription after it ended.',
        });
      }
    }
  };
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const SpeechRecognitionAPI =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

  return SpeechRecognitionAPI !== undefined;
}

export function startTranscription(
  audioUrl: string,
  callbacks: TranscriptionCallbacks
): void {
  if (state.isRunning) {
    callbacks.onError({
      code: 'already-running',
      message: 'Transcription is already in progress.',
    });
    return;
  }

  const recognition = getSpeechRecognition();
  if (!recognition) {
    callbacks.onError({
      code: 'not-supported',
      message: 'Speech Recognition is not supported in this browser. Please use Chrome or Edge.',
    });
    return;
  }

  const audioElement = createAudioElement(audioUrl);

  state.recognition = recognition;
  state.audioElement = audioElement;
  state.isRunning = true;
  state.finalTranscript = '';

  setupRecognition(recognition, callbacks);

  try {
    recognition.start();
  } catch (error) {
    state.isRunning = false;
    state.recognition = null;
    state.audioElement = null;
    callbacks.onError({
      code: 'start-failed',
      message: error instanceof Error ? error.message : 'Failed to start transcription.',
    });
    return;
  }

  audioElement.play().catch((error: Error) => {
    stopTranscription();
    callbacks.onError({
      code: 'playback-failed',
      message: `Failed to play audio: ${error.message}`,
    });
  });
}

export function stopTranscription(): void {
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch {
      // Ignore errors when stopping recognition
    }
    state.recognition.onresult = null;
    state.recognition.onerror = null;
    state.recognition.onend = null;
    state.recognition = null;
  }

  if (state.audioElement) {
    try {
      state.audioElement.pause();
      state.audioElement.src = '';
    } catch {
      // Ignore errors when cleaning up audio element
    }
    state.audioElement = null;
  }

  state.isRunning = false;
}

export function getTranscriptionState(): { isRunning: boolean; finalTranscript: string } {
  return {
    isRunning: state.isRunning,
    finalTranscript: state.finalTranscript,
  };
}
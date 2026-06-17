import { v4 as uuidv4 } from 'uuid';

export type TranscriptStatus = 'recording' | 'processing' | 'done' | 'error';

export interface Transcript {
  id: string;
  text: string;
  createdAt: string;
  duration: number;
  status: TranscriptStatus;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  error: string | null;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StorageOperations {
  saveTranscript(transcript: Transcript): Promise<StorageResult<Transcript>>;
  getTranscript(id: string): Promise<StorageResult<Transcript | null>>;
  getAllTranscripts(): Promise<StorageResult<Transcript[]>>;
  deleteTranscript(id: string): Promise<StorageResult<void>>;
  updateTranscript(id: string, updates: Partial<Pick<Transcript, 'text' | 'status'>>): Promise<StorageResult<Transcript>>;
}

export function createTranscript(text: string, duration: number): Transcript {
  return {
    id: uuidv4(),
    text,
    createdAt: new Date().toISOString(),
    duration,
    status: 'done',
  };
}
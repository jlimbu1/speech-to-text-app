import { get, set, keys, del } from 'idb-keyval';
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

const STORE_KEY_PREFIX = 'transcript:';

function buildKey(id: string): string {
  return `${STORE_KEY_PREFIX}${id}`;
}

function isTranscriptKey(key: IDBValidKey): boolean {
  return typeof key === 'string' && key.startsWith(STORE_KEY_PREFIX);
}

function extractId(key: IDBValidKey): string {
  if (typeof key !== 'string') {
    throw new Error('Invalid key type: expected string');
  }
  return key.slice(STORE_KEY_PREFIX.length);
}

export async function saveTranscript(transcript: Transcript): Promise<StorageResult<Transcript>> {
  try {
    if (!transcript.id || !transcript.text === undefined || !transcript.createdAt || transcript.duration === undefined || !transcript.status) {
      return { success: false, error: 'Invalid transcript: missing required fields' };
    }
    if (typeof transcript.duration !== 'number' || transcript.duration < 0) {
      return { success: false, error: 'Invalid transcript: duration must be a non-negative number' };
    }
    if (!['recording', 'processing', 'done', 'error'].includes(transcript.status)) {
      return { success: false, error: 'Invalid transcript: status must be one of recording, processing, done, error' };
    }
    const key = buildKey(transcript.id);
    await set(key, transcript);
    return { success: true, data: transcript };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error saving transcript';
    return { success: false, error: message };
  }
}

export async function getTranscript(id: string): Promise<StorageResult<Transcript | null>> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid id: must be a non-empty string' };
    }
    const key = buildKey(id);
    const transcript = await get<Transcript>(key);
    if (transcript === undefined) {
      return { success: true, data: null };
    }
    return { success: true, data: transcript };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error getting transcript';
    return { success: false, error: message };
  }
}

export async function getAllTranscripts(): Promise<StorageResult<Transcript[]>> {
  try {
    const allKeys = await keys();
    const transcriptKeys = allKeys.filter(isTranscriptKey);
    const transcripts: Transcript[] = [];
    for (const key of transcriptKeys) {
      const transcript = await get<Transcript>(key);
      if (transcript !== undefined) {
        transcripts.push(transcript);
      }
    }
    transcripts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { success: true, data: transcripts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error getting all transcripts';
    return { success: false, error: message };
  }
}

export async function deleteTranscript(id: string): Promise<StorageResult<void>> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid id: must be a non-empty string' };
    }
    const key = buildKey(id);
    await del(key);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error deleting transcript';
    return { success: false, error: message };
  }
}

export async function updateTranscript(id: string, updates: Partial<Pick<Transcript, 'text' | 'status'>>): Promise<StorageResult<Transcript>> {
  try {
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid id: must be a non-empty string' };
    }
    if (updates.status && !['recording', 'processing', 'done', 'error'].includes(updates.status)) {
      return { success: false, error: 'Invalid status: must be one of recording, processing, done, error' };
    }
    const existingResult = await getTranscript(id);
    if (!existingResult.success) {
      return existingResult;
    }
    if (existingResult.data === null) {
      return { success: false, error: 'Transcript not found' };
    }
    const updatedTranscript: Transcript = {
      ...existingResult.data,
      ...updates,
    };
    const key = buildKey(id);
    await set(key, updatedTranscript);
    return { success: true, data: updatedTranscript };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error updating transcript';
    return { success: false, error: message };
  }
}
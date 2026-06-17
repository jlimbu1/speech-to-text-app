export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  originalFilename: string;
  transcription: string | null;
  createdAt: string;
}

export interface TranscriptionResult {
  jobId: string;
  transcription: string;
  status: 'done' | 'error';
  error?: string;
}

export interface CreateJobInput {
  id: string;
  originalFilename: string;
}

export interface UpdateJobInput {
  status?: 'pending' | 'processing' | 'done' | 'error';
  transcription?: string;
}
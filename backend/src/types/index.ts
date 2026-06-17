export interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: AudioStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type AudioStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface Transcription {
  id: string;
  audioFileId: string;
  text: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
}
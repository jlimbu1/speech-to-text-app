export interface TranscriptionSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionResult {
  id: string;
  text: string;
  segments: TranscriptionSegment[];
  createdAt: string;
  source: 'recorded' | 'uploaded';
}
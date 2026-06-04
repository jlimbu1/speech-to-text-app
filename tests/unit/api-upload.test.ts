import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockPrisma = {
  audioFile: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  transcript: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  extname: vi.fn((path: string) => {
    const lastDot = path.lastIndexOf('.');
    return lastDot === -1 ? '' : path.slice(lastDot);
  }),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'mocked-uuid-12345'),
}));

const { POST: uploadPost } = await import('../../src/app/api/upload/route');
const { POST: transcriptPost } = await import('../../src/app/api/transcript/route');
const { GET: historyGet } = await import('../../src/app/api/history/route');

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData();
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No audio file provided');
  });

  it('returns 400 when file is not an audio type', async () => {
    const formData = new FormData();
    const blob = new Blob(['fake content'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Only audio files are allowed');
  });

  it('returns 201 and file info on successful upload', async () => {
    mockPrisma.audioFile.create.mockResolvedValue({
      id: 'mocked-uuid-12345',
      filename: 'test.wav',
      originalName: 'test.wav',
      mimeType: 'audio/wav',
      size: 1024,
      createdAt: new Date('2025-01-01'),
    });

    const formData = new FormData();
    const blob = new Blob(['fake audio content'], { type: 'audio/wav' });
    formData.append('file', blob, 'test.wav');
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('mocked-uuid-12345');
    expect(data.filename).toBe('test.wav');
    expect(data.originalName).toBe('test.wav');
  });

  it('returns 500 when file write fails', async () => {
    const { writeFile } = await import('fs/promises');
    (writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Disk full'));

    const formData = new FormData();
    const blob = new Blob(['fake audio content'], { type: 'audio/wav' });
    formData.append('file', blob, 'test.wav');
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await uploadPost(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save audio file');
  });
});

describe('POST /api/transcript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when fileId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('fileId and text are required');
  });

  it('returns 400 when text is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: 'abc-123' }),
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('fileId and text are required');
  });

  it('returns 404 when audio file does not exist', async () => {
    mockPrisma.audioFile.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: 'nonexistent-id', text: 'Hello world' }),
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Audio file not found');
  });

  it('returns 201 and transcript on success', async () => {
    mockPrisma.audioFile.findUnique.mockResolvedValue({
      id: 'abc-123',
      filename: 'test.wav',
      originalName: 'test.wav',
      mimeType: 'audio/wav',
      size: 1024,
      createdAt: new Date('2025-01-01'),
    });
    mockPrisma.transcript.create.mockResolvedValue({
      id: 'transcript-1',
      fileId: 'abc-123',
      text: 'Hello world',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });

    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: 'abc-123', text: 'Hello world' }),
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe('transcript-1');
    expect(data.text).toBe('Hello world');
  });

  it('returns 500 when database save fails', async () => {
    mockPrisma.audioFile.findUnique.mockResolvedValue({
      id: 'abc-123',
      filename: 'test.wav',
      originalName: 'test.wav',
      mimeType: 'audio/wav',
      size: 1024,
      createdAt: new Date('2025-01-01'),
    });
    mockPrisma.transcript.create.mockRejectedValue(new Error('DB connection lost'));

    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: 'abc-123', text: 'Hello world' }),
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save transcript');
  });
});

describe('GET /api/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no transcripts exist', async () => {
    mockPrisma.transcript.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/history');
    const response = await historyGet(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('returns list of transcripts ordered by createdAt descending', async () => {
    const mockTranscripts = [
      {
        id: 't2',
        fileId: 'f2',
        text: 'Second transcript',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        audioFile: { originalName: 'file2.wav' },
      },
      {
        id: 't1',
        fileId: 'f1',
        text: 'First transcript',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        audioFile: { originalName: 'file1.wav' },
      },
    ];
    mockPrisma.transcript.findMany.mockResolvedValue(mockTranscripts);

    const request = new NextRequest('http://localhost:3000/api/history');
    const response = await historyGet(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('t2');
    expect(data[1].id).toBe('t1');
  });

  it('filters by search query when provided', async () => {
    mockPrisma.transcript.findMany.mockResolvedValue([
      {
        id: 't1',
        fileId: 'f1',
        text: 'Matching text',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        audioFile: { originalName: 'file1.wav' },
      },
    ]);

    const request = new NextRequest('http://localhost:3000/api/history?search=matching');
    const response = await historyGet(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].text).toBe('Matching text');
    expect(mockPrisma.transcript.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          text: expect.objectContaining({ contains: 'matching' }),
        }),
      })
    );
  });

  it('returns 500 when database query fails', async () => {
    mockPrisma.transcript.findMany.mockRejectedValue(new Error('DB timeout'));

    const request = new NextRequest('http://localhost:3000/api/history');
    const response = await historyGet(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch history');
  });
});
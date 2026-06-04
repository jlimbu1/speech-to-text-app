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

const { POST: transcriptPost } = await import('../../src/app/api/transcript/route');

describe('POST /api/transcript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when fileId is missing', async () => {
    const formData = new FormData();
    formData.append('text', 'Hello world');
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('fileId and text are required');
  });

  it('returns 400 when text is missing', async () => {
    const formData = new FormData();
    formData.append('fileId', 'mocked-uuid-12345');
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('fileId and text are required');
  });

  it('returns 404 when audioFile does not exist', async () => {
    mockPrisma.audioFile.findUnique.mockResolvedValue(null);

    const formData = new FormData();
    formData.append('fileId', 'nonexistent-uuid');
    formData.append('text', 'Hello world');
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Audio file not found');
  });

  it('returns 201 and creates transcript on success', async () => {
    const mockAudioFile = { id: 'mocked-uuid-12345', filename: 'test.wav', createdAt: new Date() };
    const mockTranscript = {
      id: 'transcript-1',
      fileId: 'mocked-uuid-12345',
      text: 'Hello world',
      createdAt: new Date(),
    };

    mockPrisma.audioFile.findUnique.mockResolvedValue(mockAudioFile);
    mockPrisma.transcript.create.mockResolvedValue(mockTranscript);

    const formData = new FormData();
    formData.append('fileId', 'mocked-uuid-12345');
    formData.append('text', 'Hello world');
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.transcript).toEqual(mockTranscript);
    expect(mockPrisma.transcript.create).toHaveBeenCalledWith({
      data: {
        fileId: 'mocked-uuid-12345',
        text: 'Hello world',
      },
    });
  });

  it('returns 500 when database create fails', async () => {
    const mockAudioFile = { id: 'mocked-uuid-12345', filename: 'test.wav', createdAt: new Date() };
    mockPrisma.audioFile.findUnique.mockResolvedValue(mockAudioFile);
    mockPrisma.transcript.create.mockRejectedValue(new Error('Database error'));

    const formData = new FormData();
    formData.append('fileId', 'mocked-uuid-12345');
    formData.append('text', 'Hello world');
    const request = new NextRequest('http://localhost:3000/api/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await transcriptPost(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to save transcript');
  });
});
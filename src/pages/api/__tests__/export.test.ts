import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../export';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    transcript: {
      findUnique: jest.fn(),
    },
  },
}));

const mockFindUnique = jest.requireMock('../../lib/prisma').default.transcript.findUnique;

describe('/api/export', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 if id is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Missing transcript id');
  });

  it('returns 400 if id is not a valid number', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'abc' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Invalid transcript id');
  });

  it('returns 404 if transcript is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Transcript not found');
  });

  it('returns transcript as plain text when format is txt', async () => {
    const mockTranscript = {
      id: 1,
      text: 'This is a simulated transcript of your audio file.',
      filename: 'test-audio.mp3',
      createdAt: new Date('2026-06-04T17:27:00.000Z'),
    };
    mockFindUnique.mockResolvedValue(mockTranscript);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1', format: 'txt' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('text/plain; charset=utf-8');
    expect(res._getData()).toBe(mockTranscript.text);
  });

  it('returns transcript as JSON when format is json', async () => {
    const mockTranscript = {
      id: 1,
      text: 'This is a simulated transcript of your audio file.',
      filename: 'test-audio.mp3',
      createdAt: new Date('2026-06-04T17:27:00.000Z'),
    };
    mockFindUnique.mockResolvedValue(mockTranscript);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1', format: 'json' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('application/json; charset=utf-8');
    const data = JSON.parse(res._getData());
    expect(data).toEqual({
      id: mockTranscript.id,
      text: mockTranscript.text,
      filename: mockTranscript.filename,
      createdAt: mockTranscript.createdAt.toISOString(),
    });
  });

  it('defaults to plain text format when format is not specified', async () => {
    const mockTranscript = {
      id: 1,
      text: 'This is a simulated transcript of your audio file.',
      filename: 'test-audio.mp3',
      createdAt: new Date('2026-06-04T17:27:00.000Z'),
    };
    mockFindUnique.mockResolvedValue(mockTranscript);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['content-type']).toBe('text/plain; charset=utf-8');
    expect(res._getData()).toBe(mockTranscript.text);
  });

  it('returns 400 for unsupported format', async () => {
    const mockTranscript = {
      id: 1,
      text: 'This is a simulated transcript of your audio file.',
      filename: 'test-audio.mp3',
      createdAt: new Date('2026-06-04T17:27:00.000Z'),
    };
    mockFindUnique.mockResolvedValue(mockTranscript);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1', format: 'pdf' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Unsupported format. Use "txt" or "json".');
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: '1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Method not allowed');
  });

  it('handles database errors gracefully', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection failed'));

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: '1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error', 'Internal server error');
  });
});
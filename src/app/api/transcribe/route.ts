import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { transcribeAudio, hasApiKey, TranscriptionError } from '@/lib/transcription';

export async function POST(request: NextRequest) {
  try {
    const { fileId, fileName, language } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Check API key early
    if (!hasApiKey()) {
      return NextResponse.json(
        {
          error: 'GROQ_API_KEY not configured',
          code: 'missing_key',
          message: 'Transcription is not available because GROQ_API_KEY is not set. ' +
                   'Get a free API key at https://console.groq.com and add it to your .env.local file.',
        },
        { status: 503 },
      );
    }

    // Find the uploaded file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    let files: string[];
    try {
      files = await readdir(uploadDir);
    } catch {
      return NextResponse.json({ error: 'Upload not found. Please upload a file first.' }, { status: 404 });
    }

    const matchingFile = files.find((f) => f.startsWith(fileId));
    if (!matchingFile) {
      return NextResponse.json({ error: 'Upload not found. The file may have expired.' }, { status: 404 });
    }

    // Transcribe using Groq Whisper API
    const filePath = path.join(uploadDir, matchingFile);
    const result = await transcribeAudio(filePath, language);

    // Save to database
    const transcript = await prisma.transcript.create({
      data: {
        filename: matchingFile,
        originalName: fileName || matchingFile,
        text: result.text,
        duration: result.duration,
      },
    });

    return NextResponse.json({
      id: transcript.id,
      text: transcript.text,
      filename: transcript.filename,
      originalName: transcript.originalName,
      createdAt: transcript.createdAt,
    });
  } catch (error) {
    console.error('Transcribe error:', error);

    if (error instanceof TranscriptionError) {
      const statusMap: Record<string, number> = {
        missing_key: 503,
        auth_error: 502,
        rate_limited: 429,
        file_too_large: 413,
        no_speech: 400,
        api_error: 502,
        network_error: 502,
      };
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: statusMap[error.code] || 500 },
      );
    }

    return NextResponse.json(
      { error: 'Transcription failed. Please try again.' },
      { status: 500 },
    );
  }
}

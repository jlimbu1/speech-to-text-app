import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { transcribeAudio } from '@/lib/transcription';

export async function POST(request: NextRequest) {
  try {
    const { fileId, fileName } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    // Find the uploaded file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    let files: string[];
    try {
      files = await readdir(uploadDir);
    } catch {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const matchingFile = files.find((f) => f.startsWith(fileId));
    if (!matchingFile) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Transcribe
    const filePath = path.join(uploadDir, matchingFile);
    const result = await transcribeAudio(filePath);

    // Save to database
    const transcript = await prisma.transcript.create({
      data: {
        filename: matchingFile,
        originalName: fileName || matchingFile,
        text: result.text,
        duration: result.duration,
      },
    });

    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: 'Transcription failed. Please try again.' }, { status: 500 });
  }
}

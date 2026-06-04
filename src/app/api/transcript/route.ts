import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fileId, text, originalName } = body;

    if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid fileId' },
        { status: 400 }
      );
    }

    const transcript = await prisma.transcript.create({
      data: {
        filename: fileId.trim(),
        originalName: typeof originalName === 'string' ? originalName.trim() : '',
        text: typeof text === 'string' ? text : '',
      },
    });

    return NextResponse.json(transcript, { status: 201 });
  } catch (error) {
    console.error('Failed to create transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}